from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends, status, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any, Set
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
from enum import Enum
import shutil
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pythonjsonlogger import jsonlogger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import json
# Flutterwave Configuration (replaces Stripe/Paystack)
# Flutterwave routes are in routes/payments.py

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure structured logging
LOG_DIR = Path('/var/log/temaruco')
LOG_DIR.mkdir(exist_ok=True, parents=True)

# Setup JSON logger
logHandler = logging.FileHandler(LOG_DIR / 'app.log')
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logHandler.setFormatter(formatter)

# Setup console logger for development
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))

# Configure root logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(logHandler)
logger.addHandler(console_handler)

# Create specific loggers
auth_logger = logging.getLogger('auth')
order_logger = logging.getLogger('orders')
payment_logger = logging.getLogger('payments')
security_logger = logging.getLogger('security')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']

# Configure MongoDB client with Atlas-compatible options
client_options = {
    'serverSelectionTimeoutMS': 5000,  # 5 second timeout
    'connectTimeoutMS': 10000,  # 10 second connection timeout
    'socketTimeoutMS': 45000,  # 45 second socket timeout
    'maxPoolSize': 50,  # Connection pool size
    'minPoolSize': 10,
    'retryWrites': True,  # Enable retryable writes
    'retryReads': True,  # Enable retryable reads
}

# Add SSL/TLS settings for Atlas (if not in connection string)
if 'mongodb+srv://' in mongo_url or 'ssl=true' in mongo_url.lower():
    # Atlas connection or SSL enabled
    client_options['tls'] = True
    client_options['tlsAllowInvalidCertificates'] = False  # Enforce certificate validation

client = AsyncIOMotorClient(mongo_url, **client_options)
db = client[os.environ['DB_NAME']]

# Database operation wrapper for better error handling
async def safe_db_operation(operation, *args, **kwargs):
    """Wrapper for database operations with retry logic"""
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            return await operation(*args, **kwargs)
        except Exception as e:
            logger.error(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay * (attempt + 1))
            else:
                raise
    
    return None

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Flutterwave Configuration
FLUTTERWAVE_SECRET_KEY = os.environ.get('FLUTTERWAVE_SECRET_KEY')
FLUTTERWAVE_PUBLIC_KEY = os.environ.get('FLUTTERWAVE_PUBLIC_KEY')
PAYMENT_MOCK = os.environ.get('PAYMENT_MOCK', 'false').lower() == 'true'

# Email Mock Configuration
EMAIL_MOCK = os.environ.get('EMAIL_MOCK', 'true').lower() == 'true'

# File upload configuration
UPLOAD_DIR = Path('/app/backend/uploads')
UPLOAD_DIR.mkdir(exist_ok=True)

# POD Design directories
POD_DESIGNS_DIR = UPLOAD_DIR / 'designs'
POD_ORIGINALS_DIR = POD_DESIGNS_DIR / 'original'
POD_MOCKUPS_DIR = POD_DESIGNS_DIR / 'mockups'
POD_ORIGINALS_DIR.mkdir(exist_ok=True, parents=True)
POD_MOCKUPS_DIR.mkdir(exist_ok=True, parents=True)

# Print size configurations (in pixels for digital, actual dimensions for print)
PRINT_SIZES = {
    'badge': {'width': 120, 'height': 120, 'label': 'Badge (80-120px)', 'scale_factor': 0.15},
    'a4': {'width': 2480, 'height': 3508, 'label': 'A4 (2480×3508px)', 'scale_factor': 0.5},
    'a3': {'width': 3508, 'height': 4961, 'label': 'A3 (3508×4961px)', 'scale_factor': 0.7},
    'a2': {'width': 4961, 'height': 7016, 'label': 'A2 (4961×7016px)', 'scale_factor': 1.0}
}

# File upload security settings
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.txt'}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

# Security
security = HTTPBearer()

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)

# Create the main app
app = FastAPI(title="Temaruco Clothing Factory API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")

# ==================== WEBSOCKET CONNECTION MANAGER ====================
class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # user_id -> websocket
        self.admin_connections: Set[WebSocket] = set()  # All admin connections
    
    async def connect(self, websocket: WebSocket, user_id: str, is_admin: bool = False):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        if is_admin:
            self.admin_connections.add(websocket)
        logger.info(f"WebSocket connected: {user_id}, is_admin: {is_admin}")
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            ws = self.active_connections.pop(user_id)
            self.admin_connections.discard(ws)
            logger.info(f"WebSocket disconnected: {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to {user_id}: {e}")
    
    async def broadcast_to_admins(self, message: dict):
        """Send message to all connected admin users"""
        disconnected = []
        for connection in self.admin_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to admin: {e}")
                disconnected.append(connection)
        # Clean up disconnected sockets
        for conn in disconnected:
            self.admin_connections.discard(conn)

ws_manager = ConnectionManager()

