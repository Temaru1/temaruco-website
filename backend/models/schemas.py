"""Pydantic models for the application"""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from enum import Enum

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
    CUSTOM = "custom"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    FAILED = "failed"

# ==================== USER MODELS ====================
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    is_admin: bool = False
    is_super_admin: bool = False

# ==================== ORDER MODELS ====================
class QuickQuoteRequest(BaseModel):
    clothing_type: str
    quantity: int
    print_type: str
    colors: int
    delivery_needed: bool = False

class QuickQuoteResponse(BaseModel):
    base_price: float
    total_price: float
    unit_price: float
    breakdown: dict

class BulkOrderCreate(BaseModel):
    clothing_type: str
    quantity: int
    sizes: dict
    print_type: str
    colors: int
    design_description: str
    design_files: Optional[List[str]] = []

class PODOrderCreate(BaseModel):
    clothing_type: str
    quantity: int
    sizes: dict
    print_type: str
    design_description: str
    design_file: Optional[str] = None
    user_name: str
    user_email: EmailStr
    user_phone: str
    delivery_address: str

class BoutiqueProduct(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    sizes: List[str]
    colors: List[str]
    images: List[str]
    stock: int = 0

class CartItem(BaseModel):
    product_id: str
    quantity: int
    size: str
    color: str

# ==================== PAYMENT MODELS ====================
class PaymentInitializeRequest(BaseModel):
    email: EmailStr
    amount: float
    order_id: str
    order_type: str
    metadata: Optional[dict] = None

class StripePaymentRequest(BaseModel):
    order_id: str
    order_type: str
    amount: float  # Amount in NGN
    email: str
    origin_url: str
    metadata: Optional[Dict[str, Any]] = None

# ==================== ADMIN MODELS ====================
class AdminProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    sizes: List[str]
    colors: List[str]
    stock: int = 0
    images: Optional[List[str]] = []

class CMSContent(BaseModel):
    section: str
    content: dict
    updated_by: Optional[str] = None

class ManualQuoteCreate(BaseModel):
    quote_type: str  # 'quote', 'invoice', 'receipt'
    client_name: str
    client_email: str
    client_phone: Optional[str] = None
    items: List[dict]
    notes: Optional[str] = None
    due_date: Optional[str] = None
    discount_percent: Optional[float] = 0
    tax_percent: Optional[float] = 0

class CustomOrderRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    order_type: str
    description: str
    quantity: Optional[int] = None
    budget: Optional[str] = None
    deadline: Optional[str] = None

class EnquiryQuoteCreate(BaseModel):
    enquiry_id: str
    items: List[dict]
    notes: Optional[str] = None
    valid_days: int = 7

class EnquiryStatusUpdate(BaseModel):
    status: str

class AdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class PaymentProofUpload(BaseModel):
    order_id: str
    reference: str
    notes: Optional[str] = None

class AdminSettings(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None

# ==================== INVENTORY MODELS ====================
class MaterialInventory(BaseModel):
    material_type: str
    material_name: str
    quantity: float
    unit: str
    reorder_level: float
    cost_per_unit: float
    supplier: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class ProcurementItem(BaseModel):
    item_name: str
    quantity: float
    unit_price: float
    total_cost: float
    supplier: Optional[str] = None
    date_purchased: str
    notes: Optional[str] = None

# ==================== STAFF MODELS ====================
class StaffRecord(BaseModel):
    name: str
    email: EmailStr
    phone: str
    role: str
    department: str
    hire_date: str
    salary: Optional[float] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None

# ==================== CLIENT MODELS ====================
class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ClientMeasurement(BaseModel):
    measurement_type: str
    values: dict
    notes: Optional[str] = None
