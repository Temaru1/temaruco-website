"""Payment routes - Flutterwave Integration"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
import httpx
import logging
import os

from ..core import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])

# Flutterwave Configuration
FLUTTERWAVE_SECRET_KEY = os.environ.get('FLUTTERWAVE_SECRET_KEY')
FLUTTERWAVE_PUBLIC_KEY = os.environ.get('FLUTTERWAVE_PUBLIC_KEY')
FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3"


class FlutterwavePaymentRequest(BaseModel):
    email: EmailStr
    amount: float
    currency: str = "NGN"
    order_id: str
    order_type: str
    customer_name: str
    phone: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = None


class FlutterwaveVerifyRequest(BaseModel):
    transaction_id: str
    tx_ref: str
    order_id: str


@router.post("/flutterwave/initialize")
async def initialize_flutterwave_payment(payment_request: FlutterwavePaymentRequest):
    """Initialize Flutterwave payment"""
    db = get_db()
    
    try:
        # Generate unique transaction reference
        tx_ref = f"TM-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Store payment record
        payment_data = {
            'id': str(uuid.uuid4()),
            'tx_ref': tx_ref,
            'email': payment_request.email,
            'amount': payment_request.amount,
            'currency': payment_request.currency,
            'order_type': payment_request.order_type,
            'order_id': payment_request.order_id,
            'customer_name': payment_request.customer_name,
            'phone': payment_request.phone,
            'status': 'pending',
            'provider': 'flutterwave',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        if not FLUTTERWAVE_SECRET_KEY:
            # Mock mode for testing
            payment_data['is_mock'] = True
            await db.payments.insert_one(payment_data)
            
            logger.info(f"[MOCK PAYMENT] Initialized mock Flutterwave payment for {payment_request.email}")
            
            return {
                'status': True,
                'message': 'Payment initialized (MOCK MODE)',
                'data': {
                    'tx_ref': tx_ref,
                    'amount': payment_request.amount,
                    'currency': payment_request.currency
                }
            }
        
        # Real Flutterwave integration
        frontend_url = os.environ.get('FRONTEND_URL', 'https://retail-reboot-1.preview.emergentagent.com')
        
        payload = {
            'tx_ref': tx_ref,
            'amount': payment_request.amount,
            'currency': payment_request.currency,
            'payment_options': 'card,mobilemoney,ussd,banktransfer',
            'redirect_url': f"{frontend_url}/payment/callback",
            'customer': {
                'email': payment_request.email,
                'phonenumber': payment_request.phone or '',
                'name': payment_request.customer_name
            },
            'customizations': {
                'title': 'Temaruco Payment',
                'description': f'Payment for order {payment_request.order_id}',
                'logo': f"{frontend_url}/logo.png"
            },
            'meta': {
                'order_id': payment_request.order_id,
                'order_type': payment_request.order_type,
                **(payment_request.metadata or {})
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{FLUTTERWAVE_BASE_URL}/payments',
                json=payload,
                headers={
                    'Authorization': f'Bearer {FLUTTERWAVE_SECRET_KEY}',
                    'Content-Type': 'application/json'
                },
                timeout=30.0
            )
        
        if response.status_code != 200:
            logger.error(f"Flutterwave initialization failed: {response.text}")
            raise HTTPException(status_code=400, detail="Payment initialization failed")
        
        flutterwave_response = response.json()
        
        if flutterwave_response.get('status') != 'success':
            raise HTTPException(
                status_code=400, 
                detail=flutterwave_response.get('message', 'Payment initialization failed')
            )
        
        payment_data['flutterwave_response'] = flutterwave_response.get('data', {})
        payment_data['is_mock'] = False
        
        await db.payments.insert_one(payment_data)
        
        logger.info(f"Flutterwave payment initialized: {tx_ref} for {payment_request.email}")
        
        return {
            'status': True,
            'message': 'Payment initialized',
            'data': {
                'tx_ref': tx_ref,
                'amount': payment_request.amount,
                'currency': payment_request.currency,
                'link': flutterwave_response.get('data', {}).get('link')
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flutterwave payment initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/flutterwave/verify")
async def verify_flutterwave_payment(verify_request: FlutterwaveVerifyRequest):
    """Verify Flutterwave payment"""
    db = get_db()
    
    try:
        # Check if mock payment
        payment_record = await db.payments.find_one({'tx_ref': verify_request.tx_ref}, {'_id': 0})
        
        if payment_record and payment_record.get('is_mock'):
            # Update mock payment status
            await db.payments.update_one(
                {'tx_ref': verify_request.tx_ref},
                {'$set': {
                    'status': 'successful',
                    'verified_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update order status
            await db.orders.update_one(
                {'id': verify_request.order_id},
                {'$set': {
                    'payment_status': 'paid',
                    'payment_reference': verify_request.tx_ref,
                    'payment_provider': 'flutterwave'
                }}
            )
            
            return {
                'status': True,
                'message': 'Payment verified (MOCK)',
                'data': {'status': 'successful'}
            }
        
        if not FLUTTERWAVE_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Payment not configured")
        
        # Verify with Flutterwave API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'{FLUTTERWAVE_BASE_URL}/transactions/{verify_request.transaction_id}/verify',
                headers={'Authorization': f'Bearer {FLUTTERWAVE_SECRET_KEY}'},
                timeout=30.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Verification failed")
        
        flutterwave_response = response.json()
        
        if flutterwave_response.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Verification failed")
        
        transaction_data = flutterwave_response.get('data', {})
        transaction_status = transaction_data.get('status', 'failed')
        
        # Update payment record
        await db.payments.update_one(
            {'tx_ref': verify_request.tx_ref},
            {'$set': {
                'status': transaction_status,
                'transaction_id': verify_request.transaction_id,
                'flutterwave_response': transaction_data,
                'verified_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update order if successful
        if transaction_status == 'successful':
            await db.orders.update_one(
                {'id': verify_request.order_id},
                {'$set': {
                    'payment_status': 'paid',
                    'payment_reference': verify_request.tx_ref,
                    'payment_provider': 'flutterwave',
                    'status': 'payment_verified'
                }}
            )
            logger.info(f"Order {verify_request.order_id} payment verified via Flutterwave")
        
        return {
            'status': True,
            'message': 'Payment verified',
            'data': transaction_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flutterwave payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flutterwave/status/{tx_ref}")
async def get_flutterwave_payment_status(tx_ref: str):
    """Get Flutterwave payment status by transaction reference"""
    db = get_db()
    
    try:
        # Check local record first
        payment_record = await db.payments.find_one({'tx_ref': tx_ref}, {'_id': 0})
        
        if not payment_record:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if payment_record.get('is_mock'):
            return {
                'status': True,
                'data': {
                    'status': payment_record.get('status', 'pending'),
                    'amount': payment_record.get('amount'),
                    'currency': payment_record.get('currency', 'NGN')
                }
            }
        
        if not FLUTTERWAVE_SECRET_KEY:
            return {
                'status': True,
                'data': {
                    'status': payment_record.get('status', 'pending'),
                    'amount': payment_record.get('amount'),
                    'currency': payment_record.get('currency', 'NGN')
                }
            }
        
        # Verify with Flutterwave API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'{FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference',
                params={'tx_ref': tx_ref},
                headers={'Authorization': f'Bearer {FLUTTERWAVE_SECRET_KEY}'},
                timeout=30.0
            )
        
        if response.status_code == 200:
            flutterwave_response = response.json()
            if flutterwave_response.get('status') == 'success':
                transaction_data = flutterwave_response.get('data', {})
                
                # Update local record
                await db.payments.update_one(
                    {'tx_ref': tx_ref},
                    {'$set': {
                        'status': transaction_data.get('status', 'pending'),
                        'flutterwave_response': transaction_data,
                        'verified_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                return {
                    'status': True,
                    'data': transaction_data
                }
        
        # Return local record if API call fails
        return {
            'status': True,
            'data': {
                'status': payment_record.get('status', 'pending'),
                'amount': payment_record.get('amount'),
                'currency': payment_record.get('currency', 'NGN')
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flutterwave status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/provider")
async def get_payment_provider(request: Request):
    """Get recommended currency based on user location"""
    country = request.headers.get('CF-IPCountry', '').upper()
    accept_lang = request.headers.get('Accept-Language', '')
    
    is_nigerian = country == 'NG' or 'ng' in accept_lang.lower()
    
    return {
        'provider': 'flutterwave',
        'currency': 'NGN' if is_nigerian else 'USD',
        'country_detected': country or 'unknown',
        'is_nigerian': is_nigerian
    }


@router.post("/webhook/flutterwave")
async def flutterwave_webhook(request: Request):
    """Handle Flutterwave webhook events"""
    db = get_db()
    
    try:
        # Get webhook secret hash for verification
        webhook_secret = os.environ.get('FLUTTERWAVE_WEBHOOK_SECRET', '')
        
        # Verify webhook signature
        signature = request.headers.get('verif-hash', '')
        
        if webhook_secret and signature != webhook_secret:
            logger.warning("Invalid Flutterwave webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        payload = await request.json()
        event = payload.get('event')
        data = payload.get('data', {})
        
        logger.info(f"Flutterwave webhook received: {event}")
        
        if event == 'charge.completed':
            tx_ref = data.get('tx_ref')
            status = data.get('status')
            
            if tx_ref and status == 'successful':
                # Update payment record
                await db.payments.update_one(
                    {'tx_ref': tx_ref},
                    {'$set': {
                        'status': 'successful',
                        'transaction_id': data.get('id'),
                        'flutterwave_response': data,
                        'webhook_verified_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Get order_id from meta
                order_id = data.get('meta', {}).get('order_id')
                if not order_id:
                    # Try to get from payment record
                    payment = await db.payments.find_one({'tx_ref': tx_ref}, {'_id': 0})
                    order_id = payment.get('order_id') if payment else None
                
                if order_id:
                    await db.orders.update_one(
                        {'id': order_id},
                        {'$set': {
                            'payment_status': 'paid',
                            'payment_reference': tx_ref,
                            'payment_provider': 'flutterwave',
                            'status': 'payment_verified'
                        }}
                    )
                    logger.info(f"Order {order_id} payment verified via Flutterwave webhook")
        
        return {'status': 'success'}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flutterwave webhook error: {str(e)}")
        # Return success to acknowledge receipt even if processing fails
        return {'status': 'received'}
