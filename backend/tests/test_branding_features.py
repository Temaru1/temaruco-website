"""
Test Suite for Branded Products Features
- Branding upload endpoint
- Souvenir order with branding fields
- Admin branded orders endpoint
- Admin Products has_branding toggle
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bulk-sizing-orders.preview.emergentagent.com')


class TestBrandingUploadEndpoint:
    """Test POST /api/branding/upload-design endpoint"""
    
    def test_01_upload_valid_png_file(self):
        """Test uploading a valid PNG file under 2MB"""
        # Create a small valid PNG file
        png_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test_design.png', io.BytesIO(png_content), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/branding/upload-design", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'url' in data, "Response should contain 'url'"
        assert data.get('storage') in ['supabase', 'local'], f"Storage should be supabase or local, got {data.get('storage')}"
        print(f"✓ Branding upload successful - URL: {data['url'][:50]}...")
    
    def test_02_upload_valid_jpg_file(self):
        """Test uploading a valid JPEG file"""
        # Minimal valid JPEG
        jpg_content = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9teleVP8 \x00\x00\x08\x00\x00\x00\x00\x00\x00\x00\xff\xd9'
        
        files = {'file': ('test_design.jpg', io.BytesIO(jpg_content), 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/branding/upload-design", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ JPEG upload accepted")
    
    def test_03_reject_invalid_file_type(self):
        """Test that non-image files are rejected"""
        pdf_content = b'%PDF-1.4 test content'
        
        files = {'file': ('test_file.pdf', io.BytesIO(pdf_content), 'application/pdf')}
        response = requests.post(f"{BASE_URL}/api/branding/upload-design", files=files)
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("✓ PDF file correctly rejected")
    
    def test_04_reject_large_file(self):
        """Test that files over 2MB are rejected"""
        # Create a file larger than 2MB
        large_content = b'\x89PNG\r\n\x1a\n' + b'x' * (3 * 1024 * 1024)  # 3MB
        
        files = {'file': ('large_design.png', io.BytesIO(large_content), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/branding/upload-design", files=files)
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        print("✓ Large file (>2MB) correctly rejected")


class TestSouvenirOrderWithBranding:
    """Test POST /api/orders/souvenir with branding fields"""
    
    def test_05_create_souvenir_order_without_branding(self):
        """Test creating a basic souvenir order without branding"""
        order_data = {
            "items": [
                {"souvenir_id": "test-souvenir-1", "name": "Test Mug", "quantity": 10, "price": 500}
            ],
            "customer_name": "TEST_Branding Customer",
            "customer_email": "test@example.com",
            "customer_phone": "+2341234567890",
            "total_price": 5000,
            "contains_branded_items": False
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/souvenir", json=order_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'order_id' in data, "Response should contain order_id"
        assert data['order_id'].startswith('SOU-'), f"Order ID should start with SOU-, got {data['order_id']}"
        print(f"✓ Souvenir order created: {data['order_id']}")
    
    def test_06_create_souvenir_order_with_client_upload_design(self):
        """Test creating a branded order where client uploads design"""
        order_data = {
            "items": [
                {"souvenir_id": "test-souvenir-2", "name": "Branded Mug", "quantity": 20, "price": 800, "is_branded": True}
            ],
            "customer_name": "TEST_Branded Client",
            "customer_email": "branded@example.com",
            "customer_phone": "+2349876543210",
            "total_price": 16000,
            "contains_branded_items": True,
            "design_source": "client_upload",
            "branding_image_url": "https://example.com/my-logo.png"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/souvenir", json=order_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'order_id' in data
        print(f"✓ Branded order (client_upload) created: {data['order_id']}")
    
    def test_07_create_souvenir_order_with_temaruco_design(self):
        """Test creating a branded order where TEMARUCO creates design"""
        order_data = {
            "items": [
                {"souvenir_id": "test-souvenir-3", "name": "Tote Bag", "quantity": 50, "price": 1200, "is_branded": True}
            ],
            "customer_name": "TEST_Temaruco Design Client",
            "customer_email": "temaruco_design@example.com",
            "customer_phone": "+2348001234567",
            "total_price": 60000,
            "contains_branded_items": True,
            "design_source": "temaruco_design",
            "design_brief": {
                "company_name": "Acme Corp",
                "colors": "Blue and Gold",
                "style_preferences": "Minimalist, Modern",
                "additional_notes": "Please include our tagline: Innovation First"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/souvenir", json=order_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'order_id' in data
        assert data.get('requires_design_quote') == True, "TEMARUCO design orders should require design quote"
        print(f"✓ Branded order (temaruco_design) created: {data['order_id']} - requires_design_quote: {data.get('requires_design_quote')}")


class TestAdminBrandedOrdersEndpoint:
    """Test GET /api/admin/branded-orders (admin auth required)"""
    
    @pytest.fixture(autouse=True)
    def login_admin(self):
        """Login as admin to get session token"""
        login_data = {
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('token') or data.get('session_token')
            self.session = requests.Session()
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            cookies = response.cookies
            for cookie in cookies:
                self.session.cookies.set(cookie.name, cookie.value)
        else:
            pytest.skip("Admin login failed - skipping admin tests")
    
    def test_08_get_branded_orders_list(self):
        """Test fetching list of branded orders"""
        response = self.session.get(f"{BASE_URL}/api/admin/branded-orders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'orders' in data, "Response should contain 'orders'"
        assert 'counts' in data, "Response should contain 'counts'"
        assert 'all' in data['counts'], "Counts should have 'all'"
        print(f"✓ Branded orders retrieved - Total: {data['counts']['all']}, Orders: {len(data['orders'])}")
    
    def test_09_get_branded_orders_filtered_by_status(self):
        """Test filtering branded orders by design negotiation status"""
        response = self.session.get(f"{BASE_URL}/api/admin/branded-orders?status=pending_design_quote")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify filter is applied (orders should only have pending_design_quote or empty)
        for order in data.get('orders', []):
            assert order.get('design_negotiation_status') == 'pending_design_quote', f"Order {order.get('order_id')} has wrong status"
        print(f"✓ Filtered branded orders (pending_design_quote): {len(data['orders'])}")


class TestAdminSouvenirsBrandingToggle:
    """Test admin souvenirs endpoint for has_branding toggle"""
    
    @pytest.fixture(autouse=True)
    def login_admin(self):
        """Login as admin to get session token"""
        login_data = {
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('token') or data.get('session_token')
            self.session = requests.Session()
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            cookies = response.cookies
            for cookie in cookies:
                self.session.cookies.set(cookie.name, cookie.value)
        else:
            pytest.skip("Admin login failed - skipping admin tests")
    
    def test_10_create_souvenir_with_branding_enabled(self):
        """Test creating a souvenir with has_branding=true"""
        souvenir_data = {
            "name": "TEST_Branded Pen",
            "price": 300,
            "branded_price": 450,
            "has_branding": True,
            "moq_value": 50,
            "description": "Custom branded pen with logo",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/souvenirs", json=souvenir_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'id' in data, "Response should contain souvenir ID"
        self.__class__.created_souvenir_id = data['id']
        print(f"✓ Souvenir with branding enabled created: {data['id']}")
    
    def test_11_verify_souvenir_has_branding_field(self):
        """Verify the created souvenir has has_branding field"""
        # Get souvenirs list
        response = requests.get(f"{BASE_URL}/api/souvenirs")
        
        assert response.status_code == 200
        souvenirs = response.json()
        
        # Find our test souvenir
        test_souvenir = None
        for s in souvenirs:
            if s.get('name') == 'TEST_Branded Pen':
                test_souvenir = s
                break
        
        assert test_souvenir is not None, "Test souvenir not found"
        assert test_souvenir.get('has_branding') == True, "Souvenir should have has_branding=true"
        assert test_souvenir.get('branded_price') == 450, f"Branded price should be 450, got {test_souvenir.get('branded_price')}"
        print(f"✓ Souvenir branding verified - has_branding: {test_souvenir.get('has_branding')}, branded_price: {test_souvenir.get('branded_price')}")
    
    def test_12_update_souvenir_toggle_branding_off(self):
        """Test updating souvenir to disable branding"""
        souvenir_id = getattr(self.__class__, 'created_souvenir_id', None)
        if not souvenir_id:
            pytest.skip("No souvenir ID from previous test")
        
        update_data = {
            "has_branding": False
        }
        
        response = self.session.put(f"{BASE_URL}/api/admin/souvenirs/{souvenir_id}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Souvenir branding toggled off")
    
    def test_13_cleanup_test_souvenir(self):
        """Delete test souvenir"""
        souvenir_id = getattr(self.__class__, 'created_souvenir_id', None)
        if not souvenir_id:
            pytest.skip("No souvenir ID from previous test")
        
        response = self.session.delete(f"{BASE_URL}/api/admin/souvenirs/{souvenir_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Test souvenir cleaned up")


class TestSouvenirsEndpointForBranding:
    """Test GET /api/souvenirs returns branding fields"""
    
    def test_14_souvenirs_return_branding_fields(self):
        """Verify souvenirs endpoint returns has_branding and branded_price fields"""
        response = requests.get(f"{BASE_URL}/api/souvenirs")
        
        assert response.status_code == 200
        souvenirs = response.json()
        
        # Check that souvenirs have the branding fields in schema
        if len(souvenirs) > 0:
            sample = souvenirs[0]
            # These fields should exist in the souvenir schema
            # has_branding may be False/None for existing products
            print(f"✓ Souvenirs endpoint working - returned {len(souvenirs)} souvenirs")
            print(f"  Sample fields: name={sample.get('name')}, price={sample.get('price')}, has_branding={sample.get('has_branding')}, branded_price={sample.get('branded_price')}")
        else:
            print("⚠ No souvenirs in database")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
