"""Payment routes"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid
import httpx
import logging

from ..core import get_db
from ..core.config import PAYSTACK_SECRET_KEY, STRIPE_API_KEY
from ..models import PaymentInitializeRequest, StripePaymentRequest, OrderStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])

# Stripe imports (optional)
try:
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
    )
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    logger.warning("Stripe integration not available")

@router.post("/initialize")
async def initialize_payment(payment_request: PaymentInitializeRequest):
    """Initialize Paystack payment"""
    db = get_db()
    
    try:
        amount_in_kobo = int(payment_request.amount * 100)
        reference = f"TM-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Store payment record
        payment_data = {
            'id': str(uuid.uuid4()),
            'reference': reference,
            'email': payment_request.email,
            'amount': payment_request.amount,
            'order_type': payment_request.order_type,
            'order_id': payment_request.order_id,
            'status': 'pending',
            'provider': 'paystack',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        if not PAYSTACK_SECRET_KEY:
            # Mock mode
            payment_data['is_mock'] = True
            payment_data['access_code'] = f"mock_{reference}"
            payment_data['authorization_url'] = f"/payment/mock?ref={reference}"
            await db.payments.insert_one(payment_data)
            
            return {
                'status': True,
                'message': 'Payment initialized (MOCK)',
                'data': {
                    'reference': reference,
                    'access_code': payment_data['access_code'],
                    'authorization_url': payment_data['authorization_url']
                }
            }
        
        # Real Paystack integration
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.paystack.co/transaction/initialize',
                json={
                    'email': payment_request.email,
                    'amount': amount_in_kobo,
                    'metadata': {
                        'order_type': payment_request.order_type,
                        'order_id': payment_request.order_id,
                        **(payment_request.metadata or {})
                    }
                },
                headers={
                    'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
                    'Content-Type': 'application/json'
                },
                timeout=30.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Payment initialization failed")
        
        paystack_response = response.json()
        
        if not paystack_response.get('status'):
            raise HTTPException(status_code=400, detail=paystack_response.get('message', 'Payment failed'))
        
        payment_data['reference'] = paystack_response['data']['reference']
        payment_data['access_code'] = paystack_response['data']['access_code']
        payment_data['authorization_url'] = paystack_response['data']['authorization_url']
        payment_data['is_mock'] = False
        
        await db.payments.insert_one(payment_data)
        
        return {
            'status': True,
            'message': 'Payment initialized',
            'data': paystack_response['data']
        }
    
    except Exception as e:
        logger.error(f"Payment initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{reference}")
async def verify_payment(reference: str):
    """Verify Paystack payment"""
    db = get_db()
    
    try:
        payment_record = await db.payments.find_one({'reference': reference}, {'_id': 0})
        
        if payment_record and payment_record.get('is_mock'):
            return {
                'status': True,
                'message': 'Payment verified (MOCK)',
                'data': {'status': 'success'}
            }
        
        if not PAYSTACK_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Payment not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'https://api.paystack.co/transaction/verify/{reference}',
                headers={'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}'},
                timeout=30.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Verification failed")
        
        paystack_response = response.json()
        
        if not paystack_response.get('status'):
            raise HTTPException(status_code=400, detail="Verification failed")
        
        transaction_data = paystack_response.get('data', {})
        transaction_status = transaction_data.get('status', 'failed')
        
        # Update payment record
        await db.payments.update_one(
            {'reference': reference},
            {'$set': {
                'status': transaction_status,
                'verified_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update order if successful
        if transaction_status == 'success' and payment_record:
            await db.orders.update_one(
                {'id': payment_record['order_id']},
                {'$set': {'payment_status': 'paid', 'payment_reference': reference}}
            )
        
        return {
            'status': True,
            'message': 'Payment verified',
            'data': transaction_data
        }
    
    except Exception as e:
        logger.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/provider")
async def get_payment_provider(request: Request):
    """Get recommended payment provider based on user location"""
    country = request.headers.get('CF-IPCountry', '').upper()
    accept_lang = request.headers.get('Accept-Language', '')
    
    is_nigerian = country == 'NG' or 'ng' in accept_lang.lower()
    
    return {
        'provider': 'paystack' if is_nigerian else 'stripe',
        'currency': 'NGN' if is_nigerian else 'USD',
        'country_detected': country or 'unknown',
        'is_nigerian': is_nigerian
    }

# Stripe endpoints
@router.post("/stripe/initialize")
async def initialize_stripe_payment(payment_request: StripePaymentRequest, request: Request):
    """Initialize Stripe payment for international customers"""
    if not STRIPE_AVAILABLE or not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    db = get_db()
    
    try:
        # Get USD rate
        ngn_to_usd_rate = 0.00063
        try:
            cached_rates = await db.currency_cache.find_one(
                {'date': datetime.now(timezone.utc).strftime('%Y-%m-%d')},
                {'_id': 0}
            )
            if cached_rates and cached_rates.get('rates', {}).get('USD', {}).get('rate'):
                ngn_to_usd_rate = cached_rates['rates']['USD']['rate']
        except:
            pass
        
        amount_usd = round(payment_request.amount * ngn_to_usd_rate, 2)
        if amount_usd < 0.50:
            amount_usd = 0.50
        
        # Create Stripe checkout
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        success_url = f"{payment_request.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{payment_request.origin_url}/payment/callback?cancelled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=amount_usd,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "order_id": payment_request.order_id,
                "order_type": payment_request.order_type,
                "email": payment_request.email,
                "original_amount_ngn": str(payment_request.amount)
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store payment record
        payment_record = {
            'id': str(uuid.uuid4()),
            'session_id': session.session_id,
            'provider': 'stripe',
            'email': payment_request.email,
            'amount_ngn': payment_request.amount,
            'amount_usd': amount_usd,
            'currency': 'USD',
            'order_id': payment_request.order_id,
            'order_type': payment_request.order_type,
            'payment_status': 'pending',
            'checkout_url': session.url,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(payment_record)
        
        return {
            'status': True,
            'message': 'Stripe checkout session created',
            'data': {
                'checkout_url': session.url,
                'session_id': session.session_id,
                'amount_usd': amount_usd,
                'amount_ngn': payment_request.amount
            }
        }
    
    except Exception as e:
        logger.error(f"Stripe initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stripe/status/{session_id}")
async def get_stripe_payment_status(session_id: str, request: Request):
    """Check Stripe payment status"""
    if not STRIPE_AVAILABLE or not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    db = get_db()
    
    try:
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update payment record
        new_status = 'paid' if status.payment_status == 'paid' else status.payment_status
        
        await db.payment_transactions.update_one(
            {'session_id': session_id},
            {'$set': {
                'payment_status': new_status,
                'stripe_status': status.status,
                'verified_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update order if paid
        if status.payment_status == 'paid':
            payment_record = await db.payment_transactions.find_one({'session_id': session_id}, {'_id': 0})
            if payment_record:
                await db.orders.update_one(
                    {'id': payment_record['order_id']},
                    {'$set': {
                        'payment_status': 'paid',
                        'payment_provider': 'stripe',
                        'payment_reference': session_id,
                        'status': OrderStatus.PAYMENT_VERIFIED
                    }}
                )
        
        return {
            'status': True,
            'payment_status': status.payment_status,
            'session_status': status.status,
            'amount': status.amount_total / 100,
            'currency': status.currency.upper()
        }
    
    except Exception as e:
        logger.error(f"Stripe status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
