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
- **Cloud Storage:** Supabase Cloud Storage (product images)
- **Services:** Supervisor for process management
- **Fonts:** Syne (headings), Manrope (body)
- **Brand Color:** #D90429

## Key Features Implemented

### Supabase Cloud Storage Integration (Feb 18, 2026) ✅
- **Persistent Image Storage**: All product images now stored in Supabase Cloud Storage
- **CDN Delivery**: Images served via Supabase CDN for fast global access
- **Automatic Cleanup**: Product deletion automatically removes associated images from Supabase
- **Fallback System**: Graceful fallback to local storage if Supabase is unavailable
- **Supported Products**: Fabrics, Souvenirs, Boutique, POD Clothing Items, **Bulk Order Items**, **POD Designs**
- **Storage Service**: `/app/backend/services/storage_service.py`
- **Image URLs**: Format: `https://wkltyoesqjixpvjxjham.supabase.co/storage/v1/object/public/product-images/{folder}/{uuid}.{ext}`
- **Folder Structure**:
  - `bulk-products/` - Bulk order clothing item images
  - `pod-products/` - POD clothing item images  
  - `pod-designs/original/` - Customer uploaded POD design files
  - `pod-designs/mockups/` - Generated mockup previews
  - `fabrics/` - Fabric product images
  - `souvenirs/` - Souvenir product images
  - `boutique/` - Boutique product images

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

## Completed Work (Feb 16, 2026) - Full Email Marketing System

### Email Marketing System (Complete)
- **Admin Module**: Settings → Email Marketing (`/admin/email`)
- **Navigation**: Added to AdminPage sidebar under Settings
- **Route**: `/admin/email` with protected auth

**6 Main Tabs:**
1. **Analytics Dashboard**
   - Total Sent count
   - Open Rate percentage
   - Subscribers count
   - Failed count
   - Quick Stats: Actual Sent, Mocked, Campaigns sent, Unsubscribed

2. **SMTP Settings**
   - Gmail SMTP pre-configured (smtp.gmail.com:587)
   - Username: temarucoltd@gmail.com
   - From Name: Temaruco
   - Status: Configured (green badge when password exists)
   - Edit Settings modal (Super Admin only for password)
   - Send Test Email functionality

3. **Email Templates**
   - 6 default templates: Welcome, Order Confirmation, Password Reset, Quote Reminder, Newsletter, Promotional
   - Create custom templates with key, name, type (transactional/marketing), subject, HTML content
   - Variables support: {{name}}, {{email}}, {{company_name}}, {{order_id}}, etc.
   - Edit/Delete templates (defaults cannot be deleted)

4. **Subscribers Management**
   - List all subscribers with pagination
   - View email, name, source, status, date
   - Add subscriber manually
   - Remove subscriber
   - Export to CSV functionality

5. **Email Campaigns**
   - Create marketing campaigns
   - Set title, subject, HTML content, audience
   - Draft → Sending → Sent status flow
   - Send to all subscribers
   - Track sent/failed counts

6. **Email Logs**
   - Full audit trail of all sent emails
   - Recipient, subject, status (sent/mocked/failed), opened, date
   - Pagination support

**Backend Features:**
- SMTP password encryption using Fernet (cryptography library)
- Email open tracking via 1x1 pixel
- Public unsubscribe endpoint with HTML page
- Newsletter subscription endpoint for frontend forms
- Background email queue for rate limiting
- Transactional email integration (order confirmation, quote emails)

**API Endpoints:**
- `GET /api/admin/email/settings` - Get SMTP settings (no password)
- `POST /api/admin/email/settings` - Save SMTP settings (Super Admin)
- `POST /api/admin/email/test` - Send test email
- `GET /api/admin/email/templates` - List all templates
- `POST /api/admin/email/templates` - Create template
- `PUT /api/admin/email/templates/{key}` - Update template
- `DELETE /api/admin/email/templates/{key}` - Delete template (Super Admin)
- `GET /api/admin/email/subscribers` - List subscribers
- `POST /api/admin/email/subscribers` - Add subscriber
- `PATCH /api/admin/email/subscribers/{id}` - Update subscriber
- `DELETE /api/admin/email/subscribers/{id}` - Delete subscriber
- `GET /api/admin/email/subscribers/export` - Export CSV
- `GET /api/admin/email/campaigns` - List campaigns
- `POST /api/admin/email/campaigns` - Create campaign
- `PUT /api/admin/email/campaigns/{id}` - Update campaign
- `POST /api/admin/email/campaigns/{id}/send` - Send campaign
- `DELETE /api/admin/email/campaigns/{id}` - Delete campaign
- `GET /api/admin/email/logs` - Email logs with pagination
- `GET /api/admin/email/analytics` - Email analytics
- `GET /api/email/track/{log_id}` - Tracking pixel
- `GET /api/unsubscribe` - Unsubscribe page
- `POST /api/unsubscribe` - Process unsubscribe
- `POST /api/newsletter/subscribe` - Public newsletter signup

