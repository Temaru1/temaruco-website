"""Email Service Module - Handles all email-related functionality"""
import os
import uuid
import base64
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

# Environment variables
EMAIL_MOCK = os.environ.get('EMAIL_MOCK', 'true').lower() == 'true'
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@temaruco.com')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')


def get_encryption_key():
    """Get or create encryption key for SMTP passwords"""
    key = os.environ.get('EMAIL_ENCRYPTION_KEY')
    if not key:
        secret = os.environ.get('JWT_SECRET_KEY', 'temaruco-default-secret-key-2024')
        key = base64.urlsafe_b64encode(secret.encode()[:32].ljust(32, b'0'))
    return key


def encrypt_password(password: str) -> str:
    """Encrypt SMTP password for storage"""
    if not password:
        return ""
    f = Fernet(get_encryption_key())
    return f.encrypt(password.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    """Decrypt SMTP password for use"""
    if not encrypted:
        return ""
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted


# Default email templates
DEFAULT_EMAIL_TEMPLATES = {
    'welcome': {
        'name': 'Welcome Email',
        'type': 'transactional',
        'subject': 'Welcome to {{company_name}}!',
        'variables': ['name', 'email', 'company_name'],
        'html_content': '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: #D90429; padding: 20px; text-align: center;">
<h1 style="color: white; margin: 0;">Welcome to {{company_name}}!</h1>
</div>
<div style="padding: 30px; background: #f9f9f9;">
<p>Hi {{name}},</p>
<p>Thank you for joining us! We're excited to have you as part of our community.</p>
<p>You can now:</p>
<ul>
<li>Browse our products and place orders</li>
<li>Track your orders in real-time</li>
<li>Get exclusive deals and promotions</li>
</ul>
<p>If you have any questions, feel free to reach out to us.</p>
<p>Best regards,<br>The {{company_name}} Team</p>
</div>
<div style="background: #18181b; color: #888; padding: 20px; text-align: center; font-size: 12px;">
<p>© 2024 {{company_name}}. All rights reserved.</p>
<p><a href="{{unsubscribe_url}}" style="color: #888;">Unsubscribe</a></p>
</div>
</body>
</html>'''
    },
    'order_confirmation': {
        'name': 'Order Confirmation',
        'type': 'transactional',
        'subject': 'Order Confirmed - #{{order_id}}',
        'variables': ['name', 'order_id', 'total_amount', 'items', 'company_name'],
        'html_content': '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: #D90429; padding: 20px; text-align: center;">
<h1 style="color: white; margin: 0;">Order Confirmed!</h1>
</div>
<div style="padding: 30px; background: #f9f9f9;">
<p>Hi {{name}},</p>
<p>Thank you for your order! We've received your order and are processing it.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<h3 style="margin-top: 0;">Order Details</h3>
<p><strong>Order ID:</strong> {{order_id}}</p>
<p><strong>Total Amount:</strong> ₦{{total_amount}}</p>
{{items}}
</div>
<p>You can track your order status anytime by visiting our website.</p>
<p>Best regards,<br>The {{company_name}} Team</p>
</div>
</body>
</html>'''
    },
    'password_reset': {
        'name': 'Password Reset',
        'type': 'transactional',
        'subject': 'Reset Your Password - {{company_name}}',
        'variables': ['name', 'reset_link', 'company_name'],
        'html_content': '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: #D90429; padding: 20px; text-align: center;">
<h1 style="color: white; margin: 0;">Password Reset</h1>
</div>
<div style="padding: 30px; background: #f9f9f9;">
<p>Hi {{name}},</p>
<p>We received a request to reset your password. Click the button below to create a new password:</p>
<div style="text-align: center; margin: 30px 0;">
<a href="{{reset_link}}" style="background: #D90429; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
</div>
<p>If you didn't request this, please ignore this email. This link expires in 1 hour.</p>
<p>Best regards,<br>The {{company_name}} Team</p>
</div>
</body>
</html>'''
    },
    'quote_reminder': {
        'name': 'Quote Reminder',
        'type': 'transactional',
        'subject': 'Your Quote is Waiting - {{company_name}}',
        'variables': ['name', 'quote_id', 'total_amount', 'company_name'],
        'html_content': '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: #D90429; padding: 20px; text-align: center;">
<h1 style="color: white; margin: 0;">Your Quote is Ready!</h1>
</div>
<div style="padding: 30px; background: #f9f9f9;">
<p>Hi {{name}},</p>
<p>Just a friendly reminder that you have a pending quote waiting for you.</p>
<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
<p><strong>Quote ID:</strong> {{quote_id}}</p>
<p><strong>Total Amount:</strong> ₦{{total_amount}}</p>
</div>
<p>Ready to proceed? Visit our website to complete your order.</p>
<p>Best regards,<br>The {{company_name}} Team</p>
</div>
</body>
</html>'''
    },
    'newsletter': {
        'name': 'Newsletter Template',
        'type': 'marketing',
        'subject': '{{subject_line}}',
        'variables': ['name', 'subject_line', 'content', 'company_name', 'unsubscribe_url'],
        'html_content': '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: #D90429; padding: 20px; text-align: center;">
<h1 style="color: white; margin: 0;">{{company_name}}</h1>
</div>
<div style="padding: 30px; background: #f9f9f9;">
<p>Hi {{name}},</p>
{{content}}
<p>Best regards,<br>The {{company_name}} Team</p>
</div>
<div style="background: #18181b; color: #888; padding: 20px; text-align: center; font-size: 12px;">
<p>© 2024 {{company_name}}. All rights reserved.</p>
<p><a href="{{unsubscribe_url}}" style="color: #888;">Unsubscribe</a></p>
</div>
</body>
</html>'''
    },
    'promotional': {
        'name': 'Promotional Email',
        'type': 'marketing',
        'subject': '{{promo_title}} - {{company_name}}',
        'variables': ['name', 'promo_title', 'promo_description', 'promo_code', 'discount', 'company_name', 'unsubscribe_url'],
        'html_content': '''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<div style="background: #D90429; padding: 30px; text-align: center;">
<h1 style="color: white; margin: 0; font-size: 28px;">{{promo_title}}</h1>
<p style="color: white; font-size: 48px; margin: 20px 0; font-weight: bold;">{{discount}}% OFF</p>
</div>
<div style="padding: 30px; background: #f9f9f9; text-align: center;">
<p>Hi {{name}},</p>
<p>{{promo_description}}</p>
<div style="background: #18181b; color: white; padding: 15px 30px; display: inline-block; border-radius: 8px; margin: 20px 0;">
<p style="margin: 0; font-size: 12px;">USE CODE</p>
<p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{promo_code}}</p>
</div>
<p><a href="#" style="background: #D90429; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Shop Now</a></p>
</div>
<div style="background: #18181b; color: #888; padding: 20px; text-align: center; font-size: 12px;">
<p>© 2024 {{company_name}}. All rights reserved.</p>
<p><a href="{{unsubscribe_url}}" style="color: #888;">Unsubscribe</a></p>
</div>
</body>
</html>'''
    }
}


class EmailService:
    """Email service class for handling all email operations"""
    
    def __init__(self, db):
        self.db = db
        self.email_queue = []
    
    async def get_email_settings(self) -> Dict[str, Any]:
        """Get SMTP settings from database, fallback to env vars"""
        settings = await self.db.email_settings.find_one({'is_active': True}, {'_id': 0})
        
        if settings:
            if settings.get('smtp_password'):
                settings['smtp_password'] = decrypt_password(settings['smtp_password'])
            return settings
        
        return {
            'smtp_host': SMTP_HOST,
            'smtp_port': SMTP_PORT,
            'smtp_username': SMTP_USER,
            'smtp_password': SMTP_PASSWORD,
            'from_email': FROM_EMAIL,
            'from_name': os.environ.get('FROM_NAME', 'Temaruco'),
            'reply_to': os.environ.get('REPLY_TO', ''),
            'is_active': True
        }
    
    async def render_email_template(self, template_key: str, variables: Dict[str, Any]) -> tuple:
        """Render email template with variables"""
        # Add default variables
        variables.setdefault('company_name', 'Temaruco')
        variables.setdefault('unsubscribe_url', f"{FRONTEND_URL}/api/unsubscribe?email={variables.get('email', '')}")
        
        # Get template from DB or defaults
        template = await self.db.email_templates.find_one({'key': template_key}, {'_id': 0})
        
        if not template and template_key in DEFAULT_EMAIL_TEMPLATES:
            template = DEFAULT_EMAIL_TEMPLATES[template_key]
        
        if not template:
            return (f"Email from Temaruco", f"<p>{variables.get('content', '')}</p>")
        
        subject = template.get('subject', '')
        html_content = template.get('html_content', '')
        
        # Replace variables
        for key, value in variables.items():
            placeholder = '{{' + key + '}}'
            subject = subject.replace(placeholder, str(value) if value else '')
            html_content = html_content.replace(placeholder, str(value) if value else '')
        
        return (subject, html_content)
    
    async def send_email_with_logging(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        template_id: str = None,
        campaign_id: str = None
    ) -> bool:
        """Send email and log result"""
        log_id = str(uuid.uuid4())
        settings = await self.get_email_settings()
        
        log_entry = {
            'id': log_id,
            'recipient_email': to_email,
            'subject': subject,
            'template_id': template_id,
            'campaign_id': campaign_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'opened': False
        }
        
        # Add tracking pixel
        tracking_url = f"{FRONTEND_URL}/api/email/track/{log_id}"
        html_with_tracking = html_content + f'<img src="{tracking_url}" width="1" height="1" style="display:none;" />'
        
        if EMAIL_MOCK:
            log_entry['status'] = 'mocked'
            logger.info(f"[EMAIL MOCK] Would send to {to_email}: {subject}")
            await self.db.email_logs.insert_one(log_entry)
            return True
        
        if not settings.get('smtp_username') or not settings.get('smtp_password'):
            log_entry['status'] = 'failed'
            log_entry['error'] = 'SMTP not configured'
            await self.db.email_logs.insert_one(log_entry)
            return False
        
        try:
            import aiosmtplib
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.get('from_name', 'Temaruco')} <{settings.get('from_email', settings['smtp_username'])}>"
            msg['To'] = to_email
            
            if settings.get('reply_to'):
                msg['Reply-To'] = settings['reply_to']
            
            msg.attach(MIMEText(html_with_tracking, 'html'))
            
            await aiosmtplib.send(
                msg,
                hostname=settings['smtp_host'],
                port=settings['smtp_port'],
                username=settings['smtp_username'],
                password=settings['smtp_password'],
                start_tls=True
            )
            
            log_entry['status'] = 'sent'
            logger.info(f"[EMAIL] Sent to {to_email}: {subject}")
            
        except Exception as e:
            log_entry['status'] = 'failed'
            log_entry['error'] = str(e)
            logger.error(f"[EMAIL ERROR] Failed to send to {to_email}: {str(e)}")
        
        await self.db.email_logs.insert_one(log_entry)
        return log_entry['status'] == 'sent'
    
    async def send_templated_email(self, to_email: str, template_key: str, variables: Dict[str, Any]) -> bool:
        """Send email using a template"""
        subject, html_content = await self.render_email_template(template_key, variables)
        return await self.send_email_with_logging(to_email, subject, html_content, template_id=template_key)
    
    async def add_subscriber(
        self,
        email: str,
        name: str = '',
        phone: str = '',
        source: str = 'website'
    ) -> str:
        """Add or update email subscriber"""
        email = email.lower().strip()
        existing = await self.db.email_subscribers.find_one({'email': email})
        
        if existing:
            await self.db.email_subscribers.update_one(
                {'email': email},
                {
                    '$set': {'is_subscribed': True, 'updated_at': datetime.now(timezone.utc).isoformat()},
                    '$addToSet': {'sources': source}
                }
            )
            return existing.get('id')
        
        subscriber_id = str(uuid.uuid4())
        await self.db.email_subscribers.insert_one({
            'id': subscriber_id,
            'email': email,
            'name': name,
            'phone': phone,
            'sources': [source],
            'is_subscribed': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        return subscriber_id
    
    async def process_email_queue(self):
        """Process queued emails with rate limiting"""
        while self.email_queue:
            email_data = self.email_queue.pop(0)
            await self.send_email_with_logging(**email_data)
            await asyncio.sleep(1)


def get_order_confirmation_email(order_id: str, customer_name: str, total_amount: float, order_type: str, items: list = None):
    """Generate professional order confirmation email HTML"""
    items_html = ""
    if items:
        items_rows = ""
        for item in items:
            items_rows += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{item.get('name', item.get('description', 'Item'))}</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">{item.get('quantity', 1)}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₦{item.get('price', item.get('unit_price', 0)):,.0f}</td>
            </tr>
            """
        items_html = f"""
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background: #f4f4f5;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #52525b;">Item</th>
                    <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #52525b;">Qty</th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #52525b;">Price</th>
                </tr>
            </thead>
            <tbody>{items_rows}</tbody>
        </table>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Temaruco</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #D90429 0%, #b8031f 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Order Confirmed!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Thank you for your purchase</p>
            </div>
            <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <p style="color: #52525b; font-size: 16px; line-height: 1.6;">Hi {customer_name},</p>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6;">Your order has been confirmed and is being processed.</p>
                <div style="background: #fafafa; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e4e4e7;">
                    <p style="margin: 0 0 8px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</p>
                    <p style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600; font-family: monospace;">{order_id}</p>
                    <p style="margin: 0 0 8px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Type</p>
                    <p style="margin: 0 0 16px 0; color: #18181b; font-size: 16px; font-weight: 500;">{order_type.title()}</p>
                    <p style="margin: 0 0 8px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount</p>
                    <p style="margin: 0; color: #D90429; font-size: 24px; font-weight: 700;">₦{total_amount:,.0f}</p>
                </div>
                {items_html}
                <div style="text-align: center; margin-top: 32px;">
                    <a href="{FRONTEND_URL}/track?id={order_id}" style="background: #D90429; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Track Your Order</a>
                </div>
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-top: 32px; text-align: center;">Questions? Reply to this email or contact us at temarucoltd@gmail.com</p>
            </div>
            <div style="text-align: center; padding: 24px; color: #a1a1aa; font-size: 12px;">
                <p style="margin: 0;">© 2024 Temaruco. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
