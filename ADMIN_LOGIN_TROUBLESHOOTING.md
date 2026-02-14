# Admin Login Troubleshooting Guide

## ✅ Confirmed Working Credentials

### Super Admin
```
Email:    superadmin@temaruco.com
Password: superadmin123
```

### Regular Admin
```
Email:    admin@temaruco.com
Password: admin123
```

**Note**: Email must be typed **exactly** as shown (all lowercase, no spaces)

---

## Common Login Issues & Solutions

### Issue 1: "User not found" or "Invalid username"

**Problem**: Email might have extra spaces or wrong format

**Solution**:
1. Copy-paste email exactly: `superadmin@temaruco.com`
2. Ensure no spaces before/after email
3. Use lowercase only
4. Make sure you're using the **@** symbol, not other similar characters

---

### Issue 2: "Incorrect password"

**Problem**: Password case-sensitive or has typos

**Solution**:
1. Copy-paste password exactly: `superadmin123`
2. Make sure no extra spaces
3. All lowercase letters + numbers
4. No special characters in this password

---

### Issue 3: Login button not working

**Problem**: Frontend not loading properly or JavaScript error

**Solution**:
1. **Hard refresh**: Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
2. **Clear cache**: 
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: History → Clear recent history
3. **Try incognito/private mode**
4. **Check console**: Press F12 → Console tab → Look for errors

---

### Issue 4: Page stuck loading

**Problem**: Network or server delay

**Solution**:
1. Wait 10-15 seconds
2. Refresh page (F5)
3. Check if services are running:
   ```bash
   sudo supervisorctl status
   ```
4. Restart services if needed:
   ```bash
   sudo supervisorctl restart all
   ```

---

## Step-by-Step Login Process

### Using Copy-Paste (Recommended)

1. **Open Admin Login Page**:
   ```
   https://temaru-payment.preview.emergentagent.com/admin/login
   ```

2. **In Email/Username field**, paste:
   ```
   superadmin@temaruco.com
   ```

3. **In Password field**, paste:
   ```
   superadmin123
   ```

4. Click **"Sign In"** button

5. Wait for redirect to admin dashboard

---

## Manual Testing via API (Confirm credentials work)

Run this command to test login directly:

```bash
curl -X POST https://temaru-web-clone.preview.emergentagant.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@temaruco.com", "password": "superadmin123"}'
```

**Expected response**: Should return a token and user object

If this works but browser doesn't, it's a frontend/browser issue.

---

## Verify Admin User Exists

Check database:

```bash
mongosh temaruco_db --eval "db.users.findOne({email: 'superadmin@temaruco.com'}, {email: 1, is_admin: 1, is_super_admin: 1})"
```

**Expected output**:
```javascript
{
  email: 'superadmin@temaruco.com',
  is_admin: true,
  is_super_admin: true
}
```

---

## Reset Password (If needed)

If you suspect password was changed, reset it:

```bash
cd /app/backend
python << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import os

async def reset_password():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    new_password = bcrypt.hashpw('superadmin123'.encode(), bcrypt.gensalt()).decode()
    
    await db.users.update_one(
        {'email': 'superadmin@temaruco.com'},
        {'$set': {'password': new_password}}
    )
    
    print("Password reset to: superadmin123")

asyncio.run(reset_password())
EOF
```

---

## Alternative: Create New Admin

If all else fails, create a new admin account:

```bash
cd /app/backend
python << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime, timezone
import os

async def create_admin():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password = bcrypt.hashpw('test123'.encode(), bcrypt.gensalt()).decode()
    
    admin = {
        'id': user_id,
        'user_id': user_id,
        'name': 'Test Admin',
        'email': 'test@admin.com',
        'phone': '+2349125423902',
        'password': password,
        'is_verified': True,
        'is_admin': True,
        'is_super_admin': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin)
    print("New admin created:")
    print("Email: test@admin.com")
    print("Password: test123")

asyncio.run(create_admin())
EOF
```

---

## Browser Developer Tools Check

1. Open login page
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for any red error messages
5. Go to **Network** tab
6. Try logging in
7. Look for `/api/auth/login` request
8. Check if it shows status 200 (success) or error

**Common issues visible in Network tab**:
- 404: Wrong API URL
- 401: Wrong password
- 404: Email not found
- 500: Server error

---

## Quick Test URLs

Try these to verify everything is working:

1. **Backend API**: https://temaru-payment.preview.emergentagent.com/api/bank-details
   - Should show bank details

2. **Test Connection**: https://temaru-payment.preview.emergentagent.com/test-connection.html
   - Should show green checkmarks

3. **Admin Login**: https://temaru-payment.preview.emergentagent.com/admin/login
   - Should show login form

---

## Still Not Working?

If login still fails after trying all above:

1. **Check backend logs**:
   ```bash
   tail -f /var/log/supervisor/backend.err.log
   ```

2. **Check frontend logs**:
   ```bash
   tail -f /var/log/supervisor/frontend.err.log
   ```

3. **Restart everything**:
   ```bash
   sudo supervisorctl restart all
   sleep 10
   sudo supervisorctl status
   ```

4. **Verify database connection**:
   ```bash
   mongosh temaruco_db --eval "db.users.countDocuments({is_admin: true})"
   ```
   Should return: `2` (super admin + regular admin)

---

## Summary

✅ **Credentials are confirmed working** via direct API test  
✅ **Admin users exist** in database  
✅ **Backend API is responding** correctly  
✅ **Services are running**  

**Most likely causes**:
1. Typo in email or password (extra spaces, wrong case)
2. Browser cache issue (hard refresh needed)
3. Copy-paste formatting issue (type manually)

**Best solution**: Copy-paste credentials exactly as shown, do hard refresh, try incognito mode.
