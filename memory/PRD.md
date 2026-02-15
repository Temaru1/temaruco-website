# Temaruco Website - Product Requirements Document

## Overview
A comprehensive e-commerce platform for Temaruco Clothing Factory featuring bulk orders, print-on-demand, boutique, fabrics, and souvenirs sales, with integrated Paystack payment processing and a full admin dashboard.

## Original Problem Statement
Clone and enhance the Temaruco website with:
- Redesigned landing page with clean, modern UI
- New service pages: Fabrics, Souvenirs, Design Lab
- Interactive price calculator
- Full admin dashboard for managing products, orders, and operations
- Paystack payment integration for online orders
- Image upload and management for clothing items

## Tech Stack
- **Frontend:** React, Tailwind CSS, Axios, react-helmet-async (SEO), Shadcn/UI components
- **Backend:** FastAPI, Motor (async MongoDB driver), JWT authentication
- **Database:** MongoDB
- **Payments:** Paystack (Live integration)
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

### Payments (COMPLETED)
- Paystack integration (Live keys configured)
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

## Future Tasks (Backlog)
- Backend refactoring (server.py is 7500+ lines - needs to be split into modules)
- Shipping integration
- Procurement/inventory tracking
- Financial reports generation

