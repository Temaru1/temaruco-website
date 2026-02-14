# 🔐 Login Credentials - Temaruco Website

## Admin Dashboard Access

### Super Admin Account (Full Access)
```
Email:    superadmin@temaruco.com
Password: superadmin123
```

**Permissions:**
- ✅ Full system access
- ✅ Manage other admins
- ✅ All admin features
- ✅ System settings
- ✅ User management

---

### Regular Admin Account
```
Email:    admin@temaruco.com
Password: admin123
```

**Permissions:**
- ✅ Manage orders
- ✅ Manage quotes & invoices
- ✅ Manage inventory
- ✅ View analytics
- ✅ Upload images
- ⚠️ Cannot manage other admins

---

## How to Login

### Method 1: Admin Login Page
1. Go to: `https://apparel-manager-31.preview.emergentagent.com/admin/login`
2. Enter email and password
3. Click "Sign In"

### Method 2: Main Site
1. Go to: `https://apparel-manager-31.preview.emergentagent.com`
2. Click "Admin" in navigation
3. Enter credentials

---

## What You Can Do After Login

### 1. Upload Bulk Order Clothing Images
**Path**: Admin Dashboard → Clothing Management → Bulk Order Items
- Add new clothing items
- Upload product images
- Set prices
- Make items active/inactive

### 2. Manage Inventory
**Path**: Admin Dashboard → Boutique Inventory
- Add boutique products
- Upload product images
- Track stock levels
- Manage restocking

### 3. Manage Orders
**Path**: Admin Dashboard → Orders
- View all orders
- Update order status
- Upload payment receipts
- Track deliveries

### 4. Upload Website Images
**Path**: Admin Dashboard → Image Management
- Upload hero banners
- Add feature images
- Update logos
- Manage all website images

### 5. Pricing Management
**Path**: Admin Dashboard → Pricing Management
- Set fabric quality prices
- Configure print costs
- Update base prices

---

## Test Users Created

The database has been seeded with:
- ✅ 2 Admin accounts (super admin + regular admin)
- ✅ 10 Sample boutique products with images
- ✅ CMS settings configured
- ✅ Default pricing structure

---

## Quick Start Guide

1. **Login**:
   ```
   URL: /admin/login
   Email: admin@temaruco.com
   Password: admin123
   ```

2. **Add Your First Bulk Order Item**:
   - Click "Clothing Management" (Shirt icon)
   - Select "Bulk Order Items" tab
   - Click "Add New Item"
   - Upload image of T-Shirt
   - Name: "Premium T-Shirt"
   - Price: 1500
   - Check "Active" ✅
   - Click "Add Item"

3. **Verify on Customer Page**:
   - Open: `/bulk-orders`
   - See your T-Shirt with uploaded image
   - Click to start an order

---

## Password Reset

If you need to reset passwords:

```bash
# Connect to MongoDB
mongosh

# Use database
use temaruco_db

# Check users
db.users.find({is_admin: true}, {email: 1, name: 1, is_super_admin: 1})

# To create new admin, run seed script again:
cd /app/backend && python seed_database.py
```

---

## Security Notes

⚠️ **Important**: These are default credentials for development.

**For Production**, you should:
1. Change all default passwords
2. Use strong passwords (16+ characters)
3. Enable two-factor authentication
4. Regularly rotate credentials
5. Limit admin access by role

---

## Troubleshooting Login Issues

### "User not found"
- Check email spelling
- Ensure seed script ran successfully
- Verify database connection

### "Invalid credentials"
- Double-check password (case-sensitive)
- Try copy-pasting credentials
- Clear browser cache

### "Not authenticated"
- Check if JWT_SECRET is set in backend .env
- Restart backend: `sudo supervisorctl restart backend`
- Clear browser cookies

### Can't access admin routes
- Verify user has `is_admin: true` in database
- Check user session is valid
- Try logging out and back in

---

## Database Verification

Check if admin users exist:

```bash
mongosh --quiet --eval "use temaruco_db; db.users.find({is_admin: true}).pretty()"
```

Expected output:
```javascript
{
  email: "superadmin@temaruco.com",
  name: "Super Admin",
  is_admin: true,
  is_super_admin: true,
  // ... other fields
}
{
  email: "admin@temaruco.com", 
  name: "Admin User",
  is_admin: true,
  is_super_admin: false,
  // ... other fields
}
```

---

## Summary

✅ **Super Admin**: `superadmin@temaruco.com` / `superadmin123`  
✅ **Regular Admin**: `admin@temaruco.com` / `admin123`  
✅ Database seeded with sample data  
✅ All admin features accessible  
✅ Image upload functionality ready  

**Login URL**: https://apparel-manager-31.preview.emergentagent.com/admin/login

Start uploading your bulk order clothing images now! 🎉
