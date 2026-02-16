# Temaruco Website - Product Requirements Document

## Overview
A comprehensive e-commerce platform for Temaruco Clothing Factory featuring bulk orders, print-on-demand, boutique, fabrics, and souvenirs sales, with integrated Flutterwave payment processing and a full admin dashboard.

## Original Problem Statement
Clone and enhance the Temaruco website with:
- Redesigned landing page with clean, modern UI
- New service pages: Fabrics, Souvenirs, Design Lab
- Interactive price calculator
- Full admin dashboard for managing products, orders, and operations
- Flutterwave payment integration for online orders
- Image upload and management for clothing items

## Tech Stack
- **Frontend:** React, Tailwind CSS, Axios, react-helmet-async (SEO), Shadcn/UI components
- **Backend:** FastAPI, Motor (async MongoDB driver), JWT authentication
- **Database:** MongoDB
- **Payments:** Flutterwave (Live integration)
- **Services:** Supervisor for process management
- **Fonts:** Syne (headings), Manrope (body)
- **Brand Color:** #D90429

## Key Features Implemented

### Customer-Facing
- Landing page with hero section, services grid, and trust indicators
- Bulk Orders page with quote calculator
- Print-On-Demand ordering with 4-step flow
- Custom Order requests with comprehensive form
- Fabrics e-commerce page with cart and checkout
- Souvenirs e-commerce page
- Design Lab for custom design inquiries
- Boutique with product categories (Nigerian Traditional, Modern Wear)
- Quick Price Calculator widget
- WhatsApp support button (bottom-right)

### Admin Dashboard
- Super Admin and Admin role support
- Order management with status tracking
- Clothing items management (CRUD with image upload)
- Production tracking
- Enquiries management
- Quotes & Invoices with "Create Quote/Invoice" button
- Website settings/CMS
- Client directory
- Revenue analytics dashboard

### Print-On-Demand Design System (ENHANCED - Feb 2026)
- **Dual File Storage**: Original design + Generated mockup saved separately
- **STATELESS Guest Tracking (Feb 16, 2026)**: 
  - Uses UUID-based `temp_design_id` stored in localStorage (no cookies/sessions required)
  - Designs uploaded as `status='unassigned'`, linked to contact later via `temp_design_id`
  - Survives browser close, cache clear, cookie clear
- **Print Size Selection**: Badge, A4, A3, A2 with dynamic resizing
- **Canvas-Based Rendering**: Transformable design layer using Konva.js
- **Position Controls**: Drag, center, reset functionality
- **Admin Dashboard Module**: Guest Designs page under Orders menu
  - View all guest designs with previews
  - **Status Filter Tabs**: All / Assigned / Unassigned with counts
  - View guest contacts with design counts
  - Modal preview for original + mockup files
  - **Download buttons**: Full resolution file downloads (not compressed)
  - Search and pagination
- **Backend Endpoints**:
  - `/api/pod/print-sizes` - Get available print sizes
  - `/api/pod/upload-design` - STATELESS upload: returns temp_design_id, status='unassigned'
  - `/api/pod/link-design` - Links design to contact via temp_design_id, status='assigned'
  - `/api/pod/upload-mockup/{design_id}` - Upload generated mockup
  - `/api/pod/design/{design_id}/transform` - Update design transform
  - `/api/admin/pod/guest-designs` - Admin: Get all guest designs (supports status filter)
  - `/api/admin/pod/guest-contacts` - Admin: Get all guest contacts
  - `/api/admin/pod/design/{design_id}` - Admin: Get/delete design
  - `/api/admin/pod/download/original/{design_id}` - Admin: Download original file (full resolution)
  - `/api/admin/pod/download/mockup/{design_id}` - Admin: Download mockup file (full resolution)
- **Storage Locations**:
  - `/uploads/designs/original/` - Original design files
  - `/uploads/designs/mockups/` - Generated mockups