**Database Collections:**
- `email_settings` - SMTP configuration with encrypted password
- `email_templates` - Custom and default templates
- `email_subscribers` - Newsletter subscribers
- `email_campaigns` - Marketing campaigns
- `email_logs` - Sent email audit trail

## Database-Driven System Architecture (Feb 16, 2026) ✅

### Core Principle
All system-critical behavior lives in database tables, NOT in code. Nothing resets on redeploy.

### Collections & Persistence

**`system_config`** - Feature flags & system settings
- Feature toggles: `pod_enabled`, `bulk_orders_enabled`, `email_marketing_enabled`, etc.
- Business rules: `min_bulk_quantity`, `pod_print_fee`
- Localization: `default_currency`
- Print size configs: `print_size_a4`, `print_size_a3`, etc.
- All editable by Super Admin via API

**`pod_clothing_items`** - POD products (seeded on first deploy)
- `base_image_url`: Exact image for product card AND design canvas
- `print_area`: `{x, y, width, height, rotation}` - persisted mockup position
- Pricing, colors, sizes all stored in DB

**`bulk_clothing_items`** - Bulk products (seeded on first deploy)
**`material_types`** - Inventory categories (seeded on first deploy)
**`email_templates`** - Email templates (seeded on first deploy)
**`site_texts`** - CMS text content
**`audit_logs`** - All admin changes tracked

