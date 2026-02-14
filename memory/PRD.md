# Temaruco Website - Product Requirements Document

## Overview
A comprehensive e-commerce platform for Temaruco Clothing Factory featuring bulk orders, print-on-demand, boutique, fabrics, and souvenirs sales, with integrated Paystack payment processing and a full admin dashboard.

## Original Problem Statement
Clone and enhance the Temaruco website with:
- Redesigned landing page with interactive chatbot
- New service pages: Fabrics, Souvenirs, Design Lab
- Interactive price calculator
- Full admin dashboard for managing products, orders, and operations
- Paystack payment integration for online orders
- Image upload and management for clothing items

## Tech Stack
- **Frontend:** React, Tailwind CSS, Axios
- **Backend:** FastAPI, Motor (async MongoDB driver), JWT authentication
- **Database:** MongoDB
- **Payments:** Paystack (Live integration)
- **Services:** Supervisor for process management

## Key Features Implemented

### Customer-Facing
- Landing page with chatbot navigation assistant
- Bulk Orders page with quote calculator
- Print-On-Demand ordering
- Custom Order requests
- Fabrics e-commerce page with cart and checkout
- Souvenirs e-commerce page
- Design Lab for custom design inquiries
- Boutique products
- Quick Price Calculator widget

### Admin Dashboard
- Super Admin and Admin role support
- Order management with status tracking
- Clothing items management (CRUD with image upload)
- Production tracking
- Enquiries management
- Quotes & Invoices
- Website settings/CMS
- Client directory
- Revenue analytics

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
- ✅ Fixed critical Paystack payment bug (OrderType enum missing fabric/souvenir)
- ✅ Fixed Paystack callback async function error
- ✅ Implemented AuthProvider for persistent admin login sessions
- ✅ Extended Paystack to OrderSummaryPage with dual payment options (Paystack + Bank Transfer)
- ✅ All order types now support Paystack: bulk, pod, fabric, souvenir, boutique
- ✅ SEO Optimization implemented:
  - Enhanced meta tags (title, description, keywords)
  - Open Graph tags for social sharing
  - Twitter Card meta tags
  - JSON-LD structured data (Organization, ClothingStore schema)
  - sitemap.xml created
  - robots.txt created
  - react-helmet-async for dynamic page titles
  - SEO component for per-page customization
- ✅ Advanced Analytics Dashboard with:
  - Revenue trend area chart
  - Total revenue, orders, avg order value KPI cards
  - Revenue by order type pie chart
  - Daily orders bar chart
  - Top selling products list
  - Order status distribution
  - 7/30/90 day filter options
  - Real-time refresh capability
  - CSV Export for Revenue and Products data
  - Added to admin sidebar for easy access
- ✅ Fixed Chatbot visibility issue (moved above PWA install prompt, increased z-index)

## Known Limitations
- Email notifications in **MOCK** mode (SMTP not configured)
- Paystack popup may be blocked by Cloudflare in automated testing environments (works in real browsers)

## Pending Tasks (P2)
- Enable real email notifications (requires SMTP credentials)

## Future Tasks (Backlog)
- Advanced Analytics Dashboard with charts
- Drag-and-drop mockup builder
- Staff management with role permissions
- Automated email reminders
- Customer measurements database
- Procurement/inventory tracking
- Financial reports generation