- **Database Collections**:
  - `pod_designs` - Design records with file URLs, temp_design_id, status (assigned/unassigned)
  - `pod_guest_contacts` - Guest contact records
  - `clients` - Client records (auto-created for POD guests)

### Payments (COMPLETED)
- Flutterwave integration (Live keys configured)
- Payment initialization and verification
- Supports all order types: fabric, souvenir, bulk, pod, boutique
- Dual payment options on Order Summary: Paystack (online) or Bank Transfer
- Order status updates on successful payment

## Database Collections
- `users`: Admin and user accounts
- `orders`: All order types (bulk, pod, boutique, fabric, souvenir)
- `bulk_clothing_items`: Clothing inventory
- `fabrics`: Fabric products
- `souvenirs`: Souvenir products
- `design_enquiries`: Design lab submissions
- `payments`: Payment records
- `customer_emails`: Email collection

## Admin Credentials
- **Super Admin:** superadmin@temaruco.com / superadmin123
- **Admin:** admin@temaruco.com / admin123

## Completed Work (Feb 14, 2026)

### Previous Session
- ✅ Fixed critical Paystack payment bug (OrderType enum missing fabric/souvenir)
- ✅ Fixed Paystack callback async function error
- ✅ Implemented AuthProvider for persistent admin login sessions
- ✅ Extended Paystack to OrderSummaryPage with dual payment options
- ✅ SEO Optimization with meta tags, sitemap, robots.txt
- ✅ Advanced Analytics Dashboard with charts
- ✅ Fixed Chatbot visibility, then replaced with WhatsApp button
- ✅ Fixed Navigation: Added Souvenirs and Design Lab links
- ✅ Added placeholder images for all products

### Current Session
- ✅ **Full UI/UX Redesign Completed:**
  - LandingPage: Clean hero with trust indicators, services grid, CTA sections
  - PODPage: 4-step progress flow with clean card-based design
  - DesignLabPage: Service selection grid with contact form
  - CustomOrderPage: Card-based form with color/size selection
  - ContactPage: Contact info cards with business hours and form
  - AboutPage: Story, Mission, Values sections with professional imagery
  - BoutiquePage: Product grid with category links and cart
  - FabricsPage, SouvenirsPage, BulkOrdersPage: Already redesigned
  - AdminPage sidebar: Grouped navigation
- ✅ **Create Quote/Invoice Feature:**
  - Added "Create Quote/Invoice" button to AdminQuotesPage
  - Full modal form for manual quote/invoice creation
  - Supports manual entry or order/enquiry code lookup

## Known Limitations
- Boutique products show placeholder text when no images uploaded

## Completed Work (Feb 14, 2026 - Session 2)

### Email System
- ✅ Configured Gmail SMTP (temarucoltd@gmail.com)
- ✅ Real email notifications now working (EMAIL_MOCK=false)
- ✅ Professional Quote Email Template with:
  - Branded header with Temaruco logo colors
  - Itemized quote details with pricing table
  - Payment terms and bank details
  - Status tracking (draft → pending → paid)
  - "Send Email" and "Resend" buttons in Admin Quotes page
- ✅ API endpoint: POST /api/admin/quotes/{quote_id}/send-email
- ✅ **Automated Quote Reminders:**
  - Scheduler runs daily at configurable time
  - Sends reminders at customizable intervals (default: 3, 7, 14 days)
  - Tracks reminder history per quote
  - API: GET /api/admin/quotes/reminder-status
  - API: POST /api/admin/quotes/trigger-reminders (super admin only)
- ✅ **Reminder Settings Page** (Super Admin only):
  - Enable/disable reminders toggle
  - Add/remove reminder day intervals (1-90 days)
  - Configure daily send time (hour:minute)
  - Customize email subject prefix
  - View scheduler status and reminder statistics
  - API: GET/PUT /api/admin/settings/reminders
- ✅ **Email Delivery Tracking:**
  - Tracking pixel embedded in all quote emails
  - Records email opens with timestamp, user agent, IP
  - Shows "Opened" badge with open count in Quotes table
  - Email tracking stats API: GET /api/admin/email-tracking
  - Tracks open rate percentage

