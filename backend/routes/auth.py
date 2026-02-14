"""Authentication routes"""
from fastapi import APIRouter, HTTPException, Response, Request
from datetime import datetime, timezone
import uuid

from ..core import get_db, hash_password, verify_password, create_token, get_current_user
from ..models import UserRegister, UserLogin

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register(user: UserRegister):
    """Register a new user"""
    db = get_db()
    
    # Check if email exists
    existing = await db.users.find_one({'email': user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'user_id': user_id,
        'name': user.name,
        'email': user.email,
        'password': hash_password(user.password),
        'phone': user.phone,
        'is_admin': False,
        'is_super_admin': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate token
    token = create_token(user_id, user.email)
    
    return {
        'message': 'Registration successful',
        'token': token,
        'user': {
            'id': user_id,
            'name': user.name,
            'email': user.email,
            'is_admin': False
        }
    }

@router.post("/login")
async def login(credentials: UserLogin, response: Response):
    """Login user"""
    db = get_db()
    
    user = await db.users.find_one({'email': credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user.get('id') or user.get('user_id')
    
    # Create session
    session_id = str(uuid.uuid4())
    await db.user_sessions.insert_one({
        'session_id': session_id,
        'user_id': user_id,
        'email': user['email'],
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    # Set session cookie
    response.set_cookie(
        key='session_id',
        value=session_id,
        httponly=True,
        secure=True,
        samesite='none',
        max_age=86400 * 7
    )
    
    # Generate token
    token = create_token(
        user_id,
        user['email'],
        user.get('is_admin', False),
        user.get('is_super_admin', False)
    )
    
    return {
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user_id,
            'name': user['name'],
            'email': user['email'],
            'is_admin': user.get('is_admin', False),
            'is_super_admin': user.get('is_super_admin', False)
        }
    }

@router.get("/me")
async def get_me(request: Request):
    """Get current user info"""
    user = await get_current_user(request)
    return user

@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    db = get_db()
    session_id = request.cookies.get('session_id')
    
    if session_id:
        await db.user_sessions.delete_one({'session_id': session_id})
    
    response.delete_cookie(key='session_id')
    
    return {'message': 'Logged out successfully'}
