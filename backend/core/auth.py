"""Authentication utilities"""
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request
from .config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from .database import get_db

def hash_password(password: str) -> str:
    """Hash a password"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, is_admin: bool = False, is_super_admin: bool = False) -> str:
    """Create a JWT token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'is_admin': is_admin,
        'is_super_admin': is_super_admin,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> dict:
    """Get current user from request (cookie or header)"""
    db = get_db()
    
    # Try cookie-based session first
    session_id = request.cookies.get('session_id')
    if session_id:
        session = await db.user_sessions.find_one({'session_id': session_id})
        if session:
            user = await db.users.find_one({'email': session['email']}, {'_id': 0, 'password': 0})
            if user:
                return user
    
    # Try token-based auth
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        user = await db.users.find_one(
            {'$or': [{'id': payload['user_id']}, {'user_id': payload['user_id']}]},
            {'_id': 0, 'password': 0}
        )
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Not authenticated")

async def get_admin_user(request: Request) -> dict:
    """Get current admin user"""
    user = await get_current_user(request)
    if not user.get('is_admin') and not user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_super_admin_user(request: Request) -> dict:
    """Get current super admin user"""
    user = await get_current_user(request)
    if not user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user
