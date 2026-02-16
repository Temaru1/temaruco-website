"""Services module - exports all service classes"""
from .email_service import (
    EmailService,
    DEFAULT_EMAIL_TEMPLATES,
    encrypt_password,
    decrypt_password,
    get_order_confirmation_email
)
