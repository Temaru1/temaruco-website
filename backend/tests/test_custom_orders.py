"""
Test Custom Orders Feature
- POST /api/enquiries/create - creates custom order with order_id in CUS-YYYYMMDD-HHMM format
- GET /api/admin/enquiries - returns counts for all/custom_order/general tabs
- GET /api/admin/enquiries?search=CUS - search by Order ID (case-insensitive, partial match)
- GET /api/admin/enquiries?enquiry_type=custom_order - filter by type
- POST /api/admin/enquiries/{id}/create-full-quote - creates linked quote and updates enquiry status
"""

import pytest
import requests
import os
import re
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bulk-sizing-orders.preview.emergentagent.com').rstrip('/')

# Test data
ADMIN_EMAIL = "superadmin@temaruco.com"
ADMIN_PASSWORD = "superadmin123"


class TestCustomOrdersFeature:
    """Test Custom Orders storage and management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        login_data = login_response.json()
        self.token = login_data.get('token')
        self.session_token = login_data.get('session_token')
        
        # Set auth headers
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}"
        })
        self.session.cookies.set('session_token', self.session_token)
        
        yield
        
        # Cleanup: Delete test enquiries created during tests
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data after tests"""
        try:
            # Get all enquiries and delete TEST_ prefixed ones
            response = self.session.get(f"{BASE_URL}/api/admin/enquiries")
            if response.status_code == 200:
                data = response.json()
                enquiries = data.get('enquiries', []) if isinstance(data, dict) else data
                for enq in enquiries:
                    if enq.get('customer_name', '').startswith('TEST_'):
                        # Note: No delete endpoint exists, so we just log
                        print(f"Test enquiry to clean: {enq.get('order_id')}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def test_01_create_custom_order_returns_order_id(self):
        """Test POST /api/enquiries/create returns order_id in CUS-YYYYMMDD-HHMM format"""
        # Create custom order using multipart form data
        enquiry_data = {
            "order_category": "Corporate Wear",
            "clothing_name": "Corporate Shirt",
            "quantity": 50,
            "fabric_material": "Cotton",
            "colors": ["White", "Blue"],
            "size_type": "Male Sizes",
            "male_sizes": {"S": 10, "M": 20, "L": 15, "XL": 5},
            "female_sizes": {},
            "design_details": "Company logo on left chest",
            "additional_notes": "TEST_Custom order for testing",
            "delivery_address": "123 Test Street, Lagos"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/enquiries/create",
            data={
                "enquiry_data": json.dumps(enquiry_data),
                "customer_name": "TEST_John Doe",
                "customer_email": "test_john@example.com",
                "customer_phone": "+234 800 123 4567"
            }
        )
        
        assert response.status_code == 200, f"Create enquiry failed: {response.text}"
        
        data = response.json()
        
        # Verify order_id is returned
        assert 'order_id' in data, "Response should contain order_id"
        order_id = data['order_id']
        
        # Verify order_id format: CUS-YYYYMMDD-HHMM
        pattern = r'^CUS-\d{8}-\d{4}$'
        assert re.match(pattern, order_id), f"Order ID '{order_id}' should match format CUS-YYYYMMDD-HHMM"
        
        # Verify date part is today's date
        today = datetime.now().strftime('%Y%m%d')
        assert order_id.startswith(f'CUS-{today}'), f"Order ID should start with CUS-{today}"
        
        # Verify other fields
        assert data.get('enquiry_type') == 'custom_order', "enquiry_type should be 'custom_order'"
        assert data.get('customer_name') == 'TEST_John Doe'
        assert data.get('customer_email') == 'test_john@example.com'
        assert data.get('status') == 'pending'
        
        # Store for later tests
        self.created_enquiry_id = data.get('id')
        self.created_order_id = order_id
        
        print(f"✓ Created custom order with order_id: {order_id}")
    
    def test_02_admin_enquiries_returns_counts(self):
        """Test GET /api/admin/enquiries returns counts for all/custom_order/general tabs"""
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries")
        
        assert response.status_code == 200, f"Get enquiries failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert 'enquiries' in data, "Response should contain 'enquiries' array"
        assert 'counts' in data, "Response should contain 'counts' object"
        
        counts = data['counts']
        assert 'all' in counts, "Counts should include 'all'"
        assert 'custom_order' in counts, "Counts should include 'custom_order'"
        assert 'general' in counts, "Counts should include 'general'"
        
        # Verify counts are integers
        assert isinstance(counts['all'], int), "all count should be integer"
        assert isinstance(counts['custom_order'], int), "custom_order count should be integer"
        assert isinstance(counts['general'], int), "general count should be integer"
        
        # Verify all = custom_order + general
        assert counts['all'] == counts['custom_order'] + counts['general'], \
            f"all ({counts['all']}) should equal custom_order ({counts['custom_order']}) + general ({counts['general']})"
        
        print(f"✓ Counts returned: all={counts['all']}, custom_order={counts['custom_order']}, general={counts['general']}")
    
    def test_03_search_by_order_id_case_insensitive(self):
        """Test GET /api/admin/enquiries?search=CUS - search by Order ID (case-insensitive)"""
        # First create a custom order to search for
        enquiry_data = {
            "order_category": "School Uniform",
            "clothing_name": "School Shirt",
            "quantity": 100,
            "fabric_material": "Polyester",
            "colors": ["White"],
            "size_type": "Mixed",
            "male_sizes": {"S": 25, "M": 25},
            "female_sizes": {"S": 25, "M": 25},
            "design_details": "School crest embroidery",
            "additional_notes": "TEST_Search test order"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/enquiries/create",
            data={
                "enquiry_data": json.dumps(enquiry_data),
                "customer_name": "TEST_Search Customer",
                "customer_email": "test_search@example.com",
                "customer_phone": "+234 800 999 8888"
            }
        )
        assert create_response.status_code == 200
        created_order_id = create_response.json().get('order_id')
        
        # Test search with lowercase 'cus'
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries?search=cus")
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        enquiries = data.get('enquiries', [])
        
        # All results should have order_id containing 'CUS' (case-insensitive)
        for enq in enquiries:
            order_id = enq.get('order_id', '')
            assert 'CUS' in order_id.upper(), f"Order ID '{order_id}' should contain 'CUS'"
        
        print(f"✓ Search 'cus' returned {len(enquiries)} results (case-insensitive)")
        
        # Test search with partial order ID
        if created_order_id:
            partial_id = created_order_id[:12]  # e.g., "CUS-20260219"
            response = self.session.get(f"{BASE_URL}/api/admin/enquiries?search={partial_id}")
            assert response.status_code == 200
            
            data = response.json()
            enquiries = data.get('enquiries', [])
            
            # Should find the created order
            found = any(enq.get('order_id') == created_order_id for enq in enquiries)
            assert found, f"Should find order {created_order_id} with partial search '{partial_id}'"
            
            print(f"✓ Partial search '{partial_id}' found the created order")
    
    def test_04_search_by_customer_name(self):
        """Test search by customer name"""
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries?search=TEST_")
        
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        enquiries = data.get('enquiries', [])
        
        # All results should have customer_name containing 'TEST_'
        for enq in enquiries:
            name = enq.get('customer_name', '')
            assert 'TEST_' in name.upper() or 'TEST_' in name, \
                f"Customer name '{name}' should contain 'TEST_'"
        
        print(f"✓ Search by customer name returned {len(enquiries)} results")
    
    def test_05_filter_by_enquiry_type_custom_order(self):
        """Test GET /api/admin/enquiries?enquiry_type=custom_order - filter by type"""
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries?enquiry_type=custom_order")
        
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        data = response.json()
        enquiries = data.get('enquiries', [])
        
        # All results should be custom_order type
        for enq in enquiries:
            assert enq.get('enquiry_type') == 'custom_order', \
                f"Enquiry {enq.get('order_id')} should be custom_order type"
        
        # Verify count matches
        custom_count = data.get('counts', {}).get('custom_order', 0)
        assert len(enquiries) <= custom_count, "Filtered results should not exceed custom_order count"
        
        print(f"✓ Filter by custom_order returned {len(enquiries)} results")
    
    def test_06_filter_by_enquiry_type_general(self):
        """Test GET /api/admin/enquiries?enquiry_type=general - filter by type"""
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries?enquiry_type=general")
        
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        data = response.json()
        enquiries = data.get('enquiries', [])
        
        # All results should be general type or have no enquiry_type
        for enq in enquiries:
            enq_type = enq.get('enquiry_type')
            assert enq_type in ['general', None], \
                f"Enquiry should be general type, got: {enq_type}"
        
        print(f"✓ Filter by general returned {len(enquiries)} results")
    
    def test_07_create_full_quote_from_enquiry(self):
        """Test POST /api/admin/enquiries/{id}/create-full-quote - creates linked quote"""
        # First create a custom order
        enquiry_data = {
            "order_category": "Event Wear",
            "clothing_name": "Event T-Shirt",
            "quantity": 200,
            "fabric_material": "Cotton Blend",
            "colors": ["Red", "Black"],
            "size_type": "Male Sizes",
            "male_sizes": {"S": 40, "M": 80, "L": 60, "XL": 20},
            "female_sizes": {},
            "design_details": "Event logo front and back",
            "additional_notes": "TEST_Quote creation test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/enquiries/create",
            data={
                "enquiry_data": json.dumps(enquiry_data),
                "customer_name": "TEST_Quote Customer",
                "customer_email": "test_quote@example.com",
                "customer_phone": "+234 800 777 6666"
            }
        )
        assert create_response.status_code == 200, f"Create enquiry failed: {create_response.text}"
        
        enquiry = create_response.json()
        enquiry_id = enquiry.get('id')
        order_id = enquiry.get('order_id')
        
        # Create quote from enquiry
        quote_data = {
            "unit_price": 5000,
            "additional_cost": 10000,
            "discount": 5000,
            "estimated_production_days": 14,
            "quote_expiry_date": "2026-03-01",
            "notes_to_customer": "Thank you for your order. Production will begin upon payment confirmation."
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/enquiries/{enquiry_id}/create-full-quote",
            json=quote_data
        )
        
        assert response.status_code == 200, f"Create quote failed: {response.text}"
        
        data = response.json()
        
        # Verify response
        assert 'quote' in data, "Response should contain 'quote'"
        assert 'quote_number' in data, "Response should contain 'quote_number'"
        
        quote = data['quote']
        quote_number = data['quote_number']
        
        # Verify quote number format: QT-MMYY-DDXXXX
        pattern = r'^QT-\d{4}-\d{6}$'
        assert re.match(pattern, quote_number), f"Quote number '{quote_number}' should match format QT-MMYY-DDXXXX"
        
        # Verify quote details
        assert quote.get('linked_enquiry_id') == enquiry_id, "Quote should be linked to enquiry"
        assert quote.get('linked_order_id') == order_id, "Quote should have linked order_id"
        assert quote.get('client_name') == 'TEST_Quote Customer'
        assert quote.get('unit_price') == 5000
        
        # Verify total calculation: (unit_price * quantity) + additional_cost - discount
        expected_total = (5000 * 200) + 10000 - 5000  # 1,005,000
        assert quote.get('total') == expected_total, f"Total should be {expected_total}, got {quote.get('total')}"
        
        print(f"✓ Created quote {quote_number} linked to order {order_id}")
        
        # Verify enquiry status was updated
        get_response = self.session.get(f"{BASE_URL}/api/admin/enquiries/{enquiry_id}")
        assert get_response.status_code == 200
        
        updated_enquiry = get_response.json()
        assert updated_enquiry.get('status') == 'Quote Created', \
            f"Enquiry status should be 'Quote Created', got: {updated_enquiry.get('status')}"
        assert updated_enquiry.get('linked_quote_id') == quote.get('id'), \
            "Enquiry should have linked_quote_id"
        
        print(f"✓ Enquiry status updated to 'Quote Created'")
    
    def test_08_search_by_phone_number(self):
        """Test search by customer phone number"""
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries?search=800")
        
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        enquiries = data.get('enquiries', [])
        
        # Results should include enquiries with phone containing '800'
        if enquiries:
            has_phone_match = any('800' in enq.get('customer_phone', '') for enq in enquiries)
            print(f"✓ Search by phone '800' returned {len(enquiries)} results, phone match: {has_phone_match}")
        else:
            print("✓ Search by phone returned 0 results (no matching data)")
    
    def test_09_search_by_email(self):
        """Test search by customer email"""
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries?search=test_")
        
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        enquiries = data.get('enquiries', [])
        
        print(f"✓ Search by email prefix 'test_' returned {len(enquiries)} results")
    
    def test_10_enquiry_contains_all_required_fields(self):
        """Test that created enquiry contains all required fields"""
        enquiry_data = {
            "order_category": "Traditional Wear",
            "clothing_name": "Agbada",
            "quantity": 10,
            "fabric_material": "Aso-Oke",
            "colors": ["Gold", "White"],
            "size_type": "Male Sizes",
            "male_sizes": {"M": 5, "L": 5},
            "female_sizes": {},
            "design_details": "Traditional embroidery pattern",
            "additional_notes": "TEST_Field validation test",
            "delivery_address": "456 Test Avenue, Abuja"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/enquiries/create",
            data={
                "enquiry_data": json.dumps(enquiry_data),
                "customer_name": "TEST_Field Validator",
                "customer_email": "test_fields@example.com",
                "customer_phone": "+234 800 555 4444"
            }
        )
        
        assert response.status_code == 200, f"Create enquiry failed: {response.text}"
        
        data = response.json()
        
        # Verify all required fields are present
        required_fields = [
            'id', 'order_id', 'enquiry_code', 'enquiry_type',
            'customer_name', 'customer_email', 'customer_phone',
            'order_category', 'clothing_name', 'quantity',
            'fabric_material', 'colors', 'size_type',
            'status', 'created_at'
        ]
        
        for field in required_fields:
            assert field in data, f"Response should contain '{field}'"
        
        # Verify field values
        assert data['customer_name'] == 'TEST_Field Validator'
        assert data['customer_email'] == 'test_fields@example.com'
        assert data['customer_phone'] == '+234 800 555 4444'
        assert data['order_category'] == 'Traditional Wear'
        assert data['clothing_name'] == 'Agbada'
        assert data['quantity'] == 10
        assert data['fabric_material'] == 'Aso-Oke'
        assert data['colors'] == ['Gold', 'White']
        assert data['delivery_address'] == '456 Test Avenue, Abuja'
        
        print(f"✓ All required fields present and validated")
    
    def test_11_update_enquiry_status(self):
        """Test PATCH /api/admin/enquiries/{id}/status - update status"""
        # First create an enquiry
        enquiry_data = {
            "order_category": "Sports Wear",
            "clothing_name": "Jersey",
            "quantity": 30,
            "fabric_material": "Polyester",
            "colors": ["Green"],
            "size_type": "Male Sizes",
            "male_sizes": {"M": 15, "L": 15},
            "female_sizes": {},
            "design_details": "Team logo",
            "additional_notes": "TEST_Status update test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/enquiries/create",
            data={
                "enquiry_data": json.dumps(enquiry_data),
                "customer_name": "TEST_Status Tester",
                "customer_email": "test_status@example.com",
                "customer_phone": "+234 800 333 2222"
            }
        )
        assert create_response.status_code == 200
        
        enquiry_id = create_response.json().get('id')
        
        # Update status to 'reviewed'
        response = self.session.patch(
            f"{BASE_URL}/api/admin/enquiries/{enquiry_id}/status",
            json={"status": "reviewed"}
        )
        
        assert response.status_code == 200, f"Status update failed: {response.text}"
        
        # Verify status was updated
        get_response = self.session.get(f"{BASE_URL}/api/admin/enquiries/{enquiry_id}")
        assert get_response.status_code == 200
        
        updated = get_response.json()
        assert updated.get('status') == 'reviewed', f"Status should be 'reviewed', got: {updated.get('status')}"
        
        print(f"✓ Status updated to 'reviewed'")
    
    def test_12_get_single_enquiry_details(self):
        """Test GET /api/admin/enquiries/{id} - get single enquiry"""
        # First create an enquiry
        enquiry_data = {
            "order_category": "Casual Wear",
            "clothing_name": "Hoodie",
            "quantity": 25,
            "fabric_material": "Fleece",
            "colors": ["Black", "Gray"],
            "size_type": "Mixed",
            "male_sizes": {"M": 10, "L": 5},
            "female_sizes": {"S": 5, "M": 5},
            "design_details": "Custom print design",
            "additional_notes": "TEST_Single enquiry test"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/enquiries/create",
            data={
                "enquiry_data": json.dumps(enquiry_data),
                "customer_name": "TEST_Single Enquiry",
                "customer_email": "test_single@example.com",
                "customer_phone": "+234 800 111 0000"
            }
        )
        assert create_response.status_code == 200
        
        enquiry_id = create_response.json().get('id')
        
        # Get single enquiry
        response = self.session.get(f"{BASE_URL}/api/admin/enquiries/{enquiry_id}")
        
        assert response.status_code == 200, f"Get enquiry failed: {response.text}"
        
        data = response.json()
        
        # Verify it's the correct enquiry
        assert data.get('id') == enquiry_id
        assert data.get('customer_name') == 'TEST_Single Enquiry'
        
        print(f"✓ Retrieved single enquiry details for {enquiry_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
