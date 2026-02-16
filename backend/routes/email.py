"""Email Routes Module - API endpoints for email management"""
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import Response
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import os

from ..services.email_service import (
    EmailService, 
    DEFAULT_EMAIL_TEMPLATES, 
    encrypt_password,
    get_order_confirmation_email
)

router = APIRouter(prefix="/api", tags=["email"])

# These will be injected from the main app
db = None
get_admin_user = None
get_super_admin_user = None


def init_email_routes(database, admin_dep, super_admin_dep):
    """Initialize email routes with dependencies"""
    global db, get_admin_user, get_super_admin_user
    db = database
    get_admin_user = admin_dep
    get_super_admin_user = super_admin_dep


def get_email_service():
    """Get email service instance"""
    return EmailService(db)


# ==================== EMAIL SETTINGS API ====================

@router.get("/admin/email/settings")
async def get_admin_email_settings(admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Get email settings (without password)"""
    settings = await db.email_settings.find_one({'is_active': True}, {'_id': 0, 'smtp_password': 0})
    
    if not settings:
        return {
            'smtp_host': os.environ.get('SMTP_HOST', 'smtp.gmail.com'),
            'smtp_port': int(os.environ.get('SMTP_PORT', 587)),
            'smtp_username': os.environ.get('SMTP_USER', ''),
            'from_email': os.environ.get('FROM_EMAIL', 'noreply@temaruco.com'),
            'from_name': os.environ.get('FROM_NAME', 'Temaruco'),
            'reply_to': '',
            'is_active': True,
            'has_password': bool(os.environ.get('SMTP_PASSWORD', ''))
        }
    
    full_settings = await db.email_settings.find_one({'is_active': True}, {'_id': 0})
    settings['has_password'] = bool(full_settings.get('smtp_password'))
    
    return settings


@router.post("/admin/email/settings")
async def save_email_settings(data: Dict[str, Any], request: Request):
    """Super Admin: Save email SMTP settings"""
    admin_user = await get_super_admin_user(request)
    
    settings_doc = {
        'id': 'primary',
        'smtp_host': data.get('smtp_host', 'smtp.gmail.com'),
        'smtp_port': int(data.get('smtp_port', 587)),
        'smtp_username': data.get('smtp_username', ''),
        'from_email': data.get('from_email', ''),
        'from_name': data.get('from_name', 'Temaruco'),
        'reply_to': data.get('reply_to', ''),
        'is_active': data.get('is_active', True),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': admin_user.get('email')
    }
    
    if data.get('smtp_password'):
        settings_doc['smtp_password'] = encrypt_password(data['smtp_password'])
    else:
        existing = await db.email_settings.find_one({'id': 'primary'}, {'smtp_password': 1})
        if existing and existing.get('smtp_password'):
            settings_doc['smtp_password'] = existing['smtp_password']
    
    await db.email_settings.update_one(
        {'id': 'primary'},
        {'$set': settings_doc},
        upsert=True
    )
    
    return {'message': 'Email settings saved successfully'}


@router.post("/admin/email/test")
async def test_email_settings(data: Dict[str, Any], admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Send test email to verify SMTP settings"""
    email_service = get_email_service()
    test_email = data.get('test_email', admin_user.get('email'))
    
    subject, html_content = await email_service.render_email_template('welcome', {
        'name': 'Test User',
        'email': test_email
    })
    
    success = await email_service.send_email_with_logging(
        to_email=test_email,
        subject=f"[TEST] {subject}",
        html_content=html_content,
        template_id='test'
    )
    
    if success:
        return {'message': f'Test email sent to {test_email}', 'success': True}
    else:
        raise HTTPException(status_code=500, detail='Failed to send test email. Check SMTP settings.')


# ==================== EMAIL TEMPLATES API ====================

@router.get("/admin/email/templates")
async def get_email_templates(
    template_type: Optional[str] = None,
    admin_user: Dict = Depends(lambda: get_admin_user)
):
    """Admin: Get all email templates"""
    query = {}
    if template_type:
        query['type'] = template_type
    
    templates = await db.email_templates.find(query, {'_id': 0}).to_list(100)
    
    for key, default_template in DEFAULT_EMAIL_TEMPLATES.items():
        exists = any(t.get('key') == key for t in templates)
        if not exists:
            templates.append({
                'key': key,
                'is_default': True,
                **default_template
            })
    
    return {'templates': templates}


@router.post("/admin/email/templates")
async def create_email_template(data: Dict[str, Any], admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Create new email template"""
    template_key = data.get('key', '').lower().replace(' ', '_')
    
    if not template_key or not data.get('name') or not data.get('subject'):
        raise HTTPException(status_code=400, detail="Key, name, and subject are required")
    
    existing = await db.email_templates.find_one({'key': template_key})
    if existing:
        raise HTTPException(status_code=400, detail="Template with this key already exists")
    
    template = {
        'id': str(uuid.uuid4()),
        'key': template_key,
        'name': data.get('name'),
        'type': data.get('type', 'transactional'),
        'subject': data.get('subject'),
        'html_content': data.get('html_content', ''),
        'text_content': data.get('text_content', ''),
        'variables': data.get('variables', []),
        'is_active': True,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': admin_user.get('email')
    }
    
    await db.email_templates.insert_one(template)
    
    return {'message': 'Template created', 'template': {k: v for k, v in template.items() if k != '_id'}}


@router.put("/admin/email/templates/{template_key}")
async def update_email_template(template_key: str, data: Dict[str, Any], admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Update email template"""
    await db.email_templates.update_one(
        {'key': template_key},
        {'$set': {
            'name': data.get('name'),
            'subject': data.get('subject'),
            'html_content': data.get('html_content'),
            'text_content': data.get('text_content', ''),
            'variables': data.get('variables', []),
            'is_active': data.get('is_active', True),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': admin_user.get('email')
        }},
        upsert=True
    )
    
    return {'message': 'Template updated'}


@router.delete("/admin/email/templates/{template_key}")
async def delete_email_template(template_key: str, request: Request):
    """Super Admin: Delete email template"""
    await get_super_admin_user(request)
    
    if template_key in DEFAULT_EMAIL_TEMPLATES:
        raise HTTPException(status_code=400, detail="Cannot delete default templates")
    
    await db.email_templates.delete_one({'key': template_key})
    
    return {'message': 'Template deleted'}


# ==================== EMAIL SUBSCRIBERS API ====================

@router.get("/admin/email/subscribers")
async def get_email_subscribers(
    page: int = 1,
    limit: int = 50,
    search: str = "",
    subscribed_only: bool = True,
    admin_user: Dict = Depends(lambda: get_admin_user)
):
    """Admin: Get email subscribers"""
    query = {}
    if subscribed_only:
        query['is_subscribed'] = True
    if search:
        query['$or'] = [
            {'email': {'$regex': search, '$options': 'i'}},
            {'name': {'$regex': search, '$options': 'i'}}
        ]
    
    skip = (page - 1) * limit
    
    subscribers = await db.email_subscribers.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    total = await db.email_subscribers.count_documents(query)
    
    return {
        'subscribers': subscribers,
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    }


@router.post("/admin/email/subscribers")
async def add_email_subscriber(data: Dict[str, Any], admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Manually add subscriber"""
    email_service = get_email_service()
    email = data.get('email', '').lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    subscriber_id = await email_service.add_subscriber(
        email=email,
        name=data.get('name', ''),
        phone=data.get('phone', ''),
        source='manual_admin'
    )
    
    return {'message': 'Subscriber added', 'id': subscriber_id}


@router.patch("/admin/email/subscribers/{subscriber_id}")
async def update_subscriber(subscriber_id: str, data: Dict[str, Any], admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Update subscriber"""
    await db.email_subscribers.update_one(
        {'id': subscriber_id},
        {'$set': {
            'name': data.get('name'),
            'is_subscribed': data.get('is_subscribed', True),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {'message': 'Subscriber updated'}


@router.delete("/admin/email/subscribers/{subscriber_id}")
async def delete_subscriber(subscriber_id: str, admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Delete subscriber"""
    await db.email_subscribers.delete_one({'id': subscriber_id})
    return {'message': 'Subscriber deleted'}


@router.get("/admin/email/subscribers/export")
async def export_subscribers(admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Export subscribers as CSV"""
    subscribers = await db.email_subscribers.find({'is_subscribed': True}, {'_id': 0}).to_list(10000)
    
    csv_content = "Email,Name,Phone,Source,Created At\n"
    for sub in subscribers:
        sources = ','.join(sub.get('sources', []))
        csv_content += f"{sub.get('email')},{sub.get('name','')},{sub.get('phone','')},{sources},{sub.get('created_at','')}\n"
    
    return Response(
        content=csv_content,
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=subscribers.csv'}
    )


# ==================== EMAIL CAMPAIGNS API ====================

@router.get("/admin/email/campaigns")
async def get_email_campaigns(
    status: Optional[str] = None,
    admin_user: Dict = Depends(lambda: get_admin_user)
):
    """Admin: Get email campaigns"""
    query = {}
    if status:
        query['status'] = status
    
    campaigns = await db.email_campaigns.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    return {'campaigns': campaigns}


@router.post("/admin/email/campaigns")
async def create_email_campaign(data: Dict[str, Any], admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Create email campaign"""
    campaign = {
        'id': str(uuid.uuid4()),
        'title': data.get('title'),
        'subject': data.get('subject'),
        'template_key': data.get('template_key'),
        'html_content': data.get('html_content', ''),
        'audience': data.get('audience', 'all'),
        'scheduled_time': data.get('scheduled_time'),
        'status': 'draft',
        'sent_count': 0,
        'failed_count': 0,
        'opened_count': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': admin_user.get('email')
    }
    
    await db.email_campaigns.insert_one(campaign)
    
    return {'message': 'Campaign created', 'campaign': {k: v for k, v in campaign.items() if k != '_id'}}


@router.put("/admin/email/campaigns/{campaign_id}")
async def update_email_campaign(campaign_id: str, data: Dict[str, Any], admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Update campaign"""
    campaign = await db.email_campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get('status') == 'sent':
        raise HTTPException(status_code=400, detail="Cannot edit sent campaign")
    
    await db.email_campaigns.update_one(
        {'id': campaign_id},
        {'$set': {
            'title': data.get('title', campaign.get('title')),
            'subject': data.get('subject', campaign.get('subject')),
            'html_content': data.get('html_content', campaign.get('html_content')),
            'audience': data.get('audience', campaign.get('audience')),
            'scheduled_time': data.get('scheduled_time'),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {'message': 'Campaign updated'}


@router.post("/admin/email/campaigns/{campaign_id}/send")
async def send_email_campaign(campaign_id: str, admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Send campaign immediately"""
    email_service = get_email_service()
    
    campaign = await db.email_campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get('status') == 'sent':
        raise HTTPException(status_code=400, detail="Campaign already sent")
    
    query = {'is_subscribed': True}
    subscribers = await db.email_subscribers.find(query, {'_id': 0}).to_list(10000)
    
    if not subscribers:
        raise HTTPException(status_code=400, detail="No subscribers to send to")
    
    await db.email_campaigns.update_one(
        {'id': campaign_id},
        {'$set': {
            'status': 'sending',
            'started_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    sent_count = 0
    failed_count = 0
    
    for subscriber in subscribers:
        variables = {
            'name': subscriber.get('name', 'Valued Customer'),
            'email': subscriber.get('email'),
            'subject_line': campaign.get('subject'),
            'content': campaign.get('html_content', '')
        }
        
        if campaign.get('template_key'):
            subject, html_content = await email_service.render_email_template(campaign['template_key'], variables)
        else:
            subject = campaign.get('subject')
            html_content = campaign.get('html_content', '')
            for key, value in variables.items():
                html_content = html_content.replace('{{' + key + '}}', str(value) if value else '')
                subject = subject.replace('{{' + key + '}}', str(value) if value else '')
        
        success = await email_service.send_email_with_logging(
            to_email=subscriber['email'],
            subject=subject,
            html_content=html_content,
            campaign_id=campaign_id
        )
        
        if success:
            sent_count += 1
        else:
            failed_count += 1
    
    await db.email_campaigns.update_one(
        {'id': campaign_id},
        {'$set': {
            'status': 'sent',
            'sent_count': sent_count,
            'failed_count': failed_count,
            'completed_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        'message': f'Campaign sent to {sent_count} subscribers',
        'sent_count': sent_count,
        'failed_count': failed_count
    }


@router.delete("/admin/email/campaigns/{campaign_id}")
async def delete_email_campaign(campaign_id: str, admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Delete campaign"""
    await db.email_campaigns.delete_one({'id': campaign_id})
    return {'message': 'Campaign deleted'}


# ==================== EMAIL LOGS & ANALYTICS API ====================

@router.get("/admin/email/logs")
async def get_email_logs(
    page: int = 1,
    limit: int = 50,
    status: Optional[str] = None,
    campaign_id: Optional[str] = None,
    admin_user: Dict = Depends(lambda: get_admin_user)
):
    """Admin: Get email logs"""
    query = {}
    if status:
        query['status'] = status
    if campaign_id:
        query['campaign_id'] = campaign_id
    
    skip = (page - 1) * limit
    
    logs = await db.email_logs.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    total = await db.email_logs.count_documents(query)
    
    return {
        'logs': logs,
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    }


@router.get("/admin/email/analytics")
async def get_email_analytics(admin_user: Dict = Depends(lambda: get_admin_user)):
    """Admin: Get email analytics"""
    total_sent = await db.email_logs.count_documents({'status': 'sent'})
    total_mocked = await db.email_logs.count_documents({'status': 'mocked'})
    total_failed = await db.email_logs.count_documents({'status': 'failed'})
    total_opened = await db.email_logs.count_documents({'opened': True})
    
    total_subscribers = await db.email_subscribers.count_documents({'is_subscribed': True})
    total_unsubscribed = await db.email_subscribers.count_documents({'is_subscribed': False})
    
    total_campaigns = await db.email_campaigns.count_documents({})
    sent_campaigns = await db.email_campaigns.count_documents({'status': 'sent'})
    
    return {
        'emails': {
            'total_sent': total_sent + total_mocked,
            'actual_sent': total_sent,
            'mocked': total_mocked,
            'failed': total_failed,
            'opened': total_opened,
            'open_rate': round((total_opened / (total_sent or 1)) * 100, 1)
        },
        'subscribers': {
            'total': total_subscribers,
            'unsubscribed': total_unsubscribed
        },
        'campaigns': {
            'total': total_campaigns,
            'sent': sent_campaigns
        }
    }


# ==================== PUBLIC EMAIL ENDPOINTS ====================

@router.get("/email/track/{log_id}")
async def track_email_open(log_id: str):
    """Track email open via 1x1 pixel"""
    import base64
    await db.email_logs.update_one(
        {'id': log_id},
        {'$set': {'opened': True, 'opened_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    gif_bytes = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
    return Response(content=gif_bytes, media_type='image/gif')


@router.get("/unsubscribe")
async def unsubscribe_page(email: str = ""):
    """Public: Unsubscribe page"""
    return Response(
        content=f'''
<!DOCTYPE html>
<html>
<head><title>Unsubscribe</title></head>
<body style="font-family: Arial; max-width: 400px; margin: 50px auto; text-align: center;">
<h2>Unsubscribe</h2>
<p>Are you sure you want to unsubscribe <strong>{email}</strong>?</p>
<form action="/api/unsubscribe" method="POST">
<input type="hidden" name="email" value="{email}">
<button type="submit" style="background: #D90429; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Unsubscribe</button>
</form>
</body>
</html>
''',
        media_type='text/html'
    )


@router.post("/unsubscribe")
async def process_unsubscribe(email: str = Form(...)):
    """Public: Process unsubscribe"""
    await db.email_subscribers.update_one(
        {'email': email.lower()},
        {'$set': {'is_subscribed': False, 'unsubscribed_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return Response(
        content='''
<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title></head>
<body style="font-family: Arial; max-width: 400px; margin: 50px auto; text-align: center;">
<h2>✓ Unsubscribed</h2>
<p>You have been successfully unsubscribed from our mailing list.</p>
</body>
</html>
''',
        media_type='text/html'
    )


@router.post("/newsletter/subscribe")
async def newsletter_subscribe(data: Dict[str, Any]):
    """Public: Newsletter signup"""
    email_service = get_email_service()
    email = data.get('email', '').lower().strip()
    name = data.get('name', '')
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    subscriber_id = await email_service.add_subscriber(email=email, name=name, source='newsletter')
    
    await email_service.send_templated_email(email, 'welcome', {'name': name or 'there', 'email': email})
    
    return {'message': 'Successfully subscribed!', 'id': subscriber_id}