### Admin Features
- ✅ **Create Customer Manually:** Already available in Admin → Clients page
- ✅ **Create Quote/Invoice/Receipt Manually:** Modal with full form in Admin → Quotes page
  - Type dropdown: Quote, Invoice, Receipt
  - Manual entry or lookup by Order/Enquiry code
  - Add line items with description, quantity, price
  - Tax and discount fields
  - Auto-calculate totals

### Multi-Currency Support (Simplified)
- ✅ **Auto-Detection:** Detects visitor's country via IP/headers
- ✅ **Nigeria → Naira (₦):** Nigerian visitors see prices in NGN
- ✅ **Rest of World → USD ($):** International visitors see prices in USD
- ✅ **Automatic Conversion:** No manual selection needed
- ✅ **Pages Updated:** Fabrics, Souvenirs, Boutique pages all use dynamic currency
- ✅ **Exchange Rate:** 1 USD ≈ ₦1,580 (configurable in backend)

### Responsive Design
- ✅ Mobile-first responsive layouts
- ✅ Navigation collapses to hamburger menu on mobile
- ✅ Cards stack vertically on small screens
- ✅ Proper text sizing hierarchy across breakpoints

## Design System (design_guidelines.json)
- **Fonts:** Syne (headings), Manrope (body)
- **Brand Color:** #D90429 (Red)
- **Background:** White (#FFFFFF), Subtle (#FAFAFA), Dark (#09090B)
- **Text:** Primary (#18181B), Secondary (#52525B), Muted (#A1A1AA)
- **Components:** Rounded cards, pill-shaped buttons, shadow-lg hover effects
- **Layout:** max-w-7xl container, responsive grids

## Pending Tasks (P2)
- None - all major features implemented

## Completed Work (Feb 14, 2026 - Session 3)

### Feature 1: Drag-and-Drop Mockup Builder ✅
- New page at `/mockup-builder` (nav: "Design Tool")
- **14 templates in 2 categories:**
  - **Apparel (7):** T-Shirt Front/Back, Hoodie Front/Back, Polo Shirt, Sweatshirt, Tank Top
  - **Accessories (7):** Cap Front/Side, Tote Bag, Backpack, Coffee Mug, Phone Case, Face Mask
- 10 garment colors
- Upload custom images (drag, resize, rotate)
- Add text with font size and color controls
- Download mockup as PNG
- Dashed print area indicator
- Zoom controls
- Instructions panel

### Feature 2: Staff Management with Role Permissions ✅
- Already implemented in SuperAdminPage
- Role-based access control for different admin functions

### Feature 3: Customer Measurements Database ✅
- Already implemented in AdminClientsPage
- Add/edit customer measurements
- Stored with client profiles

### Feature 4: Product Images for Boutique ✅
- Updated boutique products with real Unsplash images
- Professional product photography

## Completed Work (Feb 14, 2026 - Session 4)

### Feature 1: Customer Account Page ✅
- New `/account` route with full account management UI
- Profile section with editable name and phone
- Order history tab showing all past orders with status badges
- Saved addresses management (add/delete addresses with default setting)
- Saved designs tab showing mockups saved from Design Tool
- Tab-based navigation with badge counts
- Responsive design for mobile and desktop
- API functions added to `api.js` for all account endpoints

### Feature 2: Save Mockup Functionality ✅
- Added "Save" button to MockupBuilderPage (visible when logged in)
- Save modal with design name input
- Generates thumbnail preview before saving
- Saves template, color, and element data to database
- Non-logged users see "Sign In to Save" button
- Saved mockups viewable in Account page

### Feature 3: Code Cleanup ✅
- Removed unused `CurrencySelector.js` component
- Fixed backend syntax error in address save function

### Feature 4: Real-time Admin Notifications (WebSocket) ✅
- Implemented WebSocket connection manager in backend
- `/ws/notifications` endpoint for real-time updates
- Auto-reconnection logic on frontend
- Ping/pong keepalive mechanism
- Live notification indicator on bell icon
- Toast notifications for new alerts
- Mark as read via WebSocket

### Feature 5: Advanced Analytics Dashboard ✅
- New `/api/admin/analytics/advanced` endpoint
- Customer insights: new customers, repeat customers, retention rate
- Conversion metrics: completion rate, cancellation rate, avg fulfillment time
- Quote conversion tracking
- Orders by hour chart
- Orders by day of week chart  
- Top customer locations map
- Added all visualizations to AdminRevenueAnalyticsPage

### Feature 6: Stripe Payment for International Customers ✅
- New `/api/payments/stripe/initialize` endpoint for checkout session creation
- New `/api/payments/stripe/status/{session_id}` for payment verification
- New `/api/webhook/stripe` for Stripe webhooks
- New `/api/payments/provider` endpoint to auto-detect user location
- Created `StripePayment.js` component
- Created `PaymentSelector.js` component with auto-detection (Paystack for Nigeria, Stripe for international)
- Created `PaymentSuccessPage.js` for Stripe redirect handling
- NGN to USD conversion using live exchange rates
- Frontend shows correct payment option based on user location

### Feature 7: Backend Modular Refactoring ✅
- Created `/app/backend/core/` module with:
  - `config.py` - Environment variables and configuration
  - `database.py` - MongoDB connection management
  - `auth.py` - Authentication utilities (password hashing, JWT, user retrieval)
- Created `/app/backend/models/schemas.py` - All Pydantic models consolidated
- Created `/app/backend/routes/` module with:
  - `auth.py` - Authentication routes
  - `payments.py` - Payment routes (Paystack + Stripe)
- Created `/app/backend/main.py` - New modular entry point
- Original `server.py` kept for backward compatibility

### Feature 8: Boutique Improvements ✅
- Added category filters: Traditional Wear vs Modern Wear
- Added audience filters: Adults vs Kids
- Added gender filters: Male, Female, Unisex
- Seeded 22 products with proper categorization
- Added "Clear Filters" button when no products match

### Feature 9: Bulk Order & POD Improvements ✅
- Auto-navigate to next step when clicking clothing item (no need to click Continue)
- Added size distribution selector (XS to 3XL) with quantity per size
- Color toggle now works properly (click to select, click again to deselect)
- Improved UX with "Change Item" button

### Feature 10: Enhanced Multi-Currency ✅
- Updated CurrencyContext with IP geolocation detection
- Uses ipapi.co for location detection
- Supports 12 currencies (NGN, USD, GBP, EUR, CAD, AUD, GHS, KES, ZAR, INR, AED)
- Shows prices in user's local currency automatically

### Feature 11: Restructured Print-on-Demand with Embedded Design Tool ✅
- **Removed "Design Tool" from Navigation** - No longer a standalone page
- **New route structure:**
  - `/print-on-demand` → Product selection page (T-Shirt, Hoodie, Polo, etc.)
  - `/print-on-demand/:productId` → Design tool opens with selected product
- **Correct user flow:**
  1. User clicks Print-On-Demand from Navbar
  2. User sees product cards only
  3. User selects a product (click)
  4. Design tool opens immediately with that product
  5. User designs → Adds to Cart → Checkout
- **Design Tool features:**
  - Upload image (PNG/JPG up to 10MB)
  - Add text (double-click to edit)
  - Drag to position, corners to resize
  - Color selection for garment
  - Size selection (XS to XXL)
  - Quantity selector
  - Real-time price calculation
  - Print area guide (dashed box)
- **Products available:** T-Shirt, Hoodie, Polo, Joggers, Varsity Jacket, Tank Top, Sweatshirt, Cap
- Legacy `/pod` route redirects to `/print-on-demand`

### Feature 12: Design Services Page ✅
- **Purpose:** For customers who need professional design help
- **Added to Navbar:** "Design Services" link
- **Route:** `/design-services`
- **Services offered:**
  - Logo Design
  - T-Shirt Artwork
  - Brand Identity
  - Social Media Graphics
  - Event Flyers
  - Custom Illustrations
- **Inquiry Form (NOT a cart/checkout):**
  - Full Name
  - Email
  - Phone / WhatsApp
  - Type of Design (dropdown)
  - Description of Idea
  - Upload Reference Images (up to 5)
  - Deadline Needed
  - Budget Range (Optional)
  - "Submit Inquiry" button
- **Backend:**
  - `/api/design-inquiries` (POST) - Submit inquiry
  - `/api/admin/design-inquiries` (GET) - Admin view all
  - `/api/admin/design-inquiries/{code}` (PATCH) - Update status
  - Creates notification for admin
  - Sends acknowledgment email to customer
- **What happens after submission:**
  - Admin receives notification in dashboard
  - No automatic pricing or payment
  - Admin reviews → Sends manual quote via email/WhatsApp

## Future Tasks (Backlog)
- Backend refactoring (server.py is 7500+ lines - needs to be split into modules)
- Shipping integration
- Procurement/inventory tracking
- Financial reports generation

## Completed Work (Feb 16, 2026) - Admin Dashboard + POD + Mobile Fixes

### 1. Unified Products Admin Page
- New page: `/admin/all-products` shows ALL product types in one view
- Filter tabs: All / Bulk / POD / Boutique / Fabric / Souvenir with counts
- Placeholder products now editable and deletable (was hidden before)
- Edit and Delete buttons for all products including placeholders

### 2. Dynamic Product Categories
- Database: `product_categories` collection
- Admin can create/edit/delete categories for Boutique, Fabric, Souvenir
- Categories automatically update products when renamed
- SuperAdmin-only delete (regular admins can only edit)
- API Endpoints:
  - `GET /api/admin/categories` - List all categories
  - `POST /api/admin/categories` - Create category
  - `PUT /api/admin/categories/{id}` - Update category
  - `DELETE /api/admin/categories/{id}` - Delete category (SuperAdmin)

### 3. POD Add to Cart Button Position
- Moved to BOTTOM of page (was at top)
- Sticky/fixed position on mobile for easy access
- Shows total price in button
- Disabled states with clear messaging

### 4. POD Order → Design Linking
- Orders now store `design_id` linked to `pod_designs` collection
- Order details modal shows:
  - Original design (high-res download)
  - Product mockup (download)
  - Design ID reference
- No more manual searching across pages

### 5. Mobile Table Horizontal Scroll
- All admin tables now scroll horizontally on mobile
- Added `-webkit-overflow-scrolling: touch` for smooth iOS scrolling
- Custom red scrollbar styling
- Tables maintain minimum width for readability

### 6. Materials Inventory (Already Implemented)
- View Details button with history
- Quantity History Log with audit trail
- Dynamic Material Types creation

## Completed Work (Feb 16, 2026) - Admin RBAC System

### Role-Based Access Control (RBAC) System
**Super Admin Capabilities:**
- Create other Super Admins (with full system access)
- Create regular Admins with granular permissions
- Promote regular Admins to Super Admin
- Demote Super Admins to regular Admin
- Delete any Admin (except themselves)
- Assign/revoke individual permissions per module

**13 Permission Modules:**
1. Website Text CMS (3 permissions)
2. Materials Inventory (6 permissions)
3. Products (6 permissions)
4. Orders & Production (7 permissions)
5. Quotes (4 permissions)
6. Clients (3 permissions)
7. Financials (5 permissions)
8. Inventory & Procurement (6 permissions)
9. CMS & Website (3 permissions)
10. Analytics (3 permissions)
11. Communication (2 permissions)
12. Admin Management (5 permissions)
13. Settings (4 permissions)

**Security:**
- Server-side permission validation on all endpoints
- Super Admins have ALL permissions by default
- Cannot delete or demote yourself
- Activity logging for all admin actions
- Passwords hashed securely

**API Endpoints:**
- `GET /api/super-admin/permissions` - Get all available permissions
- `POST /api/super-admin/create-admin` - Create admin or super admin
- `PATCH /api/super-admin/admin/{id}/role` - Update permissions or promote
- `PATCH /api/super-admin/admin/{id}/demote` - Demote super admin
- `DELETE /api/super-admin/admins/{id}` - Remove admin privileges

**UI Features:**
- Role filter (All / Super Admins / Regular Admins)
- Crown icon for Super Admins
- Expandable permission modules with checkboxes
- Module-level toggle (enable/disable all permissions)
- One-time password display after creation
- Copy credentials button

## Completed Work (Feb 16, 2026) - Materials Inventory Module Enhancement

### Materials Inventory Module (Enhanced)
**New Features:**
- **View Button**: Each material has a View button to open detailed modal
- **View Modal**: Shows all material details (name, type, quantity, unit, cost, supplier, location, notes, dates)
- **Quantity History Log**: Full audit trail of all quantity changes
  - Change type (add/remove/adjust)
  - Quantity changed
  - Previous and new quantities
  - Admin who made the change
  - Reason for change
  - Timestamp
- **Dynamic Material Types**: Admin can create new material types from dropdown
  - "+ Create New Type" option in type dropdown
  - Type name and description fields
  - Case-insensitive duplicate prevention
  - Minimum 2 character validation
  - Soft delete (deactivate) support for custom types
  - Existing materials keep assigned types even if type deactivated
- **Validation**:
  - Quantity cannot go below zero
  - Reason required for adjustments
  - Auto-generated timestamps
  - Admin ID auto-linked

**Database Updates:**
- `material_types` collection: Custom material types with id, name, description, status, created_by
- `materials_transactions` collection: Quantity history with change_type, quantity_changed, previous/new quantity, reason, admin, timestamp

**API Endpoints:**
- `GET /api/admin/materials-inventory/{id}` - Get material details with history
- `GET /api/admin/material-types-full` - Get all types with metadata
- `POST /api/admin/material-types-full` - Create new type
- `PUT /api/admin/material-types-full/{id}` - Update type
- `PATCH /api/admin/material-types-full/{id}/status` - Activate/deactivate type

## Completed Work (Feb 16, 2026) - Website Text CMS

### Website Text Management System (CMS)
- **Admin Module**: Settings → Website Text
- **Live Sync**: Changes reflect automatically within 60 seconds (no redeploy needed)
- **Features**:
  - Table view with all text keys
  - Search by key, value, or description
  - Filter by page (home, bulk, pod, boutique, etc.)
  - Inline editing with confirmation popup
  - Reset to default functionality
  - Character limit validation
  - Admin-only access
- **73 Default Text Keys** covering:
  - Homepage (hero titles, CTAs, descriptions)
  - Bulk Orders page
  - Print-on-Demand page
  - Boutique, Fabrics, Souvenirs pages
  - Cart & Checkout
  - Footer
  - Navigation
  - Common buttons
  - Contact, About pages
  - Order tracking
- **API Endpoints**:
  - `GET /api/site-texts` - Public: Get all texts (cached 60s)
  - `GET /api/admin/site-texts` - Admin: Get texts with metadata
  - `PUT /api/admin/site-texts/:key` - Admin: Update text
  - `POST /api/admin/site-texts/reset/:key` - Admin: Reset to default
  - `POST /api/admin/site-texts/seed` - Super Admin: Initialize defaults
- **Frontend Integration**:
  - `SiteTextContext` provider wraps entire app
  - `useSiteText(key)` hook for components
  - 60-second cache TTL with localStorage
  - Auto-refresh on tab visibility change
  - Fallback to defaults on API failure
- **Database Collection**: `site_texts`
  - Fields: key, value, page, section, description, max_length, last_updated, updated_by

