import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv
import bcrypt
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def seed_database():
    print("Seeding database...")
    
    # Create super admin user
    super_admin_password = bcrypt.hashpw('superadmin123'.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    super_admin_user = {
        'id': user_id,  # Add id field for compatibility
        'user_id': user_id,
        'name': 'Super Admin',
        'email': 'superadmin@temaruco.com',
        'phone': '+2349125423902',
        'password': super_admin_password,
        'is_verified': True,
        'is_admin': True,
        'is_super_admin': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    existing_super = await db.users.find_one({'email': 'superadmin@temaruco.com'})
    if not existing_super:
        await db.users.insert_one(super_admin_user)
        print("✓ Super Admin created (email: superadmin@temaruco.com, password: superadmin123)")
    else:
        print("✓ Super Admin already exists")
    
    # Create regular admin user
    admin_password = bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode()
    admin_user_id = f"user_{uuid.uuid4().hex[:12]}"
    admin_user = {
        'id': admin_user_id,  # Add id field for compatibility
        'user_id': admin_user_id,
        'name': 'Admin User',
        'email': 'admin@temaruco.com',
        'phone': '+2349125423902',
        'password': admin_password,
        'is_verified': True,
        'is_admin': True,
        'is_super_admin': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    existing_admin = await db.users.find_one({'email': 'admin@temaruco.com'})
    if not existing_admin:
        await db.users.insert_one(admin_user)
        print("✓ Admin user created (email: admin@temaruco.com, password: admin123)")
    else:
        print("✓ Admin user already exists")
    
    # Create sample boutique products
    products = [
        {
            'id': str(uuid.uuid4()),
            'name': 'Premium Cotton T-Shirt',
            'description': 'Soft, breathable cotton tee in classic fit',
            'price': 5000,
            'category': 'T-Shirts',
            'sizes': ['S', 'M', 'L', 'XL'],
            'image_url': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Designer Polo Shirt',
            'description': 'Elegant polo with modern cut and premium fabric',
            'price': 8500,
            'category': 'Polos',
            'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
            'image_url': 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Classic Hoodie',
            'description': 'Comfortable pullover hoodie with soft fleece lining',
            'price': 12000,
            'category': 'Hoodies',
            'sizes': ['S', 'M', 'L', 'XL'],
            'image_url': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Professional Button-Down',
            'description': 'Crisp button-down shirt for business and formal occasions',
            'price': 9500,
            'category': 'Shirts',
            'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
            'image_url': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        # Nigerian Traditional Clothing
        {
            'id': str(uuid.uuid4()),
            'name': 'Traditional Agbada',
            'description': 'Premium flowing agbada with intricate embroidery, perfect for special occasions',
            'price': 45000,
            'category': 'Traditional',
            'sizes': ['M', 'L', 'XL', 'XXL'],
            'image_url': 'https://images.unsplash.com/photo-1752343927726-20ae2eb8432b?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Senator Wear',
            'description': 'Elegant senator style with modern tailoring and premium fabric',
            'price': 35000,
            'category': 'Traditional',
            'sizes': ['M', 'L', 'XL', 'XXL'],
            'image_url': 'https://images.unsplash.com/photo-1579710754366-bb9665344096?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Kaftan (Men)',
            'description': 'Classic Nigerian kaftan with beautiful patterns and comfortable fit',
            'price': 28000,
            'category': 'Traditional',
            'sizes': ['M', 'L', 'XL', 'XXL'],
            'image_url': 'https://images.unsplash.com/photo-1632427511068-81a8a19890d7?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Ankara Bubu Dress',
            'description': 'Vibrant Ankara print bubu dress with flowing silhouette',
            'price': 32000,
            'category': 'Traditional',
            'sizes': ['S', 'M', 'L', 'XL'],
            'image_url': 'https://images.unsplash.com/photo-1663044023009-cfdb6dd6b89c?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Ankara Midi Dress',
            'description': 'Colorful Ankara print dress with modern cut and African heritage',
            'price': 25000,
            'category': 'Traditional',
            'sizes': ['S', 'M', 'L', 'XL'],
            'image_url': 'https://images.unsplash.com/photo-1629160477511-e5e730a661ee?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Dashiki Shirt',
            'description': 'Vibrant dashiki with traditional African print patterns',
            'price': 18000,
            'category': 'Traditional',
            'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
            'image_url': 'https://images.unsplash.com/photo-1680345575812-2f6878d7d775?crop=entropy&cs=srgb&fm=jpg&q=85',
            'in_stock': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    
    existing_products = await db.boutique_products.count_documents({})
    if existing_products == 0:
        await db.boutique_products.insert_many(products)
        print(f"✓ {len(products)} boutique products created")
    else:
        print(f"✓ Boutique products already exist ({existing_products} products)")
    
    # Create CMS settings with logo
    cms_settings = {
        'logo_url': '/uploads/temaruco_logo_black.png',
        'logo_url_black': '/uploads/temaruco_logo_black.png',
        'logo_url_white': '/uploads/temaruco_logo_white.png',
        'company_name': 'Temaruco Clothing Factory',
        'tagline': 'Inspire • Empower • Accomplish',
        'email': 'temarucoltd@gmail.com',
        'phone': '+234 912 542 3902',
        'address': 'Lagos, Nigeria',
        'pod_shirt_quality_prices': {
            'Standard': 2000,
            'Premium': 2800,
            'Luxury': 3500
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
            '50': 5,
            '100': 10,
            '200': 15,
            '500': 20
        },
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    existing_cms = await db.cms_settings.find_one({})
    if not existing_cms:
        await db.cms_settings.insert_one(cms_settings)
        print("✓ CMS settings created with Temaruco logo")
    else:
        # Always update logo paths to ensure both variations are set
        logo_update = {
            'logo_url': '/uploads/temaruco_logo_black.png',
            'logo_url_black': '/uploads/temaruco_logo_black.png',
            'logo_url_white': '/uploads/temaruco_logo_white.png'
        }
        await db.cms_settings.update_one({}, {'$set': logo_update})
        print("✓ CMS settings updated with both logo variations")
    
    # Add logo to CMS images collection
    await db.cms_images.delete_many({'section': 'logo'})
    logo_image = {
        'section': 'logo',
        'file_path': '/uploads/temaruco_logo_black.png',
        'uploaded_at': datetime.now(timezone.utc).isoformat()
    }
    await db.cms_images.insert_one(logo_image)
    print("✓ Logo added to CMS images")
    
    print("\nDatabase seeding completed!")
    print("\nLogin credentials:")
    print("  Super Admin: superadmin@temaruco.com / superadmin123")
    print("  Admin: admin@temaruco.com / admin123")
    print("\nYou can now:")
    print("  1. Register as a new user (via Google or email)")
    print("  2. Login as super admin to manage admins")
    print("  3. Login as admin to manage orders and quotes")
    print("  4. Browse boutique products")
    print("  5. Create bulk orders, POD orders, or custom requests")

if __name__ == '__main__':
    asyncio.run(seed_database())
    client.close()
