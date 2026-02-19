"""
Push Notification Service for Admin Dashboard
Uses Web Push API with VAPID authentication
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

# VAPID Configuration
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '').replace('\\n', '\n')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'mailto:admin@temaruco.com')

# Notification event types
NOTIFICATION_EVENTS = {
    'new_order': {
        'title': 'New Order',
        'icon': '🛒',
        'description': 'New orders (bulk, POD, souvenir, fabric, boutique)'
    },
    'new_enquiry': {
        'title': 'New Enquiry',
        'icon': '📩',
        'description': 'New enquiries and custom order requests'
    },
    'new_design_request': {
        'title': 'Design Request',
        'icon': '🎨',
        'description': 'New branded product design requests'
    },
    'payment_received': {
        'title': 'Payment Received',
        'icon': '💳',
        'description': 'Payment confirmations'
    },
    'quote_response': {
        'title': 'Quote Response',
        'icon': '📋',
        'description': 'Customer responses to quotes'
    },
    'low_inventory': {
        'title': 'Low Inventory',
        'icon': '📦',
        'description': 'Inventory alerts'
    }
}

def get_vapid_public_key() -> str:
    """Get the VAPID public key for client subscription"""
    return VAPID_PUBLIC_KEY

async def send_push_notification(
    subscription_info: Dict[str, Any],
    title: str,
    body: str,
    url: Optional[str] = None,
    tag: Optional[str] = None,
    data: Optional[Dict] = None
) -> bool:
    """
    Send a push notification to a single subscription
    
    Args:
        subscription_info: Push subscription object from client
        title: Notification title
        body: Notification body text
        url: URL to open when notification is clicked
        tag: Notification tag for grouping
        data: Additional data to send with notification
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not VAPID_PRIVATE_KEY:
        logger.warning("VAPID_PRIVATE_KEY not configured, skipping push notification")
        return False
    
    payload = {
        'title': title,
        'body': body,
        'icon': '/logo192.png',
        'badge': '/logo192.png',
        'tag': tag or 'temaruco-admin',
        'requireInteraction': True,
        'data': {
            'url': url or '/admin/dashboard',
            **(data or {})
        }
    }
    
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={'sub': VAPID_CLAIMS_EMAIL}
        )
        logger.info(f"Push notification sent: {title}")
        return True
    except WebPushException as e:
        logger.error(f"Push notification failed: {e}")
        # Check if subscription is expired/invalid
        if e.response and e.response.status_code in [404, 410]:
            logger.info("Subscription expired or invalid")
            return False
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending push: {e}")
        return False

async def send_push_to_admins(
    db,
    event_type: str,
    title: str,
    body: str,
    url: Optional[str] = None,
    data: Optional[Dict] = None,
    exclude_admin_id: Optional[str] = None
) -> Dict[str, int]:
    """
    Send push notification to all admins who have enabled this event type
    
    Args:
        db: Database connection
        event_type: Type of notification event (e.g., 'new_order', 'payment_received')
        title: Notification title
        body: Notification body
        url: URL to open on click
        data: Additional data
        exclude_admin_id: Admin ID to exclude (e.g., the one who triggered the event)
    
    Returns:
        Dict with 'sent' and 'failed' counts
    """
    results = {'sent': 0, 'failed': 0, 'skipped': 0}
    
    # Get all admin push subscriptions with this event enabled
    query = {
        'is_active': True,
        f'enabled_events.{event_type}': True
    }
    
    if exclude_admin_id:
        query['admin_id'] = {'$ne': exclude_admin_id}
    
    subscriptions = await db.push_subscriptions.find(query).to_list(100)
    
    for sub in subscriptions:
        subscription_info = sub.get('subscription')
        if not subscription_info:
            results['skipped'] += 1
            continue
        
        success = await send_push_notification(
            subscription_info=subscription_info,
            title=title,
            body=body,
            url=url,
            tag=event_type,
            data=data
        )
        
        if success:
            results['sent'] += 1
        else:
            results['failed'] += 1
            # If subscription failed, mark it as inactive
            if not success:
                await db.push_subscriptions.update_one(
                    {'_id': sub['_id']},
                    {'$set': {'is_active': False, 'error_count': sub.get('error_count', 0) + 1}}
                )
    
    logger.info(f"Push notifications for {event_type}: sent={results['sent']}, failed={results['failed']}")
    return results

# Convenience functions for specific events
async def notify_new_order(db, order_id: str, order_type: str, customer_name: str):
    """Notify admins of a new order"""
    await send_push_to_admins(
        db=db,
        event_type='new_order',
        title=f'🛒 New {order_type.title()} Order',
        body=f'Order {order_id} from {customer_name}',
        url=f'/admin/orders?search={order_id}',
        data={'order_id': order_id, 'order_type': order_type}
    )

async def notify_new_enquiry(db, enquiry_id: str, customer_name: str, enquiry_type: str = 'general'):
    """Notify admins of a new enquiry"""
    await send_push_to_admins(
        db=db,
        event_type='new_enquiry',
        title=f'📩 New {enquiry_type.title()} Enquiry',
        body=f'From {customer_name}',
        url=f'/admin/enquiries?search={enquiry_id}',
        data={'enquiry_id': enquiry_id}
    )

async def notify_design_request(db, order_id: str, customer_name: str):
    """Notify admins of a new design request"""
    await send_push_to_admins(
        db=db,
        event_type='new_design_request',
        title='🎨 New Design Request',
        body=f'Order {order_id} from {customer_name} needs a design quote',
        url=f'/admin/orders?search={order_id}',
        data={'order_id': order_id}
    )

async def notify_payment_received(db, order_id: str, amount: float, currency: str = 'NGN'):
    """Notify admins of a payment"""
    await send_push_to_admins(
        db=db,
        event_type='payment_received',
        title='💳 Payment Received',
        body=f'Order {order_id}: {currency} {amount:,.0f}',
        url=f'/admin/orders?search={order_id}',
        data={'order_id': order_id, 'amount': amount}
    )

async def notify_quote_response(db, quote_id: str, customer_name: str, response_type: str):
    """Notify admins of a customer quote response"""
    await send_push_to_admins(
        db=db,
        event_type='quote_response',
        title=f'📋 Quote {response_type.title()}',
        body=f'{customer_name} has {response_type} quote {quote_id}',
        url=f'/admin/quotes?search={quote_id}',
        data={'quote_id': quote_id}
    )
