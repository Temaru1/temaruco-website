"""
Comprehensive API Tests for Temaruco E-commerce Platform
Tests: Health, Auth, Admin Dashboard, Email Marketing, Site Texts, Guest Designs, Products, POD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://guest-tracker-40.preview.emergentagent.com')

class TestHealthAndBasics:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        assert data.get('database') == 'connected'
        print(f"✓ Health check passed: {data}")

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data or 'access_token' in data
        assert 'user' in data
        print(f"✓ Admin login successful: {data.get('user', {}).get('email', 'N/A')}")
        return data
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
        print("✓ Invalid credentials correctly rejected")

class TestAdminDashboard:
    """Admin dashboard API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip("Admin login failed")
    
    def test_admin_dashboard(self, auth_token):
        """Test admin dashboard endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert 'today_stats' in data or 'recent_orders' in data
        print(f"✓ Admin dashboard loaded: {list(data.keys())}")
    
    def test_admin_orders(self, auth_token):
        """Test admin orders endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin orders loaded: {len(data)} orders")

class TestEmailMarketing:
    """Email Marketing System API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip("Admin login failed")
    
    def test_email_analytics(self, auth_token):
        """Test email analytics endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/email/analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert 'emails' in data or 'subscribers' in data or 'campaigns' in data
        print(f"✓ Email analytics loaded: {list(data.keys())}")
    
    def test_email_settings(self, auth_token):
        """Test email settings endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/email/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Email settings loaded: SMTP host={data.get('smtp_host', 'N/A')}")
    
    def test_email_templates(self, auth_token):
        """Test email templates endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/email/templates", headers=headers)
        assert response.status_code == 200
        data = response.json()
        templates = data.get('templates', [])
        print(f"✓ Email templates loaded: {len(templates)} templates")
    
    def test_email_subscribers(self, auth_token):
        """Test email subscribers endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/email/subscribers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        subscribers = data.get('subscribers', [])
        total = data.get('total', 0)
        print(f"✓ Email subscribers loaded: {len(subscribers)} subscribers (total: {total})")
    
    def test_email_campaigns(self, auth_token):
        """Test email campaigns endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/email/campaigns", headers=headers)
        assert response.status_code == 200
        data = response.json()
        campaigns = data.get('campaigns', [])
        print(f"✓ Email campaigns loaded: {len(campaigns)} campaigns")
    
    def test_email_logs(self, auth_token):
        """Test email logs endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/email/logs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        logs = data.get('logs', [])
        print(f"✓ Email logs loaded: {len(logs)} logs")

class TestSiteTexts:
    """Site Texts CMS API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip("Admin login failed")
    
    def test_get_site_texts(self):
        """Test public site texts endpoint"""
        response = requests.get(f"{BASE_URL}/api/site-texts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Site texts loaded: {len(data)} text entries")
    
    def test_admin_site_texts(self, auth_token):
        """Test admin site texts endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/site-texts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Admin site texts loaded: {len(data)} entries")

class TestGuestDesigns:
    """Guest Designs API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip("Admin login failed")
    
    def test_admin_guest_designs(self, auth_token):
        """Test admin guest designs endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guest-designs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        designs = data.get('designs', [])
        assigned_count = data.get('assigned_count', 0)
        unassigned_count = data.get('unassigned_count', 0)
        print(f"✓ Guest designs loaded: {len(designs)} designs (assigned: {assigned_count}, unassigned: {unassigned_count})")
    
    def test_admin_guest_designs_filter_assigned(self, auth_token):
        """Test guest designs filter by assigned status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guest-designs?status=assigned", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Assigned designs filter works: {len(data.get('designs', []))} designs")
    
    def test_admin_guest_designs_filter_unassigned(self, auth_token):
        """Test guest designs filter by unassigned status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/guest-designs?status=unassigned", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Unassigned designs filter works: {len(data.get('designs', []))} designs")

class TestProducts:
    """Products API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip("Admin login failed")
    
    def test_boutique_products(self):
        """Test public boutique products endpoint"""
        response = requests.get(f"{BASE_URL}/api/boutique/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Boutique products loaded: {len(data)} products")
    
    def test_fabrics_products(self):
        """Test public fabrics products endpoint"""
        response = requests.get(f"{BASE_URL}/api/fabrics")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fabrics products loaded: {len(data)} products")
    
    def test_souvenirs_products(self):
        """Test public souvenirs products endpoint"""
        response = requests.get(f"{BASE_URL}/api/souvenirs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Souvenirs products loaded: {len(data)} products")
    
    def test_admin_all_products(self, auth_token):
        """Test admin all products endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/all-products", headers=headers)
        assert response.status_code == 200
        data = response.json()
        products = data.get('products', [])
        print(f"✓ Admin all products loaded: {len(products)} products")
    
    def test_admin_all_products_filter_boutique(self, auth_token):
        """Test admin products filter by boutique type"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/all-products?type=boutique", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Boutique products filter works: {len(data.get('products', []))} products")

class TestPOD:
    """Print-on-Demand API tests"""
    
    def test_pod_clothing_items(self):
        """Test POD clothing items endpoint"""
        response = requests.get(f"{BASE_URL}/api/pod/clothing-items")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ POD clothing items loaded: {len(data)} items")
        if len(data) > 0:
            item = data[0]
            assert 'name' in item or 'id' in item
            print(f"  Sample item: {item.get('name', item.get('id', 'N/A'))}")

class TestOrderTracking:
    """Order tracking API tests"""
    
    def test_track_order_invalid(self):
        """Test order tracking with invalid order ID"""
        response = requests.get(f"{BASE_URL}/api/orders/track/INVALID-ORDER-ID")
        assert response.status_code in [404, 400]
        print("✓ Invalid order tracking correctly returns error")

class TestCategories:
    """Categories API tests"""
    
    def test_get_categories(self):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Categories loaded: {len(data)} categories")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