# Helper function to broadcast notification to admins
async def broadcast_admin_notification(notification_type: str, title: str, message: str, data: dict = None):
    """Create notification in DB and broadcast to connected admins"""
    notification = {
        'id': str(uuid.uuid4()),
        'type': notification_type,
        'title': title,
        'message': message,
        'data': data or {},
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Broadcast to connected admins
    await ws_manager.broadcast_to_admins({
        'event': 'notification',
        'notification': {k: v for k, v in notification.items() if k != '_id'}
    })
    
    return notification

# Helper function to create notifications
async def create_notification(notification_type: str, title: str, message: str, order_id: str = None):
    """Create a notification for admins"""
    try:
        notification = {
            'id': str(uuid.uuid4()),
            'type': notification_type,
            'title': title,
            'message': message,
            'order_id': order_id,  # Add order_id for direct navigation
            'read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        
        # Also broadcast via WebSocket
        await ws_manager.broadcast_to_admins({
            'event': 'notification',
            'notification': {k: v for k, v in notification.items() if k != '_id'}
        })
    except Exception as e:
        print(f"Failed to create notification: {e}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class OrderStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"
    PAYMENT_SUBMITTED = "payment_submitted"
    PAYMENT_VERIFIED = "payment_verified"
    IN_PRODUCTION = "in_production"
    READY_FOR_DELIVERY = "ready_for_delivery"
    COMPLETED = "completed"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class OrderType(str, Enum):
    BULK = "bulk"
    POD = "pod"
    BOUTIQUE = "boutique"
    FABRIC = "fabric"
    SOUVENIR = "souvenir"

class PrintType(str, Enum):
    NONE = "none"
    FRONT = "front"
    FRONT_BACK = "front_back"
    EMBROIDERY = "embroidery"

class FabricQuality(str, Enum):
    STANDARD = "standard"
    PREMIUM = "premium"
    LUXURY = "luxury"

# ==================== MODELS ====================
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

class UserLogin(BaseModel):
    email: str  # Can be email OR username
    password: str

class User(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    is_verified: bool = False
    is_admin: bool = False
    created_at: datetime

class QuickQuoteRequest(BaseModel):
    clothing_item: str
    quantity: int
    print_type: PrintType
    fabric_quality: Optional[str] = "Standard"

class QuickQuoteResponse(BaseModel):
    estimated_price: float
    estimated_days: int
    breakdown: Dict[str, float]

class BulkOrderCreate(BaseModel):
    clothing_item: str
    quantity: int
    size_breakdown: Dict[str, int]
    print_type: PrintType
    fabric_quality: str
    notes: Optional[str] = None

class PODOrderCreate(BaseModel):
    items: List[Dict]  # Array of items with their variations
    design_position: Optional[Dict[str, float]] = None  # x, y coordinates
    delivery_option: str
    recipient_name: Optional[str] = None
    delivery_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_notes: Optional[str] = None

class BoutiqueProduct(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    sizes: List[str]
    image_url: str
    in_stock: bool = True

class CartItem(BaseModel):
    product_id: str
    quantity: int
    size: str

class PaymentInitializeRequest(BaseModel):
    email: EmailStr
    amount: float
    order_type: OrderType
    order_id: str
    metadata: Optional[Dict[str, Any]] = None

class AdminProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    sizes: List[str]
    image_url: str
    bulk_base_price: Optional[float] = None

class CMSContent(BaseModel):
    key: str
    value: str
    section: str

class ManualQuoteCreate(BaseModel):
    client_name: str
    client_email: str
    client_phone: str
    client_address: Optional[str] = None
    items: List[Dict[str, Any]]
    subtotal: float
    tax: Optional[float] = 0
    discount: Optional[float] = 0
    total: float
    notes: Optional[str] = None
    quote_type: str  # 'quote', 'invoice', 'receipt'

class CustomOrderRequest(BaseModel):
    item_description: str
    quantity: int
    reference_image_url: Optional[str] = None
    specifications: Optional[str] = None
    target_price: Optional[float] = None
    deadline: Optional[str] = None
    notes: Optional[str] = None

class EnquiryQuoteCreate(BaseModel):
    unit_price: float
    total_price: float
    estimated_production_days: Optional[int] = None
    valid_until: Optional[str] = None
    notes_to_client: Optional[str] = None

class EnquiryStatusUpdate(BaseModel):
    status: str

class AdminCreate(BaseModel):
    username: str
    name: str
    password: str

class PaymentProofUpload(BaseModel):
    payment_reference: Optional[str] = None
    notes: Optional[str] = None

class AdminSettings(BaseModel):
    fabric_quality_prices: Dict[str, float]
    bulk_print_costs: Dict[str, float]
    pod_print_costs: Dict[str, float]
    bulk_clothing_items: List[Dict[str, Any]]
    pod_clothing_items: List[Dict[str, Any]]

# ==================== UTILITIES ====================
async def generate_order_id() -> str:
    """Generate unique order ID in format TM-MMYY-DDXXXX"""
    now = datetime.now(timezone.utc)
    month_year = now.strftime('%m%y')  # e.g., "0225" for Feb 2025
    day = now.strftime('%d')  # e.g., "09" for 9th day
    day_key = now.strftime('%Y%m%d')  # e.g., "20250209" for daily counter
    
    # Get or create counter for this specific day
    counter_doc = await db.order_counters.find_one_and_update(
        {'day_key': day_key},
        {'$inc': {'counter': 1}},
        upsert=True,
        return_document=True
    )
    
    counter = counter_doc.get('counter', 1) if counter_doc else 1
    order_number = day + str(counter).zfill(4)  # Day + 4-digit counter
    
    return f"TM-{month_year}-{order_number}"

async def generate_quote_id() -> str:
    """Generate unique quote ID in format QT-MMYY-DDXXXX"""
    now = datetime.now(timezone.utc)
    month_year = now.strftime('%m%y')
    day = now.strftime('%d')
    day_key = now.strftime('%Y%m%d')
    
    counter_doc = await db.quote_counters.find_one_and_update(
        {'day_key': day_key},
        {'$inc': {'counter': 1}},
        upsert=True,
        return_document=True
    )
    
    counter = counter_doc.get('counter', 1) if counter_doc else 1
    quote_number = day + str(counter).zfill(4)
    
    return f"QT-{month_year}-{quote_number}"

async def generate_invoice_id() -> str:
    """Generate unique invoice ID in format INV-MMYY-DDXXXX"""
    now = datetime.now(timezone.utc)
    month_year = now.strftime('%m%y')
    day = now.strftime('%d')
    day_key = now.strftime('%Y%m%d')
    
    counter_doc = await db.invoice_counters.find_one_and_update(
        {'day_key': day_key},
        {'$inc': {'counter': 1}},
        upsert=True,
        return_document=True
    )
    
    counter = counter_doc.get('counter', 1) if counter_doc else 1
    invoice_number = day + str(counter).zfill(4)
    
    return f"INV-{month_year}-{invoice_number}"

async def generate_refund_id() -> str:
    """Generate unique refund ID in format REF-MMYY-DDXXXX"""
    now = datetime.now(timezone.utc)
    month_year = now.strftime('%m%y')
    day = now.strftime('%d')
    day_key = now.strftime('%Y%m%d')
    
    counter_doc = await db.refund_counters.find_one_and_update(
        {'day_key': day_key},
        {'$inc': {'counter': 1}},
        upsert=True,
        return_document=True
    )
    
    counter = counter_doc.get('counter', 1) if counter_doc else 1
    refund_number = day + str(counter).zfill(4)
    
    return f"REF-{month_year}-{refund_number}"

async def generate_procurement_id() -> str:
    """Generate unique procurement ID in format PRC-MMYY-DDXXXX"""
    now = datetime.now(timezone.utc)
    month_year = now.strftime('%m%y')
    day = now.strftime('%d')
    day_key = now.strftime('%Y%m%d')
    
    counter_doc = await db.procurement_counters.find_one_and_update(
        {'day_key': day_key},
        {'$inc': {'counter': 1}},
        upsert=True,
        return_document=True
    )
    
    counter = counter_doc.get('counter', 1) if counter_doc else 1
    procurement_number = day + str(counter).zfill(4)
    
    return f"PRC-{month_year}-{procurement_number}"

async def generate_expense_id() -> str:
    """Generate unique expense ID in format EXP-MMYY-DDXXXX"""
    now = datetime.now(timezone.utc)
    month_year = now.strftime('%m%y')
    day = now.strftime('%d')
    day_key = now.strftime('%Y%m%d')
    
    counter_doc = await db.expense_counters.find_one_and_update(
        {'day_key': day_key},
        {'$inc': {'counter': 1}},
        upsert=True,
        return_document=True
    )
    
    counter = counter_doc.get('counter', 1) if counter_doc else 1
    expense_number = day + str(counter).zfill(4)
    
    return f"EXP-{month_year}-{expense_number}"

async def validate_file_upload(file: UploadFile, allowed_extensions: set = None) -> tuple[bool, str]:
    """Validate uploaded file for security"""
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_EXTENSIONS
    
    # Check if file exists
    if not file:
        return False, "No file provided"
    
    # Check filename
    if not file.filename:
        return False, "Invalid filename"
    
    # Get file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    # Validate extension
    if file_ext not in allowed_extensions:
        return False, f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
    
    # Read file content to check size
    contents = await file.read()
    file_size = len(contents)
    
    # Validate size
    if file_size > MAX_UPLOAD_SIZE:
        return False, f"File too large. Maximum size: {MAX_UPLOAD_SIZE / (1024*1024):.1f}MB"
    
    if file_size == 0:
        return False, "File is empty"
    
    # Reset file position for later reading
    await file.seek(0)
    
    return True, "Valid"

async def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and other attacks"""
    # Remove directory paths
    filename = os.path.basename(filename)
    # Remove dangerous characters
    filename = "".join(c for c in filename if c.isalnum() or c in '._- ')
    # Limit length
    if len(filename) > 100:
        name, ext = os.path.splitext(filename)
        filename = name[:95] + ext
    return filename

async def save_upload_file(file: UploadFile, allowed_extensions: set = None, module: str = "general") -> Dict[str, str]:
    """
    Unified file upload service with comprehensive logging.
    Used by all modules: bulk, pod, fabric, boutique, souvenir
    
    Args:
        file: The uploaded file
        allowed_extensions: Set of allowed file extensions
        module: Module name for logging (bulk, pod, fabric, boutique, souvenir)
    
    Returns:
        Dict with file_name, file_path, original_name, file_size
    """
    logger.info(f"[UPLOAD][{module}] File received: {file.filename}")
    
    # Validate file
    is_valid, message = await validate_file_upload(file, allowed_extensions)
    if not is_valid:
        logger.error(f"[UPLOAD][{module}] Validation failed: {message}")
        raise HTTPException(status_code=400, detail=message)
    
    # Generate secure filename
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1].lower()
    safe_original_name = await sanitize_filename(file.filename)
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    logger.info(f"[UPLOAD][{module}] Generated filename: {filename}")
    logger.info(f"[UPLOAD][{module}] Save path: {file_path}")
    
    # Ensure upload directory exists and is writable
    UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Verify file was saved
        if not file_path.exists():
            logger.error(f"[UPLOAD][{module}] File not found after save: {file_path}")
            raise HTTPException(status_code=500, detail="File save verification failed")
        
        saved_size = file_path.stat().st_size
        logger.info(f"[UPLOAD][{module}] File saved successfully: {filename} ({saved_size} bytes)")
        
    except Exception as e:
        logger.error(f"[UPLOAD][{module}] File save error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save file")
    
    # Generate public URL
    public_url = f"/api/uploads/{filename}"
    logger.info(f"[UPLOAD][{module}] Generated URL: {public_url}")
    
    return {
        'file_name': filename,
        'file_path': public_url,
        'original_name': safe_original_name,
        'file_size': len(contents)
    }

async def generate_enquiry_code() -> str:
    """Generate unique enquiry code in format ENQ-MMYY-DDXXXX"""
    now = datetime.now(timezone.utc)
    month_year = now.strftime('%m%y')  # e.g., "0225" for Feb 2025
    day = now.strftime('%d')  # e.g., "09" for 9th day
    day_key = now.strftime('%Y%m%d')  # e.g., "20250209" for daily counter
    
    # Get or create counter for this specific day
    counter_doc = await db.enquiry_counters.find_one_and_update(
        {'day_key': day_key},
        {'$inc': {'counter': 1}},
        upsert=True,
        return_document=True
    )
    
    counter = counter_doc.get('counter', 1) if counter_doc else 1
    enquiry_number = day + str(counter).zfill(4)  # Day + 4-digit counter
    
    return f"ENQ-{month_year}-{enquiry_number}"

# ==================== UTILITIES ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        # Handle both 'id' and 'user_id' fields for compatibility
        user = await db.users.find_one({'$or': [{'id': user_id}, {'user_id': user_id}]}, {'_id': 0, 'password': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_from_cookie_or_header(request: Request) -> Dict:
    """Get user from session_token cookie OR Authorization header (JWT or session)"""
    # Try cookie first (for Google OAuth sessions)
    session_token = request.cookies.get('session_token')
    
    # Try Authorization header (for JWT tokens or session tokens)
    auth_header = request.headers.get('Authorization')
    
    user_id = None
    
    # If we have a session cookie, use it
    if session_token:
        session_doc = await db.user_sessions.find_one({'session_token': session_token}, {'_id': 0})
        if session_doc:
            # Check expiration
            expires_at = session_doc['expires_at']
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user_id = session_doc['user_id']
    
    # If no valid session from cookie, try Authorization header
    if not user_id and auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        
        # First, try to decode as JWT
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            # If JWT decode fails, try as session token
            session_doc = await db.user_sessions.find_one({'session_token': token}, {'_id': 0})
            if session_doc:
                expires_at = session_doc['expires_at']
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at >= datetime.now(timezone.utc):
                    user_id = session_doc['user_id']
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user (handle both id and user_id fields)
    user = await db.users.find_one(
        {'$or': [{'id': user_id}, {'user_id': user_id}]},
        {'_id': 0, 'password': 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def get_admin_user(request: Request) -> Dict:
    user = await get_current_user_from_cookie_or_header(request)
    if not user.get('is_admin') and not user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_super_admin_user(request: Request) -> Dict:
    user = await get_current_user_from_cookie_or_header(request)
    if not user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

# Permission check helper for RBAC
async def check_permission(request: Request, permission: str) -> Dict:
    """Check if the current user has a specific permission"""
    user = await get_current_user_from_cookie_or_header(request)
    
    # Super admins have all permissions
    if user.get('is_super_admin'):
        return user
    
    # Check if admin
    if not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check specific permission
    role = user.get('role', {})
    if not role.get(permission, False):
        raise HTTPException(status_code=403, detail=f"Permission denied: {permission}")
    
    return user

# Available permissions definition
AVAILABLE_PERMISSIONS = {
    'website_text_cms': {
        'label': 'Website Text CMS',
        'permissions': [
            {'key': 'can_view_site_texts', 'label': 'View Site Texts', 'description': 'View all editable text content'},
            {'key': 'can_edit_site_texts', 'label': 'Edit Site Texts', 'description': 'Modify text content on the website'},
            {'key': 'can_reset_site_texts', 'label': 'Reset Site Texts', 'description': 'Reset texts to default values'},
        ]
    },
    'materials_inventory': {
        'label': 'Materials Inventory',
        'permissions': [
            {'key': 'can_view_materials', 'label': 'View Materials', 'description': 'View materials inventory'},
            {'key': 'can_add_materials', 'label': 'Add Materials', 'description': 'Add new materials to inventory'},
            {'key': 'can_edit_materials', 'label': 'Edit Materials', 'description': 'Edit existing materials'},
            {'key': 'can_delete_materials', 'label': 'Delete Materials', 'description': 'Delete materials from inventory'},
            {'key': 'can_add_material_types', 'label': 'Add Material Types', 'description': 'Create new material categories'},
            {'key': 'can_view_material_history', 'label': 'View History', 'description': 'View quantity change history'},
        ]
    },
    'products': {
        'label': 'Products (Bulk/POD/Boutique/Souvenirs)',
        'permissions': [
            {'key': 'can_view_products', 'label': 'View Products', 'description': 'View all product listings'},
            {'key': 'can_add_products', 'label': 'Add Products', 'description': 'Add new products'},
            {'key': 'can_edit_products', 'label': 'Edit Products', 'description': 'Edit existing products'},
            {'key': 'can_delete_products', 'label': 'Delete Products', 'description': 'Delete products'},
            {'key': 'can_view_designs', 'label': 'View Designs', 'description': 'View customer designs'},
            {'key': 'can_download_designs', 'label': 'Download Designs', 'description': 'Download original/mockup files'},
        ]
    },
    'orders_production': {
        'label': 'Orders & Production',
        'permissions': [
            {'key': 'can_view_orders', 'label': 'View Orders', 'description': 'View all orders'},
            {'key': 'can_manage_orders', 'label': 'Manage Orders', 'description': 'Full order management'},
            {'key': 'can_update_order_status', 'label': 'Update Status', 'description': 'Change order status'},
            {'key': 'can_delete_orders', 'label': 'Delete Orders', 'description': 'Delete orders'},
            {'key': 'can_view_production', 'label': 'View Production', 'description': 'View production queue'},
            {'key': 'can_manage_production', 'label': 'Manage Production', 'description': 'Manage production workflow'},
            {'key': 'can_assign_tailors', 'label': 'Assign Tailors', 'description': 'Assign orders to tailors'},
        ]
    },
    'quotes': {
        'label': 'Quotes & Custom Requests',
        'permissions': [
            {'key': 'can_view_quotes', 'label': 'View Quotes', 'description': 'View all quotes'},
            {'key': 'can_manage_quotes', 'label': 'Manage Quotes', 'description': 'Create and edit quotes'},
            {'key': 'can_view_custom_requests', 'label': 'View Custom Requests', 'description': 'View custom order requests'},
            {'key': 'can_manage_custom_requests', 'label': 'Manage Custom Requests', 'description': 'Handle custom requests'},
        ]
    },
    'clients': {
        'label': 'Clients',
        'permissions': [
            {'key': 'can_view_clients', 'label': 'View Clients', 'description': 'View client information'},
            {'key': 'can_edit_clients', 'label': 'Edit Clients', 'description': 'Edit client details'},
            {'key': 'can_delete_clients', 'label': 'Delete Clients', 'description': 'Delete client records'},
        ]
    },
    'financials': {
        'label': 'Financial',
        'permissions': [
            {'key': 'can_view_financials', 'label': 'View Financials', 'description': 'View financial reports'},
            {'key': 'can_manage_financials', 'label': 'Manage Financials', 'description': 'Manage financial data'},
            {'key': 'can_delete_payments', 'label': 'Delete Payments', 'description': 'Delete payment records'},
            {'key': 'can_view_pricing', 'label': 'View Pricing', 'description': 'View product pricing'},
            {'key': 'can_manage_pricing', 'label': 'Manage Pricing', 'description': 'Modify product pricing'},
        ]
    },
    'inventory_procurement': {
        'label': 'Inventory & Procurement',
        'permissions': [
            {'key': 'can_view_inventory', 'label': 'View Inventory', 'description': 'View product inventory'},
            {'key': 'can_manage_inventory', 'label': 'Manage Inventory', 'description': 'Manage stock levels'},
            {'key': 'can_view_procurement', 'label': 'View Procurement', 'description': 'View procurement orders'},
            {'key': 'can_manage_procurement', 'label': 'Manage Procurement', 'description': 'Create procurement orders'},
            {'key': 'can_view_suppliers', 'label': 'View Suppliers', 'description': 'View supplier list'},
            {'key': 'can_manage_suppliers', 'label': 'Manage Suppliers', 'description': 'Add/edit suppliers'},
        ]
    },
    'cms_website': {
        'label': 'CMS & Website',
        'permissions': [
            {'key': 'can_manage_cms', 'label': 'Manage CMS', 'description': 'Manage website content'},
            {'key': 'can_manage_images', 'label': 'Manage Images', 'description': 'Upload and manage images'},
            {'key': 'can_manage_pod_items', 'label': 'Manage POD Items', 'description': 'Manage print-on-demand items'},
        ]
    },
    'analytics': {
        'label': 'Analytics & Reports',
        'permissions': [
            {'key': 'can_view_analytics', 'label': 'View Analytics', 'description': 'View business analytics'},
            {'key': 'can_view_website_analytics', 'label': 'View Website Analytics', 'description': 'View website traffic'},
            {'key': 'can_export_reports', 'label': 'Export Reports', 'description': 'Export data reports'},
        ]
    },
    'communication': {
        'label': 'Communication',
        'permissions': [
            {'key': 'can_view_emails', 'label': 'View Customer Emails', 'description': 'View collected emails'},
            {'key': 'can_send_notifications', 'label': 'Send Notifications', 'description': 'Send customer notifications'},
        ]
    },
    'admin_management': {
        'label': 'Admin Management',
        'permissions': [
            {'key': 'can_view_admins', 'label': 'View Admins', 'description': 'View admin list'},
            {'key': 'can_create_admins', 'label': 'Create Admins', 'description': 'Create new admin accounts'},
            {'key': 'can_edit_admins', 'label': 'Edit Admins', 'description': 'Edit admin details'},
            {'key': 'can_delete_admins', 'label': 'Delete Admins', 'description': 'Remove admin accounts'},
            {'key': 'can_assign_permissions', 'label': 'Assign Permissions', 'description': 'Modify admin permissions'},
        ]
    },
    'settings': {
        'label': 'Settings',
        'permissions': [
            {'key': 'can_view_settings', 'label': 'View Settings', 'description': 'View system settings'},
            {'key': 'can_manage_settings', 'label': 'Manage Settings', 'description': 'Modify general settings'},
            {'key': 'can_manage_payment_settings', 'label': 'Payment Settings', 'description': 'Manage payment config'},
            {'key': 'can_manage_inventory_settings', 'label': 'Inventory Settings', 'description': 'Manage inventory settings'},
        ]
    },
}

async def send_email_mock(to: str, subject: str, body: str):
    """Mock email sending function"""
    logger.info(f"[MOCK EMAIL] To: {to}, Subject: {subject}, Body: {body[:100]}...")

async def calculate_bulk_price(clothing_item: str, quantity: int, print_type: PrintType, fabric_quality: str) -> Dict[str, float]:
    # Fetch dynamic pricing from CMS settings
    settings = await db.cms_settings.find_one({}, {'_id': 0})
    
    # Get production costs
    production_costs = await db.production_costs.find_one({}, {'_id': 0})
    if not production_costs:
        production_costs = {
            'bulk_print_cost_per_piece': 500,
            'bulk_embroidery_cost_per_piece': 1200
        }
    
    # Default base prices (fallback if not in CMS)
    default_base_prices = {
        'T-Shirt': 1500,
        'Hoodie': 4500,
        'Joggers': 3500,
        'Varsity Jacket': 8000,
        'Polo': 2500,
        'Polo Shirt': 2500,  # Alias
        'Button-Down Shirt': 3000,
        'Corporate Shirt': 3200,
        'Coverall': 5000,
        'Hospital Scrubs': 3500,
        'Shorts': 2000,
        'School Uniform': 2500,
        'Security Uniform': 3000,
        'Uniform': 3500,
        'Dress': 4000,
        # Nigerian Traditional Clothing
        'Agbada': 12000,
        'Senator Wear': 9000,
        'Kaftan': 7500,
        'Bubu Dress': 8500,
        'Ankara Dress': 6500,
        'Dashiki': 5000
    }
    
    # Get base prices from CMS or use defaults
    if settings and 'bulk_order_base_prices' in settings:
        base_prices = settings['bulk_order_base_prices']
        # Merge with defaults for items not in CMS
        for key, value in default_base_prices.items():
            if key not in base_prices:
                base_prices[key] = value
    else:
        base_prices = default_base_prices
    
    base_price = base_prices.get(clothing_item, 2000)
    
    # Get fabric quality price (clothing-specific)
    fabric_cost = 0
    fabric_qualities = await db.fabric_qualities.find({
        '$or': [
            {'clothing_item': clothing_item},
            {'clothing_item': 'default'}
        ]
    }, {'_id': 0}).to_list(100)
    
    # Find matching fabric quality
    fabric_quality_str = fabric_quality or 'standard'
    for fq in fabric_qualities:
        if fq['name'].lower() == fabric_quality_str.lower():
            fabric_cost = fq['price']
            break
    
    # Get quantity discounts from CMS or use defaults
    default_discounts = {
        '500': 20,
        '200': 15,
        '100': 10,
        '50': 5
    }
    
    if settings and 'bulk_order_discounts' in settings:
        discount_settings = settings['bulk_order_discounts']
    else:
        discount_settings = default_discounts
    
    # Apply quantity discount
    discount = 0
    # Sort by quantity descending to apply highest applicable discount
    sorted_discounts = sorted(
        [(int(qty), disc) for qty, disc in discount_settings.items()],
        key=lambda x: x[0],
        reverse=True
    )
    
    for min_qty, disc_percent in sorted_discounts:
        if quantity >= min_qty:
            discount = disc_percent / 100.0
            break
    
    # Print type cost - use production costs
    print_cost = 0
    if print_type == PrintType.FRONT or print_type == PrintType.FRONT_BACK:
        print_cost = production_costs.get('bulk_print_cost_per_piece', 500)
        if print_type == PrintType.FRONT_BACK:
            print_cost = print_cost * 1.6  # 60% more for back printing
    elif print_type == PrintType.EMBROIDERY:
        print_cost = production_costs.get('bulk_embroidery_cost_per_piece', 1200)
    
    # Calculate item price: base + fabric + print
    item_price = base_price + fabric_cost + print_cost
    discounted_price = item_price * (1 - discount)
    total = discounted_price * quantity
    
    return {
        'base_price': base_price,
        'fabric_cost': fabric_cost,
        'print_cost': print_cost,
        'discount_percentage': discount * 100,
        'price_per_item': discounted_price,
        'total_price': total
    }

def calculate_production_time(quantity: int, print_type: PrintType) -> int:
    base_days = 3
    
    if quantity > 100:
        base_days += 7
    elif quantity > 50:
        base_days += 5
    elif quantity > 20:
        base_days += 3
    
    if print_type == PrintType.EMBROIDERY:
        base_days += 2
    elif print_type == PrintType.FRONT_BACK:
        base_days += 1
    
    return base_days

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register")
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserRegister):
    existing_user = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if existing_user:
        # Check if user registered with Google
        if existing_user.get('auth_provider') == 'google' or not existing_user.get('password'):
            raise HTTPException(
                status_code=400, 
                detail="This email is already registered with Google Sign-In. Please use 'Sign in with Google' button to login."
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail="This email is already registered. Please go to the Login tab and sign in with your password."
            )
    
    user_id = str(uuid.uuid4())
    verification_token = str(uuid.uuid4())
    
    user = {
        'id': user_id,
        'name': user_data.name,
        'email': user_data.email,
        'phone': user_data.phone,
        'password': hash_password(user_data.password),
        'is_verified': EMAIL_MOCK,  # Auto-verify if mocking emails
        'is_admin': False,
        'verification_token': verification_token,
        'auth_provider': 'email',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    if EMAIL_MOCK:
        await send_email_mock(
            user_data.email,
            "Welcome to Temaruco!",
            f"Verification link: /verify/{verification_token}"
        )
    
    token = create_token(user_id)
    
    return {
        'token': token,
        'user': {
            'id': user_id,
            'name': user_data.name,
            'email': user_data.email,
            'is_verified': user['is_verified']
        }
    }

@api_router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin, response: Response):
    # Support login with username OR email
    user = await db.users.find_one({
        '$or': [
            {'email': credentials.email},
            {'username': credentials.email}  # Allow username in email field
        ]
    }, {'_id': 0})
    
    if not user:
        auth_logger.warning(f"Failed login attempt for email/username: {credentials.email}")
        raise HTTPException(
            status_code=404, 
            detail="No account found with this email/username. Please check your credentials."
        )
    
    if not user.get('password'):
        auth_logger.warning(f"Google user attempted email/password login: {user['email']}")
        raise HTTPException(
            status_code=400,
            detail="This account uses Google Sign-In. Please use the 'Sign in with Google' button."
        )
    
    if not verify_password(credentials.password, user['password']):
        auth_logger.warning(f"Incorrect password attempt for user: {user['email']}")
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    
    # Handle both 'id' and 'user_id' fields for compatibility
    user_id = user.get('id') or user.get('user_id')
    token = create_token(user_id)
    
    # Log successful login
    auth_logger.info(f"Successful login for user: {user['email']}, user_id: {user_id}")
    
    # Create session in database for cookie-based auth (needed for admin/super-admin routes)
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        'user_id': user_id,
        'email': user['email'],
        'session_id': session_token,
        'session_token': session_token,
        'expires_at': expires_at,
        'created_at': datetime.now(timezone.utc)
    }
    
    await db.user_sessions.insert_one(session_doc)
    
    # Set httpOnly cookie - use both keys for compatibility
    response.set_cookie(
        key='session_id',
        value=session_token,
        httponly=True,
        secure=True,
        samesite='none',
        path='/',
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    response.set_cookie(
        key='session_token',
        value=session_token,
        httponly=True,
        secure=True,
        samesite='none',
        path='/',
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {
        'token': token,
        'session_token': session_token,
        'user': {
            'id': user_id,
            'name': user['name'],
            'email': user['email'],
            'is_verified': user['is_verified'],
            'is_admin': user.get('is_admin', False),
            'is_super_admin': user.get('is_super_admin', False),
            'role': user.get('role', {})  # Include role for frontend permission checks
        }
    }

@api_router.get("/auth/verify/{token}")
async def verify_email(token: str):
    user = await db.users.find_one({'verification_token': token}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="Invalid verification token")
    
    # Update user verification status (handle both id and user_id fields)
    result = await db.users.update_one(
        {'$or': [{'id': user.get('id')}, {'user_id': user.get('user_id')}]}, 
        {'$set': {'is_verified': True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to verify user")
    
    return {'message': 'Email verified successfully'}

# ==================== CUSTOMER ACCOUNT FEATURES ====================

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user_from_cookie_or_header(request)
    return user

@api_router.put("/account/profile")
async def update_profile(request: Request, data: Dict[str, Any]):
    """Update customer profile"""
    user = await get_current_user_from_cookie_or_header(request)
    
    update_data = {
        'name': data.get('name', user.get('name')),
        'phone': data.get('phone', user.get('phone')),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.update_one({'id': user['id']}, {'$set': update_data})
    
    return {'message': 'Profile updated successfully'}

@api_router.get("/account/addresses")
async def get_saved_addresses(request: Request):
    """Get customer's saved addresses"""
    user = await get_current_user_from_cookie_or_header(request)
    
    addresses = await db.user_addresses.find({'user_id': user['id']}, {'_id': 0}).to_list(20)
    return addresses

@api_router.post("/account/addresses")
async def add_address(request: Request, data: Dict[str, Any]):
    """Add a new saved address"""
    user = await get_current_user_from_cookie_or_header(request)
    
    address = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'label': data.get('label', 'Home'),
        'full_name': data.get('full_name', user.get('name')),
        'phone': data.get('phone', user.get('phone')),
        'address_line1': data.get('address_line1', ''),
        'address_line2': data.get('address_line2', ''),
        'city': data.get('city', ''),
        'state': data.get('state', ''),
        'country': data.get('country', 'Nigeria'),
        'postal_code': data.get('postal_code', ''),
        'is_default': data.get('is_default', False),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # If this is the default, unset other defaults
    if address['is_default']:
        await db.user_addresses.update_many(
            {'user_id': user['id']},
            {'$set': {'is_default': False}}
        )
    
    await db.user_addresses.insert_one(address)
    if '_id' in address:
        del address['_id']
    
    return {'message': 'Address saved', 'address': address}

@api_router.delete("/account/addresses/{address_id}")
async def delete_address(address_id: str, request: Request):
    """Delete a saved address"""
    user = await get_current_user_from_cookie_or_header(request)
    
    result = await db.user_addresses.delete_one({'id': address_id, 'user_id': user['id']})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return {'message': 'Address deleted'}

@api_router.get("/account/orders")
async def get_order_history(request: Request):
    """Get customer's order history"""
    user = await get_current_user_from_cookie_or_header(request)
    
    # Find orders by customer email
    orders = await db.orders.find(
        {'customer_details.email': user['email']},
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    return orders

@api_router.get("/account/orders/{order_id}")
async def get_order_detail(order_id: str, request: Request):
    """Get single order details"""
    user = await get_current_user_from_cookie_or_header(request)
    
    order = await db.orders.find_one(
        {'id': order_id, 'customer_details.email': user['email']},
        {'_id': 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@api_router.get("/account/mockups")
async def get_saved_mockups(request: Request):
    """Get customer's saved mockups"""
    user = await get_current_user_from_cookie_or_header(request)
    
    mockups = await db.saved_mockups.find(
        {'user_id': user['id']},
        {'_id': 0}
    ).sort('created_at', -1).limit(20).to_list(20)
    
    return mockups

@api_router.post("/account/mockups")
async def save_mockup(request: Request, data: Dict[str, Any]):
    """Save a mockup design"""
    user = await get_current_user_from_cookie_or_header(request)
    
    mockup = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'name': data.get('name', f"Design {datetime.now().strftime('%Y%m%d_%H%M')}"),
        'template': data.get('template', 'tshirt_front'),
        'color': data.get('color', '#FFFFFF'),
        'elements': data.get('elements', []),
        'thumbnail': data.get('thumbnail', ''),  # Base64 preview image
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.saved_mockups.insert_one(mockup)
    
    return {'message': 'Mockup saved', 'mockup_id': mockup['id']}

@api_router.put("/account/mockups/{mockup_id}")
async def update_mockup(mockup_id: str, request: Request, data: Dict[str, Any]):
    """Update a saved mockup"""
    user = await get_current_user_from_cookie_or_header(request)
    
    result = await db.saved_mockups.update_one(
        {'id': mockup_id, 'user_id': user['id']},
        {'$set': {
            'name': data.get('name'),
            'template': data.get('template'),
            'color': data.get('color'),
            'elements': data.get('elements'),
            'thumbnail': data.get('thumbnail', ''),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mockup not found")
    
    return {'message': 'Mockup updated'}

@api_router.delete("/account/mockups/{mockup_id}")
async def delete_mockup(mockup_id: str, request: Request):
    """Delete a saved mockup"""
    user = await get_current_user_from_cookie_or_header(request)
    
    result = await db.saved_mockups.delete_one({'id': mockup_id, 'user_id': user['id']})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mockup not found")
    
    return {'message': 'Mockup deleted'}

@api_router.post("/auth/google-session")
async def google_session(request: Request, response: Response):
    """Process Google OAuth session_id and create user session"""
    try:
        data = await request.json()
        session_id = data.get('session_id')
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id required")
        
        # Call Emergent Auth API to get user data
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
                headers={'X-Session-ID': session_id},
                timeout=30.0
            )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        google_user = auth_response.json()
        
        # Check if user exists
        existing_user = await db.users.find_one({'email': google_user['email']}, {'_id': 0})
        
        if existing_user:
            user_id = existing_user['user_id']
            # Update user info
            await db.users.update_one(
                {'user_id': user_id},
                {'$set': {
                    'name': google_user['name'],
                    'picture': google_user.get('picture'),
                    'last_login': datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                'user_id': user_id,
                'email': google_user['email'],
                'name': google_user['name'],
                'phone': '',
                'picture': google_user.get('picture'),
                'address': '',
                'is_verified': True,
                'is_admin': False,
                'auth_provider': 'google',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_login': datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
        
        # Create session in database
        session_token = google_user['session_token']
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session_doc = {
            'user_id': user_id,
            'session_token': session_token,
            'expires_at': expires_at,
            'created_at': datetime.now(timezone.utc)
        }
        
        await db.user_sessions.insert_one(session_doc)
        
        # Set httpOnly cookie
        response.set_cookie(
            key='session_token',
            value=session_token,
            httponly=True,
            secure=True,
            samesite='none',
            path='/',
            max_age=7 * 24 * 60 * 60  # 7 days
        )
        
        # Get complete user data
        user = await db.users.find_one({'user_id': user_id}, {'_id': 0, 'password': 0})
        
        return {'user': user, 'session_token': session_token}
    
    except httpx.RequestError as e:
        logger.error(f"Emergent Auth API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    except Exception as e:
        logger.error(f"Google session error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    try:
        session_token = request.cookies.get('session_token')
        
        if session_token:
            # Delete session from database
            await db.user_sessions.delete_one({'session_token': session_token})
        
        # Clear cookie
        response.delete_cookie(
            key='session_token',
            path='/',
            samesite='none',
            secure=True
        )
        
        return {'message': 'Logged out successfully'}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/auth/update-address")
async def update_address(address: str, request: Request):
    """Update user's address"""
    user = await get_current_user_from_cookie_or_header(request)
    
    await db.users.update_one(
        {'user_id': user['user_id']},
        {'$set': {'address': address}}
    )
    
    return {'message': 'Address updated successfully'}

# ==================== QUICK QUOTE ====================
@api_router.post("/quote/calculate", response_model=QuickQuoteResponse)
async def calculate_quote(quote_request: QuickQuoteRequest):
    breakdown = await calculate_bulk_price(
        quote_request.clothing_item,
        quote_request.quantity,
        quote_request.print_type,
        quote_request.fabric_quality
    )
    
    days = calculate_production_time(quote_request.quantity, quote_request.print_type)
    
    return QuickQuoteResponse(
        estimated_price=breakdown['total_price'],
        estimated_days=days,
        breakdown=breakdown
    )

# ==================== BULK ORDERS ====================
@api_router.post("/orders/bulk")
@limiter.limit("20/hour")
async def create_bulk_order(
    request: Request,
    order_data: str = Form(...),
    design_file: Optional[UploadFile] = File(None),
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...)
):
    # No authentication required - guest orders allowed
    import json
    order_dict = json.loads(order_data)
    
    # Validate minimum quantity for bulk orders
    if order_dict.get('quantity', 0) < 50:
        raise HTTPException(status_code=400, detail="Minimum bulk order quantity is 50")
    
    order_id = await generate_order_id()
    design_url = None
    
    if design_file:
        file_data = await save_upload_file(design_file, ALLOWED_IMAGE_EXTENSIONS)
        design_url = file_data['file_path']
    
    # Calculate price based on new structure
    breakdown = await calculate_bulk_price(
        order_dict.get('clothing_item'),
        order_dict.get('quantity'),
        order_dict.get('print_type'),
        order_dict.get('fabric_quality')
    )
    
    days = calculate_production_time(order_dict.get('quantity'), order_dict.get('print_type'))
    
    # Get variant pricing
    product_variant = order_dict.get('product_variant', 'standard')
    unit_price = order_dict.get('unit_price', 0)
    
    bulk_order = {
        'id': order_id,
        'order_id': order_id,
        'user_id': None,
        'user_email': customer_email,
        'user_name': customer_name,
        'user_phone': customer_phone,
        'type': OrderType.BULK,
        'clothing_item': order_dict.get('clothing_item'),
        'clothing_item_id': order_dict.get('clothing_item_id'),
        'product_variant': product_variant,
        'unit_price': unit_price,
        'quantity': order_dict.get('quantity'),
        'color_quantities': order_dict.get('color_quantities', {}),
        'size_breakdown': order_dict.get('size_breakdown', {}),
        'print_type': order_dict.get('print_type'),
        'fabric_quality': order_dict.get('fabric_quality'),
        'design_url': design_url,
        'notes': order_dict.get('notes'),
        'price_breakdown': {
            **breakdown,
            'product_variant': product_variant,
            'unit_price': unit_price
        },
        'total_price': order_dict.get('quote', {}).get('total_price', unit_price * order_dict.get('quantity', 0)),
        'estimated_days': days,
        'status': OrderStatus.PENDING_PAYMENT,
        'payment_status': 'pending_payment',
        'payment_proof_url': None,
        'payment_verified_at': None,
        'payment_receipt_url': None,
        'tailor_assigned': None,
        'production_deadline': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(bulk_order)
    
    # Create admin notification
    variant_label = product_variant.capitalize()
    await create_notification(
        'new_order',
        'New Bulk Order',
        f"Order {order_id} from {customer_name} - {order_dict.get('clothing_item')} ({variant_label}) x{order_dict.get('quantity')}",
        order_id=order_id
    )
    
    del bulk_order['_id']
    return bulk_order

# ==================== POD ORDERS ====================
@api_router.post("/orders/pod")
async def create_pod_order(
    order_data: str = Form(...),
    design_file: UploadFile = File(...),
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...)
):
    # No authentication required - guest orders allowed
    import json
    order_dict = json.loads(order_data)
    
    order_id = await generate_order_id()
    
    # Save design file
    file_data = await save_upload_file(design_file, ALLOWED_IMAGE_EXTENSIONS)
    design_url = file_data['file_path']
    
    pod_order = {
        'id': order_id,
        'order_id': order_id,
        'user_id': None,
        'user_email': customer_email,
        'user_name': customer_name,
        'user_phone': customer_phone,
        'type': OrderType.POD,
        'clothing_item': order_dict.get('clothing_item'),
        'quantity': order_dict.get('quantity'),
        'color_quantities': order_dict.get('color_quantities', {}),
        'size_breakdown': order_dict.get('size_breakdown', {}),
        'print_size': order_dict.get('print_size'),
        'fabric_quality': order_dict.get('fabric_quality'),
        'design_placement': order_dict.get('design_placement'),
        'design_url': design_url,
        'mockup_position_x': order_dict.get('mockup_position_x', 0),
        'mockup_position_y': order_dict.get('mockup_position_y', 0),
        'print_scale_percentage': order_dict.get('print_scale_percentage', 35),
        'notes': order_dict.get('notes'),
        'unit_price': order_dict.get('unit_price'),
        'total_price': order_dict.get('total_price'),
        'status': OrderStatus.PENDING_PAYMENT,
        'payment_status': 'pending_payment',
        'payment_proof_url': None,
        'payment_receipt_url': None,
        'payment_verified_at': None,
        'tailor_assigned': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(pod_order)
    
    # Create admin notification
    await create_notification(
        'new_order',
        'New POD Order',
        f"Order {order_id} from {customer_name} - {order_dict.get('clothing_item')} x{order_dict.get('quantity')}",
        order_id=order_id
    )
    
    del pod_order['_id']
    return pod_order

# ==================== POD DESIGN UPLOAD (Dual File Storage) ====================
@api_router.get("/pod/print-sizes")
async def get_print_sizes():
    """Get available print sizes for POD designs"""
    return PRINT_SIZES

@api_router.post("/pod/guest-contact")
async def create_or_get_guest_contact(data: Dict[str, Any]):
    """Create or retrieve guest contact record for POD design linking.
    Also creates/updates record in clients collection for admin visibility."""
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    session_id = data.get('session_id', f"session_{uuid.uuid4().hex[:12]}")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    try:
        # Check if guest contact exists in pod_guest_contacts
        existing = await db.pod_guest_contacts.find_one({'email': email})
        
        if existing:
            # Update contact info if provided
            update_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
            if name:
                update_data['name'] = name
            if phone:
                update_data['phone'] = phone
            if session_id:
                update_data['session_id'] = session_id
            
            await db.pod_guest_contacts.update_one(
                {'email': email},
                {'$set': update_data}
            )
            
            guest_id = existing['id']
            existing.pop('_id', None)
            existing.update(update_data)
            logger.info(f"[POD] Updated guest contact: {email}")
        else:
            # Create new guest contact
            guest_id = f"guest_{uuid.uuid4().hex[:12]}"
            guest_contact = {
                'id': guest_id,
                'guest_id': guest_id,
                'session_id': session_id,
                'name': name,
                'email': email,
                'phone': phone,
                'designs': [],
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            await db.pod_guest_contacts.insert_one(guest_contact)
            guest_contact.pop('_id', None)
            existing = guest_contact
            logger.info(f"[POD] Created guest contact: {email} -> {guest_id}")
        
        # Also create/update in clients collection for admin visibility
        client_record = await db.clients.find_one({'email': email})
        if not client_record:
            client_id = f"client_{uuid.uuid4().hex[:12]}"
            client_record = {
                'id': client_id,
                'client_id': client_id,
                'name': name or 'Guest',
                'email': email,
                'phone': phone,
                'type': 'pod_guest',
                'source': 'print_on_demand',
                'pod_guest_id': guest_id,
                'total_orders': 0,
                'total_spent': 0,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            await db.clients.insert_one(client_record)
            logger.info(f"[POD] Created client record: {email} -> {client_id}")
        else:
            # Update client record
            await db.clients.update_one(
                {'email': email},
                {'$set': {
                    'name': name or client_record.get('name', 'Guest'),
                    'phone': phone or client_record.get('phone', ''),
                    'pod_guest_id': guest_id,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Link any unlinked designs from this session to the contact
        if session_id:
            unlinked_designs = await db.pod_designs.find({
                'session_id': session_id,
                'guest_id': {'$exists': False}
            }).to_list(100)
            
            for design in unlinked_designs:
                await db.pod_designs.update_one(
                    {'id': design['id']},
                    {'$set': {
                        'guest_id': guest_id,
                        'guest_email': email,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                await db.pod_guest_contacts.update_one(
                    {'id': guest_id},
                    {'$push': {'designs': design['id']}}
                )
                logger.info(f"[POD] Linked design {design['id']} to guest {guest_id}")
        
        return existing
        
    except Exception as e:
        logger.error(f"[POD] Guest contact creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create guest contact")

@api_router.post("/pod/upload-design")
async def upload_pod_design(
    design_file: UploadFile = File(...),
    product_id: str = Form(...),
    item_type: str = Form("")
):
    """
    Upload POD design - STATELESS implementation.
    Immediately saves design with status='unassigned'.
    Returns temp_design_id for frontend to store in localStorage.
    
    Does NOT require cookies, sessions, or contact info.
    Contact linking happens separately via /pod/link-design endpoint.
    
    Returns: temp_design_id, original_file_url
    """
    logger.info(f"[POD DESIGN] Stateless upload started: product={product_id}")
    
    # Validate file
    is_valid, message = await validate_file_upload(design_file, ALLOWED_IMAGE_EXTENSIONS)
    if not is_valid:
        logger.error(f"[POD DESIGN] Validation failed: {message}")
        raise HTTPException(status_code=400, detail=message)
    
    # Generate unique temp_design_id (UUID-based, primary key)
    temp_design_id = f"design_{uuid.uuid4().hex}"
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save original design file
    file_ext = os.path.splitext(design_file.filename)[1].lower()
    original_filename = f"{product_id}_{timestamp}_{temp_design_id}{file_ext}"
    original_path = POD_ORIGINALS_DIR / original_filename
    
    try:
        contents = await design_file.read()
        with open(original_path, 'wb') as f:
            f.write(contents)
        
        if not original_path.exists():
            raise Exception("File save verification failed")
        
        logger.info(f"[POD DESIGN] Original saved: {original_filename} ({len(contents)} bytes)")
    except Exception as e:
        logger.error(f"[POD DESIGN] Save failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save design file")
    
    original_url = f"/api/uploads/designs/original/{original_filename}"
    
    # Create design record with status='unassigned' (STATELESS - no contact required)
    design_record = {
        'id': temp_design_id,
        'temp_design_id': temp_design_id,
        'design_id': temp_design_id,
        'contact_id': None,
        'guest_id': None,
        'guest_email': None,
        'guest_name': None,
        'guest_phone': None,
        'product_id': product_id,
        'item_type': item_type or product_id,
        'original_file_url': original_url,
        'original_filename': design_file.filename,
        'mockup_file_url': None,
        'mockup_filename': None,
        'print_size': 'a4',
        'scale': 1.0,
        'position_x': 0,
        'position_y': 0,
        'rotation': 0,
        'file_size': len(contents),
        'status': 'unassigned',  # Key: starts as unassigned
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.pod_designs.insert_one(design_record)
    if not result.inserted_id:
        logger.error(f"[POD DESIGN] DB insert failed for design {temp_design_id}")
        raise HTTPException(status_code=500, detail="Failed to save design record")
    
    logger.info(f"[POD DESIGN] Stateless upload complete: {temp_design_id} (status=unassigned)")
    
    return {
        'temp_design_id': temp_design_id,
        'design_id': temp_design_id,
        'original_file_url': original_url,
        'status': 'unassigned',
        'message': 'Design uploaded successfully. Store temp_design_id in localStorage.'
    }

@api_router.post("/pod/link-design")
async def link_design_to_contact(data: Dict[str, Any]):
    """
    Link an unassigned design to a contact.
    Called when guest submits their contact info.
    
    Required: temp_design_id, name, email, phone
    
    This is the STATELESS approach - design was uploaded first,
    now we're linking it to a contact without relying on cookies/sessions.
    """
    temp_design_id = data.get('temp_design_id')
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    
    if not temp_design_id:
        raise HTTPException(status_code=400, detail="temp_design_id is required")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone is required")
    
    logger.info(f"[POD LINK] Linking design {temp_design_id} to {email}")
    
    # Find the design
    design = await db.pod_designs.find_one({'id': temp_design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    # Check if already assigned
    if design.get('status') == 'assigned' and design.get('contact_id'):
        logger.info(f"[POD LINK] Design {temp_design_id} already assigned to {design.get('guest_email')}")
        return {
            'message': 'Design already assigned',
            'design_id': temp_design_id,
            'contact_id': design.get('contact_id'),
            'status': 'assigned'
        }
    
    try:
        # Get or create guest contact
        existing_contact = await db.pod_guest_contacts.find_one({'email': email})
        
        if existing_contact:
            contact_id = existing_contact['id']
            # Update contact info
            await db.pod_guest_contacts.update_one(
                {'id': contact_id},
                {'$set': {
                    'name': name,
                    'phone': phone,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"[POD LINK] Updated existing contact: {contact_id}")
        else:
            # Create new contact
            contact_id = f"contact_{uuid.uuid4().hex[:12]}"
            contact_record = {
                'id': contact_id,
                'contact_id': contact_id,
                'name': name,
                'email': email,
                'phone': phone,
                'designs': [],
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            await db.pod_guest_contacts.insert_one(contact_record)
            
            # Also create client record for admin visibility
            client_id = f"client_{uuid.uuid4().hex[:12]}"
            await db.clients.insert_one({
                'id': client_id,
                'client_id': client_id,
                'name': name,
                'email': email,
                'phone': phone,
                'type': 'pod_guest',
                'source': 'print_on_demand',
                'pod_contact_id': contact_id,
                'total_orders': 0,
                'total_spent': 0,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"[POD LINK] Created new contact + client: {contact_id}")
        
        # Update design record - link to contact
        await db.pod_designs.update_one(
            {'id': temp_design_id},
            {'$set': {
                'contact_id': contact_id,
                'guest_id': contact_id,
                'guest_email': email,
                'guest_name': name,
                'guest_phone': phone,
                'status': 'assigned',
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Add design to contact's designs list
        await db.pod_guest_contacts.update_one(
            {'id': contact_id},
            {
                '$addToSet': {'designs': temp_design_id},
                '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}
            }
        )
        
        logger.info(f"[POD LINK] Successfully linked design {temp_design_id} to contact {contact_id}")
        
        return {
            'message': 'Design linked to contact successfully',
            'design_id': temp_design_id,
            'contact_id': contact_id,
            'status': 'assigned'
        }
        
    except Exception as e:
        logger.error(f"[POD LINK] Failed to link design: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to link design to contact")

@api_router.post("/pod/link-multiple-designs")
async def link_multiple_designs_to_contact(data: Dict[str, Any]):
    """
    Link multiple unassigned designs to a contact.
    Used when guest has uploaded multiple designs before providing contact info.
    
    Required: design_ids (list), name, email, phone
    """
    design_ids = data.get('design_ids', [])
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    
    if not design_ids:
        raise HTTPException(status_code=400, detail="design_ids list is required")
    if not email or not name or not phone:
        raise HTTPException(status_code=400, detail="Name, email, and phone are required")
    
    linked_count = 0
    for design_id in design_ids:
        try:
            result = await link_design_to_contact({
                'temp_design_id': design_id,
                'name': name,
                'email': email,
                'phone': phone
            })
            if result.get('status') == 'assigned':
                linked_count += 1
        except Exception as e:
            logger.error(f"[POD LINK] Failed to link design {design_id}: {str(e)}")
    
    return {
        'message': f'Linked {linked_count} of {len(design_ids)} designs',
        'linked_count': linked_count,
        'total_designs': len(design_ids)
    }

@api_router.post("/pod/upload-mockup/{design_id}")
async def upload_pod_mockup(
    design_id: str,
    mockup_file: UploadFile = File(...)
):
    """
    Upload generated mockup for a POD design.
    Called after client-side mockup generation.
    """
    logger.info(f"[POD MOCKUP] Upload started: design_id={design_id}")
    
    # Verify design exists
    design = await db.pod_designs.find_one({'id': design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    # Validate file
    is_valid, message = await validate_file_upload(mockup_file, ALLOWED_IMAGE_EXTENSIONS)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Save mockup file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    mockup_filename = f"{design['product_id']}_{timestamp}_{design_id}_mockup.png"
    mockup_path = POD_MOCKUPS_DIR / mockup_filename
    
    try:
        contents = await mockup_file.read()
        with open(mockup_path, 'wb') as f:
            f.write(contents)
        
        logger.info(f"[POD MOCKUP] Saved: {mockup_filename} ({len(contents)} bytes)")
    except Exception as e:
        logger.error(f"[POD MOCKUP] Save failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save mockup file")
    
    mockup_url = f"/api/uploads/designs/mockups/{mockup_filename}"
    
    # Update design record
    await db.pod_designs.update_one(
        {'id': design_id},
        {
            '$set': {
                'mockup_file_url': mockup_url,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    logger.info(f"[POD MOCKUP] Linked to design: {design_id}")
    
    return {
        'design_id': design_id,
        'mockup_file_url': mockup_url,
        'message': 'Mockup uploaded successfully'
    }

@api_router.put("/pod/design/{design_id}/transform")
async def update_pod_design_transform(design_id: str, data: Dict[str, Any]):
    """
    Update design transform properties (scale, position, rotation, print size).
    Used for dynamic resizing without re-upload.
    """
    design = await db.pod_designs.find_one({'id': design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    update_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
    
    if 'print_size' in data:
        if data['print_size'] not in PRINT_SIZES:
            raise HTTPException(status_code=400, detail=f"Invalid print size. Valid: {list(PRINT_SIZES.keys())}")
        update_data['print_size'] = data['print_size']
    
    if 'scale' in data:
        update_data['scale'] = float(data['scale'])
    
    if 'position_x' in data:
        update_data['position_x'] = float(data['position_x'])
    
    if 'position_y' in data:
        update_data['position_y'] = float(data['position_y'])
    
    if 'rotation' in data:
        update_data['rotation'] = float(data['rotation'])
    
    await db.pod_designs.update_one(
        {'id': design_id},
        {'$set': update_data}
    )
    
    logger.info(f"[POD DESIGN] Transform updated: {design_id} -> {update_data}")
    
    return {'message': 'Design transform updated', 'design_id': design_id}

@api_router.get("/pod/design/{design_id}")
async def get_pod_design(design_id: str):
    """Get POD design details"""
    design = await db.pod_designs.find_one({'id': design_id}, {'_id': 0})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return design

@api_router.get("/pod/guest/{guest_id}/designs")
async def get_guest_designs(guest_id: str):
    """Get all designs for a guest"""
    designs = await db.pod_designs.find(
        {'guest_id': guest_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return designs

@api_router.get("/orders/my-orders")
async def get_my_orders(request: Request):
    current_user = await get_current_user_from_cookie_or_header(request)
    orders = await db.orders.find({'user_id': current_user['user_id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    # Public endpoint - anyone can view order with order ID
    order = await db.orders.find_one({
        '$or': [
            {'id': order_id},
            {'order_id': order_id}
        ]
    }, {'_id': 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.post("/orders/boutique")
async def create_boutique_order(
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...),
    cart_items: str = Form(...),  # JSON string of cart items
    delivery_address: Optional[str] = Form(None),
    delivery_city: Optional[str] = Form(None),
    delivery_state: Optional[str] = Form(None),
    delivery_notes: Optional[str] = Form(None)
):
    """Create boutique order without authentication"""
    import json
    cart = json.loads(cart_items)
    
    if not cart or len(cart) == 0:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Generate unique order ID
    order_id = await generate_order_id()
    
    # Calculate total
    total_price = sum(item['price'] * item['quantity'] for item in cart)
    
    boutique_order = {
        'id': order_id,
        'order_id': order_id,
        'user_id': None,  # Guest order
        'user_email': customer_email,
        'user_name': customer_name,
        'user_phone': customer_phone,
        'type': OrderType.BOUTIQUE,
        'cart_items': cart,
        'quantity': sum(item['quantity'] for item in cart),
        'total_price': total_price,
        'delivery_address': delivery_address,
        'delivery_city': delivery_city,
        'delivery_state': delivery_state,
        'delivery_notes': delivery_notes,
        'status': OrderStatus.PENDING_PAYMENT,
        'payment_status': 'pending_payment',
        'payment_proof_url': None,
        'payment_verified_at': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(boutique_order)
    
    # Create admin notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'type': 'new_order',
        'order_id': order_id,
        'message': f"New boutique order {order_id} from {customer_name} - {len(cart)} items",
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    del boutique_order['_id']
    return boutique_order

@api_router.post("/orders/{order_id}/payment-proof")
async def upload_payment_proof(
    order_id: str,
    payment_reference: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    proof_file: UploadFile = File(...)
):
    """Customer uploads payment proof - no authentication required"""
    
    # Find order
    order = await db.orders.find_one({
        '$or': [
            {'id': order_id},
            {'order_id': order_id}
        ]
    }, {'_id': 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Save payment proof file
    file_data = await save_upload_file(proof_file)
    
    # Update order
    update_data = {
        'payment_proof_url': file_data['file_path'],
        'payment_proof_original_name': file_data['original_name'],
        'payment_reference': payment_reference or order_id,
        'payment_notes': notes,
        'payment_proof_uploaded_at': datetime.now(timezone.utc).isoformat(),
        'status': OrderStatus.PAYMENT_SUBMITTED,
        'payment_status': 'payment_submitted'
    }
    
    result = await db.orders.update_one(
        {'$or': [{'id': order_id}, {'order_id': order_id}]},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create admin notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'type': 'payment_proof_uploaded',
        'order_id': order_id,
        'message': f"Payment proof uploaded for order {order_id}",
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    return {'message': 'Payment proof uploaded successfully', 'order_id': order_id}

@api_router.post("/admin/orders/{order_id}/upload-receipt")
async def admin_upload_receipt(
    order_id: str,
    receipt_file: UploadFile = File(...),
    admin_user: Dict = Depends(get_admin_user)
):
    """Admin manually uploads payment receipt for an order"""
    
    # Find order
    order = await db.orders.find_one({
        '$or': [
            {'id': order_id},
            {'order_id': order_id}
        ]
    }, {'_id': 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Save receipt file
    file_data = await save_upload_file(receipt_file, ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS)
    
    # Update order
    update_data = {
        'payment_receipt_url': file_data['file_path'],
        'payment_receipt_original_name': file_data['original_name'],
        'payment_receipt_uploaded_by': admin_user['email'],
        'payment_receipt_uploaded_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.orders.update_one(
        {'$or': [{'id': order_id}, {'order_id': order_id}]},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {'message': 'Receipt uploaded successfully', 'receipt_url': file_data['file_path']}


@api_router.get("/bank-details")
async def get_bank_details():
    """Public endpoint to get bank transfer details"""
    return {
        'bank_name': 'Stanbic IBTC Bank',
        'account_name': 'Temaruco Limited',
        'account_number': '0050431693',
        'whatsapp': '+2349125423902',
        'instructions': [
            'Make payment to the account above',
            'Use your Order ID as payment reference',
            'Upload payment proof or send to WhatsApp',
            'Your order will be processed once payment is confirmed'
        ]
    }

# ==================== BOUTIQUE ====================
@api_router.get("/boutique/products")
async def get_boutique_products(category: Optional[str] = None):
    query = {}
    if category:
        query['category'] = category
    
    products = await db.boutique_products.find(query, {'_id': 0}).to_list(100)
    return products

@api_router.get("/boutique/products/{product_id}")
async def get_product(product_id: str):
    product = await db.boutique_products.find_one({'id': product_id}, {'_id': 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


class NewBoutiqueProduct(BaseModel):
    name: str
    category: str
    price: float
    description: Optional[str] = ''
    image_url: Optional[str] = ''
    colors: Optional[List[str]] = []
    sizes: Optional[List[str]] = []
    style: Optional[str] = 'modern'  # 'traditional' or 'modern'
    audience: Optional[str] = 'adults'  # 'adults' or 'kids'
    gender: Optional[str] = 'unisex'  # 'male', 'female', 'unisex'

@api_router.post("/admin/boutique/products")
async def create_boutique_product(product: NewBoutiqueProduct, request: Request):
    """Admin: Create new boutique product"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Generate unique product ID
    product_id = f"PROD-{datetime.now().strftime('%y%m')}-{str(uuid.uuid4())[:8]}"
    
    # Create product document
    product_data = {
        'id': product_id,
        'name': product.name,
        'category': product.category,
        'price': product.price,
        'description': product.description,
        'image_url': product.image_url,
        'colors': product.colors or [],
        'sizes': product.sizes or [],
        'style': product.style or 'modern',
        'audience': product.audience or 'adults',
        'gender': product.gender or 'unisex',
        'inventory': {},
        'total_stock': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Insert into database
    await db.boutique_products.insert_one(product_data)
    
    return {
        'message': 'Product created successfully',
        'product_id': product_id,
        'product': {k: v for k, v in product_data.items() if k != '_id'}
    }


@api_router.post("/admin/boutique/products/upload-image")
async def upload_product_image(file: UploadFile = File(...), request: Request = None):
    """Admin: Upload product image"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File size too large. Maximum 5MB allowed.")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1]
    filename = f"product_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(contents)
    
    # Return URL - use /api/uploads to match the static files mount
    image_url = f"/api/uploads/{filename}"
    
    return {
        'message': 'Image uploaded successfully',
        'image_url': image_url,
        'filename': filename
    }


# ==================== FABRICS ====================
@api_router.get("/fabrics")
async def get_fabrics():
    """Get all active fabrics"""
    fabrics = await db.fabrics.find({'is_active': True}, {'_id': 0}).to_list(100)
    return fabrics

# Admin Fabrics Management
@api_router.post("/admin/fabrics")
async def create_fabric(fabric_data: Dict[str, Any], admin_user: Dict = Depends(get_admin_user)):
    """Create a new fabric product"""
    fabric = {
        'id': str(uuid.uuid4()),
        'name': fabric_data.get('name'),
        'price': fabric_data.get('price'),
        'branded_price': fabric_data.get('branded_price'),
        'image_url': fabric_data.get('image_url', ''),
        'description': fabric_data.get('description', ''),
        'is_active': fabric_data.get('is_active', True),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.fabrics.insert_one(fabric)
    return {'message': 'Fabric created', 'id': fabric['id']}

@api_router.put("/admin/fabrics/{fabric_id}")
async def update_fabric(fabric_id: str, fabric_data: Dict[str, Any], admin_user: Dict = Depends(get_admin_user)):
    """Update a fabric product"""
    update_data = {k: v for k, v in fabric_data.items() if k not in ['id', '_id', 'created_at']}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.fabrics.update_one({'id': fabric_id}, {'$set': update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fabric not found")
    return {'message': 'Fabric updated'}

@api_router.delete("/admin/fabrics/{fabric_id}")
async def delete_fabric(fabric_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Delete a fabric product"""
    result = await db.fabrics.delete_one({'id': fabric_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fabric not found")
    return {'message': 'Fabric deleted'}

@api_router.post("/orders/fabric")
async def create_fabric_order(order_data: Dict[str, Any]):
    """Create a fabric order"""
    order_id = f"FAB-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    order = {
        'id': order_id,
        'order_id': order_id,
        'order_type': 'fabric',
        'customer_name': order_data.get('customer_name'),
        'customer_email': order_data.get('customer_email'),
        'customer_phone': order_data.get('customer_phone'),
        'items': order_data.get('items', []),
        'total_price': order_data.get('total_price', 0),
        'status': 'pending_payment',
        'payment_status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Send order confirmation email
    try:
        email_html = get_order_confirmation_email(
            order_id=order_id,
            customer_name=order['customer_name'],
            total_amount=order['total_price'],
            order_type='Fabric'
        )
        await send_email_notification(
            to_email=order['customer_email'],
            subject=f'Order Confirmation - {order_id}',
            html_content=email_html
        )
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {str(e)}")
    
    return {
        'message': 'Fabric order created successfully',
        'order_id': order_id,
        'order': {k: v for k, v in order.items() if k != '_id'}
    }

# ==================== SOUVENIRS ====================
@api_router.get("/souvenirs")
async def get_souvenirs():
    """Get all active souvenirs"""
    souvenirs = await db.souvenirs.find({'is_active': True}, {'_id': 0}).to_list(100)
    return souvenirs

# Admin Souvenirs Management
@api_router.post("/admin/souvenirs")
async def create_souvenir(souvenir_data: Dict[str, Any], admin_user: Dict = Depends(get_admin_user)):
    """Create a new souvenir product"""
    souvenir = {
        'id': str(uuid.uuid4()),
        'name': souvenir_data.get('name'),
        'price': souvenir_data.get('price'),
        'branded_price': souvenir_data.get('branded_price'),
        'image_url': souvenir_data.get('image_url', ''),
        'description': souvenir_data.get('description', ''),
        'is_active': souvenir_data.get('is_active', True),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.souvenirs.insert_one(souvenir)
    return {'message': 'Souvenir created', 'id': souvenir['id']}

@api_router.put("/admin/souvenirs/{souvenir_id}")
async def update_souvenir(souvenir_id: str, souvenir_data: Dict[str, Any], admin_user: Dict = Depends(get_admin_user)):
    """Update a souvenir product"""
    update_data = {k: v for k, v in souvenir_data.items() if k not in ['id', '_id', 'created_at']}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    result = await db.souvenirs.update_one({'id': souvenir_id}, {'$set': update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Souvenir not found")
    return {'message': 'Souvenir updated'}

@api_router.delete("/admin/souvenirs/{souvenir_id}")
async def delete_souvenir(souvenir_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Delete a souvenir product"""
    result = await db.souvenirs.delete_one({'id': souvenir_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Souvenir not found")
    return {'message': 'Souvenir deleted'}

@api_router.post("/orders/souvenir")
async def create_souvenir_order(order_data: Dict[str, Any]):
    """Create a souvenir order"""
    order_id = f"SOU-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    order = {
        'id': order_id,
        'order_id': order_id,
        'order_type': 'souvenir',
        'customer_name': order_data.get('customer_name'),
        'customer_email': order_data.get('customer_email'),
        'customer_phone': order_data.get('customer_phone'),
        'items': order_data.get('items', []),
        'total_price': order_data.get('total_price', 0),
        'status': 'pending_payment',
        'payment_status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Send order confirmation email
    try:
        email_html = get_order_confirmation_email(
            order_id=order_id,
            customer_name=order['customer_name'],
            total_amount=order['total_price'],
            order_type='Souvenir'
        )
        await send_email_notification(
            to_email=order['customer_email'],
            subject=f'Order Confirmation - {order_id}',
            html_content=email_html
        )
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {str(e)}")
    
    return {
        'message': 'Souvenir order created successfully',
        'order_id': order_id,
        'order': {k: v for k, v in order.items() if k != '_id'}
    }

# ==================== DESIGN LAB ====================
@api_router.post("/design-inquiries")
async def create_design_inquiry(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(None),
    design_type: str = Form(...),
    description: str = Form(...),
    deadline: Optional[str] = Form(None),
    budget_range: Optional[str] = Form(None),
    reference_0: Optional[UploadFile] = File(None),
    reference_1: Optional[UploadFile] = File(None),
    reference_2: Optional[UploadFile] = File(None),
    reference_3: Optional[UploadFile] = File(None),
    reference_4: Optional[UploadFile] = File(None)
):
    """Submit a design services inquiry"""
    inquiry_code = f"DSN-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    
    # Collect reference files
    reference_files = [reference_0, reference_1, reference_2, reference_3, reference_4]
    reference_files = [f for f in reference_files if f and f.filename]
    
    # Handle file uploads
    uploaded_files = []
    if reference_files:
        UPLOAD_DIR = ROOT_DIR / 'uploads' / 'design_references'
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        for file in reference_files:
            if file and file.filename:
                file_ext = file.filename.split('.')[-1]
                filename = f"{uuid.uuid4()}.{file_ext}"
                file_path = UPLOAD_DIR / filename
                
                with open(file_path, 'wb') as f:
                    shutil.copyfileobj(file.file, f)
                
                uploaded_files.append(f"/api/uploads/design_references/{filename}")
    
    # Create inquiry record
    inquiry = {
        'id': inquiry_code,
        'inquiry_code': inquiry_code,
        'type': 'design_inquiry',
        'design_type': design_type,
        'full_name': full_name,
        'email': email,
        'phone': phone,
        'description': description,
        'deadline': deadline,
        'budget_range': budget_range,
        'reference_files': uploaded_files,
        'status': 'pending_review',
        'quote_amount': None,
        'admin_notes': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.design_inquiries.insert_one(inquiry)
    
    # Create admin notification
    await create_notification(
        'design_inquiry',
        'New Design Inquiry',
        f"{full_name} submitted a {design_type.replace('_', ' ')} design request",
        inquiry_code
    )
    
    # Send acknowledgment email
    try:
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #D90429; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; }}
                .inquiry-box {{ background: white; padding: 20px; border-left: 4px solid #D90429; margin: 20px 0; border-radius: 4px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Design Inquiry Received</h1>
                </div>
                <div class="content">
                    <p>Dear {full_name},</p>
                    <p>Thank you for your design inquiry! We've received your request and our team will review it shortly.</p>
                    
                    <div class="inquiry-box">
                        <h3>Inquiry Details</h3>
                        <p><strong>Reference Code:</strong> {inquiry_code}</p>
                        <p><strong>Service Type:</strong> {design_type.replace('_', ' ').title()}</p>
                        <p><strong>Budget Range:</strong> {budget_range or 'To be discussed'}</p>
                        <p><strong>Deadline:</strong> {deadline or 'Flexible'}</p>
                    </div>
                    
                    <p><strong>What happens next:</strong></p>
                    <ol>
                        <li>Our design team will review your request within 24 hours</li>
                        <li>You'll receive a custom quote via email or WhatsApp</li>
                        <li>Once approved, we'll start working on your design</li>
                        <li>You'll receive drafts for review and feedback</li>
                    </ol>
                    
                    <p>If you have any questions, feel free to reach out!</p>
                </div>
                <div class="footer">
                    <p>Temaruco Limited | Design Services</p>
                    <p>Reference Code: {inquiry_code}</p>
                </div>
            </div>
        </body>
        </html>
        """
        await send_email_notification(
            to_email=email,
            subject=f'Design Inquiry Received - {inquiry_code}',
            html_content=email_html
        )
    except Exception as e:
        logger.error(f"Failed to send design inquiry email: {str(e)}")
    
    return {
        'message': 'Design inquiry submitted successfully',
        'inquiry_code': inquiry_code
    }

@api_router.get("/admin/design-inquiries")
async def get_design_inquiries(admin_user: Dict = Depends(get_admin_user)):
    """Get all design inquiries for admin"""
    inquiries = await db.design_inquiries.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return inquiries

@api_router.patch("/admin/design-inquiries/{inquiry_code}")
async def update_design_inquiry(
    inquiry_code: str,
    status: Optional[str] = None,
    quote_amount: Optional[float] = None,
    admin_notes: Optional[str] = None,
    admin_user: Dict = Depends(get_admin_user)
):
    """Update design inquiry status"""
    update_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
    if status:
        update_data['status'] = status
    if quote_amount is not None:
        update_data['quote_amount'] = quote_amount
    if admin_notes:
        update_data['admin_notes'] = admin_notes
    
    result = await db.design_inquiries.update_one(
        {'inquiry_code': inquiry_code},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return {'message': 'Inquiry updated successfully'}

@api_router.post("/design-lab/request")
async def create_design_request(
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...),
    service_type: str = Form(...),
    description: str = Form(...),
    deadline: Optional[str] = Form(None),
    budget: Optional[str] = Form(None),
    reference_files: List[UploadFile] = File(None)
):
    """Submit a design lab request"""
    enquiry_code = f"DES-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    
    # Handle file uploads
    uploaded_files = []
    if reference_files:
        UPLOAD_DIR = ROOT_DIR / 'uploads' / 'design_references'
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        for file in reference_files:
            if file and file.filename:
                file_ext = file.filename.split('.')[-1]
                filename = f"{uuid.uuid4()}.{file_ext}"
                file_path = UPLOAD_DIR / filename
                
                with open(file_path, 'wb') as f:
                    shutil.copyfileobj(file.file, f)
                
                uploaded_files.append(f"/api/uploads/design_references/{filename}")
    
    # Create enquiry
    enquiry = {
        'id': enquiry_code,
        'enquiry_code': enquiry_code,
        'type': 'design_lab',
        'service_type': service_type,
        'customer_name': customer_name,
        'customer_email': customer_email,
        'customer_phone': customer_phone,
        'description': description,
        'deadline': deadline,
        'budget': budget,
        'reference_files': uploaded_files,
        'status': 'pending_review',
        'quote_amount': None,
        'quote_notes': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.enquiries.insert_one(enquiry)
    
    # Send acknowledgment email
    try:
        email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #D90429; color: white; padding: 20px; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; }}
                .enquiry-box {{ background: white; padding: 20px; border-left: 4px solid #D90429; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Design Request Received</h1>
                </div>
                <div class="content">
                    <p>Dear {customer_name},</p>
                    <p>Thank you for your design request! We've received your submission and our design team will review it shortly.</p>
                    
                    <div class="enquiry-box">
                        <h2>Request Details</h2>
                        <p><strong>Enquiry Code:</strong> {enquiry_code}</p>
                        <p><strong>Service Type:</strong> {service_type.replace('_', ' ').title()}</p>
                        <p><strong>Budget:</strong> {budget or 'To be discussed'}</p>
                        <p><strong>Deadline:</strong> {deadline or 'Flexible'}</p>
                    </div>
                    
                    <p><strong>What happens next:</strong></p>
                    <ol>
                        <li>Our design team will review your request within 24 hours</li>
                        <li>You'll receive a custom quote via email</li>
                        <li>Once approved, we'll start working on your design</li>
                        <li>You'll receive drafts for review and feedback</li>
                    </ol>
                </div>
                <div class="footer">
                    <p>Temaruco Limited | Design Lab</p>
                    <p>Keep this enquiry code for tracking: {enquiry_code}</p>
                </div>
            </div>
        </body>
        </html>
        """
        await send_email_notification(
            to_email=customer_email,
            subject=f'Design Request Received - {enquiry_code}',
            html_content=email_html
        )
    except Exception as e:
        logger.error(f"Failed to send design lab acknowledgment email: {str(e)}")
    
    return {
        'message': 'Design request submitted successfully',
        'enquiry_code': enquiry_code,
        'enquiry': {k: v for k, v in enquiry.items() if k != '_id'}
    }

@api_router.get("/design-lab/enquiry/{enquiry_code}")
async def get_design_enquiry(enquiry_code: str):
    """Get design lab enquiry status"""
    enquiry = await db.enquiries.find_one({'enquiry_code': enquiry_code}, {'_id': 0})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

# ==================== EMAIL NOTIFICATIONS ====================
async def send_email_notification(to_email: str, subject: str, html_content: str, tracking_id: str = None):
    """Send email notification with optional tracking pixel"""
    email_mock = os.environ.get('EMAIL_MOCK', 'true').lower() == 'true'
    
    # Add tracking pixel if tracking_id is provided
    if tracking_id:
        backend_url = os.environ.get('BACKEND_URL', 'https://picxpress-1.preview.emergentagent.com')
        tracking_pixel = f'<img src="{backend_url}/api/email/track/{tracking_id}" width="1" height="1" style="display:none;" alt="" />'
        # Insert tracking pixel before closing body tag
        if '</body>' in html_content:
            html_content = html_content.replace('</body>', f'{tracking_pixel}</body>')
        else:
            html_content += tracking_pixel
    
    if email_mock:
        # Mock mode - just log the email
        logger.info(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}")
        logger.info(f"[MOCK EMAIL] Content: {html_content[:200]}...")
        return True
    
    try:
        # Real SMTP sending (configure your SMTP settings)
        import aiosmtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER', '')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        from_email = os.environ.get('FROM_EMAIL', 'noreply@temaruco.com')
        
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = from_email
        message['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=True
        )
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

def get_order_confirmation_email(order_id: str, customer_name: str, total_amount: float, order_type: str, items: list = None):
    """Generate professional order confirmation email HTML"""
    
    # Generate items table if provided
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
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #D90429 0%, #a30320 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">TEMARUCO</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 12px; letter-spacing: 3px;">CLOTHING FACTORY</p>
                </div>
                
                <!-- Success Badge -->
                <div style="text-align: center; margin-top: -25px;">
                    <div style="display: inline-block; background: #22c55e; color: white; padding: 8px 24px; border-radius: 50px; font-size: 14px; font-weight: 600;">
                        ✓ Order Received
                    </div>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #18181b; margin: 20px 0 10px 0; font-size: 22px;">Thank You, {customer_name}!</h2>
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        Your <strong>{order_type}</strong> order has been received and is being processed.
                    </p>
                    
                    <!-- Order Summary Box -->
                    <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <div>
                                <p style="color: #71717a; font-size: 12px; margin: 0; text-transform: uppercase;">Order ID</p>
                                <p style="color: #18181b; font-size: 18px; font-weight: bold; margin: 4px 0 0 0;">{order_id}</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="color: #71717a; font-size: 12px; margin: 0; text-transform: uppercase;">Total</p>
                                <p style="color: #D90429; font-size: 24px; font-weight: bold; margin: 4px 0 0 0;">₦{total_amount:,.0f}</p>
                            </div>
                        </div>
                        <div style="border-top: 1px dashed #d4d4d8; padding-top: 15px;">
                            <p style="color: #71717a; font-size: 12px; margin: 0;">Status</p>
                            <p style="color: #f59e0b; font-size: 14px; font-weight: 600; margin: 4px 0 0 0;">⏳ Awaiting Payment</p>
                        </div>
                    </div>
                    
                    {items_html}
                    
                    <!-- Payment Instructions -->
                    <div style="background: #fef2f2; border-left: 4px solid #D90429; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <h3 style="color: #18181b; margin: 0 0 15px 0; font-size: 16px;">💳 Payment Instructions</h3>
                        <ol style="color: #52525b; margin: 0; padding-left: 20px; line-height: 2;">
                            <li>Transfer <strong>₦{total_amount:,.0f}</strong> to our bank account</li>
                            <li>Use <strong>{order_id}</strong> as payment reference</li>
                            <li>Send proof of payment via WhatsApp or email</li>
                        </ol>
                    </div>
                    
                    <!-- Bank Details -->
                    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
                        <h3 style="color: #18181b; margin: 0 0 15px 0; font-size: 14px;">🏦 Bank Details</h3>
                        <table style="width: 100%; font-size: 14px;">
                            <tr><td style="color: #71717a; padding: 4px 0;">Bank:</td><td style="color: #18181b; font-weight: 500;">Stanbic IBTC Bank</td></tr>
                            <tr><td style="color: #71717a; padding: 4px 0;">Account Name:</td><td style="color: #18181b; font-weight: 500;">Temaruco Limited</td></tr>
                            <tr><td style="color: #71717a; padding: 4px 0;">Account Number:</td><td style="color: #18181b; font-weight: 600; font-size: 16px;">0050431693</td></tr>
                        </table>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://picxpress-1.preview.emergentagent.com/order-summary/{order_id}" 
                           style="display: inline-block; background: #D90429; color: white; padding: 14px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 14px;">
                            View Order Details →
                        </a>
                    </div>
                    
                    <!-- Help -->
                    <p style="color: #71717a; font-size: 13px; text-align: center; margin: 25px 0 0 0;">
                        Questions? Reply to this email or WhatsApp us at <strong>+234 912 542 3902</strong>
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background: #18181b; padding: 25px; text-align: center;">
                    <p style="color: white; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Temaruco Clothing Factory</p>
                    <p style="color: #a1a1aa; margin: 0; font-size: 12px;">Inspire • Empower • Accomplish</p>
                    <p style="color: #71717a; margin: 15px 0 0 0; font-size: 11px;">
                        Lagos, Nigeria | temarucoltd@gmail.com | +234 912 542 3902
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def get_order_status_email(order_id: str, customer_name: str, new_status: str):
    """Generate order status update email HTML"""
    status_messages = {
        'payment_confirmed': 'Your payment has been confirmed!',
        'in_production': 'Your order is now in production!',
        'ready_for_delivery': 'Your order is ready for delivery!',
        'completed': 'Your order has been completed!',
        'delivered': 'Your order has been delivered!'
    }
    
    message = status_messages.get(new_status, f'Your order status has been updated to: {new_status}')
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #D90429; color: white; padding: 20px; text-align: center; }}
            .content {{ background: #f9f9f9; padding: 30px; }}
            .status-box {{ background: white; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; text-align: center; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Status Update</h1>
            </div>
            <div class="content">
                <p>Dear {customer_name},</p>
                <div class="status-box">
                    <h2>{message}</h2>
                    <p><strong>Order ID:</strong> {order_id}</p>
                    <p><strong>New Status:</strong> {new_status.replace('_', ' ').title()}</p>
                </div>
                <p>Track your order anytime at: <a href="https://picxpress-1.preview.emergentagent.com/order-summary/{order_id}">View Order</a></p>
            </div>
            <div class="footer">
                <p>Temaruco Limited | Premium Clothing Manufacturing</p>
            </div>
        </div>
    </body>
    </html>
    """

    return enquiry

# ==================== PAYMENTS (FLUTTERWAVE) ====================
# Flutterwave payment endpoints
FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3"

@api_router.post("/payments/flutterwave/initialize")
async def initialize_flutterwave_payment(payment_request: dict):
    """Initialize Flutterwave payment"""
    try:
        email = payment_request.get('email')
        amount = payment_request.get('amount')
        currency = payment_request.get('currency', 'NGN')
        order_id = payment_request.get('order_id')
        order_type = payment_request.get('order_type')
        customer_name = payment_request.get('customer_name', '')
        phone = payment_request.get('phone', '')
        
        # Save customer email
        existing_email = await db.customer_emails.find_one({'email': email})
        if existing_email:
            await db.customer_emails.update_one(
                {'email': email},
                {'$set': {'last_seen': datetime.now(timezone.utc).isoformat()}, '$inc': {'interaction_count': 1}}
            )
        else:
            await db.customer_emails.insert_one({
                'email': email, 'sources': ['payment'], 'interaction_count': 1,
                'first_seen': datetime.now(timezone.utc).isoformat(),
                'last_seen': datetime.now(timezone.utc).isoformat()
            })
        
        # Generate unique transaction reference
        tx_ref = f"TM-{datetime.now().strftime('%y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Store payment record
        payment_data = {
            'id': str(uuid.uuid4()),
            'tx_ref': tx_ref,
            'email': email,
            'amount': amount,
            'currency': currency,
            'order_type': order_type,
            'order_id': order_id,
            'customer_name': customer_name,
            'phone': phone,
            'status': 'pending',
            'provider': 'flutterwave',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        if PAYMENT_MOCK or not FLUTTERWAVE_SECRET_KEY:
            # Mock mode
            payment_data['is_mock'] = True
            await db.payments.insert_one(payment_data)
            logger.info(f"[MOCK PAYMENT] Initialized Flutterwave payment for {email}")
            return {
                'status': True,
                'message': 'Payment initialized (MOCK MODE)',
                'data': {'tx_ref': tx_ref, 'amount': amount, 'currency': currency}
            }
        
        # Real Flutterwave integration
        frontend_url = os.environ.get('FRONTEND_URL', 'https://picxpress-1.preview.emergentagent.com')
        
        payload = {
            'tx_ref': tx_ref,
            'amount': amount,
            'currency': currency,
            'payment_options': 'card,mobilemoney,ussd,banktransfer',
            'redirect_url': f"{frontend_url}/payment/callback",
            'customer': {'email': email, 'phonenumber': phone, 'name': customer_name},
            'customizations': {
                'title': 'Temaruco Payment',
                'description': f'Payment for order {order_id}',
                'logo': f"{frontend_url}/logo.png"
            },
            'meta': {'order_id': order_id, 'order_type': order_type}
        }
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f'{FLUTTERWAVE_BASE_URL}/payments',
                json=payload,
                headers={'Authorization': f'Bearer {FLUTTERWAVE_SECRET_KEY}', 'Content-Type': 'application/json'},
                timeout=30.0
            )
        
        if response.status_code != 200:
            logger.error(f"Flutterwave initialization failed: {response.text}")
            # Fallback to mock
            payment_data['is_mock'] = True
            await db.payments.insert_one(payment_data)
            return {'status': True, 'message': 'Payment initialized (fallback)', 'data': {'tx_ref': tx_ref, 'amount': amount, 'currency': currency}}
        
        flw_response = response.json()
        payment_data['flutterwave_response'] = flw_response.get('data', {})
        payment_data['is_mock'] = False
        await db.payments.insert_one(payment_data)
        
        return {
            'status': True,
            'message': 'Payment initialized',
            'data': {'tx_ref': tx_ref, 'amount': amount, 'currency': currency, 'link': flw_response.get('data', {}).get('link')}
        }
    except Exception as e:
        logger.error(f"Flutterwave payment initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/flutterwave/verify")
async def verify_flutterwave_payment(verify_request: dict):
    """Verify Flutterwave payment"""
    try:
        transaction_id = verify_request.get('transaction_id')
        tx_ref = verify_request.get('tx_ref')
        order_id = verify_request.get('order_id')
        
        payment_record = await db.payments.find_one({'tx_ref': tx_ref}, {'_id': 0})
        
        if payment_record and payment_record.get('is_mock'):
            await db.payments.update_one({'tx_ref': tx_ref}, {'$set': {'status': 'successful', 'verified_at': datetime.now(timezone.utc).isoformat()}})
            await db.orders.update_one({'id': order_id}, {'$set': {'payment_status': 'paid', 'payment_reference': tx_ref, 'payment_provider': 'flutterwave', 'status': OrderStatus.PAYMENT_VERIFIED}})
            return {'status': True, 'message': 'Payment verified (MOCK)', 'data': {'status': 'successful'}}
        
        if not FLUTTERWAVE_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Payment not configured")
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f'{FLUTTERWAVE_BASE_URL}/transactions/{transaction_id}/verify',
                headers={'Authorization': f'Bearer {FLUTTERWAVE_SECRET_KEY}'},
                timeout=30.0
            )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Verification failed")
        
        flw_response = response.json()
        if flw_response.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Verification failed")
        
        transaction_data = flw_response.get('data', {})
        transaction_status = transaction_data.get('status', 'failed')
        
        await db.payments.update_one(
            {'tx_ref': tx_ref},
            {'$set': {'status': transaction_status, 'transaction_id': transaction_id, 'flutterwave_response': transaction_data, 'verified_at': datetime.now(timezone.utc).isoformat()}}
        )
        
        if transaction_status == 'successful':
            await db.orders.update_one(
                {'id': order_id},
                {'$set': {'payment_status': 'paid', 'payment_reference': tx_ref, 'payment_provider': 'flutterwave', 'status': OrderStatus.PAYMENT_VERIFIED}}
            )
            
            # Auto-generate receipt for the order
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
            if order and not order.get('receipt_id'):
                receipt_id = await generate_invoice_id()
                order_details = {
                    'clothing_item': order.get('clothing_item', ''),
                    'quantity': order.get('quantity', order.get('total_quantity', 0)),
                    'color_quantities': order.get('color_quantities', {}),
                    'size_breakdown': order.get('size_breakdown', order.get('sizes', {})),
                    'print_type': order.get('print_type', ''),
                    'colors': order.get('colors', []),
                    'notes': order.get('notes', ''),
                    'cart_items': order.get('cart_items', []),
                }
                receipt_data = {
                    'id': str(uuid.uuid4()),
                    'receipt_id': receipt_id,
                    'receipt_number': receipt_id,
                    'order_id': order_id,
                    'order_number': order.get('order_id', order_id),
                    'customer_name': order.get('user_name', payment_record.get('customer_name', 'Customer')),
                    'customer_email': order.get('user_email', payment_record.get('email', '')),
                    'customer_phone': order.get('user_phone', payment_record.get('phone', '')),
                    'amount_paid': order.get('total_price', payment_record.get('amount', 0)),
                    'payment_method': 'Flutterwave',
                    'payment_reference': tx_ref,
                    'order_type': order.get('type', 'bulk'),
                    'order_details': order_details,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'issued_by': 'system'
                }
                await db.receipts.insert_one(receipt_data)
                await db.orders.update_one({'id': order_id}, {'$set': {'receipt_id': receipt_id}})
                logger.info(f"Receipt {receipt_id} created for order {order_id}")
            
            # Create notification
            await create_notification('payment_received', 'Payment Received', f"Flutterwave payment received for order {order_id}", order_id)
            
            # Send confirmation email
            if payment_record:
                await send_email_mock(payment_record['email'], "Payment Confirmed - Temaruco", f"Your payment of {payment_record.get('currency', 'NGN')} {payment_record['amount']:,.2f} has been confirmed. Order ID: {order_id}")
            
            logger.info(f"Order {order_id} payment verified via Flutterwave")
        
        return {'status': True, 'message': 'Payment verified', 'data': transaction_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flutterwave payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payments/flutterwave/status/{tx_ref}")
async def get_flutterwave_payment_status(tx_ref: str):
    """Get Flutterwave payment status"""
    try:
        payment_record = await db.payments.find_one({'tx_ref': tx_ref}, {'_id': 0})
        if not payment_record:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if payment_record.get('is_mock') or not FLUTTERWAVE_SECRET_KEY:
            return {'status': True, 'data': {'status': payment_record.get('status', 'pending'), 'amount': payment_record.get('amount'), 'currency': payment_record.get('currency', 'NGN')}}
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f'{FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference',
                params={'tx_ref': tx_ref},
                headers={'Authorization': f'Bearer {FLUTTERWAVE_SECRET_KEY}'},
                timeout=30.0
            )
        
        if response.status_code == 200:
            flw_response = response.json()
            if flw_response.get('status') == 'success':
                return {'status': True, 'data': flw_response.get('data', {})}
        
        return {'status': True, 'data': {'status': payment_record.get('status', 'pending'), 'amount': payment_record.get('amount'), 'currency': payment_record.get('currency', 'NGN')}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flutterwave status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payments/provider")
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

@api_router.post("/webhook/flutterwave")
async def flutterwave_webhook(request: Request):
    """Handle Flutterwave webhook events"""
    try:
        webhook_secret = os.environ.get('FLUTTERWAVE_WEBHOOK_SECRET', '')
        signature = request.headers.get('verif-hash', '')
        
        if webhook_secret and signature != webhook_secret:
            logger.warning("Invalid Flutterwave webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        payload = await request.json()
        event = payload.get('event')
        data = payload.get('data', {})
        
        logger.info(f"Flutterwave webhook received: {event}")
        
        if event == 'charge.completed' and data.get('status') == 'successful':
            tx_ref = data.get('tx_ref')
            if tx_ref:
                await db.payments.update_one(
                    {'tx_ref': tx_ref},
                    {'$set': {'status': 'successful', 'transaction_id': data.get('id'), 'flutterwave_response': data, 'webhook_verified_at': datetime.now(timezone.utc).isoformat()}}
                )
                
                order_id = data.get('meta', {}).get('order_id')
                if not order_id:
                    payment = await db.payments.find_one({'tx_ref': tx_ref}, {'_id': 0})
                    order_id = payment.get('order_id') if payment else None
                
                if order_id:
                    await db.orders.update_one(
                        {'id': order_id},
                        {'$set': {'payment_status': 'paid', 'payment_reference': tx_ref, 'payment_provider': 'flutterwave', 'status': OrderStatus.PAYMENT_VERIFIED}}
                    )
                    logger.info(f"Order {order_id} payment verified via Flutterwave webhook")
        
        return {'status': 'success'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flutterwave webhook error: {str(e)}")
        return {'status': 'received'}

# ==================== ADMIN ROUTES ====================
@api_router.get("/admin/dashboard")
async def get_admin_dashboard(request: Request):
    admin_user = await get_admin_user(request)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get today's orders
    today_orders = await db.orders.find({
        'created_at': {'$gte': today.isoformat()}
    }, {'_id': 0}).to_list(100)
    
    # Count by status
    pending_payment = len([o for o in today_orders if o['status'] == OrderStatus.PENDING_PAYMENT])
    payment_submitted = len([o for o in today_orders if o['status'] == OrderStatus.PAYMENT_SUBMITTED])
    payment_verified = len([o for o in today_orders if o['status'] == OrderStatus.PAYMENT_VERIFIED])
    in_production = len([o for o in today_orders if o['status'] == OrderStatus.IN_PRODUCTION])
    ready_for_delivery = len([o for o in today_orders if o['status'] == OrderStatus.READY_FOR_DELIVERY])
    completed = len([o for o in today_orders if o['status'] == OrderStatus.COMPLETED])
    delivered = len([o for o in today_orders if o['status'] == OrderStatus.DELIVERED])
    
    # Calculate revenue (only verified payments)
    total_revenue = sum(o.get('total_price', 0) for o in today_orders if o.get('payment_status') == 'verified')
    
    # Get recent orders
    recent_orders = await db.orders.find({}, {'_id': 0}).sort('created_at', -1).limit(10).to_list(10)
    
    return {
        'today_stats': {
            'pending_payment': pending_payment,
            'payment_submitted': payment_submitted,
            'payment_verified': payment_verified,
            'in_production': in_production,
            'ready_for_delivery': ready_for_delivery,
            'completed': completed,
            'delivered': delivered,
            'total_orders': len(today_orders),
            'revenue': total_revenue
        },
        'recent_orders': recent_orders
    }

@api_router.get("/admin/analytics/revenue")
async def get_revenue_analytics(
    days: int = 30,
    admin_user: Dict = Depends(get_admin_user)
):
    """Get revenue analytics with daily breakdown"""
    days = min(days, 365)  # Limit to 1 year
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Get all orders in the period
    orders = await db.orders.find({
        'created_at': {'$gte': start_date.isoformat()}
    }, {'_id': 0}).to_list(10000)
    
    # Daily revenue breakdown
    daily_revenue = {}
    order_type_revenue = {}
    status_counts = {}
    
    for order in orders:
        # Parse date
        created_at = order.get('created_at', '')
        if created_at:
            try:
                if isinstance(created_at, str):
                    date_str = created_at[:10]
                else:
                    date_str = created_at.strftime('%Y-%m-%d')
            except:
                continue
            
            price = order.get('total_price', 0) or 0
            order_type = order.get('type', 'unknown')
            status = order.get('status', 'unknown')
            
            # Daily aggregation
            if date_str not in daily_revenue:
                daily_revenue[date_str] = {'revenue': 0, 'orders': 0}
            daily_revenue[date_str]['revenue'] += price
            daily_revenue[date_str]['orders'] += 1
            
            # Order type breakdown
            if order_type not in order_type_revenue:
                order_type_revenue[order_type] = {'revenue': 0, 'orders': 0}
            order_type_revenue[order_type]['revenue'] += price
            order_type_revenue[order_type]['orders'] += 1
            
            # Status counts
            if status not in status_counts:
                status_counts[status] = 0
            status_counts[status] += 1
    
    # Fill missing dates
    daily_data = []
    current = start_date
    while current <= end_date:
        date_str = current.strftime('%Y-%m-%d')
        if date_str in daily_revenue:
            daily_data.append({
                'date': date_str,
                'revenue': daily_revenue[date_str]['revenue'],
                'orders': daily_revenue[date_str]['orders']
            })
        else:
            daily_data.append({
                'date': date_str,
                'revenue': 0,
                'orders': 0
            })
        current += timedelta(days=1)
    
    # Calculate totals
    total_revenue = sum(d['revenue'] for d in daily_data)
    total_orders = sum(d['orders'] for d in daily_data)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    # Convert order_type_revenue to list
    type_breakdown = [
        {'type': k, 'revenue': v['revenue'], 'orders': v['orders']}
        for k, v in order_type_revenue.items()
    ]
    type_breakdown.sort(key=lambda x: x['revenue'], reverse=True)
    
    return {
        'period_days': days,
        'total_revenue': total_revenue,
        'total_orders': total_orders,
        'avg_order_value': round(avg_order_value, 2),
        'daily_data': daily_data,
        'type_breakdown': type_breakdown,
        'status_breakdown': status_counts
    }

@api_router.get("/admin/analytics/products")
async def get_product_analytics(
    days: int = 30,
    admin_user: Dict = Depends(get_admin_user)
):
    """Get best selling products analytics"""
    days = min(days, 365)
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Get orders with items
    orders = await db.orders.find({
        'created_at': {'$gte': start_date.isoformat()}
    }, {'_id': 0, 'items': 1, 'type': 1}).to_list(5000)
    
    product_sales = {}
    
    for order in orders:
        items = order.get('items', [])
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    name = item.get('name', item.get('item_name', 'Unknown'))
                    quantity = item.get('quantity', 1)
                    price = item.get('price', item.get('unit_price', 0)) or 0
                    
                    if name not in product_sales:
                        product_sales[name] = {'quantity': 0, 'revenue': 0}
                    product_sales[name]['quantity'] += quantity
                    product_sales[name]['revenue'] += price * quantity
    
    # Convert to list and sort by quantity
    products = [
        {'name': k, 'quantity': v['quantity'], 'revenue': v['revenue']}
        for k, v in product_sales.items()
    ]
    products.sort(key=lambda x: x['quantity'], reverse=True)
    
    return {
        'period_days': days,
        'top_products': products[:20],  # Top 20 products
        'total_products_sold': sum(p['quantity'] for p in products)
    }

@api_router.get("/admin/analytics/advanced")
async def get_advanced_analytics(
    days: int = 30,
    admin_user: Dict = Depends(get_admin_user)
):
    """Get advanced analytics including customer insights and conversion metrics"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Customer Analytics
    total_customers = await db.clients.count_documents({})
    new_customers = await db.clients.count_documents({
        'created_at': {'$gte': start_date.isoformat()}
    })
    
    # Repeat customers (more than 1 order)
    repeat_customer_pipeline = [
        {'$match': {'created_at': {'$gte': start_date.isoformat()}}},
        {'$group': {'_id': '$user_email', 'order_count': {'$sum': 1}}},
        {'$match': {'order_count': {'$gt': 1}}},
        {'$count': 'repeat_customers'}
    ]
    repeat_result = await db.orders.aggregate(repeat_customer_pipeline).to_list(1)
    repeat_customers = repeat_result[0]['repeat_customers'] if repeat_result else 0
    
    # Order Conversion Metrics
    total_orders = await db.orders.count_documents({
        'created_at': {'$gte': start_date.isoformat()}
    })
    completed_orders = await db.orders.count_documents({
        'status': {'$in': ['completed', 'delivered']},
        'created_at': {'$gte': start_date.isoformat()}
    })
    cancelled_orders = await db.orders.count_documents({
        'status': 'cancelled',
        'created_at': {'$gte': start_date.isoformat()}
    })
    
    completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0
    cancellation_rate = (cancelled_orders / total_orders * 100) if total_orders > 0 else 0
    
    # Revenue by Hour of Day
    hourly_pipeline = [
        {'$match': {
            'created_at': {'$gte': start_date.isoformat()},
            'status': {'$in': ['completed', 'delivered', 'payment_verified', 'in_production']}
        }},
        {'$addFields': {
            'hour': {'$hour': {'$dateFromString': {'dateString': '$created_at'}}}
        }},
        {'$group': {
            '_id': '$hour',
            'orders': {'$sum': 1},
            'revenue': {'$sum': '$total_price'}
        }},
        {'$sort': {'_id': 1}}
    ]
    hourly_data = await db.orders.aggregate(hourly_pipeline).to_list(24)
    hourly_breakdown = [{'hour': h['_id'], 'orders': h['orders'], 'revenue': h['revenue']} for h in hourly_data]
    
    # Revenue by Day of Week
    weekday_pipeline = [
        {'$match': {
            'created_at': {'$gte': start_date.isoformat()},
            'status': {'$in': ['completed', 'delivered', 'payment_verified', 'in_production']}
        }},
        {'$addFields': {
            'dayOfWeek': {'$dayOfWeek': {'$dateFromString': {'dateString': '$created_at'}}}
        }},
        {'$group': {
            '_id': '$dayOfWeek',
            'orders': {'$sum': 1},
            'revenue': {'$sum': '$total_price'}
        }},
        {'$sort': {'_id': 1}}
    ]
    weekday_data = await db.orders.aggregate(weekday_pipeline).to_list(7)
    days_map = {1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat'}
    weekday_breakdown = [{'day': days_map.get(d['_id'], 'Unknown'), 'orders': d['orders'], 'revenue': d['revenue']} for d in weekday_data]
    
    # Top Customer Locations
    location_pipeline = [
        {'$match': {'created_at': {'$gte': start_date.isoformat()}}},
        {'$group': {
            '_id': {'$ifNull': ['$delivery_state', '$delivery_city']},
            'orders': {'$sum': 1},
            'revenue': {'$sum': '$total_price'}
        }},
        {'$match': {'_id': {'$ne': None}}},
        {'$sort': {'orders': -1}},
        {'$limit': 10}
    ]
    location_data = await db.orders.aggregate(location_pipeline).to_list(10)
    top_locations = [{'location': l['_id'], 'orders': l['orders'], 'revenue': l['revenue']} for l in location_data]
    
    # Quote Conversion (quotes to orders)
    total_quotes = await db.manual_quotes.count_documents({
        'created_at': {'$gte': start_date.isoformat()}
    })
    paid_quotes = await db.manual_quotes.count_documents({
        'status': 'paid',
        'created_at': {'$gte': start_date.isoformat()}
    })
    quote_conversion = (paid_quotes / total_quotes * 100) if total_quotes > 0 else 0
    
    # Average Time to Complete Order
    completed_orders_data = await db.orders.find({
        'status': {'$in': ['completed', 'delivered']},
        'created_at': {'$gte': start_date.isoformat()}
    }, {'_id': 0, 'created_at': 1, 'completed_at': 1, 'delivered_at': 1}).to_list(500)
    
    completion_times = []
    for order in completed_orders_data:
        try:
            start = datetime.fromisoformat(order['created_at'].replace('Z', '+00:00'))
            end_field = order.get('delivered_at') or order.get('completed_at')
            if end_field:
                end = datetime.fromisoformat(end_field.replace('Z', '+00:00'))
                completion_times.append((end - start).days)
        except:
            pass
    
    avg_completion_days = sum(completion_times) / len(completion_times) if completion_times else 0
    
    return {
        'period_days': days,
        'customer_insights': {
            'total_customers': total_customers,
            'new_customers': new_customers,
            'repeat_customers': repeat_customers,
            'customer_retention_rate': (repeat_customers / total_customers * 100) if total_customers > 0 else 0
        },
        'conversion_metrics': {
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'completion_rate': round(completion_rate, 1),
            'cancellation_rate': round(cancellation_rate, 1),
            'quote_conversion_rate': round(quote_conversion, 1),
            'avg_completion_days': round(avg_completion_days, 1)
        },
        'hourly_breakdown': hourly_breakdown,
        'weekday_breakdown': weekday_breakdown,
        'top_locations': top_locations
    }

@api_router.get("/admin/orders")
async def get_all_orders(
    order_type: Optional[OrderType] = None,
    status: Optional[OrderStatus] = None,
    admin_user: Dict = Depends(get_admin_user),
    limit: int = 100,
    skip: int = 0
):
    query = {}
    if order_type:
        query['type'] = order_type
    if status:
        query['status'] = status
    
    # Limit max results to prevent abuse
    limit = min(limit, 500)
    
    orders = await db.orders.find(query, {'_id': 0}).sort('created_at', -1).limit(limit).skip(skip).to_list(limit)
    return orders

@api_router.get("/admin/orders/search")
async def search_orders(
    order_id: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    request: Request = None
):
    """Admin: Search orders by Order ID, email, or phone"""
    admin_user = await get_admin_user(request)
    
    query = {}
    if order_id:
        # Search by TM-MMYY-XXXXXX format or UUID
        query['$or'] = [
            {'id': order_id},
            {'order_id': order_id},
            {'order_id': {'$regex': order_id, '$options': 'i'}}
        ]
    elif email:
        query['user_email'] = {'$regex': email, '$options': 'i'}
    elif phone:
        query['$or'] = [
            {'user_phone': {'$regex': phone, '$options': 'i'}},
            {'delivery_phone': {'$regex': phone, '$options': 'i'}}
        ]
    
    orders = await db.orders.find(query, {'_id': 0}).sort('created_at', -1).limit(50).to_list(50)
    return orders

@api_router.get("/admin/production/dashboard")
async def get_production_dashboard(request: Request):
    """Admin: Get production dashboard with orders ready for production"""
    admin_user = await get_admin_user(request)
    
    # Get orders by status
    payment_verified = await db.orders.find(
        {'status': OrderStatus.PAYMENT_VERIFIED},
        {'_id': 0}
    ).sort('created_at', 1).to_list(100)
    
    in_production = await db.orders.find(
        {'status': OrderStatus.IN_PRODUCTION},
        {'_id': 0}
    ).sort('production_deadline', 1).to_list(100)
    
    ready_for_delivery = await db.orders.find(
        {'status': OrderStatus.READY_FOR_DELIVERY},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    # Get statistics
    total_in_production = len(in_production)
    pending_verification = await db.orders.count_documents({'status': OrderStatus.PAYMENT_SUBMITTED})
    
    return {
        'payment_verified': payment_verified,
        'in_production': in_production,
        'ready_for_delivery': ready_for_delivery,
        'statistics': {
            'total_in_production': total_in_production,
            'pending_verification': pending_verification,
            'ready_for_delivery': len(ready_for_delivery)
        }
    }

@api_router.patch("/admin/orders/{order_id}/verify-payment")
async def verify_payment(
    order_id: str,
    notes: Optional[str] = None,
    request: Request = None
):
    """Admin: Verify payment and update order status + add to income"""
    admin_user = await get_admin_user(request)
    
    # Get order details first
    order = await db.orders.find_one({'$or': [{'id': order_id}, {'order_id': order_id}]}, {'_id': 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        'status': OrderStatus.PAYMENT_VERIFIED,
        'payment_status': 'verified',
        'payment_verified_at': datetime.now(timezone.utc).isoformat(),
        'payment_verified_by': admin_user['email'],
        'payment_verification_notes': notes,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.orders.update_one(
        {'$or': [{'id': order_id}, {'order_id': order_id}]},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # ✅ NEW: Add to income/financials immediately upon payment verification
    # Record this as income in the financial records
    income_record = {
        'id': str(uuid.uuid4()),
        'transaction_id': f"INC-{order_id}",
        'type': 'income',
        'category': 'order_payment',
        'order_id': order_id,
        'order_type': order.get('type', 'unknown'),
        'amount': order.get('total_price', 0),
        'description': f"Payment verified for order {order_id} - {order.get('type', 'order').upper()}",
        'customer_name': order.get('user_name', 'N/A'),
        'customer_email': order.get('user_email', 'N/A'),
        'verified_by': admin_user['email'],
        'date': datetime.now(timezone.utc).date().isoformat(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.financial_transactions.insert_one(income_record)
    
    # Create notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'type': 'payment_verified',
        'order_id': order_id,
        'message': f"Payment verified for order {order_id} - Ready for production",
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    # Send email to customer (mocked)
    if order:
        await send_email_mock(
            order['user_email'],
            "Payment Confirmed - Temaruco",
            f"Your payment for order {order_id} has been confirmed. Your order is now in the production queue."
        )
    
    return {
        'message': 'Payment verified and income recorded successfully', 
        'order_id': order_id,
        'income_recorded': income_record['amount']
    }

@api_router.patch("/admin/orders/{order_id}/assign-tailor")
async def assign_tailor(
    order_id: str,
    request: Request
):
    """Admin: Assign tailor and set production deadline"""
    admin_user = await get_admin_user(request)
    
    # Get data from request body
    body = await request.json()
    tailor_name = body.get('tailor_name')
    deadline = body.get('deadline')
    
    if not tailor_name:
        raise HTTPException(status_code=400, detail="Tailor name is required")
    
    update_data = {
        'tailor_assigned': tailor_name,
        'production_deadline': deadline,
        'status': OrderStatus.IN_PRODUCTION,
        'production_started_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.orders.update_one(
        {'$or': [{'id': order_id}, {'order_id': order_id}]},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'type': 'tailor_assigned',
        'order_id': order_id,
        'message': f"Order {order_id} assigned to {tailor_name}",
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    return {'message': 'Tailor assigned successfully'}


@api_router.patch("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    notes: Optional[str] = None,
    admin_user: Dict = Depends(get_admin_user)
):
    update_data = {
        'status': status,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if notes:
        update_data['admin_notes'] = notes
    
    result = await db.orders.update_one({'id': order_id}, {'$set': update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Auto-generate receipt if payment received or completed
    if status in ['payment_verified', 'in_production', 'ready_for_delivery', 'completed', 'delivered']:
        order = await db.orders.find_one({'id': order_id}, {'_id': 0})
        if order and not order.get('receipt_id'):
            # Generate receipt with full order details
            receipt_id = await generate_invoice_id()
            # Prepare order details based on order type
            order_details = {
                'clothing_item': order.get('clothing_item', ''),
                'quantity': order.get('quantity', order.get('total_quantity', 0)),
                'color_quantities': order.get('color_quantities', {}),
                'size_breakdown': order.get('size_breakdown', {}),
                'print_type': order.get('print_type', ''),
                'fabric_quality': order.get('fabric_quality', ''),
                'print_size': order.get('print_size', ''),
                'colors': order.get('colors', []),
                'notes': order.get('notes', ''),
                'cart_items': order.get('cart_items', []),  # For boutique orders
                'items': order.get('items', []),  # For multi-item POD orders
            }
            
            # For POD orders, flatten pod_details into order_details
            if order.get('type') == 'pod' and order.get('pod_details'):
                pod_details = order.get('pod_details', {})
                order_details.update({
                    'shirt_quality': pod_details.get('shirt_quality', 'Standard'),
                    'print_size': pod_details.get('print_size', 'A4'),
                    'quantity': pod_details.get('quantity', 1),
                    'design_url': pod_details.get('design_url', ''),
                })
            
            receipt_data = {
                'id': str(uuid.uuid4()),
                'receipt_id': receipt_id,
                'receipt_number': receipt_id,
                'order_id': order_id,
                'order_number': order.get('order_id', order_id),
                'customer_name': order.get('user_name', 'Customer'),
                'customer_email': order.get('user_email', ''),
                'customer_phone': order.get('user_phone', ''),
                'amount_paid': order.get('total_price', 0),
                'payment_method': order.get('payment_method', 'Bank Transfer'),
                'order_type': order.get('type', 'bulk'),
                'order_details': order_details,
                'pricing_breakdown': order.get('pricing_breakdown', {}),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'issued_by': admin_user['email']
            }
            await db.receipts.insert_one(receipt_data)
            
            # Update order with receipt_id
            await db.orders.update_one(
                {'id': order_id},
                {'$set': {'receipt_id': receipt_id}}
            )
    
    # Create notification for status change
    order = await db.orders.find_one({'id': order_id}, {'_id': 0})
    if order:
        await db.notifications.insert_one({
            'id': str(uuid.uuid4()),
            'type': 'status_change',
            'order_id': order_id,
            'message': f"Order {order_id[:8]} status changed to {status}",
            'read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        # Send email to customer (mocked)
        await send_email_mock(
            order['user_email'],
            f"Order Status Update - {status}",
            f"Your order {order_id[:8]} status has been updated to: {status}"
        )
    
    return {'message': 'Order status updated successfully'}

@api_router.post("/admin/products")
async def create_product(product: AdminProductCreate, admin_user: Dict = Depends(get_admin_user)):
    product_id = str(uuid.uuid4())
    
    product_data = {
        'id': product_id,
        'name': product.name,
        'description': product.description,
        'price': product.price,
        'category': product.category,
        'sizes': product.sizes,
        'image_url': product.image_url,
        'bulk_base_price': product.bulk_base_price,
        'in_stock': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.boutique_products.insert_one(product_data)
    
    del product_data['_id']
    return product_data

@api_router.get("/admin/notifications")
async def get_notifications(admin_user: Dict = Depends(get_admin_user)):
    notifications = await db.notifications.find({}, {'_id': 0}).sort('created_at', -1).limit(50).to_list(50)
    return notifications

@api_router.patch("/admin/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, admin_user: Dict = Depends(get_admin_user)):
    await db.notifications.update_one({'id': notification_id}, {'$set': {'read': True}})
    return {'message': 'Notification marked as read'}

# ==================== CMS ROUTES ====================
@api_router.get("/cms/content")
async def get_cms_content():
    content = await db.cms_content.find({}, {'_id': 0}).to_list(1000)
    return content

@api_router.get("/cms/content/{key}")
async def get_cms_content_by_key(key: str):
    content = await db.cms_content.find_one({'key': key}, {'_id': 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content

@api_router.get("/cms/settings")
async def get_public_cms_settings():
    """Public endpoint for CMS settings (logo, company info - no sensitive data)"""
    settings = await db.cms_settings.find_one({}, {'_id': 0})
    
    if not settings:
        return {
            'logo_url': '',
            'company_name': 'Temaruco Clothing Factory',
            'tagline': 'Inspire • Empower • Accomplish',
            'phone': '+234 912 542 3902',
            'email': 'temarucoltd@gmail.com',
            'address': 'Lagos, Nigeria'
        }
    
    # Return only public information
    return {
        'logo_url': settings.get('logo_url', ''),
        'company_name': settings.get('company_name', 'Temaruco Clothing Factory'),
        'tagline': settings.get('tagline', 'Inspire • Empower • Accomplish'),
        'phone': settings.get('phone', '+234 912 542 3902'),
        'email': settings.get('email', 'temarucoltd@gmail.com'),
        'address': settings.get('address', 'Lagos, Nigeria')
    }

@api_router.post("/admin/cms/content")
async def update_cms_content(content: CMSContent, request: Request):
    """Super Admin Only: Update CMS content"""
    super_admin = await get_super_admin_user(request)
    existing = await db.cms_content.find_one({'key': content.key})
    
    content_data = {
        'key': content.key,
        'value': content.value,
        'section': content.section,
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': super_admin['email']
    }
    
    if existing:
        await db.cms_content.update_one({'key': content.key}, {'$set': content_data})
    else:
        content_data['created_at'] = datetime.now(timezone.utc).isoformat()
        await db.cms_content.insert_one(content_data)
    
    return {'message': 'Content updated successfully', 'data': content_data}

@api_router.get("/admin/cms/settings")
async def get_cms_settings(admin_user: Dict = Depends(get_admin_user)):
    settings = await db.cms_settings.find_one({}, {'_id': 0})
    if not settings:
        settings = {
            'logo_url': '',
            'company_name': 'Temaruco Clothing Factory',
            'tagline': 'Inspire • Empower • Accomplish',
            'phone': '+234 912 542 3902',
            'email': 'temarucoltd@gmail.com',
            'address': 'Lagos, Nigeria',
            'whatsapp': '+2349125423902',
            # Bank Transfer Details
            'bank_name': 'Stanbic IBTC Bank',
            'account_name': 'Temaruco Limited',
            'account_number': '0050431693',
            # POD Pricing Settings
            'pod_shirt_quality_prices': {
                'Standard': 2000,   # Basic quality
                'Premium': 2800,    # Better quality
                'Luxury': 3500      # Best quality
            },
            'pod_print_prices': {
                'Badge': 500,
                'A4': 800,
                'A3': 1200,
                'A2': 1800,
                'A1': 2500
            },
            'bulk_order_base_prices': {
                'T-Shirt': 1800,
                'Polo Shirt': 2500,
                'Hoodie': 4500,
                'Corporate Shirt': 3200,
                'Uniform': 3500,
                'Senator Wear': 8000,
                'Agbada': 15000,
                'Kaftan': 12000
            },
            'bulk_order_discounts': {
                '50': 5,    # 50+ items = 5% discount
                '100': 10,  # 100+ items = 10% discount
                '200': 15,  # 200+ items = 15% discount
                '500': 20   # 500+ items = 20% discount
            }
        }
    return settings

@api_router.get("/pricing")
async def get_public_pricing():
    """Public endpoint for pricing information"""
    settings = await db.cms_settings.find_one({}, {'_id': 0})
    
    if not settings:
        return {
            'pod_shirt_quality_prices': {
                'Standard': 2000, 'Premium': 2800, 'Luxury': 3500
            },
            'pod_print_prices': {
                'Badge': 500, 'A4': 800, 'A3': 1200, 'A2': 1800, 'A1': 2500
            },
            'bulk_order_discounts': {
                '50': 5, '100': 10, '200': 15, '500': 20
            }
        }
    
    return {
        'pod_shirt_quality_prices': settings.get('pod_shirt_quality_prices', {
            'Standard': 2000, 'Premium': 2800, 'Luxury': 3500
        }),
        'pod_print_prices': settings.get('pod_print_prices', {
            'Badge': 500, 'A4': 800, 'A3': 1200, 'A2': 1800, 'A1': 2500
        }),
        'bulk_order_discounts': settings.get('bulk_order_discounts', {
            '50': 5, '100': 10, '200': 15, '500': 20
        })
    }

@api_router.post("/admin/cms/settings")
async def update_cms_settings(settings: Dict[str, Any], request: Request):
    """Admin with CMS role OR Super Admin: Update CMS settings including pricing"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is super admin OR has CMS role (for pricing) or manage_products
    is_super_admin = user.get('is_super_admin', False)
    can_manage_cms = user.get('role', {}).get('can_manage_cms', False)
    can_manage_products = user.get('role', {}).get('can_manage_products', False)
    
    if not (is_super_admin or can_manage_cms or can_manage_products):
        raise HTTPException(status_code=403, detail="Access denied. Requires management permission.")
    
    settings['updated_at'] = datetime.now(timezone.utc).isoformat()
    settings['updated_by'] = user['email']
    
    await db.cms_settings.update_one({}, {'$set': settings}, upsert=True)
    return {'message': 'Settings updated successfully'}


# ==================== HELPER ENDPOINTS FOR ADMIN ====================
@api_router.get("/admin/orders/lookup/{code}")
async def lookup_order_by_code(code: str, admin_user: Dict = Depends(get_admin_user)):
    """Lookup order by order ID or enquiry code"""
    # Check if it's an enquiry code (ENQ-MMYY-XXXXXX)
    if code.startswith('ENQ-'):
        request = await db.custom_order_requests.find_one(
            {'enquiry_code': code},
            {'_id': 0}
        )
        if request:
            return {
                'type': 'enquiry',
                'code': code,
                'data': request
            }
    
    # Check if it's an order ID (TM-MMYY-XXXXXX)
    order = await db.orders.find_one(
        {'$or': [{'order_id': code}, {'id': code}]},
        {'_id': 0}
    )
    if order:
        return {
            'type': 'order',
            'code': code,
            'data': order
        }
    
    raise HTTPException(status_code=404, detail="Order or enquiry not found")

@api_router.post("/admin/orders/walk-in")
async def create_walk_in_order(
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...),
    items_description: str = Form(...),
    total_amount: float = Form(...),
    notes: Optional[str] = Form(None),
    admin_user: Dict = Depends(get_admin_user)
):
    """Create order for walk-in client - generates order ID for payment reference"""
    
    # Generate order ID
    order_id = await generate_order_id()
    
    walk_in_order = {
        'id': order_id,
        'order_id': order_id,
        'user_id': None,
        'user_email': customer_email,
        'user_name': customer_name,
        'user_phone': customer_phone,
        'type': 'walk_in',
        'items_description': items_description,
        'total_price': total_amount,
        'notes': notes,
        'status': OrderStatus.PENDING_PAYMENT,
        'payment_status': 'pending_payment',
        'created_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(walk_in_order)
    
    # Create notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'type': 'walk_in_order',
        'order_id': order_id,
        'message': f"Walk-in order {order_id} created for {customer_name}",
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    del walk_in_order['_id']
    return walk_in_order


# ==================== MANUAL QUOTES/INVOICES ====================
@api_router.post("/admin/quotes/create")
async def create_manual_quote(quote_data: ManualQuoteCreate, admin_user: Dict = Depends(get_admin_user)):
    quote_id = str(uuid.uuid4())
    quote_number = await generate_quote_id()  # Use new format: QT-MMYY-XXXXXX
    
    quote = {
        'id': quote_id,
        'quote_number': quote_number,
        'quote_type': quote_data.quote_type,
        'client_name': quote_data.client_name,
        'client_email': quote_data.client_email,
        'client_phone': quote_data.client_phone,
        'client_address': quote_data.client_address,
        'items': quote_data.items,
        'subtotal': quote_data.subtotal,
        'tax': quote_data.tax,
        'discount': quote_data.discount,
        'total': quote_data.total,
        'notes': quote_data.notes,
        'created_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'status': 'draft'
    }
    
    await db.manual_quotes.insert_one(quote)
    
    # Create notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'type': 'manual_quote_created',
        'quote_id': quote_id,
        'message': f"Manual {quote_data.quote_type} {quote_number} created for {quote_data.client_name}",
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    del quote['_id']
    return quote

@api_router.get("/admin/quotes")
async def get_manual_quotes(
    quote_type: Optional[str] = None,
    admin_user: Dict = Depends(get_admin_user)
):
    query = {}
    if quote_type:
        query['quote_type'] = quote_type
    
    quotes = await db.manual_quotes.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return quotes

@api_router.get("/admin/quotes/reminder-status")
async def get_quote_reminder_status(admin_user: Dict = Depends(get_admin_user)):
    """Get status of quote reminders"""
    total_pending = await db.manual_quotes.count_documents({'status': {'$in': ['draft', 'pending']}})
    reminder_3d = await db.manual_quotes.count_documents({'reminder_3d_sent': True})
    reminder_7d = await db.manual_quotes.count_documents({'reminder_7d_sent': True})
    reminder_14d = await db.manual_quotes.count_documents({'reminder_14d_sent': True})
    
    return {
        'total_pending_quotes': total_pending,
        'reminders_sent': {'3_day': reminder_3d, '7_day': reminder_7d, '14_day': reminder_14d},
        'scheduler_running': scheduler.running if scheduler else False
    }

@api_router.get("/admin/settings/reminders")
async def get_reminder_settings(admin_user: Dict = Depends(get_admin_user)):
    """Get quote reminder settings"""
    settings = await db.reminder_settings.find_one({}, {'_id': 0})
    if not settings:
        # Return defaults
        settings = {
            'enabled': True,
            'reminder_days': [3, 7, 14],
            'send_time_hour': 9,
            'send_time_minute': 0,
            'email_subject_prefix': '[Reminder]',
            'max_reminders': 3
        }
    return settings

@api_router.put("/admin/settings/reminders")
async def update_reminder_settings(
    settings: Dict[str, Any],
    admin_user: Dict = Depends(get_admin_user)
):
    """Update quote reminder settings (super admin only)"""
    if not admin_user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Validate settings
    reminder_days = settings.get('reminder_days', [3, 7, 14])
    if not isinstance(reminder_days, list) or len(reminder_days) == 0:
        raise HTTPException(status_code=400, detail="reminder_days must be a non-empty list")
    
    for day in reminder_days:
        if not isinstance(day, int) or day < 1 or day > 90:
            raise HTTPException(status_code=400, detail="Each reminder day must be between 1 and 90")
    
    send_hour = settings.get('send_time_hour', 9)
    if not isinstance(send_hour, int) or send_hour < 0 or send_hour > 23:
        raise HTTPException(status_code=400, detail="send_time_hour must be between 0 and 23")
    
    # Sort reminder days
    reminder_days = sorted(list(set(reminder_days)))
    
    update_data = {
        'enabled': settings.get('enabled', True),
        'reminder_days': reminder_days,
        'send_time_hour': send_hour,
        'send_time_minute': settings.get('send_time_minute', 0),
        'email_subject_prefix': settings.get('email_subject_prefix', '[Reminder]'),
        'max_reminders': min(settings.get('max_reminders', 3), len(reminder_days)),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': admin_user['email']
    }
    
    await db.reminder_settings.update_one({}, {'$set': update_data}, upsert=True)
    
    # Reschedule the job with new time
    try:
        scheduler.reschedule_job('quote_reminders', trigger=CronTrigger(hour=send_hour, minute=update_data['send_time_minute']))
        logger.info(f"Reminder scheduler rescheduled to {send_hour}:{update_data['send_time_minute']:02d}")
    except Exception as e:
        logger.error(f"Failed to reschedule reminder job: {str(e)}")
    
    return {'message': 'Reminder settings updated successfully', 'settings': update_data}

@api_router.get("/admin/quotes/{quote_id}")
async def get_manual_quote(quote_id: str, admin_user: Dict = Depends(get_admin_user)):
    quote = await db.manual_quotes.find_one({'id': quote_id}, {'_id': 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote

@api_router.patch("/admin/quotes/{quote_id}")
async def update_manual_quote(
    quote_id: str,
    update_data: Dict[str, Any],
    admin_user: Dict = Depends(get_admin_user)
):
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['updated_by'] = admin_user['email']
    
    result = await db.manual_quotes.update_one({'id': quote_id}, {'$set': update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return {'message': 'Quote updated successfully'}

@api_router.delete("/admin/quotes/{quote_id}")
async def delete_manual_quote(quote_id: str, admin_user: Dict = Depends(get_admin_user)):
    result = await db.manual_quotes.delete_one({'id': quote_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return {'message': 'Quote deleted successfully'}

@api_router.post("/admin/quotes/{quote_id}/send-email")
async def send_quote_email(quote_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Send quote/invoice email to customer"""
    quote = await db.manual_quotes.find_one({'id': quote_id}, {'_id': 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if not quote.get('client_email'):
        raise HTTPException(status_code=400, detail="Client email is required")
    
    # Get CMS settings for bank details
    settings = await db.cms_settings.find_one({}, {'_id': 0}) or {}
    
    # Generate professional quote email HTML
    items_html = ""
    for item in quote.get('items', []):
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{item.get('description', '')}</td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">{item.get('quantity', 0)}</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₦{item.get('unit_price', 0):,.2f}</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₦{item.get('total', 0):,.2f}</td>
        </tr>
        """
    
    quote_type = quote.get('quote_type', 'quote').upper()
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{quote_type} from Temaruco Clothing Factory</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: #D90429; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">TEMARUCO</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 12px; letter-spacing: 2px;">CLOTHING FACTORY</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">{quote_type}</h2>
                    <p style="color: #52525b; margin: 0 0 5px 0;"><strong>Reference:</strong> {quote.get('quote_number', 'N/A')}</p>
                    <p style="color: #52525b; margin: 0 0 20px 0;"><strong>Date:</strong> {quote.get('created_at', '')[:10]}</p>
                    
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                        Dear <strong>{quote.get('client_name', 'Valued Customer')}</strong>,
                    </p>
                    <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                        Thank you for your interest in Temaruco Clothing Factory. Please find your {quote_type.lower()} details below:
                    </p>
                    
                    <!-- Items Table -->
                    <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                        <thead>
                            <tr style="background: #f4f4f5;">
                                <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #52525b;">Description</th>
                                <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #52525b;">Qty</th>
                                <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #52525b;">Unit Price</th>
                                <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #52525b;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                    </table>
                    
                    <!-- Totals -->
                    <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #52525b;">Subtotal:</span>
                            <span style="color: #18181b; font-weight: 600;">₦{quote.get('subtotal', 0):,.2f}</span>
                        </div>
                        {"<div style='display: flex; justify-content: space-between; margin-bottom: 8px;'><span style='color: #52525b;'>Tax:</span><span style='color: #18181b;'>₦" + f"{quote.get('tax', 0):,.2f}</span></div>" if quote.get('tax', 0) > 0 else ""}
                        {"<div style='display: flex; justify-content: space-between; margin-bottom: 8px;'><span style='color: #22c55e;'>Discount:</span><span style='color: #22c55e;'>-₦" + f"{quote.get('discount', 0):,.2f}</span></div>" if quote.get('discount', 0) > 0 else ""}
                        <div style="border-top: 2px solid #D90429; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between;">
                            <span style="color: #18181b; font-size: 18px; font-weight: bold;">TOTAL:</span>
                            <span style="color: #D90429; font-size: 24px; font-weight: bold;">₦{quote.get('total', 0):,.2f}</span>
                        </div>
                    </div>
                    
                    <!-- Payment Terms -->
                    <div style="background: #fef2f2; border-left: 4px solid #D90429; padding: 15px; margin: 20px 0;">
                        <h3 style="color: #18181b; margin: 0 0 10px 0; font-size: 14px;">Payment Terms:</h3>
                        <ul style="color: #52525b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                            <li>100% payment required to commence production</li>
                            <li>Production time: 14-21 working days from payment confirmation</li>
                            <li>This {quote_type.lower()} is valid for 30 days</li>
                        </ul>
                    </div>
                    
                    <!-- Bank Details -->
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #18181b; margin: 0 0 15px 0; font-size: 14px;">Bank / Payment Details:</h3>
                        <p style="color: #52525b; margin: 0; line-height: 1.8; font-size: 14px;">
                            <strong>Account Name:</strong> Temaruco Clothing Factory<br>
                            <strong>Bank:</strong> {settings.get('bank_name', 'Contact us for bank details')}<br>
                            <strong>Account Number:</strong> {settings.get('account_number', 'Contact us')}<br>
                            <strong>Contact Email:</strong> {settings.get('email', 'temarucoltd@gmail.com')}<br>
                            <strong>Contact Phone:</strong> {settings.get('phone', '+234 912 542 3902')}
                        </p>
                        <p style="color: #71717a; font-size: 12px; margin: 15px 0 0 0; font-style: italic;">
                            Please use your Quote ID ({quote.get('quote_number', 'N/A')}) as payment reference and send proof of payment to our email.
                        </p>
                    </div>
                    
                    {f"<div style='background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;'><h3 style='color: #18181b; margin: 0 0 10px 0; font-size: 14px;'>Notes:</h3><p style='color: #52525b; margin: 0; white-space: pre-wrap;'>{quote.get('notes', '')}</p></div>" if quote.get('notes') else ""}
                </div>
                
                <!-- Footer -->
                <div style="background: #18181b; padding: 25px; text-align: center;">
                    <p style="color: white; margin: 0 0 5px 0; font-size: 14px;">Thank you for choosing Temaruco!</p>
                    <p style="color: #a1a1aa; margin: 0; font-size: 12px;">
                        Inspire • Empower • Accomplish
                    </p>
                    <p style="color: #71717a; margin: 15px 0 0 0; font-size: 11px;">
                        Temaruco Clothing Factory | Lagos, Nigeria | +234 912 542 3902
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"Your {quote_type} from Temaruco Clothing Factory - {quote.get('quote_number', '')}"
    
    # Create tracking record
    tracking_id = f"qt_{quote_id}_{uuid.uuid4().hex[:8]}"
    await db.email_tracking.insert_one({
        'tracking_id': tracking_id,
        'quote_id': quote_id,
        'quote_number': quote.get('quote_number'),
        'recipient_email': quote.get('client_email'),
        'recipient_name': quote.get('client_name'),
        'email_type': quote_type,
        'subject': subject,
        'sent_at': datetime.now(timezone.utc).isoformat(),
        'sent_by': admin_user['email'],
        'open_count': 0,
        'first_opened_at': None,
        'open_events': []
    })
    
    # Send the email with tracking
    success = await send_email_notification(quote.get('client_email'), subject, html_content, tracking_id)
    
    if success:
        # Update quote to mark as sent
        await db.manual_quotes.update_one(
            {'id': quote_id},
            {
                '$set': {
                    'status': 'pending' if quote.get('status') == 'draft' else quote.get('status'),
                    'email_sent': True,
                    'email_sent_at': datetime.now(timezone.utc).isoformat(),
                    'email_sent_by': admin_user['email'],
                    'last_tracking_id': tracking_id
                }
            }
        )
        return {'message': f'{quote_type} sent successfully to {quote.get("client_email")}', 'success': True}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email. Please check SMTP configuration.")

@api_router.post("/admin/quotes/trigger-reminders")
async def trigger_quote_reminders(admin_user: Dict = Depends(get_admin_user)):
    """Manually trigger quote reminder emails (admin only)"""
    if not admin_user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    asyncio.create_task(send_quote_reminder_emails())
    return {'message': 'Quote reminder check initiated', 'success': True}

@api_router.post("/admin/quotes/{quote_id}/mark-paid")
async def mark_quote_as_paid(quote_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Mark a quote as paid and create an order from it"""
    # Get the quote
    quote = await db.manual_quotes.find_one({'id': quote_id}, {'_id': 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check if already paid
    if quote.get('status') == 'paid':
        raise HTTPException(status_code=400, detail="Quote already marked as paid")
    
    # Generate order ID
    order_id = await generate_order_id()
    
    # Create order from quote
    order = {
        'id': order_id,
        'order_id': order_id,
        'quote_id': quote_id,
        'quote_number': quote.get('quote_number'),
        'user_id': None,
        'user_email': quote.get('client_email'),
        'user_name': quote.get('client_name'),
        'user_phone': quote.get('client_phone'),
        'type': 'MANUAL_QUOTE',
        'items': quote.get('items', []),
        'total_price': quote.get('total'),
        'status': 'payment_verified',
        'payment_status': 'paid',
        'payment_verified_at': datetime.now(timezone.utc).isoformat(),
        'payment_receipt_url': None,
        'notes': quote.get('notes'),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_from_quote': True
    }
    
    await db.orders.insert_one(order)
    
    # Update quote status to paid
    await db.manual_quotes.update_one(
        {'id': quote_id},
        {
            '$set': {
                'status': 'paid',
                'order_id': order_id,
                'marked_paid_by': admin_user['email'],
                'marked_paid_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create notification
    await create_notification(
        'quote_paid',
        'Quote Marked as Paid',
        f"Quote {quote.get('quote_number')} marked as paid. Order {order_id} created.",
        order_id=order_id
    )
    
    del order['_id']
    return {
        'message': 'Quote marked as paid and order created',
        'order_id': order_id,
        'order': order
    }

@api_router.post("/admin/quotes/search")
async def search_quotes_receipts(
    search_term: str,
    admin_user: Dict = Depends(get_admin_user)
):
    """Search quotes, invoices, and receipts by their ID/number"""
    search_term = search_term.strip()
    
    # Search in quotes
    quotes = await db.manual_quotes.find({
        '$or': [
            {'quote_number': {'$regex': search_term, '$options': 'i'}},
            {'id': search_term}
        ]
    }, {'_id': 0}).to_list(100)
    
    # Search in receipts
    receipts = await db.receipts.find({
        '$or': [
            {'receipt_number': {'$regex': search_term, '$options': 'i'}},
            {'id': search_term}
        ]
    }, {'_id': 0}).to_list(100)
    
    return {
        'quotes': quotes,
        'receipts': receipts,
        'total': len(quotes) + len(receipts)
    }

# ==================== CUSTOM ORDER REQUESTS ====================
@api_router.post("/orders/custom-request")
async def create_custom_order_request(
    request_data: str = Form(...),
    reference_image: Optional[UploadFile] = File(None),
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...)
):
    """Create a custom order request for items not in catalog - No auth required"""
    
    import json
    request_dict = json.loads(request_data)
    custom_request = CustomOrderRequest(**request_dict)
    
    request_id = str(uuid.uuid4())
    reference_url = None
    
    if reference_image:
        file_ext = reference_image.filename.split('.')[-1]
        filename = f"{request_id}_reference.{file_ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(reference_image.file, f)
        
        reference_url = f"/api/uploads/{filename}"
    
    # Generate enquiry code
    enquiry_code = await generate_enquiry_code()
    
    custom_order = {
        'id': request_id,
        'enquiry_code': enquiry_code,  # ENQ-MMYY-XXXXXX format
        'user_id': None,  # Guest request
        'user_email': customer_email,
        'user_name': customer_name,
        'user_phone': customer_phone,
        'item_description': custom_request.item_description,
        'quantity': custom_request.quantity,
        'reference_image_url': reference_url,
        'specifications': custom_request.specifications,
        'target_price': custom_request.target_price,
        'deadline': custom_request.deadline,
        'notes': custom_request.notes,
        'status': 'pending_review',  # pending_review, quoted, accepted, rejected
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.custom_order_requests.insert_one(custom_order)
    
    # Create admin notification
    await db.notifications.insert_one({
        'id': str(uuid.uuid4()),
        'type': 'custom_order_request',
        'request_id': request_id,
        'enquiry_code': enquiry_code,
        'message': f"New custom order request {enquiry_code} from {customer_name} - {custom_request.item_description}",
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    del custom_order['_id']
    return custom_order

@api_router.get("/orders/my-custom-requests")
async def get_my_custom_requests(request: Request):
    """Get user's custom order requests"""
    current_user = await get_current_user_from_cookie_or_header(request)
    requests = await db.custom_order_requests.find(
        {'user_id': current_user['user_id']}, 
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return requests

@api_router.get("/admin/custom-requests")
async def get_all_custom_requests(
    status: Optional[str] = None,
    enquiry_code: Optional[str] = None,
    request: Request = None
):
    """Admin: Get all custom order requests"""
    admin_user = await get_admin_user(request)
    
    query = {}
    if status:
        query['status'] = status
    if enquiry_code:
        query['enquiry_code'] = {'$regex': enquiry_code, '$options': 'i'}
    
    requests = await db.custom_order_requests.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return requests

@api_router.get("/admin/custom-requests/{request_id}")
async def get_custom_request(request_id: str, request: Request):
    """Admin: Get specific custom request"""
    admin_user = await get_admin_user(request)
    
    custom_request = await db.custom_order_requests.find_one({'id': request_id}, {'_id': 0})
    if not custom_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return custom_request

@api_router.patch("/admin/custom-requests/{request_id}/status")
async def update_custom_request_status(
    request_id: str,
    status: str,
    admin_notes: Optional[str] = None,
    request: Request = None
):
    """Admin: Update custom request status"""
    admin_user = await get_admin_user(request)
    
    update_data = {
        'status': status,
        'admin_notes': admin_notes,
        'reviewed_by': admin_user['email'],
        'reviewed_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.custom_order_requests.update_one({'id': request_id}, {'$set': update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Send notification to client
    custom_req = await db.custom_order_requests.find_one({'id': request_id}, {'_id': 0})
    if custom_req:
        await send_email_mock(
            custom_req['user_email'],
            f"Custom Order Request Update - {status}",
            f"Your custom order request status has been updated to: {status}"
        )
    
    return {'message': 'Status updated successfully'}

# ==================== ENQUIRIES ROUTES ====================
@api_router.post("/enquiries/create")
async def create_enquiry(
    enquiry_data: str = Form(...),
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...),
    design_images: List[UploadFile] = File(default=[]),
    measurement_file: Optional[UploadFile] = File(None)
):
    """Create a new custom order enquiry - No auth required"""
    
    import json
    enquiry_dict = json.loads(enquiry_data)
    
    # Generate unique enquiry code
    enquiry_code = await generate_enquiry_code()
    enquiry_id = str(uuid.uuid4())
    
    # Save design images
    design_image_urls = []
    for image in design_images[:5]:  # Max 5 images
        file_data = await save_upload_file(image, ALLOWED_IMAGE_EXTENSIONS)
        design_image_urls.append(file_data['file_path'])
    
    # Save measurement file
    measurement_file_url = None
    if measurement_file:
        file_data = await save_upload_file(measurement_file, ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS)
        measurement_file_url = file_data['file_path']
    
    # Create enquiry document
    enquiry = {
        'id': enquiry_id,
        'enquiry_code': enquiry_code,
        'customer_name': customer_name,
        'customer_email': customer_email,
        'customer_phone': customer_phone,
        'order_category': enquiry_dict.get('order_category'),
        'clothing_name': enquiry_dict.get('clothing_name'),
        'quantity': enquiry_dict.get('quantity'),
        'fabric_material': enquiry_dict.get('fabric_material'),
        'colors': enquiry_dict.get('colors', []),
        'size_type': enquiry_dict.get('size_type'),
        'male_sizes': enquiry_dict.get('male_sizes', {}),
        'female_sizes': enquiry_dict.get('female_sizes', {}),
        'design_details': enquiry_dict.get('design_details'),
        'design_images': design_image_urls,
        'measurement_file': measurement_file_url,
        'deadline': enquiry_dict.get('deadline'),
        'additional_notes': enquiry_dict.get('additional_notes'),
        'status': 'New Inquiry',
        'quote': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.enquiries.insert_one(enquiry)
    
    # Create admin notification
    await create_notification(
        'new_enquiry',
        'New Custom Order Enquiry',
        f"New enquiry {enquiry_code} from {customer_name} - {enquiry_dict.get('clothing_name')} x{enquiry_dict.get('quantity')}",
        order_id=enquiry_id
    )
    
    del enquiry['_id']
    return enquiry

@api_router.get("/admin/enquiries")
async def get_all_enquiries(request: Request):
    """Admin: Get all custom order enquiries"""
    admin_user = await get_admin_user(request)
    
    enquiries = await db.enquiries.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return enquiries

@api_router.get("/admin/enquiries/{enquiry_id}")
async def get_enquiry_details(enquiry_id: str, request: Request):
    """Admin: Get enquiry details"""
    admin_user = await get_admin_user(request)
    
    enquiry = await db.enquiries.find_one({'id': enquiry_id}, {'_id': 0})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    
    return enquiry

@api_router.patch("/admin/enquiries/{enquiry_id}/status")
async def update_enquiry_status(
    enquiry_id: str,
    status_update: EnquiryStatusUpdate,
    request: Request = None
):
    """Admin: Update enquiry status"""
    admin_user = await get_admin_user(request)
    
    update_data = {
        'status': status_update.status,
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': admin_user['email']
    }
    
    result = await db.enquiries.update_one({'id': enquiry_id}, {'$set': update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    
    return {'message': 'Status updated successfully'}

@api_router.post("/admin/enquiries/{enquiry_id}/quote")
async def create_enquiry_quote(
    enquiry_id: str,
    quote_data: EnquiryQuoteCreate,
    request: Request = None
):
    """Admin: Create quote for enquiry"""
    admin_user = await get_admin_user(request)
    
    # Get enquiry
    enquiry = await db.enquiries.find_one({'id': enquiry_id}, {'_id': 0})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    
    # Create quote
    quote = {
        'unit_price': quote_data.unit_price,
        'total_price': quote_data.total_price,
        'estimated_production_days': quote_data.estimated_production_days,
        'valid_until': quote_data.valid_until,
        'notes_to_client': quote_data.notes_to_client,
        'created_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Update enquiry with quote
    update_data = {
        'quote': quote,
        'status': 'Quote Sent',
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.enquiries.update_one({'id': enquiry_id}, {'$set': update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    
    # Send email notification to customer
    await send_email_mock(
        enquiry['customer_email'],
        f"Quote Ready - {enquiry['enquiry_code']}",
        f"Your custom order quote is ready. Total Price: ₦{quote_data.total_price:,.2f}"
    )
    
    return {'message': 'Quote created successfully', 'quote': quote}

@api_router.get("/admin/enquiries/{enquiry_id}/quote-pdf")
async def download_quote_pdf(enquiry_id: str, request: Request):
    """Admin: Download quote as PDF"""
    admin_user = await get_admin_user(request)
    
    enquiry = await db.enquiries.find_one({'id': enquiry_id}, {'_id': 0})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    
    if not enquiry.get('quote'):
        raise HTTPException(status_code=404, detail="No quote found for this enquiry")
    
    # TODO: Generate PDF using reportlab or similar library
    # For now, return a simple text response
    from fastapi.responses import Response
    
    pdf_content = f"""
    TEMARUCO CLOTHING FACTORY
    QUOTATION
    
    Enquiry Code: {enquiry['enquiry_code']}
    Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}
    
    Customer Details:
    Name: {enquiry['customer_name']}
    Email: {enquiry['customer_email']}
    Phone: {enquiry['customer_phone']}
    
    Order Details:
    Item: {enquiry['clothing_name']}
    Quantity: {enquiry['quantity']}
    Category: {enquiry['order_category']}
    
    Pricing:
    Unit Price: ₦{enquiry['quote']['unit_price']:,.2f}
    Total Price: ₦{enquiry['quote']['total_price']:,.2f}
    
    Production Time: {enquiry['quote'].get('estimated_production_days', 'N/A')} days
    Valid Until: {enquiry['quote'].get('valid_until', 'N/A')}
    
    Notes: {enquiry['quote'].get('notes_to_client', 'N/A')}
    """
    
    return Response(
        content=pdf_content.encode('utf-8'),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=quote-{enquiry_id}.txt'}
    )

# ==================== ADMIN SETTINGS ROUTES ====================
@api_router.get("/admin/settings")
async def get_admin_settings(request: Request):
    """Admin: Get application settings"""
    admin_user = await get_admin_user(request)
    
    # Get settings from database or return defaults
    settings = await db.admin_settings.find_one({}, {'_id': 0})
    
    if not settings:
        # Default settings
        settings = {
            'fabric_quality_prices': {
                'standard': 0,
                'premium': 500,
                'luxury': 1000
            },
            'bulk_print_costs': {
                'none': 0,
                'front': 500,
                'front_back': 800,
                'embroidery': 1200
            },
            'pod_print_costs': {
                'Badge': 500,
                'A4': 800,
                'A3': 1200,
                'A2': 1800,
                'A1': 2500
            },
            'bulk_clothing_items': [
                {'name': 'T-Shirt', 'base_price': 1500, 'image_url': ''},
                {'name': 'Hoodie', 'base_price': 4500, 'image_url': ''},
                {'name': 'Joggers', 'base_price': 3500, 'image_url': ''},
                {'name': 'Polo', 'base_price': 2500, 'image_url': ''}
            ],
            'pod_clothing_items': [
                {'name': 'T-Shirt', 'base_price': 2000, 'image_url': ''},
                {'name': 'Hoodie', 'base_price': 5000, 'image_url': ''},
                {'name': 'Tank Top', 'base_price': 1800, 'image_url': ''}
            ]
        }
        await db.admin_settings.insert_one(settings)
    
    return settings

@api_router.post("/admin/settings")
async def update_admin_settings(settings: AdminSettings, request: Request):
    """Admin: Update application settings"""
    admin_user = await get_admin_user(request)
    
    settings_dict = settings.dict()
    settings_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    settings_dict['updated_by'] = admin_user['email']
    
    await db.admin_settings.update_one({}, {'$set': settings_dict}, upsert=True)
    
    return {'message': 'Settings updated successfully'}

@api_router.post("/admin/upload-image")
async def upload_admin_image(
    image: UploadFile = File(...),
    module: str = "general",
    request: Request = None
):
    """
    Admin: Unified image upload endpoint for all modules
    Supports: bulk, pod, fabric, boutique, souvenir
    """
    admin_user = await get_admin_user(request)
    
    logger.info(f"[UPLOAD][{module}] Admin upload initiated by: {admin_user['email']}")
    
    # Save image with module context for logging
    file_data = await save_upload_file(image, ALLOWED_IMAGE_EXTENSIONS, module=module)
    
    logger.info(f"[UPLOAD][{module}] Upload complete. URL: {file_data['file_path']}")
    
    return {
        'image_url': file_data['file_path'], 
        'message': 'Image uploaded successfully',
        'file_name': file_data['file_name'],
        'file_size': file_data['file_size']
    }

# ==================== FABRIC QUALITIES MANAGEMENT ====================
@api_router.get("/fabric-qualities")
async def get_fabric_qualities_public(clothing_item: Optional[str] = None):
    """Public: Get fabric qualities, optionally filtered by clothing item"""
    query = {}
    if clothing_item:
        query['clothing_item'] = clothing_item
    
    qualities = await db.fabric_qualities.find(query, {'_id': 0}).to_list(100)
    
    # If no qualities exist, create and return defaults
    if not qualities:
        default_qualities = [
            {'id': str(uuid.uuid4()), 'clothing_item': 'default', 'name': 'Standard', 'price': 2000},
            {'id': str(uuid.uuid4()), 'clothing_item': 'default', 'name': 'Premium', 'price': 4000},
            {'id': str(uuid.uuid4()), 'clothing_item': 'default', 'name': 'Heavyweight', 'price': 6000}
        ]
        try:
            # Insert defaults
            await db.fabric_qualities.insert_many(default_qualities)
        except Exception as e:
            logger.error(f"Failed to insert default fabric qualities: {e}")
        qualities = default_qualities
    
    return qualities

@api_router.get("/admin/fabric-qualities")
async def get_fabric_qualities_admin(clothing_item: Optional[str] = None, request: Request = None):
    """Admin: Get fabric qualities, optionally filtered by clothing item"""
    admin_user = await get_admin_user(request)
    
    return await get_fabric_qualities_public(clothing_item)

@api_router.post("/admin/fabric-qualities")
async def create_fabric_quality(quality_data: dict, request: Request):
    """Admin: Create new fabric quality for a clothing item"""
    admin_user = await get_admin_user(request)
    
    quality_id = str(uuid.uuid4())
    
    quality = {
        'id': quality_id,
        'clothing_item': quality_data.get('clothing_item'),
        'name': quality_data.get('name'),
        'price': quality_data.get('price'),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': admin_user['email']
    }
    
    await db.fabric_qualities.insert_one(quality)
    
    return {'message': 'Fabric quality created successfully', 'id': quality_id}

@api_router.put("/admin/fabric-qualities/{quality_id}")
async def update_fabric_quality(quality_id: str, quality_data: dict, request: Request):
    """Admin: Update fabric quality"""
    admin_user = await get_admin_user(request)
    
    result = await db.fabric_qualities.update_one(
        {'id': quality_id},
        {
            '$set': {
                'name': quality_data.get('name'),
                'price': quality_data.get('price'),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': admin_user['email']
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fabric quality not found")
    
    return {'message': 'Fabric quality updated successfully'}

@api_router.delete("/admin/fabric-qualities/{quality_id}")
async def delete_fabric_quality(quality_id: str, request: Request):
    """Admin: Delete fabric quality"""
    admin_user = await get_admin_user(request)
    
    result = await db.fabric_qualities.delete_one({'id': quality_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fabric quality not found")
    
    return {'message': 'Fabric quality deleted successfully'}

# ==================== PRODUCTION COSTS MANAGEMENT ====================
@api_router.get("/admin/production-costs")
async def get_production_costs(request: Request):
    """Admin: Get production costs"""
    admin_user = await get_admin_user(request)
    
    costs = await db.production_costs.find_one({}, {'_id': 0})
    
    if not costs:
        # Default production costs
        costs = {
            'id': str(uuid.uuid4()),
            'bulk_print_cost_per_piece': 500,
            'bulk_embroidery_cost_per_piece': 1200,
            'pod_print_cost_per_piece': 800,
            'pod_embroidery_cost_per_piece': 1500,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.production_costs.insert_one(costs)
    
    return costs

@api_router.put("/admin/production-costs")
async def update_production_costs(costs_data: dict, request: Request):
    """Admin: Update production costs"""
    admin_user = await get_admin_user(request)
    
    update_data = {
        'bulk_print_cost_per_piece': costs_data.get('bulk_print_cost_per_piece'),
        'bulk_embroidery_cost_per_piece': costs_data.get('bulk_embroidery_cost_per_piece'),
        'pod_print_cost_per_piece': costs_data.get('pod_print_cost_per_piece'),
        'pod_embroidery_cost_per_piece': costs_data.get('pod_embroidery_cost_per_piece'),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': admin_user['email']
    }
    
    await db.production_costs.update_one({}, {'$set': update_data}, upsert=True)
    
    return {'message': 'Production costs updated successfully'}

# ==================== SUPER ADMIN ROUTES ====================
@api_router.post("/super-admin/create-admin")
async def create_admin(admin_data: dict, request: Request):
    """Super Admin: Create a new admin or super admin user with granular permissions"""
    super_admin = await get_super_admin_user(request)
    
    # Check if email already exists
    existing = await db.users.find_one({'email': admin_data.get('email')}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists (if provided)
    username = admin_data.get('username', admin_data.get('email'))
    if username != admin_data.get('email'):
        existing_username = await db.users.find_one({'username': username}, {'_id': 0})
        if existing_username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Determine if creating super admin (only super admins can create other super admins)
    is_creating_super_admin = admin_data.get('is_super_admin', False)
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Comprehensive RBAC permissions structure
    default_role = {
        # ===== WEBSITE TEXT CMS =====
        'can_view_site_texts': False,
        'can_edit_site_texts': False,
        'can_reset_site_texts': False,
        
        # ===== MATERIALS INVENTORY =====
        'can_view_materials': True,
        'can_add_materials': True,
        'can_edit_materials': True,
        'can_delete_materials': False,
        'can_add_material_types': True,
        'can_view_material_history': True,
        
        # ===== PRODUCTS (Bulk / POD / Boutique / Souvenirs) =====
        'can_view_products': True,
        'can_add_products': True,
        'can_edit_products': True,
        'can_delete_products': False,
        'can_view_designs': True,
        'can_download_designs': True,
        
        # ===== ORDERS & PRODUCTION =====
        'can_view_orders': True,
        'can_manage_orders': True,
        'can_update_order_status': True,
        'can_delete_orders': False,
        'can_view_production': True,
        'can_manage_production': True,
        'can_assign_tailors': True,
        
        # ===== QUOTES & CUSTOM REQUESTS =====
        'can_view_quotes': True,
        'can_manage_quotes': True,
        'can_view_custom_requests': True,
        'can_manage_custom_requests': True,
        
        # ===== CLIENTS =====
        'can_view_clients': True,
        'can_edit_clients': True,
        'can_delete_clients': False,
        
        # ===== FINANCIAL =====
        'can_view_financials': False,
        'can_manage_financials': False,
        'can_delete_payments': False,
        'can_view_pricing': True,
        'can_manage_pricing': False,
        
        # ===== INVENTORY & PROCUREMENT =====
        'can_view_inventory': True,
        'can_manage_inventory': True,
        'can_view_procurement': True,
        'can_manage_procurement': True,
        'can_view_suppliers': True,
        'can_manage_suppliers': True,
        
        # ===== CMS & WEBSITE =====
        'can_manage_cms': False,
        'can_manage_images': False,
        'can_manage_pod_items': False,
        
        # ===== ANALYTICS & REPORTS =====
        'can_view_analytics': False,
        'can_view_website_analytics': False,
        'can_export_reports': True,
        
        # ===== COMMUNICATION =====
        'can_view_emails': False,
        'can_send_notifications': True,
        
        # ===== ADMIN MANAGEMENT =====
        'can_view_admins': False,
        'can_create_admins': False,
        'can_edit_admins': False,
        'can_delete_admins': False,
        'can_assign_permissions': False,
        
        # ===== SETTINGS =====
        'can_view_settings': False,
        'can_manage_settings': False,
        'can_manage_payment_settings': False,
        'can_manage_inventory_settings': True,
    }
    
    # If creating super admin, they get full permissions automatically
    if is_creating_super_admin:
        # Super admins get all permissions
        full_permissions = {k: True for k in default_role.keys()}
        role = full_permissions
    else:
        # Use provided role or default
        role = admin_data.get('role', default_role)
    
    new_admin = {
        'id': user_id,
        'user_id': user_id,
        'username': username,
        'email': admin_data.get('email'),
        'name': admin_data.get('name'),
        'phone': '',
        'password': hash_password(admin_data.get('password')),
        'address': '',
        'is_verified': True,
        'is_admin': True,
        'is_super_admin': is_creating_super_admin,
        'role': role,
        'auth_provider': 'email',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'created_by': super_admin.get('email', 'system')
    }
    
    await db.users.insert_one(new_admin)
    
    # Log action
    await db.admin_actions.insert_one({
        'action': 'create_super_admin' if is_creating_super_admin else 'create_admin',
        'performed_by': super_admin['email'],
        'target_user': admin_data.get('email'),
        'username': username,
        'is_super_admin': is_creating_super_admin,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"[ADMIN] {'Super Admin' if is_creating_super_admin else 'Admin'} created: {username} by {super_admin['email']}")
    
    return {
        'message': f'{"Super Admin" if is_creating_super_admin else "Admin"} created successfully',
        'user_id': user_id,
        'username': username,
        'is_super_admin': is_creating_super_admin
    }

@api_router.get("/super-admin/admins")
async def get_all_admins(request: Request):
    """Super Admin: Get all admin users"""
    super_admin = await get_super_admin_user(request)
    
    admins = await db.users.find(
        {'$or': [{'is_admin': True}, {'is_super_admin': True}]},
        {'_id': 0}
    ).to_list(1000)
    
    # Return including plain_password for super admin viewing
    return admins

@api_router.patch("/super-admin/admin/{admin_id}/role")
async def update_admin_role(admin_id: str, role_data: dict, request: Request):
    """Super Admin: Update admin role/permissions or promote to super admin"""
    super_admin = await get_super_admin_user(request)
    
    # Check if promoting to super admin
    promote_to_super_admin = role_data.pop('promote_to_super_admin', False)
    
    # Find target admin
    target_admin = await db.users.find_one(
        {'$or': [{'id': admin_id}, {'user_id': admin_id}]},
        {'_id': 0}
    )
    
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Cannot modify your own super admin status
    if target_admin.get('user_id') == super_admin.get('user_id') and promote_to_super_admin:
        raise HTTPException(status_code=400, detail="Cannot modify your own super admin status")
    
    update_data = {'role': role_data}
    
    if promote_to_super_admin:
        update_data['is_super_admin'] = True
        # Super admins get full permissions
        update_data['role'] = {k: True for k in role_data.keys()} if role_data else target_admin.get('role', {})
    
    # Update role
    result = await db.users.update_one(
        {'$or': [{'id': admin_id}, {'user_id': admin_id}]},
        {'$set': update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found or no changes made")
    
    # Log action
    await db.admin_actions.insert_one({
        'action': 'promote_to_super_admin' if promote_to_super_admin else 'update_admin_role',
        'performed_by': super_admin['email'],
        'target_admin_id': admin_id,
        'target_email': target_admin.get('email'),
        'promoted_to_super_admin': promote_to_super_admin,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"[ADMIN] {'Promoted to Super Admin' if promote_to_super_admin else 'Updated role'}: {target_admin.get('email')} by {super_admin['email']}")
    
    return {
        'message': 'Admin promoted to Super Admin' if promote_to_super_admin else 'Admin role updated successfully',
        'is_super_admin': promote_to_super_admin or target_admin.get('is_super_admin', False)
    }

@api_router.patch("/super-admin/admin/{admin_id}/demote")
async def demote_super_admin(admin_id: str, request: Request):
    """Super Admin: Demote a super admin to regular admin"""
    super_admin = await get_super_admin_user(request)
    
    # Find target admin
    target_admin = await db.users.find_one(
        {'$or': [{'id': admin_id}, {'user_id': admin_id}]},
        {'_id': 0}
    )
    
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Cannot demote yourself
    if target_admin.get('user_id') == super_admin.get('user_id'):
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    
    if not target_admin.get('is_super_admin'):
        raise HTTPException(status_code=400, detail="User is not a super admin")
    
    # Demote
    await db.users.update_one(
        {'$or': [{'id': admin_id}, {'user_id': admin_id}]},
        {'$set': {'is_super_admin': False}}
    )
    
    # Log action
    await db.admin_actions.insert_one({
        'action': 'demote_super_admin',
        'performed_by': super_admin['email'],
        'target_admin_id': admin_id,
        'target_email': target_admin.get('email'),
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"[ADMIN] Demoted from Super Admin: {target_admin.get('email')} by {super_admin['email']}")
    
    return {'message': 'Super Admin demoted to regular Admin'}

@api_router.delete("/super-admin/admins/{user_id}")
async def delete_admin(user_id: str, request: Request):
    """Super Admin: Remove admin privileges or delete admin/super admin"""
    super_admin = await get_super_admin_user(request)
    
    # Find target user
    target_user = await db.users.find_one({'user_id': user_id}, {'_id': 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Cannot delete yourself
    if target_user.get('user_id') == super_admin.get('user_id'):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Remove admin privileges (keep user but remove admin status)
    result = await db.users.update_one(
        {'user_id': user_id},
        {'$set': {'is_admin': False, 'is_super_admin': False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Log action
    await db.admin_actions.insert_one({
        'action': 'remove_admin',
        'performed_by': super_admin['email'],
        'target_user_id': user_id,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    return {'message': 'Admin privileges removed'}

@api_router.get("/super-admin/actions")
async def get_admin_actions(request: Request):
    """Super Admin: View admin action logs"""
    super_admin = await get_super_admin_user(request)
    
    actions = await db.admin_actions.find({}, {'_id': 0}).sort('timestamp', -1).limit(100).to_list(100)
    return actions

@api_router.post("/super-admin/admin/{admin_id}/change-password")
async def change_admin_password(admin_id: str, new_password: str = Form(...), request: Request = None):
    """Super Admin: Change an admin's password"""
    super_admin = await get_super_admin_user(request)
    
    # Get admin user
    admin = await db.users.find_one({'id': admin_id})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if admin.get('is_super_admin'):
        raise HTTPException(status_code=400, detail="Cannot change super admin password this way")
    
    # Update password
    hashed = hash_password(new_password)
    await db.users.update_one(
        {'id': admin_id},
        {'$set': {'password': hashed}}
    )
    
    return {'message': 'Password changed successfully'}

# ==================== EMAIL COLLECTION ====================
@api_router.post("/emails/collect")
async def collect_email(email_data: dict):
    """Save customer email from checkout/orders"""
    try:
        email = email_data.get('email')
        source = email_data.get('source', 'checkout')  # checkout, order, quote
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Check if email already exists
        existing = await db.customer_emails.find_one({'email': email})
        
        if existing:
            # Update last seen
            await db.customer_emails.update_one(
                {'email': email},
                {
                    '$set': {'last_seen': datetime.now(timezone.utc).isoformat()},
                    '$inc': {'interaction_count': 1},
                    '$addToSet': {'sources': source}
                }
            )
        else:
            # Create new record
            await db.customer_emails.insert_one({
                'email': email,
                'sources': [source],
                'interaction_count': 1,
                'first_seen': datetime.now(timezone.utc).isoformat(),
                'last_seen': datetime.now(timezone.utc).isoformat()
            })
        
        return {'message': 'Email saved successfully'}
    
    except Exception as e:
        logger.error(f"Error saving email: {str(e)}")
        return {'message': 'Email collection failed'}

@api_router.get("/super-admin/emails")
async def get_customer_emails(request: Request, skip: int = 0, limit: int = 100):
    """Super Admin: Get all collected customer emails"""
    super_admin = await get_super_admin_user(request)
    
    emails = await db.customer_emails.find(
        {}, 
        {'_id': 0}
    ).sort('last_seen', -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.customer_emails.count_documents({})
    
    return {
        'emails': emails,
        'total': total,
        'skip': skip,
        'limit': limit
    }


@api_router.post("/super-admin/change-password")
async def change_super_admin_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    request: Request = None
):
    """Super Admin: Change own password"""
    # Get current user from session
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Verify current password
    if not bcrypt.checkpw(current_password.encode(), user['password'].encode()):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    # Hash and update new password
    hashed_password = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    
    await db.users.update_one(
        {'email': user['email']},
        {'$set': {'password': hashed_password}}
    )
    
    return {'message': 'Password updated successfully'}


# ==================== PUBLIC ORDER TRACKING ====================
# Email Tracking Pixel Endpoint
@api_router.get("/email/track/{tracking_id}")
async def track_email_open(tracking_id: str, request: Request):
    """Track email opens via invisible pixel - returns 1x1 transparent GIF"""
    import base64
    
    # 1x1 transparent GIF
    transparent_gif = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
    
    try:
        # Record the open event
        user_agent = request.headers.get('user-agent', 'unknown')
        ip_address = request.client.host if request.client else 'unknown'
        
        # Find and update the email tracking record
        tracking_record = await db.email_tracking.find_one({'tracking_id': tracking_id})
        
        if tracking_record:
            # Update with open info
            open_event = {
                'opened_at': datetime.now(timezone.utc).isoformat(),
                'user_agent': user_agent[:500],  # Limit length
                'ip_address': ip_address
            }
            
            await db.email_tracking.update_one(
                {'tracking_id': tracking_id},
                {
                    '$set': {'first_opened_at': tracking_record.get('first_opened_at') or open_event['opened_at']},
                    '$inc': {'open_count': 1},
                    '$push': {'open_events': {'$each': [open_event], '$slice': -10}}  # Keep last 10 events
                }
            )
            
            # Also update the quote if this is a quote email
            if tracking_record.get('quote_id'):
                await db.manual_quotes.update_one(
                    {'id': tracking_record['quote_id']},
                    {
                        '$set': {
                            'email_opened': True,
                            'email_first_opened_at': tracking_record.get('first_opened_at') or open_event['opened_at'],
                            'email_last_opened_at': open_event['opened_at']
                        },
                        '$inc': {'email_open_count': 1}
                    }
                )
            
            logger.info(f"Email open tracked: {tracking_id}")
    except Exception as e:
        logger.error(f"Error tracking email open: {str(e)}")
    
    # Always return the transparent GIF regardless of errors
    return Response(content=transparent_gif, media_type="image/gif")

@api_router.get("/admin/email-tracking")
async def get_email_tracking_stats(admin_user: Dict = Depends(get_admin_user)):
    """Get email tracking statistics"""
    # Get overall stats
    total_sent = await db.email_tracking.count_documents({})
    total_opened = await db.email_tracking.count_documents({'open_count': {'$gt': 0}})
    
    # Get recent tracking records
    recent = await db.email_tracking.find(
        {}, 
        {'_id': 0}
    ).sort('sent_at', -1).limit(50).to_list(50)
    
    return {
        'total_sent': total_sent,
        'total_opened': total_opened,
        'open_rate': round((total_opened / total_sent * 100) if total_sent > 0 else 0, 1),
        'recent_emails': recent
    }

# Currency exchange rates (NGN base) - Updated periodically
CURRENCY_RATES = {
    'NGN': {'rate': 1, 'symbol': '₦', 'name': 'Nigerian Naira'},
    'USD': {'rate': 0.00063, 'symbol': '$', 'name': 'US Dollar'},
    'EUR': {'rate': 0.00058, 'symbol': '€', 'name': 'Euro'},
    'GBP': {'rate': 0.00050, 'symbol': '£', 'name': 'British Pound'},
    'CAD': {'rate': 0.00086, 'symbol': 'C$', 'name': 'Canadian Dollar'},
    'AUD': {'rate': 0.00098, 'symbol': 'A$', 'name': 'Australian Dollar'},
    'ZAR': {'rate': 0.0115, 'symbol': 'R', 'name': 'South African Rand'},
    'GHS': {'rate': 0.0098, 'symbol': '₵', 'name': 'Ghanaian Cedi'},
    'KES': {'rate': 0.081, 'symbol': 'KSh', 'name': 'Kenyan Shilling'},
    'INR': {'rate': 0.053, 'symbol': '₹', 'name': 'Indian Rupee'},
    'AED': {'rate': 0.0023, 'symbol': 'د.إ', 'name': 'UAE Dirham'},
    'CNY': {'rate': 0.0046, 'symbol': '¥', 'name': 'Chinese Yuan'},
}

# Country to currency mapping
COUNTRY_CURRENCY = {
    'NG': 'NGN', 'US': 'USD', 'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR', 
    'CA': 'CAD', 'AU': 'AUD', 'ZA': 'ZAR', 'GH': 'GHS', 'KE': 'KES',
    'IN': 'INR', 'AE': 'AED', 'CN': 'CNY', 'IT': 'EUR', 'ES': 'EUR',
    'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR', 'PT': 'EUR',
}

@api_router.get("/currency/detect")
async def detect_currency(request: Request):
    """Detect user's currency - Nigeria sees Naira, everyone else sees USD"""
    # Try to get country from Cloudflare header
    country_code = request.headers.get('CF-IPCountry', '').upper()
    
    # Fallback to Accept-Language header
    if not country_code or country_code == 'XX':
        accept_lang = request.headers.get('Accept-Language', '')
        if accept_lang:
            # Parse language tag (e.g., en-US, en-GB)
            parts = accept_lang.split(',')[0].split('-')
            if len(parts) > 1:
                country_code = parts[1].upper()
    
    # Simple logic: Nigeria = NGN, everyone else = USD
    is_nigeria = country_code == 'NG'
    
    if is_nigeria:
        return {
            'country_code': 'NG',
            'currency_code': 'NGN',
            'currency_symbol': '₦',
            'currency_name': 'Nigerian Naira',
            'exchange_rate': 1
        }
    else:
        return {
            'country_code': country_code or 'US',
            'currency_code': 'USD',
            'currency_symbol': '$',
            'currency_name': 'US Dollar',
            'exchange_rate': 0.00063  # 1 NGN = 0.00063 USD (approx)
        }

@api_router.get("/currency/rates")
async def get_currency_rates():
    """Get all supported currency rates - fetches live rates daily"""
    # Check if we have cached rates from today
    cached = await db.currency_cache.find_one({'date': datetime.now(timezone.utc).strftime('%Y-%m-%d')})
    
    if cached:
        return {
            'base_currency': 'NGN',
            'rates': cached.get('rates', CURRENCY_RATES),
            'updated_at': cached.get('updated_at'),
            'source': 'cached'
        }
    
    # Try to fetch live rates
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Using exchangerate-api.com free tier (NGN base)
            response = await client.get('https://open.er-api.com/v6/latest/NGN')
            if response.status_code == 200:
                data = response.json()
                if data.get('result') == 'success':
                    live_rates = data.get('rates', {})
                    # Update our rates with live data
                    updated_rates = {
                        'NGN': {'rate': 1, 'symbol': '₦', 'name': 'Nigerian Naira'},
                        'USD': {'rate': live_rates.get('USD', 0.00063), 'symbol': '$', 'name': 'US Dollar'},
                    }
                    # Cache the rates
                    await db.currency_cache.update_one(
                        {'date': datetime.now(timezone.utc).strftime('%Y-%m-%d')},
                        {'$set': {
                            'rates': updated_rates,
                            'updated_at': datetime.now(timezone.utc).isoformat(),
                            'raw_rates': live_rates
                        }},
                        upsert=True
                    )
                    return {
                        'base_currency': 'NGN',
                        'rates': updated_rates,
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                        'source': 'live'
                    }
    except Exception as e:
        logger.error(f"Failed to fetch live rates: {str(e)}")
    
    # Fallback to hardcoded rates
    return {
        'base_currency': 'NGN',
        'rates': CURRENCY_RATES,
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'source': 'fallback'
    }

@api_router.post("/currency/convert")
async def convert_currency(data: Dict[str, Any]):
    """Convert amount from NGN to target currency"""
    amount_ngn = data.get('amount', 0)
    target_currency = data.get('currency', 'NGN').upper()
    
    if target_currency not in CURRENCY_RATES:
        target_currency = 'NGN'
    
    rate_info = CURRENCY_RATES[target_currency]
    converted_amount = amount_ngn * rate_info['rate']
    
    return {
        'original_amount': amount_ngn,
        'original_currency': 'NGN',
        'converted_amount': round(converted_amount, 2),
        'target_currency': target_currency,
        'symbol': rate_info['symbol'],
        'rate': rate_info['rate']
    }

@api_router.get("/public/track/{code}")
async def track_order_public(code: str):
    """Public endpoint to track order or enquiry by code"""
    code = code.strip().upper()
    
    # Try to find order by various ID formats
    # Supports: TM-, FAB-, POD-, BULK-, SOU-, BOU- prefixes and order_id field
    order = await db.orders.find_one(
        {'$or': [
            {'order_id': code},
            {'id': code}
        ]}, 
        {'_id': 0}
    )
    
    if order:
        return {
            'code': order.get('order_id') or order.get('id'),
            'type': order.get('type', order.get('order_type', 'unknown')),
            'status': order['status'],
            'quantity': order.get('quantity'),
            'total_price': order.get('total_price'),
            'created_at': order.get('created_at'),
            'notes': order.get('notes'),
            'items': order.get('items', [])[:5]  # Limit to first 5 items for privacy
        }
    
    # Check if it's an enquiry code (ENQ-)
    if code.startswith('ENQ-'):
        enquiry = await db.custom_requests.find_one({'enquiry_code': code}, {'_id': 0})
        if enquiry:
            return {
                'code': enquiry['enquiry_code'],
                'type': 'custom_request',
                'status': enquiry['status'],
                'item_description': enquiry.get('item_description'),
                'quantity': enquiry.get('quantity'),
                'created_at': enquiry['created_at'],
                'notes': enquiry.get('notes')
            }
    
    # Check design enquiries
    design_enquiry = await db.design_enquiries.find_one({'enquiry_code': code}, {'_id': 0})
    if design_enquiry:
        return {
            'code': design_enquiry['enquiry_code'],
            'type': 'design_enquiry',
            'status': design_enquiry.get('status', 'pending'),
            'service_type': design_enquiry.get('service_type'),
            'created_at': design_enquiry.get('created_at'),
            'notes': design_enquiry.get('notes')
        }
    
    raise HTTPException(status_code=404, detail="Order or enquiry not found")

# ==================== CONTACT MESSAGES ====================
class ContactMessage(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str

@api_router.post("/contact/message")
async def submit_contact_message(message: ContactMessage):
    """Submit a contact form message"""
    message_doc = {
        'id': str(uuid.uuid4()),
        'name': message.name,
        'email': message.email,
        'phone': message.phone,
        'subject': message.subject,
        'message': message.message,
        'status': 'new',  # new, read, replied
        'created_at': datetime.now(timezone.utc),
        'read_at': None,
        'replied_at': None
    }
    
    await db.contact_messages.insert_one(message_doc)
    
    return {
        'message': 'Your message has been sent successfully! We will get back to you soon.',
        'message_id': message_doc['id']
    }

@api_router.get("/admin/contact-messages")
async def get_contact_messages(request: Request, status: str = None):
    """Admin: Get all contact messages"""
    # Check admin auth
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query['status'] = status
    
    messages = await db.contact_messages.find(
        query,
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    return messages

@api_router.patch("/admin/contact-messages/{message_id}")
async def update_contact_message_status(message_id: str, status: str, request: Request):
    """Admin: Update contact message status"""
    # Check admin auth
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {'status': status}
    if status == 'read' and not await db.contact_messages.find_one({'id': message_id, 'read_at': {'$ne': None}}):
        update_data['read_at'] = datetime.now(timezone.utc)
    elif status == 'replied':
        update_data['replied_at'] = datetime.now(timezone.utc)
    
    result = await db.contact_messages.update_one(
        {'id': message_id},
        {'$set': update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {'message': 'Status updated successfully'}

# ==================== ADMIN NOTIFICATIONS ====================
@api_router.get("/admin/notifications/count")
async def get_notification_counts(request: Request):
    """Admin: Get counts of new notifications"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Count unread notifications
    unread_notifications = await db.notifications.count_documents({'read': False})
    
    return {
        'unread_count': unread_notifications,
        'new_orders': await db.orders.count_documents({'status': 'pending_payment'}),
        'new_enquiries': await db.custom_requests.count_documents({'status': 'pending_review'}),
        'payment_submissions': await db.orders.count_documents({'status': 'payment_submitted'})
    }


# ==================== CLIENT DIRECTORY ====================
class Client(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    measurements: Optional[List[dict]] = []

@api_router.get("/admin/clients")
async def get_clients(request: Request):
    """Admin: Get all clients"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    clients = await db.clients.find({}, {'_id': 0}).sort('name', 1).to_list(1000)
    return clients

@api_router.post("/admin/clients")
async def create_client(client: Client, request: Request):
    """Admin: Create new client"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    client_doc = {
        'id': str(uuid.uuid4()),
        'name': client.name,
        'phone': client.phone,
        'email': client.email,
        'address': client.address,
        'measurements': client.measurements or [],
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc)
    }
    
    await db.clients.insert_one(client_doc)
    return {'message': 'Client created successfully', 'id': client_doc['id']}

@api_router.put("/admin/clients/{client_id}")
async def update_client(client_id: str, client: Client, request: Request):
    """Admin: Update client"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.clients.update_one(
        {'id': client_id},
        {'$set': {
            'name': client.name,
            'phone': client.phone,
            'email': client.email,
            'address': client.address,
            'measurements': client.measurements or [],
            'updated_at': datetime.now(timezone.utc)
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {'message': 'Client updated successfully'}

@api_router.delete("/admin/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    """Admin: Delete client"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.clients.delete_one({'id': client_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {'message': 'Client deleted successfully'}

@api_router.get("/admin/clients/{client_id}/orders")
async def get_client_orders(client_id: str, request: Request):
    """Admin: Get all orders for a specific client"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get client info
    client = await db.clients.find_one({'id': client_id}, {'_id': 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Find orders by matching email or phone
    query = {'$or': []}
    if client.get('email'):
        query['$or'].append({'user_email': client['email']})
    if client.get('phone'):
        query['$or'].append({'user_phone': client['phone']})
    
    if not query['$or']:
        return {'client': client, 'orders': [], 'total_orders': 0, 'total_spent': 0}
    
    # Get all orders for this client
    orders = await db.orders.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)
    
    # Calculate stats
    total_spent = sum(order.get('total_price', 0) for order in orders)
    
    return {
        'client': client,
        'orders': orders,
        'total_orders': len(orders),
        'total_spent': total_spent
    }


# ==================== FINANCIAL MANAGEMENT ====================
class Expense(BaseModel):
    type: str  # running_cost, procurement, rent, salaries, utilities, maintenance, insurance, other, fixed_overhead
    description: str
    amount: float
    date: str
    category: Optional[str] = None  # For fixed overheads: rent/salaries/utilities/etc

@api_router.get("/admin/financials/summary")
async def get_financial_summary(request: Request):
    """Admin with role OR Super Admin: Get financial summary"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is super admin OR has financials role
    is_super_admin = user.get('is_super_admin', False)
    can_view_financials = user.get('role', {}).get('can_view_financials', False)
    
    if not (is_super_admin or can_view_financials):
        raise HTTPException(status_code=403, detail="Access denied. Requires financials permission.")
    
    # Calculate income from completed orders using aggregation
    income_pipeline = [
        {'$match': {'status': 'completed'}},
        {'$group': {
            '_id': None,
            'total': {'$sum': '$total_price'},
            'count': {'$sum': 1}
        }}
    ]
    income_result = await db.orders.aggregate(income_pipeline).to_list(1)
    total_income = income_result[0]['total'] if income_result else 0
    completed_orders_count = income_result[0]['count'] if income_result else 0
    
    # Calculate expenditure using aggregation
    # Get procurement total
    procurement_pipeline = [
        {'$group': {
            '_id': None,
            'total': {'$sum': '$total_cost'},
            'count': {'$sum': 1}
        }}
    ]
    procurement_result = await db.procurement.aggregate(procurement_pipeline).to_list(1)
    procurement = procurement_result[0]['total'] if procurement_result else 0
    procurement_count = procurement_result[0]['count'] if procurement_result else 0
    
    # Get expenses by type with separate fixed overheads
    expenses_pipeline = [
        {'$group': {
            '_id': '$type',
            'total': {'$sum': '$amount'},
            'count': {'$sum': 1}
        }}
    ]
    expenses_result = await db.expenses.aggregate(expenses_pipeline).to_list(20)
    
    running_costs = next((e['total'] for e in expenses_result if e['_id'] == 'running_cost'), 0)
    other_expenses = next((e['total'] for e in expenses_result if e['_id'] == 'other'), 0)
    
    # Calculate fixed overheads (rent, salaries, utilities, insurance, maintenance)
    fixed_overhead_types = ['rent', 'salaries', 'utilities', 'insurance', 'maintenance', 'fixed_overhead']
    fixed_overheads = sum(e['total'] for e in expenses_result if e['_id'] in fixed_overhead_types)
    
    expenses_count = sum(e['count'] for e in expenses_result)
    
    # Get refunds total
    refunds_pipeline = [
        {'$group': {
            '_id': None,
            'total': {'$sum': '$amount'},
            'count': {'$sum': 1}
        }}
    ]
    refunds_result = await db.refunds.aggregate(refunds_pipeline).to_list(1)
    total_refunds = refunds_result[0]['total'] if refunds_result else 0
    refunds_count = refunds_result[0]['count'] if refunds_result else 0
    
    total_expenditure = procurement + running_costs + other_expenses + fixed_overheads + total_refunds
    
    return {
        'total_income': total_income,
        'completed_orders': completed_orders_count,
        'total_expenditure': total_expenditure,
        'total_expenses': expenses_count + procurement_count + refunds_count,
        'procurement': procurement,
        'procurement_items_count': procurement_count,
        'running_costs': running_costs,
        'fixed_overheads': fixed_overheads,
        'other_expenses': other_expenses,
        'refunds': total_refunds,
        'refunds_count': refunds_count,
        'net_profit': total_income - total_expenditure
    }

@api_router.get("/admin/financials/transactions")
async def get_transactions(request: Request, limit: int = 100, skip: int = 0):
    """Admin with role OR Super Admin: Get transactions with pagination"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is super admin OR has financials role
    is_super_admin = user.get('is_super_admin', False)
    can_view_financials = user.get('role', {}).get('can_view_financials', False)
    
    if not (is_super_admin or can_view_financials):
        raise HTTPException(status_code=403, detail="Access denied. Requires financials permission.")
    
    # Limit max results to prevent abuse
    limit = min(limit, 500)
    
    transactions = []
    
    # Add completed orders as income (with limit)
    completed_orders = await db.orders.find(
        {'status': 'completed'}, 
        {'_id': 0, 'order_id': 1, 'type': 1, 'total_price': 1, 'updated_at': 1, 'created_at': 1}
    ).sort('created_at', -1).limit(limit).skip(skip).to_list(limit)
    
    for order in completed_orders:
        transactions.append({
            'type': 'income',
            'description': f"Order {order['order_id']} - {order['type'].upper()}",
            'amount': order.get('total_price', 0),
            'date': order.get('updated_at', order.get('created_at'))
        })
    
    # Add expenses (with limit)
    expenses = await db.expenses.find(
        {}, 
        {'_id': 0, 'type': 1, 'description': 1, 'amount': 1, 'date': 1}
    ).sort('date', -1).limit(limit).skip(skip).to_list(limit)
    
    for expense in expenses:
        transactions.append({
            'type': 'expense',
            'category': expense['type'],
            'description': expense['description'],
            'amount': expense['amount'],
            'date': expense['date']
        })
    
    # Sort by date descending
    transactions.sort(key=lambda x: x['date'], reverse=True)
    
    # Return limited results
    return transactions[:limit]

@api_router.post("/admin/financials/expense")
async def add_expense(expense: Expense, request: Request):
    """Admin with manage role OR Super Admin: Add expense"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is super admin OR has manage financials role
    is_super_admin = user.get('is_super_admin', False)
    can_manage_financials = user.get('role', {}).get('can_manage_financials', False)
    
    if not (is_super_admin or can_manage_financials):
        raise HTTPException(status_code=403, detail="Access denied. Requires manage financials permission.")
    
    expense_id = await generate_expense_id()  # Use new format: EXP-MMYY-XXXXXX
    
    expense_doc = {
        'id': expense_id,
        'expense_number': expense_id,  # Same as id
        'type': expense.type,
        'description': expense.description,
        'amount': expense.amount,
        'date': expense.date,
        'created_by': user['email'],
        'created_at': datetime.now(timezone.utc)
    }
    
    await db.expenses.insert_one(expense_doc)
    return {'message': 'Expense added successfully', 'id': expense_doc['id']}

@api_router.delete("/super-admin/payment/{payment_id}")
async def delete_payment(payment_id: str, request: Request):
    """Super Admin Only: Delete a payment/expense and update financial summary"""
    super_admin = await get_super_admin_user(request)
    
    # Try to find and delete from expenses collection
    expense = await db.expenses.find_one({'id': payment_id})
    
    if expense:
        # Delete the expense
        result = await db.expenses.delete_one({'id': payment_id})
        if result.deleted_count > 0:
            return {
                'message': 'Payment deleted successfully',
                'id': payment_id,
                'type': 'expense',
                'amount': expense.get('amount', 0)
            }
    
    # If not found in expenses, check refunds
    refund = await db.refunds.find_one({'id': payment_id})
    if refund:
        result = await db.refunds.delete_one({'id': payment_id})
        if result.deleted_count > 0:
            return {
                'message': 'Refund deleted successfully',
                'id': payment_id,
                'type': 'refund',
                'amount': refund.get('amount', 0)
            }
    
    raise HTTPException(status_code=404, detail="Payment not found")

# ==================== REFUNDS MANAGEMENT (SUPER ADMIN ONLY) ====================
class Refund(BaseModel):
    client_name: str
    order_id: Optional[str] = None
    amount: float
    phone_number: str
    email: str
    date: str
    reason: Optional[str] = None

@api_router.post("/super-admin/refunds")
async def add_refund(refund: Refund, request: Request):
    """Super Admin Only: Add refund"""
    super_admin = await get_super_admin_user(request)
    
    refund_id = await generate_refund_id()  # Use new format: REF-MMYY-XXXXXX
    
    refund_doc = {
        'id': refund_id,
        'refund_number': refund_id,  # Same as id for refunds
        'client_name': refund.client_name,
        'order_id': refund.order_id,
        'amount': refund.amount,
        'phone_number': refund.phone_number,
        'email': refund.email,
        'date': refund.date,
        'reason': refund.reason,
        'created_by': super_admin['email'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.refunds.insert_one(refund_doc)
    
    # Log action
    await db.admin_actions.insert_one({
        'action': 'add_refund',
        'performed_by': super_admin['email'],
        'refund_id': refund_doc['id'],
        'amount': refund.amount,
        'client': refund.client_name,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    return {'message': 'Refund added successfully', 'id': refund_doc['id']}

@api_router.get("/super-admin/refunds")
async def get_refunds(request: Request):
    """Super Admin Only: Get all refunds"""
    super_admin = await get_super_admin_user(request)
    
    refunds = await db.refunds.find({}, {'_id': 0}).sort('date', -1).to_list(10000)
    return refunds

@api_router.get("/super-admin/refunds/summary")
async def get_refunds_summary(request: Request):
    """Super Admin Only: Get refunds summary"""
    super_admin = await get_super_admin_user(request)
    
    refunds = await db.refunds.find({}, {'_id': 0}).to_list(10000)
    total_refunds = sum(r['amount'] for r in refunds)
    
    return {
        'total_refunds': total_refunds,
        'count': len(refunds)
    }

@api_router.delete("/super-admin/refunds/{refund_id}")
async def delete_refund(refund_id: str, request: Request):
    """Super Admin Only: Delete refund"""
    super_admin = await get_super_admin_user(request)
    
    result = await db.refunds.delete_one({'id': refund_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Refund not found")
    
    # Log action
    await db.admin_actions.insert_one({
        'action': 'delete_refund',
        'performed_by': super_admin['email'],
        'refund_id': refund_id,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    return {'message': 'Refund deleted successfully'}

# ==================== PROCUREMENT MANAGEMENT ====================
class ProcurementItem(BaseModel):
    item_name: str
    quantity: float
    unit_price: float
    total_cost: float
    supplier: Optional[str] = None
    date_purchased: str
    notes: Optional[str] = None

@api_router.get("/admin/procurement")
async def get_procurement_items(request: Request):
    """Admin: Get all procurement items"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    items = await db.procurement.find({}, {'_id': 0}).sort('date_purchased', -1).to_list(1000)
    return items

@api_router.post("/admin/procurement")
async def create_procurement_item(item: ProcurementItem, request: Request):
    """Admin: Add procurement item"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    procurement_id = await generate_procurement_id()  # Use new format: PRC-MMYY-XXXXXX
    
    item_doc = {
        'id': procurement_id,
        'procurement_number': procurement_id,  # Same as id
        'item_name': item.item_name,
        'quantity': item.quantity,
        'unit_price': item.unit_price,
        'total_cost': item.total_cost,
        'supplier': item.supplier,
        'date_purchased': item.date_purchased,
        'notes': item.notes,
        'created_by': user['email'],
        'created_at': datetime.now(timezone.utc)
    }
    
    await db.procurement.insert_one(item_doc)
    return {'message': 'Procurement item added successfully', 'id': item_doc['id']}

@api_router.put("/admin/procurement/{item_id}")
async def update_procurement_item(item_id: str, item: ProcurementItem, request: Request):
    """Admin: Update procurement item"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.procurement.update_one(
        {'id': item_id},
        {'$set': {
            'item_name': item.item_name,
            'quantity': item.quantity,
            'unit_price': item.unit_price,
            'total_cost': item.total_cost,
            'supplier': item.supplier,
            'date_purchased': item.date_purchased,
            'notes': item.notes,
            'updated_at': datetime.now(timezone.utc)
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {'message': 'Procurement item updated successfully'}

@api_router.delete("/admin/procurement/{item_id}")
async def delete_procurement_item(item_id: str, request: Request):
    """Admin: Delete procurement item"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.procurement.delete_one({'id': item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {'message': 'Procurement item deleted successfully'}

# ==================== SEWING MATERIALS INVENTORY ====================
class MaterialInventory(BaseModel):
    material_type: str  # Fabrics, Threads, Buttons, Zippers, Labels, Accessories
    material_name: str
    quantity: float
    unit: str  # yards, meters, pieces, rolls, etc.
    reorder_level: float
    cost_per_unit: float
    supplier: Optional[str] = None
    location: Optional[str] = None  # Storage location
    notes: Optional[str] = None

# Material type management
@api_router.get("/admin/material-types")
async def get_material_types(admin_user: Dict = Depends(get_admin_user)):
    """Get all material types (default + custom)"""
    # Default material types
    default_types = [
        "Fabrics",
        "Threads",
        "Buttons",
        "Zippers",
        "Labels",
        "Accessories",
        "Elastic",
        "Needles",
        "Patterns"
    ]
    
    # Get custom types from database
    custom_types_doc = await db.settings.find_one({'key': 'custom_material_types'}, {'_id': 0})
    custom_types = custom_types_doc.get('types', []) if custom_types_doc else []
    
    # Combine and deduplicate
    all_types = list(set(default_types + custom_types))
    all_types.sort()
    
    return {
        'material_types': all_types,
        'default_types': default_types,
        'custom_types': custom_types
    }

@api_router.post("/admin/material-types")
async def add_material_type(type_data: dict, admin_user: Dict = Depends(get_admin_user)):
    """Add a new custom material type"""
    new_type = type_data.get('type_name', '').strip()
    
    if not new_type:
        raise HTTPException(status_code=400, detail="Material type name is required")
    
    # Get existing custom types
    custom_types_doc = await db.settings.find_one({'key': 'custom_material_types'}, {'_id': 0})
    
    if custom_types_doc:
        custom_types = custom_types_doc.get('types', [])
        
        # Check if type already exists (case-insensitive)
        if any(t.lower() == new_type.lower() for t in custom_types):
            raise HTTPException(status_code=400, detail="Material type already exists")
        
        custom_types.append(new_type)
        
        # Update
        await db.settings.update_one(
            {'key': 'custom_material_types'},
            {'$set': {'types': custom_types, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    else:
        # Create new
        await db.settings.insert_one({
            'key': 'custom_material_types',
            'types': [new_type],
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        })
    
    return {'message': 'Material type added successfully', 'type_name': new_type}

@api_router.get("/admin/materials-inventory")
async def get_materials_inventory(admin_user: Dict = Depends(get_admin_user)):
    """Get all sewing materials inventory"""
    materials = await db.materials_inventory.find({}, {'_id': 0}).sort('material_type', 1).to_list(1000)
    
    # Calculate summary by type
    summary = {}
    for material in materials:
        mat_type = material['material_type']
        if mat_type not in summary:
            summary[mat_type] = {'count': 0, 'total_value': 0, 'low_stock_count': 0}
        summary[mat_type]['count'] += 1
        summary[mat_type]['total_value'] += material['quantity'] * material['cost_per_unit']
        if material['quantity'] <= material['reorder_level']:
            summary[mat_type]['low_stock_count'] += 1
    
    return {
        'materials': materials,
        'summary': summary,
        'total_items': len(materials),
        'low_stock_items': sum(1 for m in materials if m['quantity'] <= m['reorder_level'])
    }

@api_router.post("/admin/materials-inventory")
async def add_material(material: MaterialInventory, admin_user: Dict = Depends(get_admin_user)):
    """Add new material or update quantity if exists"""
    
    # Check if material with same type and name already exists
    existing_material = await db.materials_inventory.find_one({
        'material_type': material.material_type,
        'material_name': {'$regex': f'^{material.material_name}$', '$options': 'i'}  # Case-insensitive
    }, {'_id': 0})
    
    if existing_material:
        # Material exists - update quantity and cost
        new_quantity = existing_material['quantity'] + material.quantity
        
        # Update the material
        await db.materials_inventory.update_one(
            {'id': existing_material['id']},
            {
                '$set': {
                    'quantity': new_quantity,
                    'cost_per_unit': material.cost_per_unit,  # Update to latest cost
                    'total_value': new_quantity * material.cost_per_unit,
                    'supplier': material.supplier or existing_material.get('supplier'),
                    'location': material.location or existing_material.get('location'),
                    'notes': material.notes or existing_material.get('notes'),
                    'updated_by': admin_user['email'],
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log the quantity adjustment
        await db.materials_transactions.insert_one({
            'id': str(uuid.uuid4()),
            'material_id': existing_material['id'],
            'material_name': material.material_name,
            'adjustment': material.quantity,
            'quantity_before': existing_material['quantity'],
            'quantity_after': new_quantity,
            'reason': f'Auto-updated from procurement - Added {material.quantity} {material.unit}',
            'adjusted_by': admin_user['email'],
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        
        return {
            'message': f'Material already exists. Quantity updated from {existing_material["quantity"]} to {new_quantity} {material.unit}',
            'id': existing_material['id'],
            'action': 'updated',
            'quantity_added': material.quantity,
            'new_quantity': new_quantity
        }
    
    # Material doesn't exist - create new
    material_doc = {
        'id': str(uuid.uuid4()),
        'material_type': material.material_type,
        'material_name': material.material_name,
        'quantity': material.quantity,
        'unit': material.unit,
        'reorder_level': material.reorder_level,
        'cost_per_unit': material.cost_per_unit,
        'total_value': material.quantity * material.cost_per_unit,
        'supplier': material.supplier,
        'location': material.location,
        'notes': material.notes,
        'created_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.materials_inventory.insert_one(material_doc)
    return {
        'message': 'Material added successfully',
        'id': material_doc['id'],
        'action': 'created'
    }

@api_router.put("/admin/materials-inventory/{material_id}")
async def update_material(
    material_id: str,
    material: MaterialInventory,
    admin_user: Dict = Depends(get_admin_user)
):
    """Update material in inventory"""
    update_data = {
        'material_type': material.material_type,
        'material_name': material.material_name,
        'quantity': material.quantity,
        'unit': material.unit,
        'reorder_level': material.reorder_level,
        'cost_per_unit': material.cost_per_unit,
        'total_value': material.quantity * material.cost_per_unit,
        'supplier': material.supplier,
        'location': material.location,
        'notes': material.notes,
        'updated_by': admin_user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.materials_inventory.update_one(
        {'id': material_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return {'message': 'Material updated successfully'}

@api_router.patch("/admin/materials-inventory/{material_id}/adjust")
async def adjust_material_quantity(
    material_id: str,
    adjustment: float,
    reason: str,
    request: Request
):
    """Adjust material quantity (for usage/restock)"""
    admin_user = await get_admin_user(request)
    
    material = await db.materials_inventory.find_one({'id': material_id}, {'_id': 0})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    new_quantity = material['quantity'] + adjustment
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient quantity")
    
    # Update quantity
    await db.materials_inventory.update_one(
        {'id': material_id},
        {
            '$set': {
                'quantity': new_quantity,
                'total_value': new_quantity * material['cost_per_unit'],
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log the adjustment
    await db.materials_transactions.insert_one({
        'id': str(uuid.uuid4()),
        'material_id': material_id,
        'material_name': material['material_name'],
        'adjustment': adjustment,
        'quantity_before': material['quantity'],
        'quantity_after': new_quantity,
        'reason': reason,
        'adjusted_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    return {
        'message': 'Quantity adjusted successfully',
        'new_quantity': new_quantity,
        'unit': material['unit']
    }

@api_router.delete("/admin/materials-inventory/{material_id}")
async def delete_material(material_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Delete material from inventory"""
    result = await db.materials_inventory.delete_one({'id': material_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return {'message': 'Material deleted successfully'}

# Get single material with full details and history
@api_router.get("/admin/materials-inventory/{material_id}")
async def get_material_details(material_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Get material details with quantity history"""
    material = await db.materials_inventory.find_one({'id': material_id}, {'_id': 0})
    
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Get quantity history from transactions
    history = await db.materials_transactions.find(
        {'material_id': material_id}
    ).sort('created_at', -1).to_list(100)
    
    # Convert to proper format
    quantity_history = []
    for h in history:
        change_type = 'adjust'
        if h.get('adjustment', 0) > 0:
            change_type = 'add'
        elif h.get('adjustment', 0) < 0:
            change_type = 'remove'
            
        quantity_history.append({
            'id': h.get('id'),
            'change_type': change_type,
            'quantity_changed': abs(h.get('adjustment', 0)),
            'previous_quantity': h.get('quantity_before', 0),
            'new_quantity': h.get('quantity_after', 0),
            'reason': h.get('reason', ''),
            'admin_email': h.get('adjusted_by', 'Unknown'),
            'timestamp': h.get('created_at', '')
        })
    
    return {
        'material': material,
        'quantity_history': quantity_history
    }

# ==================== ENHANCED MATERIAL TYPES MANAGEMENT ====================

@api_router.get("/admin/material-types-full")
async def get_material_types_full(admin_user: Dict = Depends(get_admin_user)):
    """Get all material types with full metadata"""
    # Default material types
    default_types = [
        {"name": "Fabrics", "description": "Various fabric materials", "is_default": True, "status": "active"},
        {"name": "Threads", "description": "Sewing threads", "is_default": True, "status": "active"},
        {"name": "Buttons", "description": "All types of buttons", "is_default": True, "status": "active"},
        {"name": "Zippers", "description": "Zippers and closures", "is_default": True, "status": "active"},
        {"name": "Labels", "description": "Labels and tags", "is_default": True, "status": "active"},
        {"name": "Accessories", "description": "Misc accessories", "is_default": True, "status": "active"},
        {"name": "Elastic", "description": "Elastic bands", "is_default": True, "status": "active"},
        {"name": "Needles", "description": "Sewing needles", "is_default": True, "status": "active"},
        {"name": "Patterns", "description": "Pattern materials", "is_default": True, "status": "active"},
        {"name": "Lining", "description": "Lining materials", "is_default": True, "status": "active"},
        {"name": "Packaging", "description": "Packaging materials", "is_default": True, "status": "active"},
    ]
    
    # Get custom types from collection
    custom_types = await db.material_types.find({}, {'_id': 0}).to_list(100)
    
    # Combine defaults with custom types
    all_types = []
    default_names = set()
    
    for dt in default_types:
        all_types.append(dt)
        default_names.add(dt['name'].lower())
    
    for ct in custom_types:
        if ct['name'].lower() not in default_names:
            ct['is_default'] = False
            all_types.append(ct)
    
    # Sort by name
    all_types.sort(key=lambda x: x['name'])
    
    # Get count of materials using each type
    type_counts = {}
    materials = await db.materials_inventory.find({}, {'material_type': 1, '_id': 0}).to_list(1000)
    for m in materials:
        mt = m.get('material_type', '')
        type_counts[mt] = type_counts.get(mt, 0) + 1
    
    for t in all_types:
        t['materials_count'] = type_counts.get(t['name'], 0)
    
    return {
        'types': all_types,
        'total': len(all_types)
    }

@api_router.post("/admin/material-types-full")
async def create_material_type(data: Dict[str, Any], admin_user: Dict = Depends(get_admin_user)):
    """Create a new custom material type"""
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    
    if not name:
        raise HTTPException(status_code=400, detail="Type name is required")
    
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Type name must be at least 2 characters")
    
    # Check for duplicates (case-insensitive)
    default_names = ['fabrics', 'threads', 'buttons', 'zippers', 'labels', 'accessories', 'elastic', 'needles', 'patterns', 'lining', 'packaging']
    if name.lower() in default_names:
        raise HTTPException(status_code=400, detail="This type already exists as a default type")
    
    existing = await db.material_types.find_one({'name': {'$regex': f'^{name}$', '$options': 'i'}})
    if existing:
        raise HTTPException(status_code=400, detail="A type with this name already exists")
    
    type_doc = {
        'id': str(uuid.uuid4()),
        'name': name,
        'description': description,
        'status': 'active',
        'created_by_admin_id': admin_user.get('id', admin_user.get('email')),
        'created_by_email': admin_user.get('email'),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.material_types.insert_one(type_doc)
    
    return {
        'message': 'Material type created successfully',
        'type': {
            'id': type_doc['id'],
            'name': type_doc['name'],
            'description': type_doc['description'],
            'status': type_doc['status'],
            'is_default': False,
            'materials_count': 0
        }
    }

@api_router.put("/admin/material-types-full/{type_id}")
async def update_material_type(type_id: str, data: Dict[str, Any], admin_user: Dict = Depends(get_admin_user)):
    """Update a custom material type (rename or change description)"""
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    
    if not name:
        raise HTTPException(status_code=400, detail="Type name is required")
    
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Type name must be at least 2 characters")
    
    # Check if type exists
    existing = await db.material_types.find_one({'id': type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Material type not found")
    
    old_name = existing['name']
    
    # Check for duplicate names (if name changed)
    if name.lower() != old_name.lower():
        duplicate = await db.material_types.find_one({
            'name': {'$regex': f'^{name}$', '$options': 'i'},
            'id': {'$ne': type_id}
        })
        if duplicate:
            raise HTTPException(status_code=400, detail="A type with this name already exists")
    
    # Update type
    await db.material_types.update_one(
        {'id': type_id},
        {'$set': {
            'name': name,
            'description': description,
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': admin_user.get('email')
        }}
    )
    
    # Update all materials using this type (if name changed)
    if name != old_name:
        await db.materials_inventory.update_many(
            {'material_type': old_name},
            {'$set': {'material_type': name}}
        )
    
    return {'message': 'Material type updated successfully'}

@api_router.patch("/admin/material-types-full/{type_id}/status")
async def toggle_material_type_status(type_id: str, data: Dict[str, Any], admin_user: Dict = Depends(get_admin_user)):
    """Activate or deactivate a material type (soft delete)"""
    status = data.get('status', 'inactive')
    
    existing = await db.material_types.find_one({'id': type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Material type not found")
    
    await db.material_types.update_one(
        {'id': type_id},
        {'$set': {
            'status': status,
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': admin_user.get('email')
        }}
    )
    
    return {'message': f'Material type {"activated" if status == "active" else "deactivated"} successfully'}

# ==================== PRODUCT INVENTORY MANAGEMENT ====================

LOW_STOCK_THRESHOLD = 10  # Default threshold for low stock alerts

@api_router.get("/admin/inventory/overview")
async def get_inventory_overview(admin_user: Dict = Depends(get_admin_user)):
    """Get inventory overview with stock levels and alerts"""
    
    # Get all product types with stock info
    fabrics = await db.fabrics.find({}, {'_id': 0}).to_list(100)
    souvenirs = await db.souvenirs.find({}, {'_id': 0}).to_list(100)
    boutique = await db.boutique_products.find({}, {'_id': 0}).to_list(100)
    
    # Calculate stats
    low_stock_items = []
    out_of_stock_items = []
    total_value = 0
    
    for product in fabrics + souvenirs + boutique:
        stock = product.get('stock', product.get('quantity', 0))
        threshold = product.get('low_stock_threshold', LOW_STOCK_THRESHOLD)
        price = product.get('price', 0)
        total_value += stock * price
        
        if stock == 0:
            out_of_stock_items.append({
                'id': product.get('id'),
                'name': product.get('name'),
                'type': 'fabric' if product in fabrics else ('souvenir' if product in souvenirs else 'boutique'),
                'stock': stock
            })
        elif stock <= threshold:
            low_stock_items.append({
                'id': product.get('id'),
                'name': product.get('name'),
                'type': 'fabric' if product in fabrics else ('souvenir' if product in souvenirs else 'boutique'),
                'stock': stock,
                'threshold': threshold
            })
    
    return {
        'summary': {
            'total_products': len(fabrics) + len(souvenirs) + len(boutique),
            'fabrics_count': len(fabrics),
            'souvenirs_count': len(souvenirs),
            'boutique_count': len(boutique),
            'low_stock_count': len(low_stock_items),
            'out_of_stock_count': len(out_of_stock_items),
            'total_inventory_value': total_value
        },
        'low_stock_items': low_stock_items,
        'out_of_stock_items': out_of_stock_items
    }

@api_router.put("/admin/inventory/{product_type}/{product_id}/stock")
async def update_product_stock(
    product_type: str,
    product_id: str,
    data: Dict[str, Any],
    admin_user: Dict = Depends(get_admin_user)
):
    """Update stock level for a product"""
    
    collection_map = {
        'fabric': db.fabrics,
        'souvenir': db.souvenirs,
        'boutique': db.boutique_products
    }
    
    if product_type not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid product type")
    
    collection = collection_map[product_type]
    
    update_data = {
        'stock': data.get('stock', 0),
        'low_stock_threshold': data.get('low_stock_threshold', LOW_STOCK_THRESHOLD),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'updated_by': admin_user['email']
    }
    
    result = await collection.update_one(
        {'id': product_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Log stock change
    await db.stock_history.insert_one({
        'id': str(uuid.uuid4()),
        'product_id': product_id,
        'product_type': product_type,
        'previous_stock': data.get('previous_stock', 0),
        'new_stock': data.get('stock', 0),
        'change': data.get('stock', 0) - data.get('previous_stock', 0),
        'reason': data.get('reason', 'Manual adjustment'),
        'updated_by': admin_user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    })
    
    return {'message': 'Stock updated successfully', 'new_stock': data.get('stock', 0)}

@api_router.get("/admin/inventory/alerts")
async def get_inventory_alerts(admin_user: Dict = Depends(get_admin_user)):
    """Get low stock and out of stock alerts"""
    
    alerts = []
    
    # Check fabrics
    fabrics = await db.fabrics.find({}, {'_id': 0}).to_list(100)
    for f in fabrics:
        stock = f.get('stock', 0)
        threshold = f.get('low_stock_threshold', LOW_STOCK_THRESHOLD)
        if stock <= threshold:
            alerts.append({
                'type': 'low_stock' if stock > 0 else 'out_of_stock',
                'severity': 'critical' if stock == 0 else ('high' if stock <= threshold/2 else 'medium'),
                'product_type': 'fabric',
                'product_id': f.get('id'),
                'product_name': f.get('name'),
                'current_stock': stock,
                'threshold': threshold
            })
    
    # Check souvenirs
    souvenirs = await db.souvenirs.find({}, {'_id': 0}).to_list(100)
    for s in souvenirs:
        stock = s.get('stock', 0)
        threshold = s.get('low_stock_threshold', LOW_STOCK_THRESHOLD)
        if stock <= threshold:
            alerts.append({
                'type': 'low_stock' if stock > 0 else 'out_of_stock',
                'severity': 'critical' if stock == 0 else ('high' if stock <= threshold/2 else 'medium'),
                'product_type': 'souvenir',
                'product_id': s.get('id'),
                'product_name': s.get('name'),
                'current_stock': stock,
                'threshold': threshold
            })
    
    # Check boutique products
    boutique = await db.boutique_products.find({}, {'_id': 0}).to_list(100)
    for b in boutique:
        stock = b.get('stock', 0)
        threshold = b.get('low_stock_threshold', LOW_STOCK_THRESHOLD)
        if stock <= threshold:
            alerts.append({
                'type': 'low_stock' if stock > 0 else 'out_of_stock',
                'severity': 'critical' if stock == 0 else ('high' if stock <= threshold/2 else 'medium'),
                'product_type': 'boutique',
                'product_id': b.get('id'),
                'product_name': b.get('name'),
                'current_stock': stock,
                'threshold': threshold
            })
    
    # Sort by severity
    severity_order = {'critical': 0, 'high': 1, 'medium': 2}
    alerts.sort(key=lambda x: severity_order.get(x['severity'], 3))
    
    return {'alerts': alerts, 'total': len(alerts)}

@api_router.get("/admin/inventory/history")
async def get_stock_history(
    product_id: Optional[str] = None,
    limit: int = 50,
    admin_user: Dict = Depends(get_admin_user)
):
    """Get stock change history"""
    query = {}
    if product_id:
        query['product_id'] = product_id
    
    history = await db.stock_history.find(query, {'_id': 0}).sort('updated_at', -1).limit(limit).to_list(limit)
    return history

# ==================== SUPPLIERS MANAGEMENT ====================
class Supplier(BaseModel):
    name: str
    product: str
    phone_number: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

@api_router.get("/admin/suppliers")
async def get_suppliers(admin_user: Dict = Depends(get_admin_user)):
    """Get all suppliers"""
    suppliers = await db.suppliers.find({}, {'_id': 0}).sort('name', 1).to_list(1000)
    return suppliers

@api_router.post("/admin/suppliers")
async def add_supplier(supplier: Supplier, admin_user: Dict = Depends(get_admin_user)):
    """Add new supplier"""
    supplier_doc = {
        'id': str(uuid.uuid4()),
        'name': supplier.name,
        'product': supplier.product,
        'phone_number': supplier.phone_number,
        'email': supplier.email,
        'address': supplier.address,
        'notes': supplier.notes,
        'created_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.suppliers.insert_one(supplier_doc)
    return {'message': 'Supplier added successfully', 'id': supplier_doc['id']}

@api_router.put("/admin/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, supplier: Supplier, admin_user: Dict = Depends(get_admin_user)):
    """Update existing supplier"""
    update_data = {
        'name': supplier.name,
        'product': supplier.product,
        'phone_number': supplier.phone_number,
        'email': supplier.email,
        'address': supplier.address,
        'notes': supplier.notes,
        'updated_by': admin_user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.suppliers.update_one(
        {'id': supplier_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return {'message': 'Supplier updated successfully'}

@api_router.delete("/admin/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Delete supplier"""
    result = await db.suppliers.delete_one({'id': supplier_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return {'message': 'Supplier deleted successfully'}

# ==================== POD CLOTHING ITEMS MANAGEMENT ====================
class PODClothingItem(BaseModel):
    name: str
    base_price: float
    image_url: str
    description: Optional[str] = None
    is_active: Optional[bool] = True

# Bulk Clothing Item with Variant Pricing
class BulkClothingItem(BaseModel):
    name: str
    standard_price: float
    premium_price: float
    luxury_price: float
    image_url: str
    description: Optional[str] = None
    is_active: Optional[bool] = True

# Helper to get variant prices
QUALITY_VARIANTS = ['standard', 'premium', 'luxury']

def get_variant_price(item: dict, variant: str) -> float:
    """Get price for a specific quality variant"""
    variant = variant.lower() if variant else 'standard'
    if variant == 'premium':
        return item.get('premium_price', item.get('base_price', 0) * 1.5)
    elif variant == 'luxury':
        return item.get('luxury_price', item.get('base_price', 0) * 2)
    else:
        return item.get('standard_price', item.get('base_price', 0))

@api_router.get("/pod/clothing-items")
async def get_pod_clothing_items():
    """Public: Get all active POD clothing items with variant pricing"""
    items = await db.pod_clothing_items.find({'is_active': True}, {'_id': 0}).sort('name', 1).to_list(100)
    
    # If no items exist, return default items with variant pricing
    if not items:
        default_items = [
            {
                'id': str(uuid.uuid4()),
                'name': 'T-Shirt',
                'standard_price': 2000,
                'premium_price': 3000,
                'luxury_price': 4500,
                'base_price': 2000,
                'image_url': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
                'description': 'Classic short sleeve',
                'colors': ['White', 'Black', 'Navy', 'Grey', 'Red'],
                'sizes': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Polo Shirt',
                'standard_price': 2500,
                'premium_price': 3750,
                'luxury_price': 5000,
                'base_price': 2500,
                'image_url': 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&q=80',
                'description': 'Collared with buttons',
                'colors': ['White', 'Black', 'Navy', 'Red', 'Blue'],
                'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Hoodie',
                'standard_price': 4500,
                'premium_price': 6750,
                'luxury_price': 9000,
                'base_price': 4500,
                'image_url': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
                'description': 'With hood and pocket',
                'colors': ['Black', 'Grey', 'Navy', 'White'],
                'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Joggers',
                'standard_price': 3500,
                'premium_price': 5250,
                'luxury_price': 7000,
                'base_price': 3500,
                'image_url': 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80',
                'description': 'Comfortable track pants',
                'colors': ['Black', 'Grey', 'Navy'],
                'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Varsity Jacket',
                'standard_price': 8000,
                'premium_price': 12000,
                'luxury_price': 16000,
                'base_price': 8000,
                'image_url': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
                'description': 'Classic sporty jacket',
                'colors': ['Black/White', 'Navy/White', 'Red/White'],
                'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Tank Top',
                'standard_price': 1500,
                'premium_price': 2250,
                'luxury_price': 3000,
                'base_price': 1500,
                'image_url': 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&q=80',
                'description': 'Sleeveless tank',
                'colors': ['White', 'Black', 'Grey'],
                'sizes': ['XS', 'S', 'M', 'L', 'XL'],
                'is_active': True
            }
        ]
        return default_items
    
    # Ensure all items have variant pricing (migrate legacy items)
    for item in items:
        if 'standard_price' not in item:
            base = item.get('base_price', 2000)
            item['standard_price'] = base
            item['premium_price'] = int(base * 1.5)
            item['luxury_price'] = int(base * 2)
    
    return items

@api_router.get("/admin/pod/clothing-items")
async def get_all_pod_clothing_items(admin_user: Dict = Depends(get_admin_user)):
    """Admin: Get all POD clothing items (including inactive) with variant pricing"""
    items = await db.pod_clothing_items.find({}, {'_id': 0}).sort('name', 1).to_list(100)
    
    # Ensure all items have variant pricing
    for item in items:
        if 'standard_price' not in item:
            base = item.get('base_price', 2000)
            item['standard_price'] = base
            item['premium_price'] = int(base * 1.5)
            item['luxury_price'] = int(base * 2)
    
    return items

@api_router.post("/admin/pod/clothing-items")
async def create_pod_clothing_item(item: BulkClothingItem, admin_user: Dict = Depends(get_admin_user)):
    """Admin: Create new POD clothing item"""
    
    # Check if item with same name exists
    existing = await db.pod_clothing_items.find_one({
        'name': {'$regex': f'^{item.name}$', '$options': 'i'}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Clothing item with this name already exists")
    
    item_doc = {
        'id': str(uuid.uuid4()),
        'name': item.name,
        'standard_price': item.standard_price,
        'premium_price': item.premium_price,
        'luxury_price': item.luxury_price,
        'base_price': item.standard_price,  # Keep base_price for backward compatibility
        'image_url': item.image_url,
        'description': item.description or '',
        'is_active': item.is_active if item.is_active is not None else True,
        'created_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.pod_clothing_items.insert_one(item_doc)
    
    # Remove MongoDB _id field for JSON serialization
    if '_id' in item_doc:
        del item_doc['_id']
    
    return {
        'message': 'POD clothing item created successfully',
        'id': item_doc['id'],
        'item': item_doc
    }

@api_router.put("/admin/pod/clothing-items/{item_id}")
async def update_pod_clothing_item(
    item_id: str,
    item: BulkClothingItem,
    admin_user: Dict = Depends(get_admin_user)
):
    """Admin: Update POD clothing item with variant pricing"""
    
    update_data = {
        'name': item.name,
        'standard_price': item.standard_price,
        'premium_price': item.premium_price,
        'luxury_price': item.luxury_price,
        'base_price': item.standard_price,  # Keep base_price for backward compatibility
        'image_url': item.image_url,
        'description': item.description,
        'is_active': item.is_active if item.is_active is not None else True,
        'updated_by': admin_user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.pod_clothing_items.update_one(
        {'id': item_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    return {'message': 'POD clothing item updated successfully'}

@api_router.delete("/admin/pod/clothing-items/{item_id}")
async def delete_pod_clothing_item(item_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Admin: Delete POD clothing item"""
    
    result = await db.pod_clothing_items.delete_one({'id': item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    return {'message': 'POD clothing item deleted successfully'}

# ==================== SITE TEXT CMS MANAGEMENT ====================
# Default site texts - used for initialization and reset
DEFAULT_SITE_TEXTS = {
    # Homepage
    "home.hero.subtitle": {"value": "PREMIUM CLOTHING MANUFACTURING", "page": "home", "section": "hero", "description": "Hero section subtitle", "max_length": 100},
    "home.hero.title1": {"value": "Quality Clothing,", "page": "home", "section": "hero", "description": "Hero title line 1", "max_length": 50},
    "home.hero.title2": {"value": "Made for You", "page": "home", "section": "hero", "description": "Hero title line 2 (italic)", "max_length": 50},
    "home.hero.description": {"value": "From bulk orders for schools and corporates to custom print-on-demand services. Nigeria's trusted clothing factory delivering excellence since day one.", "page": "home", "section": "hero", "description": "Hero description text", "max_length": 300},
    "home.hero.cta_primary": {"value": "Start Bulk Order", "page": "home", "section": "hero", "description": "Primary CTA button text", "max_length": 30},
    "home.hero.cta_secondary": {"value": "Track Order", "page": "home", "section": "hero", "description": "Secondary CTA button text", "max_length": 30},
    "home.services.title": {"value": "Our Services", "page": "home", "section": "services", "description": "Services section title", "max_length": 50},
    "home.services.subtitle": {"value": "Everything you need for quality clothing", "page": "home", "section": "services", "description": "Services section subtitle", "max_length": 100},
    "home.trust.title": {"value": "Trusted by Thousands", "page": "home", "section": "trust", "description": "Trust section title", "max_length": 50},
    "home.trust.description": {"value": "Join hundreds of satisfied customers who trust Temaruco for their clothing needs.", "page": "home", "section": "trust", "description": "Trust section description", "max_length": 200},
    
    # Bulk Orders
    "bulk.page.title": {"value": "Bulk Orders", "page": "bulk", "section": "header", "description": "Page title", "max_length": 50},
    "bulk.page.subtitle": {"value": "Quality clothing for schools, corporates, and events", "page": "bulk", "section": "header", "description": "Page subtitle", "max_length": 100},
    "bulk.step1.title": {"value": "Select Item", "page": "bulk", "section": "steps", "description": "Step 1 title", "max_length": 30},
    "bulk.step2.title": {"value": "Choose Quality", "page": "bulk", "section": "steps", "description": "Step 2 title", "max_length": 30},
    "bulk.step3.title": {"value": "Select Colors & Sizes", "page": "bulk", "section": "steps", "description": "Step 3 title", "max_length": 30},
    "bulk.step4.title": {"value": "Review & Order", "page": "bulk", "section": "steps", "description": "Step 4 title", "max_length": 30},
    "bulk.min_quantity": {"value": "Minimum order: 10 pieces per item", "page": "bulk", "section": "info", "description": "Minimum quantity notice", "max_length": 100},
    
    # Print on Demand
    "pod.page.title": {"value": "Print on Demand", "page": "pod", "section": "header", "description": "Page title", "max_length": 50},
    "pod.page.subtitle": {"value": "Custom printed clothing, one piece at a time", "page": "pod", "section": "header", "description": "Page subtitle", "max_length": 100},
    "pod.design.instructions": {"value": "Upload your design, position it on the garment, and add to cart. We'll print and deliver!", "page": "pod", "section": "design", "description": "Design tool instructions", "max_length": 200},
    "pod.upload.button": {"value": "Upload Design", "page": "pod", "section": "design", "description": "Upload button text", "max_length": 30},
    "pod.contact.title": {"value": "Your Contact Info", "page": "pod", "section": "contact", "description": "Contact form title", "max_length": 50},
    "pod.contact.note": {"value": "Required to save your design and process orders.", "page": "pod", "section": "contact", "description": "Contact form note", "max_length": 100},
    
    # Boutique
    "boutique.page.title": {"value": "Boutique", "page": "boutique", "section": "header", "description": "Page title", "max_length": 50},
    "boutique.page.subtitle": {"value": "Ready-to-wear Nigerian fashion", "page": "boutique", "section": "header", "description": "Page subtitle", "max_length": 100},
    "boutique.filter.all": {"value": "All Products", "page": "boutique", "section": "filters", "description": "All products filter", "max_length": 30},
    "boutique.filter.traditional": {"value": "Traditional", "page": "boutique", "section": "filters", "description": "Traditional filter", "max_length": 30},
    "boutique.filter.modern": {"value": "Modern", "page": "boutique", "section": "filters", "description": "Modern filter", "max_length": 30},
    
    # Fabrics
    "fabrics.page.title": {"value": "Fabrics", "page": "fabrics", "section": "header", "description": "Page title", "max_length": 50},
    "fabrics.page.subtitle": {"value": "Premium quality fabrics for your projects", "page": "fabrics", "section": "header", "description": "Page subtitle", "max_length": 100},
    
    # Souvenirs
    "souvenirs.page.title": {"value": "Souvenirs", "page": "souvenirs", "section": "header", "description": "Page title", "max_length": 50},
    "souvenirs.page.subtitle": {"value": "Custom branded merchandise and gifts", "page": "souvenirs", "section": "header", "description": "Page subtitle", "max_length": 100},
    
    # Cart & Checkout
    "cart.page.title": {"value": "Shopping Cart", "page": "cart", "section": "header", "description": "Cart page title", "max_length": 50},
    "cart.empty.message": {"value": "Your cart is empty", "page": "cart", "section": "empty", "description": "Empty cart message", "max_length": 50},
    "cart.empty.cta": {"value": "Continue Shopping", "page": "cart", "section": "empty", "description": "Empty cart CTA", "max_length": 30},
    "cart.checkout.button": {"value": "Proceed to Checkout", "page": "cart", "section": "checkout", "description": "Checkout button text", "max_length": 30},
    "checkout.title": {"value": "Order Summary", "page": "checkout", "section": "header", "description": "Checkout page title", "max_length": 50},
    "checkout.payment.title": {"value": "Payment Method", "page": "checkout", "section": "payment", "description": "Payment section title", "max_length": 50},
    
    # Footer
    "footer.company.name": {"value": "Temaruco Clothing Factory", "page": "global", "section": "footer", "description": "Company name in footer", "max_length": 50},
    "footer.company.description": {"value": "Nigeria's trusted clothing manufacturer since day one.", "page": "global", "section": "footer", "description": "Company description", "max_length": 150},
    "footer.contact.title": {"value": "Contact Us", "page": "global", "section": "footer", "description": "Contact section title", "max_length": 30},
    "footer.links.title": {"value": "Quick Links", "page": "global", "section": "footer", "description": "Links section title", "max_length": 30},
    "footer.services.title": {"value": "Services", "page": "global", "section": "footer", "description": "Services section title", "max_length": 30},
    "footer.copyright": {"value": "© 2024 Temaruco Clothing Factory. All rights reserved.", "page": "global", "section": "footer", "description": "Copyright text", "max_length": 100},
    
    # Navigation
    "nav.bulk_orders": {"value": "Bulk Orders", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    "nav.print_on_demand": {"value": "Print-On-Demand", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    "nav.custom_order": {"value": "Custom Order", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    "nav.boutique": {"value": "Boutique", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    "nav.fabrics": {"value": "Fabrics", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    "nav.souvenirs": {"value": "Souvenirs", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    "nav.design_services": {"value": "Design Services", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    "nav.contact": {"value": "Contact", "page": "global", "section": "navigation", "description": "Navigation link", "max_length": 30},
    
    # Common buttons
    "btn.add_to_cart": {"value": "Add to Cart", "page": "global", "section": "buttons", "description": "Add to cart button", "max_length": 30},
    "btn.buy_now": {"value": "Buy Now", "page": "global", "section": "buttons", "description": "Buy now button", "max_length": 30},
    "btn.continue": {"value": "Continue", "page": "global", "section": "buttons", "description": "Continue button", "max_length": 30},
    "btn.back": {"value": "Back", "page": "global", "section": "buttons", "description": "Back button", "max_length": 30},
    "btn.submit": {"value": "Submit", "page": "global", "section": "buttons", "description": "Submit button", "max_length": 30},
    "btn.save": {"value": "Save", "page": "global", "section": "buttons", "description": "Save button", "max_length": 30},
    "btn.cancel": {"value": "Cancel", "page": "global", "section": "buttons", "description": "Cancel button", "max_length": 30},
    
    # Contact Page
    "contact.page.title": {"value": "Contact Us", "page": "contact", "section": "header", "description": "Page title", "max_length": 50},
    "contact.page.subtitle": {"value": "We'd love to hear from you", "page": "contact", "section": "header", "description": "Page subtitle", "max_length": 100},
    "contact.form.title": {"value": "Send us a message", "page": "contact", "section": "form", "description": "Form title", "max_length": 50},
    "contact.address.title": {"value": "Our Address", "page": "contact", "section": "info", "description": "Address section title", "max_length": 30},
    "contact.hours.title": {"value": "Business Hours", "page": "contact", "section": "info", "description": "Hours section title", "max_length": 30},
    
    # About Page
    "about.page.title": {"value": "About Us", "page": "about", "section": "header", "description": "Page title", "max_length": 50},
    "about.page.subtitle": {"value": "Our story and mission", "page": "about", "section": "header", "description": "Page subtitle", "max_length": 100},
    "about.mission.title": {"value": "Our Mission", "page": "about", "section": "mission", "description": "Mission section title", "max_length": 50},
    "about.values.title": {"value": "Our Values", "page": "about", "section": "values", "description": "Values section title", "max_length": 50},
    
    # Design Services
    "design_services.page.title": {"value": "Design Services", "page": "design_services", "section": "header", "description": "Page title", "max_length": 50},
    "design_services.page.subtitle": {"value": "Professional design help for your projects", "page": "design_services", "section": "header", "description": "Page subtitle", "max_length": 100},
    
    # Order Tracking
    "tracking.page.title": {"value": "Track Your Order", "page": "tracking", "section": "header", "description": "Page title", "max_length": 50},
    "tracking.placeholder": {"value": "Enter your order code", "page": "tracking", "section": "form", "description": "Input placeholder", "max_length": 50},
    "tracking.button": {"value": "Track Order", "page": "tracking", "section": "form", "description": "Track button text", "max_length": 30},
}

@api_router.get("/site-texts")
async def get_all_site_texts():
    """
    Public endpoint: Get all site texts for frontend.
    Returns a simple key-value map for efficient frontend usage.
    No authentication required for reading.
    """
    try:
        texts = await db.site_texts.find({}, {'_id': 0, 'key': 1, 'value': 1}).to_list(1000)
        
        # Convert to simple key-value map
        text_map = {t['key']: t['value'] for t in texts}
        
        # Fill in defaults for any missing keys
        for key, data in DEFAULT_SITE_TEXTS.items():
            if key not in text_map:
                text_map[key] = data['value']
        
        return {
            'texts': text_map,
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'cache_ttl': 60  # Suggest 60 second cache to frontend
        }
    except Exception as e:
        logger.error(f"Failed to fetch site texts: {str(e)}")
        # Return defaults on error
        return {
            'texts': {k: v['value'] for k, v in DEFAULT_SITE_TEXTS.items()},
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'cache_ttl': 60
        }

@api_router.get("/admin/site-texts")
async def admin_get_site_texts(
    request: Request,
    page: int = 1,
    limit: int = 50,
    search: str = "",
    filter_page: str = ""
):
    """Admin: Get all site texts with full metadata for management."""
    admin_user = await get_admin_user(request)
    
    skip = (page - 1) * limit
    
    # Build query
    query = {}
    if search:
        query['$or'] = [
            {'key': {'$regex': search, '$options': 'i'}},
            {'value': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}}
        ]
    if filter_page:
        query['page'] = filter_page
    
    # Get texts from DB
    texts = await db.site_texts.find(query, {'_id': 0}).sort('key', 1).skip(skip).limit(limit).to_list(limit)
    total = await db.site_texts.count_documents(query)
    
    # Get unique pages for filter dropdown
    all_pages = await db.site_texts.distinct('page')
    
    return {
        'texts': texts,
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit,
        'available_pages': sorted(all_pages)
    }

@api_router.put("/admin/site-texts/{key:path}")
async def admin_update_site_text(key: str, data: Dict[str, Any], request: Request):
    """Admin: Update a site text value."""
    admin_user = await get_admin_user(request)
    
    new_value = data.get('value', '').strip()
    
    if not new_value:
        raise HTTPException(status_code=400, detail="Value cannot be empty")
    
    # Sanitize - remove HTML tags
    import re
    new_value = re.sub(r'<[^>]+>', '', new_value)
    
    # Check max length
    default_data = DEFAULT_SITE_TEXTS.get(key, {})
    max_length = default_data.get('max_length', 500)
    
    if len(new_value) > max_length:
        raise HTTPException(
            status_code=400, 
            detail=f"Text exceeds maximum length of {max_length} characters"
        )
    
    # Update or create
    result = await db.site_texts.update_one(
        {'key': key},
        {
            '$set': {
                'value': new_value,
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'updated_by': admin_user['email']
            }
        },
        upsert=True
    )
    
    logger.info(f"[CMS] Site text '{key}' updated by {admin_user['email']}")
    
    return {
        'message': 'Text updated successfully',
        'key': key,
        'value': new_value,
        'last_updated': datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/admin/site-texts/reset/{key:path}")
async def admin_reset_site_text(key: str, request: Request):
    """Admin: Reset a site text to its default value."""
    admin_user = await get_admin_user(request)
    
    if key not in DEFAULT_SITE_TEXTS:
        raise HTTPException(status_code=404, detail="No default value found for this key")
    
    default_value = DEFAULT_SITE_TEXTS[key]['value']
    
    await db.site_texts.update_one(
        {'key': key},
        {
            '$set': {
                'value': default_value,
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'updated_by': admin_user['email'],
                'reset_to_default': True
            }
        },
        upsert=True
    )
    
    logger.info(f"[CMS] Site text '{key}' reset to default by {admin_user['email']}")
    
    return {
        'message': 'Text reset to default',
        'key': key,
        'value': default_value
    }

@api_router.post("/admin/site-texts/seed")
async def admin_seed_site_texts(request: Request):
    """Admin: Initialize/seed all default site texts."""
    admin_user = await get_admin_user(request)
    
    # Check if user is super admin
    if not admin_user.get('is_super_admin'):
        raise HTTPException(status_code=403, detail="Only super admin can seed texts")
    
    seeded = 0
    for key, data in DEFAULT_SITE_TEXTS.items():
        existing = await db.site_texts.find_one({'key': key})
        if not existing:
            await db.site_texts.insert_one({
                'key': key,
                'value': data['value'],
                'page': data['page'],
                'section': data['section'],
                'description': data['description'],
                'max_length': data.get('max_length', 500),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'system'
            })
            seeded += 1
    
    logger.info(f"[CMS] Seeded {seeded} site texts by {admin_user['email']}")
    
    return {'message': f'Seeded {seeded} new texts', 'total_defaults': len(DEFAULT_SITE_TEXTS)}

@api_router.get("/admin/site-texts/defaults")
async def admin_get_default_texts(request: Request):
    """Admin: Get list of all default text keys for reference."""
    admin_user = await get_admin_user(request)
    
    defaults = []
    for key, data in DEFAULT_SITE_TEXTS.items():
        defaults.append({
            'key': key,
            'default_value': data['value'],
            'page': data['page'],
            'section': data['section'],
            'description': data['description'],
            'max_length': data.get('max_length', 500)
        })
    
    return {'defaults': defaults, 'total': len(defaults)}

# ==================== ADMIN: GUEST DESIGNS MANAGEMENT ====================
@api_router.get("/admin/pod/guest-designs")
async def get_all_guest_designs(
    request: Request,
    page: int = 1,
    limit: int = 50,
    search: str = "",
    status: str = ""  # Filter: 'assigned', 'unassigned', or '' for all
):
    """Admin: Get all guest designs with contact info for dashboard.
    Supports filtering by status (assigned/unassigned)."""
    admin_user = await get_admin_user(request)
    
    skip = (page - 1) * limit
    
    # Build query
    query = {}
    if search:
        query['$or'] = [
            {'guest_email': {'$regex': search, '$options': 'i'}},
            {'guest_name': {'$regex': search, '$options': 'i'}},
            {'product_id': {'$regex': search, '$options': 'i'}}
        ]
    
    # Filter by status
    if status == 'assigned':
        query['status'] = 'assigned'
    elif status == 'unassigned':
        query['status'] = {'$in': ['unassigned', 'uploaded', None]}
    
    # Get designs with pagination
    designs = await db.pod_designs.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    total = await db.pod_designs.count_documents(query)
    
    # Count by status
    assigned_count = await db.pod_designs.count_documents({'status': 'assigned'})
    unassigned_count = await db.pod_designs.count_documents({'status': {'$in': ['unassigned', 'uploaded', None]}})
    
    # Enrich with guest contact info
    enriched_designs = []
    for design in designs:
        guest_info = None
        contact_id = design.get('contact_id') or design.get('guest_id')
        if contact_id:
            guest_contact = await db.pod_guest_contacts.find_one(
                {'id': contact_id},
                {'_id': 0, 'name': 1, 'email': 1, 'phone': 1}
            )
            if guest_contact:
                guest_info = guest_contact
        
        enriched_designs.append({
            **design,
            'guest_name': design.get('guest_name') or (guest_info.get('name') if guest_info else 'Unassigned'),
            'guest_email': design.get('guest_email') or (guest_info.get('email') if guest_info else ''),
            'guest_phone': design.get('guest_phone') or (guest_info.get('phone') if guest_info else ''),
            'is_assigned': design.get('status') == 'assigned'
        })
    
    return {
        'designs': enriched_designs,
        'total': total,
        'assigned_count': assigned_count,
        'unassigned_count': unassigned_count,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit
    }

@api_router.get("/admin/pod/guest-contacts")
async def get_all_guest_contacts(
    request: Request,
    page: int = 1,
    limit: int = 50,
    search: str = ""
):
    """Admin: Get all guest contacts with their designs"""
    admin_user = await get_admin_user(request)
    
    skip = (page - 1) * limit
    
    # Build query
    query = {}
    if search:
        query = {
            '$or': [
                {'name': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}},
                {'phone': {'$regex': search, '$options': 'i'}}
            ]
        }
    
    # Get contacts with pagination
    contacts = await db.pod_guest_contacts.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    total = await db.pod_guest_contacts.count_documents(query)
    
    # Enrich with design count and latest design
    enriched_contacts = []
    for contact in contacts:
        design_count = len(contact.get('designs', []))
        latest_design = None
        
        if design_count > 0:
            latest = await db.pod_designs.find_one(
                {'guest_id': contact['id']},
                {'_id': 0}
            )
            if latest:
                latest_design = latest
        
        enriched_contacts.append({
            **contact,
            'design_count': design_count,
            'latest_design': latest_design
        })
    
    return {
        'contacts': enriched_contacts,
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit
    }

@api_router.get("/admin/pod/guest/{guest_id}/designs")
async def get_guest_designs_admin(guest_id: str, request: Request):
    """Admin: Get all designs for a specific guest"""
    admin_user = await get_admin_user(request)
    
    guest = await db.pod_guest_contacts.find_one({'id': guest_id}, {'_id': 0})
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    designs = await db.pod_designs.find(
        {'guest_id': guest_id},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    return {
        'guest': guest,
        'designs': designs
    }

@api_router.get("/admin/pod/design/{design_id}")
async def get_design_details_admin(design_id: str, request: Request):
    """Admin: Get detailed design info"""
    admin_user = await get_admin_user(request)
    
    design = await db.pod_designs.find_one({'id': design_id}, {'_id': 0})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    # Get guest info
    guest_info = None
    if design.get('guest_id'):
        guest_info = await db.pod_guest_contacts.find_one(
            {'id': design['guest_id']},
            {'_id': 0}
        )
    
    # Get product info
    product_info = await db.pod_clothing_items.find_one(
        {'$or': [
            {'id': design.get('product_id')},
            {'name': {'$regex': design.get('product_id', ''), '$options': 'i'}}
        ]},
        {'_id': 0}
    )
    
    return {
        'design': design,
        'guest': guest_info,
        'product': product_info
    }

@api_router.delete("/admin/pod/design/{design_id}")
async def delete_design_admin(design_id: str, request: Request):
    """Admin: Delete a guest design"""
    admin_user = await get_admin_user(request)
    
    design = await db.pod_designs.find_one({'id': design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    # Remove design from guest contact
    if design.get('guest_id'):
        await db.pod_guest_contacts.update_one(
            {'id': design['guest_id']},
            {'$pull': {'designs': design_id}}
        )
    
    # Delete design record
    await db.pod_designs.delete_one({'id': design_id})
    
    # Optionally delete files (keeping them for now for audit)
    logger.info(f"[ADMIN] Deleted design {design_id} by {admin_user['email']}")
    
    return {'message': 'Design deleted successfully'}

@api_router.get("/admin/pod/download/original/{design_id}")
async def download_original_design(design_id: str, request: Request):
    """Admin: Download original design file in full resolution"""
    admin_user = await get_admin_user(request)
    
    design = await db.pod_designs.find_one({'id': design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    original_url = design.get('original_file_url')
    if not original_url:
        raise HTTPException(status_code=404, detail="Original file not found")
    
    # Extract filename from URL
    filename = original_url.split('/')[-1]
    file_path = POD_ORIGINALS_DIR / filename
    
    if not file_path.exists():
        logger.error(f"[DOWNLOAD] Original file not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine mime type
    ext = filename.split('.')[-1].lower()
    mime_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    media_type = mime_types.get(ext, 'application/octet-stream')
    
    # Generate download filename with guest info
    guest_email = design.get('guest_email', 'unknown')
    product_id = design.get('product_id', 'product')
    download_filename = f"{product_id}_original_{design_id}{os.path.splitext(filename)[1]}"
    
    logger.info(f"[DOWNLOAD] Admin {admin_user['email']} downloaded original: {design_id}")
    
    return FileResponse(
        path=str(file_path),
        filename=download_filename,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"'
        }
    )

@api_router.get("/admin/pod/download/mockup/{design_id}")
async def download_mockup_design(design_id: str, request: Request):
    """Admin: Download mockup file in full resolution"""
    admin_user = await get_admin_user(request)
    
    design = await db.pod_designs.find_one({'id': design_id})
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    
    mockup_url = design.get('mockup_file_url')
    if not mockup_url:
        raise HTTPException(status_code=404, detail="Mockup file not found")
    
    # Extract filename from URL
    filename = mockup_url.split('/')[-1]
    file_path = POD_MOCKUPS_DIR / filename
    
    if not file_path.exists():
        logger.error(f"[DOWNLOAD] Mockup file not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine mime type
    ext = filename.split('.')[-1].lower()
    mime_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    media_type = mime_types.get(ext, 'application/octet-stream')
    
    # Generate download filename
    product_id = design.get('product_id', 'product')
    download_filename = f"{product_id}_mockup_{design_id}.png"
    
    logger.info(f"[DOWNLOAD] Admin {admin_user['email']} downloaded mockup: {design_id}")
    
    return FileResponse(
        path=str(file_path),
        filename=download_filename,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"'
        }
    )

# ==================== BULK ORDER CLOTHING ITEMS MANAGEMENT ====================
@api_router.get("/bulk/clothing-items")
async def get_bulk_clothing_items():
    """Public: Get all active bulk order clothing items with variant pricing"""
    items = await db.bulk_clothing_items.find({'is_active': True}, {'_id': 0}).sort('name', 1).to_list(100)
    
    # If no items exist, return default items with variant pricing
    if not items:
        default_items = [
            {
                'id': str(uuid.uuid4()),
                'name': 'T-Shirt',
                'standard_price': 1500,
                'premium_price': 2200,
                'luxury_price': 3000,
                'base_price': 1500,  # Legacy compatibility
                'image_url': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
                'description': 'Classic short sleeve t-shirt',
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Polo Shirt',
                'standard_price': 2000,
                'premium_price': 3000,
                'luxury_price': 4500,
                'base_price': 2000,
                'image_url': 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&q=80',
                'description': 'Collared polo shirt',
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Hoodie',
                'standard_price': 4000,
                'premium_price': 5500,
                'luxury_price': 7500,
                'base_price': 4000,
                'image_url': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
                'description': 'Hooded sweatshirt',
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Joggers',
                'standard_price': 3500,
                'premium_price': 5000,
                'luxury_price': 7000,
                'base_price': 3500,
                'image_url': 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80',
                'description': 'Comfortable track pants',
                'is_active': True
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Varsity Jacket',
                'standard_price': 8000,
                'premium_price': 12000,
                'luxury_price': 18000,
                'base_price': 8000,
                'image_url': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
                'description': 'Classic sporty jacket',
                'is_active': True
            }
        ]
        return default_items
    
    # Ensure all items have variant pricing (migrate legacy items)
    for item in items:
        if 'standard_price' not in item:
            base = item.get('base_price', 2000)
            item['standard_price'] = base
            item['premium_price'] = int(base * 1.5)
            item['luxury_price'] = int(base * 2)
    
    return items

@api_router.get("/admin/bulk/clothing-items")
async def get_all_bulk_clothing_items(admin_user: Dict = Depends(get_admin_user)):
    """Admin: Get all bulk order clothing items (including inactive) with variant pricing"""
    items = await db.bulk_clothing_items.find({}, {'_id': 0}).sort('name', 1).to_list(100)
    
    # Ensure all items have variant pricing
    for item in items:
        if 'standard_price' not in item:
            base = item.get('base_price', 2000)
            item['standard_price'] = base
            item['premium_price'] = int(base * 1.5)
            item['luxury_price'] = int(base * 2)
    
    return items

@api_router.post("/admin/bulk/clothing-items")
async def create_bulk_clothing_item(item: BulkClothingItem, admin_user: Dict = Depends(get_admin_user)):
    """Admin: Create new bulk order clothing item with variant pricing"""
    
    # Check if item with same name exists
    existing = await db.bulk_clothing_items.find_one({
        'name': {'$regex': f'^{item.name}$', '$options': 'i'}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Clothing item with this name already exists")
    
    item_doc = {
        'id': str(uuid.uuid4()),
        'name': item.name,
        'standard_price': item.standard_price,
        'premium_price': item.premium_price,
        'luxury_price': item.luxury_price,
        'base_price': item.standard_price,  # Legacy compatibility
        'image_url': item.image_url,
        'description': item.description or '',
        'is_active': item.is_active if item.is_active is not None else True,
        'created_by': admin_user['email'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.bulk_clothing_items.insert_one(item_doc)
    
    # Remove MongoDB _id field for JSON serialization
    if '_id' in item_doc:
        del item_doc['_id']
    
    return {
        'message': 'Bulk order clothing item created successfully',
        'id': item_doc['id'],
        'item': item_doc
    }

@api_router.put("/admin/bulk/clothing-items/{item_id}")
async def update_bulk_clothing_item(
    item_id: str,
    item: BulkClothingItem,
    admin_user: Dict = Depends(get_admin_user)
):
    """Admin: Update bulk order clothing item with variant pricing"""
    
    update_data = {
        'name': item.name,
        'standard_price': item.standard_price,
        'premium_price': item.premium_price,
        'luxury_price': item.luxury_price,
        'base_price': item.standard_price,  # Legacy compatibility
        'image_url': item.image_url,
        'description': item.description,
        'is_active': item.is_active if item.is_active is not None else True,
        'updated_by': admin_user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.bulk_clothing_items.update_one(
        {'id': item_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    return {'message': 'Bulk order clothing item updated successfully'}

@api_router.delete("/admin/bulk/clothing-items/{item_id}")
async def delete_bulk_clothing_item(item_id: str, admin_user: Dict = Depends(get_admin_user)):
    """Admin: Delete bulk order clothing item"""
    
    result = await db.bulk_clothing_items.delete_one({'id': item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Clothing item not found")
    
    return {'message': 'Bulk order clothing item deleted successfully'}

# ==================== IMAGE CMS ====================
@api_router.get("/cms/images")
async def get_cms_images():
    """Get all CMS images"""
    images = await db.cms_images.find({}, {'_id': 0}).to_list(100)
    return images

@api_router.post("/admin/cms/images")
async def upload_cms_image(
    section: str = Form(...),
    file: UploadFile = File(...),
    request: Request = None
):
    """Admin with CMS role OR Super Admin: Upload image for CMS section"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is super admin OR has CMS role
    is_super_admin = user.get('is_super_admin', False)
    can_manage_cms = user.get('role', {}).get('can_manage_cms', False)
    
    if not (is_super_admin or can_manage_cms):
        raise HTTPException(status_code=403, detail="Access denied. Requires CMS management permission.")
    
    # Save file
    file_data = await save_upload_file(file)
    
    # Update or create image record
    image_doc = {
        'section': section,  # hero, about, feature1, feature2, etc.
        'file_path': file_data['file_path'],
        'file_name': file_data['file_name'],
        'uploaded_by': user['email'],
        'uploaded_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.cms_images.update_one(
        {'section': section},
        {'$set': image_doc},
        upsert=True
    )
    
    return {
        'message': 'Image uploaded successfully',
        'section': section,
        'file_path': file_data['file_path']
    }

@api_router.delete("/admin/cms/images/{section}")
async def delete_cms_image(section: str, request: Request):
    """Admin with CMS role OR Super Admin: Delete CMS image"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is super admin OR has CMS role
    is_super_admin = user.get('is_super_admin', False)
    can_manage_cms = user.get('role', {}).get('can_manage_cms', False)
    
    if not (is_super_admin or can_manage_cms):
        raise HTTPException(status_code=403, detail="Access denied. Requires CMS management permission.")
    
    result = await db.cms_images.delete_one({'section': section})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return {'message': 'Image deleted successfully'}

# ==================== STAFF RECORDS MANAGEMENT ====================

@api_router.get("/admin/staff")
async def get_all_staff(request: Request):
    """Get all staff members"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    staff = await db.staff_records.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return staff

@api_router.get("/admin/staff/{staff_id}")
async def get_staff_member(request: Request, staff_id: str):
    """Get single staff member details"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    staff = await db.staff_records.find_one({'id': staff_id}, {'_id': 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return staff

@api_router.post("/admin/staff")
async def create_staff(request: Request, staff_data: dict):
    """Create new staff member record"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Generate staff ID
    import uuid
    staff_id = f"STAFF-{uuid.uuid4().hex[:8].upper()}"
    
    record = {
        'id': staff_id,
        'name': staff_data.get('name'),
        'email': staff_data.get('email'),
        'phone': staff_data.get('phone'),
        'address': staff_data.get('address'),
        'position': staff_data.get('position'),
        'department': staff_data.get('department'),
        'date_of_birth': staff_data.get('date_of_birth'),
        'hire_date': staff_data.get('hire_date'),
        'emergency_contact': staff_data.get('emergency_contact'),
        'emergency_phone': staff_data.get('emergency_phone'),
        'documents': staff_data.get('documents', []),  # Array of document objects
        'status': staff_data.get('status', 'active'),
        'notes': staff_data.get('notes', ''),
        'created_by': user['email'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.staff_records.insert_one(record)
    return {'message': 'Staff member added', 'id': staff_id}

@api_router.put("/admin/staff/{staff_id}")
async def update_staff(request: Request, staff_id: str, staff_data: dict):
    """Update staff member record"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {
        'name': staff_data.get('name'),
        'email': staff_data.get('email'),
        'phone': staff_data.get('phone'),
        'address': staff_data.get('address'),
        'position': staff_data.get('position'),
        'department': staff_data.get('department'),
        'date_of_birth': staff_data.get('date_of_birth'),
        'hire_date': staff_data.get('hire_date'),
        'emergency_contact': staff_data.get('emergency_contact'),
        'emergency_phone': staff_data.get('emergency_phone'),
        'documents': staff_data.get('documents'),
        'status': staff_data.get('status'),
        'notes': staff_data.get('notes'),
        'updated_by': user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.staff_records.update_one(
        {'id': staff_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    return {'message': 'Staff member updated'}

@api_router.delete("/admin/staff/{staff_id}")
async def delete_staff(request: Request, staff_id: str):
    """Delete staff member record"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.staff_records.delete_one({'id': staff_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    return {'message': 'Staff member deleted'}

@api_router.post("/admin/staff/upload-document")
async def upload_staff_document(request: Request, file: UploadFile = File(...)):
    """Upload staff document (passport, CV, certificates, etc.)"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Save file
    file_data = await save_upload_file(file)
    
    return {
        'message': 'Document uploaded successfully',
        'file_path': file_data['file_path'],
        'file_name': file_data['file_name']
    }

# ==================== JOB APPLICATIONS PORTAL ====================

# Public Job Listings
@api_router.get("/careers/jobs")
async def get_public_jobs():
    """Get all active job postings"""
    jobs = await db.job_postings.find(
        {'status': 'active'},
        {'_id': 0}
    ).sort('posted_date', -1).to_list(100)
    return jobs

@api_router.get("/careers/jobs/{job_id}")
async def get_job_details(job_id: str):
    """Get single job posting details"""
    job = await db.job_postings.find_one(
        {'id': job_id, 'status': 'active'},
        {'_id': 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@api_router.post("/careers/apply")
async def submit_application(application_data: dict):
    """Submit job application"""
    import uuid
    app_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    
    application = {
        'id': app_id,
        'job_id': application_data.get('job_id'),
        'job_title': application_data.get('job_title'),
        'applicant_name': application_data.get('applicant_name'),
        'email': application_data.get('email'),
        'phone': application_data.get('phone'),
        'address': application_data.get('address'),
        'cv_url': application_data.get('cv_url'),
        'cover_letter': application_data.get('cover_letter'),
        'experience_years': application_data.get('experience_years'),
        'education': application_data.get('education'),
        'additional_documents': application_data.get('additional_documents', []),
        'status': 'pending',
        'submitted_at': datetime.now(timezone.utc).isoformat(),
        'reviewed_at': None,
        'reviewed_by': None,
        'admin_notes': ''
    }
    
    await db.job_applications.insert_one(application)
    return {'message': 'Application submitted successfully', 'id': app_id}

# Admin - Job Management
@api_router.get("/admin/jobs")
async def get_all_jobs(request: Request):
    """Get all job postings (admin)"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    jobs = await db.job_postings.find({}, {'_id': 0}).sort('posted_date', -1).to_list(200)
    return jobs

@api_router.post("/admin/jobs")
async def create_job(request: Request, job_data: dict):
    """Create new job posting"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    import uuid
    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    
    job = {
        'id': job_id,
        'title': job_data.get('title'),
        'department': job_data.get('department'),
        'location': job_data.get('location', 'Lagos, Nigeria'),
        'employment_type': job_data.get('employment_type', 'Full-time'),
        'description': job_data.get('description'),
        'responsibilities': job_data.get('responsibilities', []),
        'requirements': job_data.get('requirements', []),
        'salary_range': job_data.get('salary_range', ''),
        'application_deadline': job_data.get('application_deadline'),
        'status': job_data.get('status', 'active'),
        'posted_date': datetime.now(timezone.utc).isoformat(),
        'posted_by': user['email'],
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.job_postings.insert_one(job)
    return {'message': 'Job posted successfully', 'id': job_id}

@api_router.put("/admin/jobs/{job_id}")
async def update_job(request: Request, job_id: str, job_data: dict):
    """Update job posting"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {
        'title': job_data.get('title'),
        'department': job_data.get('department'),
        'location': job_data.get('location'),
        'employment_type': job_data.get('employment_type'),
        'description': job_data.get('description'),
        'responsibilities': job_data.get('responsibilities'),
        'requirements': job_data.get('requirements'),
        'salary_range': job_data.get('salary_range'),
        'application_deadline': job_data.get('application_deadline'),
        'status': job_data.get('status'),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.job_postings.update_one(
        {'id': job_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {'message': 'Job updated successfully'}

@api_router.delete("/admin/jobs/{job_id}")
async def delete_job(request: Request, job_id: str):
    """Delete job posting"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.job_postings.delete_one({'id': job_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {'message': 'Job deleted successfully'}

# Admin - Applications Management
@api_router.get("/admin/applications")
async def get_all_applications(request: Request, status: str = None):
    """Get all job applications"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query['status'] = status
    
    applications = await db.job_applications.find(query, {'_id': 0}).sort('submitted_at', -1).to_list(500)
    return applications

@api_router.get("/admin/applications/{app_id}")
async def get_application_details(request: Request, app_id: str):
    """Get single application details"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    application = await db.job_applications.find_one({'id': app_id}, {'_id': 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return application

@api_router.patch("/admin/applications/{app_id}/status")
async def update_application_status(request: Request, app_id: str, status_data: dict):
    """Update application status"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {
        'status': status_data.get('status'),
        'admin_notes': status_data.get('admin_notes', ''),
        'reviewed_at': datetime.now(timezone.utc).isoformat(),
        'reviewed_by': user['email']
    }
    
    result = await db.job_applications.update_one(
        {'id': app_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {'message': 'Application status updated'}

@api_router.post("/admin/applications/upload")
async def upload_application_document(request: Request, file: UploadFile = File(...)):
    """Upload CV or other application documents"""
    # Save file
    file_data = await save_upload_file(file)
    
    return {
        'message': 'Document uploaded successfully',
        'file_path': file_data['file_path'],
        'file_name': file_data['file_name']
    }

# ==================== BOUTIQUE INVENTORY MANAGEMENT ====================

@api_router.get("/admin/inventory")
async def get_inventory_overview(request: Request):
    """Get inventory overview with stock levels"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all boutique products with inventory data
    products = await db.boutique_products.find({}, {'_id': 0}).to_list(500)
    
    # Calculate totals and alerts
    total_products = len(products)
    low_stock_items = []
    out_of_stock_items = []
    total_stock_value = 0
    
    for product in products:
        inventory = product.get('inventory', {})
        total_stock = sum(
            sum(sizes.values()) 
            for sizes in inventory.values()
        )
        
        product['total_stock'] = total_stock
        
        if total_stock == 0:
            out_of_stock_items.append(product)
        elif total_stock < 5:
            low_stock_items.append(product)
        
        # Calculate stock value
        total_stock_value += total_stock * product.get('price', 0)
    
    return {
        'products': products,
        'summary': {
            'total_products': total_products,
            'low_stock_count': len(low_stock_items),
            'out_of_stock_count': len(out_of_stock_items),
            'total_stock_value': total_stock_value,
            'low_stock_items': low_stock_items,
            'out_of_stock_items': out_of_stock_items
        }
    }

@api_router.get("/admin/inventory/{product_id}")
async def get_product_inventory(request: Request, product_id: str):
    """Get detailed inventory for a specific product"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    product = await db.boutique_products.find_one({'product_id': product_id}, {'_id': 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get restock history
    restock_history = await db.inventory_restocks.find(
        {'product_id': product_id},
        {'_id': 0}
    ).sort('restocked_at', -1).to_list(50)
    
    return {
        'product': product,
        'restock_history': restock_history
    }

@api_router.put("/admin/inventory/{product_id}")
async def update_product_inventory(request: Request, product_id: str, inventory_data: dict):
    """Update product inventory levels"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Update inventory
    result = await db.boutique_products.update_one(
        {'product_id': product_id},
        {
            '$set': {
                'inventory': inventory_data.get('inventory'),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {'message': 'Inventory updated successfully'}

@api_router.post("/admin/inventory/restock")
async def record_restock(request: Request, restock_data: dict):
    """Record a restock transaction"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    import uuid
    restock_id = f"RESTOCK-{uuid.uuid4().hex[:8].upper()}"
    
    restock = {
        'id': restock_id,
        'product_id': restock_data.get('product_id'),
        'product_name': restock_data.get('product_name'),
        'color': restock_data.get('color'),
        'size': restock_data.get('size'),
        'quantity': restock_data.get('quantity'),
        'supplier': restock_data.get('supplier', ''),
        'cost_per_unit': restock_data.get('cost_per_unit', 0),
        'notes': restock_data.get('notes', ''),
        'restocked_by': user['email'],
        'restocked_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.inventory_restocks.insert_one(restock)
    
    # Update product inventory
    product = await db.boutique_products.find_one({'product_id': restock_data.get('product_id')})
    if product:
        inventory = product.get('inventory', {})
        color = restock_data.get('color')
        size = restock_data.get('size')
        quantity = restock_data.get('quantity', 0)
        
        if color not in inventory:
            inventory[color] = {}
        if size not in inventory[color]:
            inventory[color][size] = 0
        
        inventory[color][size] += quantity
        
        await db.boutique_products.update_one(
            {'product_id': restock_data.get('product_id')},
            {'$set': {'inventory': inventory}}
        )
    
    return {'message': 'Restock recorded successfully', 'id': restock_id}

@api_router.get("/admin/inventory/low-stock")
async def get_low_stock_items(request: Request, threshold: int = 5):
    """Get products with low stock"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    products = await db.boutique_products.find({}, {'_id': 0}).to_list(500)
    
    low_stock_items = []
    for product in products:
        inventory = product.get('inventory', {})
        total_stock = sum(
            sum(sizes.values()) 
            for sizes in inventory.values()
        )
        
        if total_stock <= threshold:
            product['total_stock'] = total_stock
            low_stock_items.append(product)
    
    return low_stock_items

@api_router.get("/admin/inventory/restock-history")
async def get_restock_history(request: Request):
    """Get all restock history"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    history = await db.inventory_restocks.find(
        {},
        {'_id': 0}
    ).sort('restocked_at', -1).to_list(200)
    
    return history

# ==================== VISITOR TRACKING ====================
@api_router.post("/track-visit")
async def track_visit(request: Request):
    """Track page visits (excluding admins)"""
    # Get session if exists
    session_id = request.cookies.get('session_id')
    
    # Check if user is admin
    is_admin = False
    user_email = None
    
    if session_id:
        session = await db.user_sessions.find_one({'session_id': session_id})
        if session:
            user = await db.users.find_one({'email': session['email']})
            if user:
                is_admin = user.get('is_admin', False) or user.get('is_super_admin', False)
                user_email = user.get('email')
    
    # Don't track admin visits
    if is_admin:
        return {'tracked': False, 'reason': 'admin'}
    
    # Create visit record
    visit = {
        'id': f"visit_{uuid.uuid4().hex[:12]}",
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'user_agent': request.headers.get('user-agent', ''),
        'ip': request.client.host if request.client else 'unknown',
        'user_email': user_email,
        'date': datetime.now(timezone.utc).date().isoformat()
    }
    
    await db.page_visits.insert_one(visit)
    
    return {'tracked': True}

@api_router.get("/admin/analytics/visitors")
async def get_visitor_stats(
    days: int = 30,
    request: Request = None
):
    """Admin: Get visitor statistics using aggregation"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get date range
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=days)
    
    # Use aggregation pipeline for efficient statistics
    pipeline = [
        {
            '$match': {
                'date': {
                    '$gte': start_date.isoformat(),
                    '$lte': end_date.isoformat()
                }
            }
        },
        {
            '$group': {
                '_id': '$date',
                'total_visits': {'$sum': 1},
                'unique_ips': {'$addToSet': '$ip'},
                'unique_emails': {'$addToSet': '$user_email'}
            }
        },
        {
            '$project': {
                'date': '$_id',
                'total_visits': 1,
                'unique_visitors': {'$size': '$unique_ips'},
                '_id': 0
            }
        },
        {
            '$sort': {'date': 1}
        }
    ]
    
    daily_stats_list = await db.page_visits.aggregate(pipeline).to_list(days + 1)
    
    # Convert to dictionary format
    daily_stats = {stat['date']: stat for stat in daily_stats_list}
    
    # Fill in missing dates with zeros
    stats = []
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.isoformat()
        if date_str in daily_stats:
            stats.append(daily_stats[date_str])
        else:
            stats.append({
                'date': date_str,
                'total_visits': 0,
                'unique_visitors': 0
            })
        current_date += timedelta(days=1)
    
    # Calculate total visits
    total_visits = sum(stat['total_visits'] for stat in stats)
    
    return {
        'period_days': days,
        'total_visits': total_visits,
        'daily_stats': stats
    }

# ==================== RECEIPTS ====================
@api_router.get("/admin/receipts")
async def get_receipts(request: Request, limit: int = 100, skip: int = 0):
    """Get receipts with pagination"""
    session_id = request.cookies.get('session_id')
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({'session_id': session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({'email': session['email']})
    if not user or (not user.get('is_admin') and not user.get('is_super_admin')):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Limit max results
    limit = min(limit, 500)
    
    receipts = await db.receipts.find({}, {'_id': 0}).sort('created_at', -1).limit(limit).skip(skip).to_list(limit)
    return receipts

@api_router.get("/receipts/{receipt_id}")
async def get_receipt(receipt_id: str):
    """Get receipt by ID or receipt number - public for customer access"""
    # Try to find by receipt_id or receipt_number
    receipt = await db.receipts.find_one({
        '$or': [
            {'receipt_id': receipt_id},
            {'receipt_number': receipt_id}
        ]
    }, {'_id': 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt

# ==================== GENERAL ====================
@api_router.get("/")
async def root():
    return {"message": "Temaruco Clothing Factory API"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint with database connectivity test"""
    health_status = {
        "status": "healthy",
        "database": "unknown"
    }
    
    try:
        # Try to ping the database
        await client.admin.command('ping')
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"Health check - Database ping failed: {str(e)}")
        health_status["database"] = "disconnected"
        health_status["status"] = "degraded"
    
    return health_status

# ==================== WEBSOCKET ENDPOINTS ====================
@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time admin notifications"""
    user_id = None
    try:
        # Get token from query params
        token = websocket.query_params.get('token')
        if not token:
            await websocket.close(code=4001, reason="Token required")
            return
        
        # Verify token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('user_id')
        except jwt.ExpiredSignatureError:
            await websocket.close(code=4002, reason="Token expired")
            return
        except jwt.InvalidTokenError:
            await websocket.close(code=4003, reason="Invalid token")
            return
        
        # Get user and check if admin
        user = await db.users.find_one({'$or': [{'id': user_id}, {'user_id': user_id}]}, {'_id': 0})
        if not user:
            await websocket.close(code=4004, reason="User not found")
            return
        
        is_admin = user.get('is_admin') or user.get('is_super_admin')
        
        # Connect
        await ws_manager.connect(websocket, user_id, is_admin)
        
        # Send initial notification count
        if is_admin:
            unread_count = await db.notifications.count_documents({'read': False})
            pending_orders = await db.orders.count_documents({'status': 'pending_payment'})
            payment_submitted = await db.orders.count_documents({'status': 'payment_submitted'})
            
            await websocket.send_json({
                'event': 'connected',
                'counts': {
                    'unread_notifications': unread_count,
                    'pending_orders': pending_orders,
                    'payment_submitted': payment_submitted
                }
            })
        
        # Keep connection alive and listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle ping/pong for keepalive
                if message.get('type') == 'ping':
                    await websocket.send_json({'type': 'pong'})
                
                # Handle mark notification as read
                elif message.get('type') == 'mark_read' and is_admin:
                    notification_id = message.get('notification_id')
                    if notification_id:
                        await db.notifications.update_one(
                            {'id': notification_id},
                            {'$set': {'read': True}}
                        )
                        await websocket.send_json({
                            'event': 'notification_read',
                            'notification_id': notification_id
                        })
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if user_id:
            ws_manager.disconnect(user_id)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log all unhandled exceptions"""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )
    return Response(
        content='{"detail": "Internal server error"}',
        status_code=500,
        media_type="application/json"
    )

# Add CORS BEFORE including router
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router AFTER CORS
app.include_router(api_router)

# Mount static files for uploads - use /api/uploads for ingress routing
from fastapi.staticfiles import StaticFiles
app.mount("/api/uploads", StaticFiles(directory="/app/backend/uploads"), name="uploads")

# Initialize scheduler for automated tasks
scheduler = AsyncIOScheduler()

async def send_quote_reminder_emails():
    """Send automated reminder emails for unpaid quotes based on settings"""
    try:
        now = datetime.now(timezone.utc)
        
        # Get reminder settings from database
        reminder_settings = await db.reminder_settings.find_one({}, {'_id': 0}) or {}
        
        # Check if reminders are enabled
        if not reminder_settings.get('enabled', True):
            logger.info("Quote reminders are disabled in settings")
            return
        
        reminder_days = reminder_settings.get('reminder_days', [3, 7, 14])
        subject_prefix = reminder_settings.get('email_subject_prefix', '[Reminder]')
        
        # Get CMS settings for bank details
        settings = await db.cms_settings.find_one({}, {'_id': 0}) or {}
        
        for days in reminder_days:
            # Find quotes created X days ago that haven't been paid and haven't received this reminder
            target_date = now - timedelta(days=days)
            target_date_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            target_date_end = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            reminder_field = f'reminder_{days}d_sent'
            
            # Query for quotes created on the target date
            quotes = await db.manual_quotes.find({
                'status': {'$in': ['draft', 'pending']},
                'client_email': {'$exists': True, '$ne': ''},
                reminder_field: {'$ne': True}
            }, {'_id': 0}).to_list(100)
            
            for quote in quotes:
                try:
                    created_at = quote.get('created_at', '')
                    if isinstance(created_at, str):
                        quote_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        quote_date = created_at
                    
                    days_since_creation = (now - quote_date).days
                    
                    if days_since_creation == days:
                        # Generate reminder email
                        items_html = ""
                        for item in quote.get('items', []):
                            items_html += f"<tr><td style='padding:8px;border-bottom:1px solid #e5e7eb;'>{item.get('description','')}</td><td style='padding:8px;text-align:right;border-bottom:1px solid #e5e7eb;'>₦{item.get('total',0):,.2f}</td></tr>"
                        
                        urgency_text = {
                            3: "This is a friendly reminder",
                            7: "This is your second reminder", 
                            14: "This is your final reminder - quote expires soon"
                        }
                        
                        html_content = f"""
                        <!DOCTYPE html>
                        <html>
                        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f4f4f5;">
                            <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
                                <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                                    <div style="background:#D90429;padding:25px;text-align:center;">
                                        <h1 style="color:white;margin:0;font-size:24px;">TEMARUCO</h1>
                                        <p style="color:rgba(255,255,255,0.9);margin:5px 0 0;font-size:11px;letter-spacing:2px;">CLOTHING FACTORY</p>
                                    </div>
                                    <div style="padding:30px;">
                                        <h2 style="color:#18181b;margin:0 0 15px;">Payment Reminder</h2>
                                        <p style="color:#52525b;"><strong>Quote:</strong> {quote.get('quote_number','N/A')}</p>
                                        <p style="color:#52525b;">Dear <strong>{quote.get('client_name','Valued Customer')}</strong>,</p>
                                        <p style="color:#52525b;">{urgency_text.get(days, 'This is a reminder')} about your pending quote from Temaruco Clothing Factory.</p>
                                        
                                        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                                            <thead><tr style="background:#f4f4f5;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>
                                            <tbody>{items_html}</tbody>
                                            <tfoot><tr style="background:#fef2f2;"><td style="padding:12px;font-weight:bold;">TOTAL</td><td style="padding:12px;text-align:right;font-weight:bold;color:#D90429;">₦{quote.get('total',0):,.2f}</td></tr></tfoot>
                                        </table>
                                        
                                        <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;">
                                            <p style="margin:0;color:#52525b;font-size:14px;">
                                                <strong>Bank:</strong> {settings.get('bank_name','Contact us')}<br>
                                                <strong>Account:</strong> {settings.get('account_number','Contact us')}<br>
                                                <strong>Reference:</strong> {quote.get('quote_number','N/A')}
                                            </p>
                                        </div>
                                        
                                        <p style="color:#71717a;font-size:12px;margin-top:20px;">Quote valid for 30 days from creation. Please reply to this email with proof of payment.</p>
                                    </div>
                                    <div style="background:#18181b;padding:20px;text-align:center;">
                                        <p style="color:#a1a1aa;margin:0;font-size:12px;">Temaruco Clothing Factory | +234 912 542 3902</p>
                                    </div>
                                </div>
                            </div>
                        </body>
                        </html>
                        """
                        
                        subject = f"{subject_prefix} Your Quote {quote.get('quote_number','')} from Temaruco"
                        success = await send_email_notification(quote.get('client_email'), subject, html_content)
                        
                        if success:
                            await db.manual_quotes.update_one(
                                {'id': quote['id']},
                                {'$set': {
                                    reminder_field: True,
                                    f'reminder_{days}d_sent_at': now.isoformat()
                                }}
                            )
                            logger.info(f"Sent {days}-day reminder for quote {quote.get('quote_number')} to {quote.get('client_email')}")
                            
                except Exception as e:
                    logger.error(f"Error sending reminder for quote {quote.get('id')}: {str(e)}")
                    continue
                    
        logger.info("Quote reminder check completed")
    except Exception as e:
        logger.error(f"Error in quote reminder scheduler: {str(e)}")

@app.on_event("startup")
async def startup_db_client():
    """Test MongoDB connection on startup"""
    try:
        # Ping the database to verify connection
        await client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB: {os.environ.get('DB_NAME', 'unknown')}")
        
        # Start the scheduler for automated reminders (runs daily at 9 AM)
        scheduler.add_job(send_quote_reminder_emails, CronTrigger(hour=9, minute=0), id='quote_reminders', replace_existing=True)
        scheduler.start()
        logger.info("Quote reminder scheduler started - runs daily at 9 AM")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        # Don't fail startup - let Kubernetes restart the pod
        # raise  # Uncomment this in production to fail fast

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("MongoDB connection closed")
