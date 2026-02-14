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
- Email notifications in **MOCK** mode (SMTP not configured)
- Paystack popup may be blocked by Cloudflare in automated testing
- Boutique products show placeholder text when no images uploaded

## Design System (design_guidelines.json)
- **Fonts:** Syne (headings), Manrope (body)
- **Brand Color:** #D90429 (Red)
- **Background:** White (#FFFFFF), Subtle (#FAFAFA), Dark (#09090B)
- **Text:** Primary (#18181B), Secondary (#52525B), Muted (#A1A1AA)
- **Components:** Rounded cards, pill-shaped buttons, shadow-lg hover effects
- **Layout:** max-w-7xl container, responsive grids

## Pending Tasks (P2)
- Enable real email notifications (requires SMTP credentials)
- Add actual product images to boutique products

## Future Tasks (Backlog)
- Drag-and-drop mockup builder
- Staff management with role permissions
- Automated email reminders
- Customer measurements database
- Procurement/inventory tracking
- Financial reports generation
- Advanced Analytics Dashboard expansion
