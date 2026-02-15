# Bulk Order Clothing Items - Image Upload Guide ✅

## YES! You CAN Upload Images for Bulk Order Items

The images you upload through the Admin Dashboard **WILL** appear on the Bulk Order page that customers see.

---

## 🔄 Complete Flow: Admin Upload → Customer View

### Step 1: Admin Uploads Image
**Location**: Admin Dashboard → Clothing Management

1. Login to: `https://fashion-hub-1023.preview.emergentagent.com/admin/login`
2. Click **"Clothing Management"** in sidebar (Shirt icon)
3. Switch to **"Bulk Order Items"** tab
4. Click **"Add New Item"** button

### Step 2: Upload Process
In the Add/Edit modal:

1. **Product Image Section**:
   - Click **"Choose File"** button
   - Select your clothing item image (JPG, PNG, WEBP, GIF)
   - Click **"Upload"** button
   - Wait for success message
   - Image preview will appear automatically

2. **Fill Other Details**:
   - Item Name: e.g., "T-Shirt", "Hoodie", "Corporate Shirt"
   - Base Price: e.g., 1500, 4500
   - Description (optional)
   - Active status: ✅ (must be checked for customers to see it)

3. Click **"Add Item"** or **"Update Item"**

### Step 3: Customer Sees Image
**Location**: `https://fashion-hub-1023.preview.emergentagent.com/bulk-orders`

When customers visit the Bulk Orders page:
- They see a grid of clothing items
- **Each item displays the image you uploaded**
- Clicking an item shows the image again in the order form
- The image helps customers visualize what they're ordering

---

## 📊 Data Flow Architecture

```
Admin Dashboard (Upload)
         ↓
   Backend API: POST /api/admin/bulk/clothing-items
         ↓
   Database: bulk_clothing_items collection
         ↓
   Backend API: GET /api/bulk/clothing-items  
         ↓
   Bulk Orders Page (Customer View)
         ↓
   Display: Grid of items with images
```

---

## 🎯 What Gets Stored

When you add a bulk order item, this is saved:

```javascript
{
  id: "unique-id-123",
  name: "T-Shirt",
  base_price: 1500,
  image_url: "/uploads/abc123.jpg",  // ← Your uploaded image
  description: "Premium cotton t-shirt",
  is_active: true,  // ← Must be true for customers to see it
  created_at: "2025-02-12T10:30:00Z"
}
```

---

## 📸 Image Specifications

**Supported Formats**: JPG, JPEG, PNG, GIF, WEBP  
**Maximum Size**: 5MB  
**Recommended Resolution**: 800x800 pixels (square) or 1200x1200 for HD  
**Aspect Ratio**: Square (1:1) works best  
**Background**: White or transparent recommended  

---

## 🔍 How to Verify It's Working

### Test 1: Check Database
```bash
mongosh --quiet --eval "use temaruco_db; db.bulk_clothing_items.find().pretty()"
```

### Test 2: Check API Response
```bash
curl -s http://localhost:8001/api/bulk/clothing-items | jq
```

### Test 3: View in Browser
1. Go to: `https://temaru-web-clone.preview.emergentagant.com/bulk-orders`
2. Look for your clothing items in the grid
3. Each item should show its uploaded image

---

## 🎨 Admin Dashboard Locations for Image Upload

### 1. Bulk Order Items (MAIN)
**Path**: `/admin/dashboard/clothing-items` → Bulk Order Items tab  
**What it controls**: Images customers see on bulk order page  
**Upload method**: File upload + manual URL entry  

### 2. POD Items
**Path**: `/admin/dashboard/clothing-items` → POD Items tab  
**What it controls**: Images for Print-on-Demand orders  
**Upload method**: File upload + manual URL entry  

### 3. Boutique Products
**Path**: `/admin/inventory` → Add New Product  
**What it controls**: Images for boutique/shop items  
**Upload method**: File upload (already working)  

### 4. Website CMS Images
**Path**: `/admin/dashboard/images`  
**What it controls**: Hero banners, feature sections, logos  
**Upload method**: Section-based upload  

---

## 🚀 Quick Start: Upload Your First Item

1. **Login to Admin**:
   ```
   URL: /admin/login
   Use your admin credentials
   ```

2. **Navigate to Clothing Management**:
   - Click Shirt icon in sidebar
   - Or go to: `/admin/dashboard/clothing-items`

3. **Add Item**:
   - Click "Add New Item"
   - Select "Bulk Order Items" tab if not already selected
   - Choose your image file
   - Click Upload
   - Fill in name: "T-Shirt"
   - Set price: 1500
   - Check "Active" ✅
   - Click "Add Item"

4. **Verify**:
   - Open new tab: `/bulk-orders`
   - You should see your T-Shirt with the image

---

## 📝 Example: Complete Bulk Order Item Setup

```javascript
Item Details:
- Name: "Premium Cotton T-Shirt"
- Base Price: ₦1,500
- Image: /uploads/premium-tshirt-white.jpg
- Description: "High-quality 100% cotton t-shirt, perfect for bulk orders"
- Active: ✅ Yes

Customer Will See:
- Image displayed in 2 places:
  1. Selection grid (small thumbnail)
  2. Order details section (larger preview)
- Price starts from ₦1,500
- Click to select and customize quantities
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Image Not Showing on Bulk Order Page
**Possible Causes**:
- Item is marked as inactive (is_active: false)
- Image URL is incorrect
- Image file was deleted from uploads folder

**Solution**:
- Go to Admin → Clothing Management
- Edit the item
- Ensure "Active" checkbox is ✅ checked
- Re-upload image if needed

### Issue 2: Upload Button Disabled
**Cause**: No file selected yet

**Solution**: Click "Choose File" first, then "Upload"

### Issue 3: Image Upload Fails
**Possible Causes**:
- File too large (>5MB)
- Wrong file type (not an image)
- Server error

**Solution**:
- Check file size (should be < 5MB)
- Compress image if needed
- Use JPG or PNG format
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`

---

## 🔐 Backend API Endpoints Reference

### Public Endpoints (Customer-facing)
```
GET /api/bulk/clothing-items
→ Returns all ACTIVE bulk order items with images
→ Used by Bulk Orders page
```

### Admin Endpoints (Authenticated)
```
GET /api/admin/bulk/clothing-items
→ Returns ALL items (including inactive)

POST /api/admin/bulk/clothing-items
→ Create new bulk order item

PUT /api/admin/bulk/clothing-items/{item_id}
→ Update existing item

DELETE /api/admin/bulk/clothing-items/{item_id}
→ Delete item

POST /api/admin/upload-image
→ Upload image file, returns file path
```

---

## 📂 File Storage Location

Uploaded images are stored at:
```
/app/backend/uploads/
```

Files are named with UUID:
```
Example: abc123-def456-ghi789.jpg
```

Accessible via URL:
```
https://fashion-hub-1023.preview.emergentagent.com/uploads/abc123-def456-ghi789.jpg
```

---

## ✅ Summary

**YES**, you can upload images for bulk order clothing items! 

The complete workflow is:
1. **Admin uploads** via Clothing Management page
2. **Image saved** to `/uploads/` folder
3. **Database stores** the image path
4. **Bulk Orders page loads** items from database
5. **Customers see** your uploaded images

**Everything is now connected and working!** 🎉

---

## 📞 Support

If images still don't appear:
1. Check if item is marked as "Active"
2. Verify image uploaded successfully (check preview)
3. Clear browser cache and reload bulk orders page
4. Check backend logs for errors
5. Verify the uploaded file exists in `/app/backend/uploads/`