### Startup Behavior
On app boot (`startup_db_client`):
1. Initialize system_config with defaults (only if key doesn't exist)
2. Seed database defaults (only if collections are empty)
3. Create indexes
4. Start scheduler

### API Endpoints
- `GET /api/system-config` - Public feature flags
- `GET /api/admin/system-config` - All configs grouped by category
- `PUT /api/admin/system-config/{key}` - Update config (Super Admin)
- `POST /api/admin/system-config` - Create new config (Super Admin)
- `GET /api/admin/audit-logs` - View all admin changes

### Audit Logging
All admin changes tracked via `log_audit_event()`:
- Action: create, update, delete
- Entity type & ID
- User email
- Old and new values
- Timestamp

### File Storage
- Uploads stored in `/app/backend/uploads/`
- Subfolders: `designs/original/`, `designs/mockups/`, `design_references/`
- Database links files to products/orders/guests

## Backend Refactoring Progress (Feb 16, 2026)

### POD Image Reuse System (Feb 16, 2026) ✅
**Goal**: When a guest clicks a POD product, the EXACT same image from the card must appear on the design page.

**Implementation:**
1. **Database Schema Updated:**
   - `base_image_url`: The exact image used on product card AND design canvas
   - `print_area`: JSON object with `{x, y, width, height, rotation}` defining printable region

2. **Backend Changes:**
   - Added `base_image_url` and `print_area` fields to all POD clothing items
   - Added `PATCH /api/admin/pod/clothing-items/{id}/print-area` endpoint for admin mockup editor
   - Added `GET /api/image-proxy?url=` endpoint to proxy external images with CORS headers

3. **Frontend Changes:**
   - Removed hardcoded `POD_PRODUCTS` dictionary from design page
   - Design page now fetches product from database (single source of truth)
   - Uses `getProxiedImageUrl()` helper to route external images through backend proxy
   - `getPrintArea()` function retrieves print area from database product

4. **Flow:**
   - Guest clicks product card → Navigates to `/print-on-demand/{productId}`
   - Design page loads product from `/api/pod/clothing-items`
   - Base image loaded via proxy: `/api/image-proxy?url={external_url}`
   - Canvas renders: Background layer = base image, Foreground = guest design
   - Print area from database defines the overlay position

5. **Admin Mockup Editor (Ready for Implementation):**
   - Endpoint exists: `PATCH /api/admin/pod/clothing-items/{id}/print-area`
   - Accepts: `{print_area: {x, y, width, height, rotation}}`
   - Admin can upload base image + draw printable rectangle

**No AI generation, no dynamic rendering - only image layering/canvas overlay.**

### Current Structure
The backend has been partially refactored with a modular architecture:

```
/app/backend/
├── server.py (10,842 lines) - Main monolithic file (still active)
├── core/
│   ├── config.py - Environment variables
│   ├── database.py - MongoDB connection
│   └── auth.py - Authentication utilities
├── services/
│   ├── __init__.py
│   └── email_service.py (NEW) - Email service class with templates
├── routes/
│   ├── __init__.py
│   ├── auth.py - Auth routes (existing)
│   ├── payments.py - Payment routes (existing)
│   └── email.py (NEW) - Email API routes (ready for integration)
└── models/
    └── schemas.py - Pydantic models
```

### Refactoring Completed
- **Email Service Module** (`services/email_service.py`):
  - `EmailService` class with all email operations
  - `DEFAULT_EMAIL_TEMPLATES` dictionary
  - Encryption/decryption functions
  - `get_order_confirmation_email()` helper
  
- **Email Routes Module** (`routes/email.py`):
  - All email API endpoints extracted
  - Settings, templates, subscribers, campaigns, logs, analytics
  - Public endpoints: tracking pixel, unsubscribe, newsletter

### Remaining Refactoring (Future)
These sections in `server.py` should be extracted:
- POD Design System (lines 1678-2356)
- Boutique/Fabrics/Souvenirs (lines 2357-2653)
- Admin Orders (lines 4631-5292)
- Super Admin/RBAC (lines 6530-6862)
- Materials Inventory (lines 7939-8247)
- Site Text CMS (lines 8886-9187)

## Completed Work (Feb 19, 2026) - MOQ Feature

### Minimum Order Quantity (MOQ) for Fabrics & Souvenirs ✅

**Implementation:**
1. **Database Schema Updates:**
   - Fabrics: `moq_value` (float, default 1), `unit_type` (string, default "yard")
   - Souvenirs: `moq_value` (integer, default 1), `unit_type` (string, default "piece")

2. **Backend Endpoints Updated:**
   - `POST /api/admin/fabrics` - Creates fabric with MOQ (accepts decimal yards)
   - `PUT /api/admin/fabrics/{id}` - Updates fabric MOQ
   - `POST /api/admin/souvenirs` - Creates souvenir with MOQ (converts to integer)
   - `PUT /api/admin/souvenirs/{id}` - Updates souvenir MOQ
   - Zero/negative MOQ defaults to 1

3. **Admin UI:**
   - AdminProductsPage: MOQ input field added below Price
   - Fabrics: Label "Minimum Order Quantity (Yards) *" with decimal step
   - Souvenirs: Label "Minimum Order Quantity (Pieces) *" with integer step
   - Product cards display "MOQ: X Yards/Pieces"

4. **Customer-Facing Pages:**
   - FabricsPage: Shows "Minimum Order: X Yards" per product
   - SouvenirsPage: Shows "Minimum Order: X Pieces" per product
   - Quantity selector with MOQ as minimum value
   - Step: 0.5 for fabrics, 1 for souvenirs

5. **Validation:**
   - **Add to Cart**: Prevents adding if quantity < MOQ
   - **Cart Sidebar**: Quantity controls respect MOQ minimum
   - **Checkout (Safety Layer)**: Re-validates MOQ before order creation
   - Error toast: "Minimum order for this fabric/item is X yards/pieces."

6. **Files Modified:**
   - `/app/backend/server.py` - CRUD endpoints with MOQ fields
   - `/app/frontend/src/pages/AdminProductsPage.js` - MOQ form field
   - `/app/frontend/src/pages/FabricsPage.js` - MOQ display + validation
   - `/app/frontend/src/pages/SouvenirsPage.js` - MOQ display + validation

**Testing:** 100% pass rate (12 backend tests, all UI tests passed)


