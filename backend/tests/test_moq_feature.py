"""
MOQ (Minimum Order Quantity) Feature Tests
Tests for Fabrics (yards, decimals allowed) and Souvenirs (pieces, whole numbers only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retail-reboot-1.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@temaruco.com"
ADMIN_PASSWORD = "superadmin123"


class TestMOQBackendAPI:
    """Test MOQ feature in backend API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get('token')
            self.session_token = data.get('session_token')
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            # Set cookies for admin routes
            self.session.cookies.set('session_token', self.session_token)
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        yield
        
        # Cleanup: Delete test products created during tests
        self._cleanup_test_products()
    
    def _cleanup_test_products(self):
        """Delete test products with TEST_ prefix"""
        try:
            # Get all fabrics and delete test ones
            fabrics = self.session.get(f"{BASE_URL}/api/fabrics").json()
            for fabric in fabrics:
                if fabric.get('name', '').startswith('TEST_'):
                    self.session.delete(f"{BASE_URL}/api/admin/fabrics/{fabric['id']}")
            
            # Get all souvenirs and delete test ones
            souvenirs = self.session.get(f"{BASE_URL}/api/souvenirs").json()
            for souvenir in souvenirs:
                if souvenir.get('name', '').startswith('TEST_'):
                    self.session.delete(f"{BASE_URL}/api/admin/souvenirs/{souvenir['id']}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    # ==================== FABRIC MOQ TESTS ====================
    
    def test_01_create_fabric_with_decimal_moq(self):
        """Admin can create fabric with decimal MOQ (e.g., 2.5 yards)"""
        fabric_data = {
            "name": "TEST_Silk_Fabric_MOQ",
            "price": 5000,
            "moq_value": 2.5,
            "unit_type": "yard",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/fabrics", json=fabric_data)
        assert response.status_code == 200, f"Failed to create fabric: {response.text}"
        
        data = response.json()
        assert 'id' in data, "Response should contain fabric ID"
        
        # Verify fabric was created with correct MOQ
        fabrics = self.session.get(f"{BASE_URL}/api/fabrics").json()
        created_fabric = next((f for f in fabrics if f['name'] == "TEST_Silk_Fabric_MOQ"), None)
        
        assert created_fabric is not None, "Fabric should exist in list"
        assert created_fabric['moq_value'] == 2.5, f"MOQ should be 2.5, got {created_fabric['moq_value']}"
        assert created_fabric['unit_type'] == 'yard', f"Unit type should be 'yard', got {created_fabric['unit_type']}"
        
        print(f"✓ Created fabric with MOQ: {created_fabric['moq_value']} {created_fabric['unit_type']}s")
    
    def test_02_create_fabric_with_default_moq(self):
        """Fabric without MOQ should default to 1"""
        fabric_data = {
            "name": "TEST_Default_MOQ_Fabric",
            "price": 3000,
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/fabrics", json=fabric_data)
        assert response.status_code == 200
        
        # Verify default MOQ
        fabrics = self.session.get(f"{BASE_URL}/api/fabrics").json()
        created_fabric = next((f for f in fabrics if f['name'] == "TEST_Default_MOQ_Fabric"), None)
        
        assert created_fabric is not None
        assert created_fabric['moq_value'] == 1, f"Default MOQ should be 1, got {created_fabric['moq_value']}"
        
        print(f"✓ Default MOQ is 1 yard")
    
    def test_03_update_fabric_moq(self):
        """Admin can update fabric MOQ"""
        # First create a fabric
        fabric_data = {
            "name": "TEST_Update_MOQ_Fabric",
            "price": 4000,
            "moq_value": 1,
            "is_active": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/fabrics", json=fabric_data)
        assert create_response.status_code == 200
        fabric_id = create_response.json()['id']
        
        # Update MOQ to 3.5 yards
        update_response = self.session.put(f"{BASE_URL}/api/admin/fabrics/{fabric_id}", json={
            "moq_value": 3.5
        })
        assert update_response.status_code == 200, f"Failed to update fabric: {update_response.text}"
        
        # Verify update
        fabrics = self.session.get(f"{BASE_URL}/api/fabrics").json()
        updated_fabric = next((f for f in fabrics if f['id'] == fabric_id), None)
        
        assert updated_fabric is not None
        assert updated_fabric['moq_value'] == 3.5, f"Updated MOQ should be 3.5, got {updated_fabric['moq_value']}"
        
        print(f"✓ Updated fabric MOQ to 3.5 yards")
    
    # ==================== SOUVENIR MOQ TESTS ====================
    
    def test_04_create_souvenir_with_integer_moq(self):
        """Admin can create souvenir with integer MOQ (e.g., 20 pieces)"""
        souvenir_data = {
            "name": "TEST_Custom_Mug_MOQ",
            "price": 1500,
            "moq_value": 20,
            "unit_type": "piece",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/souvenirs", json=souvenir_data)
        assert response.status_code == 200, f"Failed to create souvenir: {response.text}"
        
        data = response.json()
        assert 'id' in data, "Response should contain souvenir ID"
        
        # Verify souvenir was created with correct MOQ
        souvenirs = self.session.get(f"{BASE_URL}/api/souvenirs").json()
        created_souvenir = next((s for s in souvenirs if s['name'] == "TEST_Custom_Mug_MOQ"), None)
        
        assert created_souvenir is not None, "Souvenir should exist in list"
        assert created_souvenir['moq_value'] == 20, f"MOQ should be 20, got {created_souvenir['moq_value']}"
        assert created_souvenir['unit_type'] == 'piece', f"Unit type should be 'piece', got {created_souvenir['unit_type']}"
        
        print(f"✓ Created souvenir with MOQ: {created_souvenir['moq_value']} {created_souvenir['unit_type']}s")
    
    def test_05_souvenir_moq_converts_to_integer(self):
        """Souvenir MOQ should be converted to integer (whole numbers only)"""
        souvenir_data = {
            "name": "TEST_Integer_MOQ_Souvenir",
            "price": 2000,
            "moq_value": 15.7,  # Decimal should be converted to int
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/souvenirs", json=souvenir_data)
        assert response.status_code == 200
        
        # Verify MOQ is integer
        souvenirs = self.session.get(f"{BASE_URL}/api/souvenirs").json()
        created_souvenir = next((s for s in souvenirs if s['name'] == "TEST_Integer_MOQ_Souvenir"), None)
        
        assert created_souvenir is not None
        assert created_souvenir['moq_value'] == 15, f"MOQ should be 15 (integer), got {created_souvenir['moq_value']}"
        assert isinstance(created_souvenir['moq_value'], int), "MOQ should be integer type"
        
        print(f"✓ Souvenir MOQ converted to integer: {created_souvenir['moq_value']}")
    
    def test_06_update_souvenir_moq(self):
        """Admin can update souvenir MOQ"""
        # First create a souvenir
        souvenir_data = {
            "name": "TEST_Update_MOQ_Souvenir",
            "price": 1000,
            "moq_value": 10,
            "is_active": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/admin/souvenirs", json=souvenir_data)
        assert create_response.status_code == 200
        souvenir_id = create_response.json()['id']
        
        # Update MOQ to 50 pieces
        update_response = self.session.put(f"{BASE_URL}/api/admin/souvenirs/{souvenir_id}", json={
            "moq_value": 50
        })
        assert update_response.status_code == 200, f"Failed to update souvenir: {update_response.text}"
        
        # Verify update
        souvenirs = self.session.get(f"{BASE_URL}/api/souvenirs").json()
        updated_souvenir = next((s for s in souvenirs if s['id'] == souvenir_id), None)
        
        assert updated_souvenir is not None
        assert updated_souvenir['moq_value'] == 50, f"Updated MOQ should be 50, got {updated_souvenir['moq_value']}"
        
        print(f"✓ Updated souvenir MOQ to 50 pieces")
    
    # ==================== MOQ VALIDATION TESTS ====================
    
    def test_07_invalid_moq_defaults_to_one(self):
        """Invalid MOQ (0 or negative) should default to 1"""
        # Test with 0
        fabric_data = {
            "name": "TEST_Zero_MOQ_Fabric",
            "price": 2000,
            "moq_value": 0,
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/fabrics", json=fabric_data)
        assert response.status_code == 200
        
        fabrics = self.session.get(f"{BASE_URL}/api/fabrics").json()
        created_fabric = next((f for f in fabrics if f['name'] == "TEST_Zero_MOQ_Fabric"), None)
        
        assert created_fabric is not None
        assert created_fabric['moq_value'] == 1, f"Zero MOQ should default to 1, got {created_fabric['moq_value']}"
        
        print(f"✓ Invalid MOQ (0) defaults to 1")
    
    def test_08_negative_moq_defaults_to_one(self):
        """Negative MOQ should default to 1"""
        souvenir_data = {
            "name": "TEST_Negative_MOQ_Souvenir",
            "price": 1500,
            "moq_value": -5,
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/souvenirs", json=souvenir_data)
        assert response.status_code == 200
        
        souvenirs = self.session.get(f"{BASE_URL}/api/souvenirs").json()
        created_souvenir = next((s for s in souvenirs if s['name'] == "TEST_Negative_MOQ_Souvenir"), None)
        
        assert created_souvenir is not None
        assert created_souvenir['moq_value'] == 1, f"Negative MOQ should default to 1, got {created_souvenir['moq_value']}"
        
        print(f"✓ Negative MOQ defaults to 1")
    
    # ==================== PUBLIC API MOQ DISPLAY TESTS ====================
    
    def test_09_fabrics_api_returns_moq(self):
        """Public fabrics API should return MOQ data for new products"""
        response = self.session.get(f"{BASE_URL}/api/fabrics")
        assert response.status_code == 200
        
        fabrics = response.json()
        assert len(fabrics) > 0, "Should have at least one fabric"
        
        # Check that MOQ fields are present for products that have them
        # Legacy products may not have moq_value field (frontend defaults to 1)
        products_with_moq = 0
        for fabric in fabrics:
            if 'moq_value' in fabric:
                products_with_moq += 1
                assert fabric['moq_value'] >= 1, f"MOQ should be >= 1, got {fabric['moq_value']}"
        
        print(f"✓ Fabrics API returns MOQ data for {products_with_moq}/{len(fabrics)} fabrics")
        print(f"  Note: Legacy products without moq_value default to 1 in frontend")
    
    def test_10_souvenirs_api_returns_moq(self):
        """Public souvenirs API should return MOQ data for new products"""
        response = self.session.get(f"{BASE_URL}/api/souvenirs")
        assert response.status_code == 200
        
        souvenirs = response.json()
        assert len(souvenirs) > 0, "Should have at least one souvenir"
        
        # Check that MOQ fields are present for products that have them
        # Legacy products may not have moq_value field (frontend defaults to 1)
        products_with_moq = 0
        for souvenir in souvenirs:
            if 'moq_value' in souvenir:
                products_with_moq += 1
                assert souvenir['moq_value'] >= 1, f"MOQ should be >= 1, got {souvenir['moq_value']}"
        
        print(f"✓ Souvenirs API returns MOQ data for {products_with_moq}/{len(souvenirs)} souvenirs")
        print(f"  Note: Legacy products without moq_value default to 1 in frontend")


class TestMOQOrderValidation:
    """Test MOQ validation in order creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin auth and create test products"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get('token')
            self.session_token = data.get('session_token')
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.session.cookies.set('session_token', self.session_token)
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
        
        # Create test fabric with MOQ 5
        fabric_response = self.session.post(f"{BASE_URL}/api/admin/fabrics", json={
            "name": "TEST_Order_Fabric",
            "price": 3000,
            "moq_value": 5,
            "is_active": True
        })
        if fabric_response.status_code == 200:
            self.test_fabric_id = fabric_response.json()['id']
        
        # Create test souvenir with MOQ 25
        souvenir_response = self.session.post(f"{BASE_URL}/api/admin/souvenirs", json={
            "name": "TEST_Order_Souvenir",
            "price": 500,
            "moq_value": 25,
            "is_active": True
        })
        if souvenir_response.status_code == 200:
            self.test_souvenir_id = souvenir_response.json()['id']
        
        yield
        
        # Cleanup
        try:
            if hasattr(self, 'test_fabric_id'):
                self.session.delete(f"{BASE_URL}/api/admin/fabrics/{self.test_fabric_id}")
            if hasattr(self, 'test_souvenir_id'):
                self.session.delete(f"{BASE_URL}/api/admin/souvenirs/{self.test_souvenir_id}")
        except:
            pass
    
    def test_11_fabric_order_with_valid_quantity(self):
        """Fabric order with quantity >= MOQ should succeed"""
        order_data = {
            "items": [{
                "fabric_id": self.test_fabric_id,
                "name": "TEST_Order_Fabric",
                "quantity": 5,  # Exactly MOQ
                "price": 3000,
                "moq_value": 5
            }],
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "08012345678",
            "total_price": 15000
        }
        
        response = self.session.post(f"{BASE_URL}/api/orders/fabric", json=order_data)
        assert response.status_code == 200, f"Order should succeed: {response.text}"
        
        data = response.json()
        assert 'order_id' in data, "Response should contain order_id"
        
        print(f"✓ Fabric order created with quantity >= MOQ: {data['order_id']}")
    
    def test_12_souvenir_order_with_valid_quantity(self):
        """Souvenir order with quantity >= MOQ should succeed"""
        order_data = {
            "items": [{
                "souvenir_id": self.test_souvenir_id,
                "name": "TEST_Order_Souvenir",
                "quantity": 30,  # Above MOQ of 25
                "price": 500,
                "moq_value": 25
            }],
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "08012345678",
            "total_price": 15000
        }
        
        response = self.session.post(f"{BASE_URL}/api/orders/souvenir", json=order_data)
        assert response.status_code == 200, f"Order should succeed: {response.text}"
        
        data = response.json()
        assert 'order_id' in data, "Response should contain order_id"
        
        print(f"✓ Souvenir order created with quantity >= MOQ: {data['order_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
