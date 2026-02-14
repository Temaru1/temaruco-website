"""Core configuration and environment variables"""
import os
from dotenv import load_dotenv

load_dotenv()

# Database
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'temaruco_db')

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'temaruco-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Payment providers
PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY')
PAYSTACK_PUBLIC_KEY = os.environ.get('PAYSTACK_PUBLIC_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Email
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
FROM_EMAIL = os.environ.get('FROM_EMAIL')

# Frontend
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
