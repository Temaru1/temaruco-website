"""
Test suite for File Manager and Souvenir Suppliers endpoints
Tests CRUD operations for souvenir suppliers and file management APIs
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "superadmin@temaruco.com"
ADMIN_PASSWORD = "superadmin123"


class TestSetup:
    """Setup and helper functions"""
    
    @staticmethod
    def get_auth_session():
        """Get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.status_code}")
        
        return session


# ==================== SOUVENIR SUPPLIERS TESTS ====================

class TestSouvenirSuppliersAPI:
    """Test Souvenir Suppliers CRUD endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Authenticated session fixture"""
        return TestSetup.get_auth_session()
    
    def test_01_get_souvenir_suppliers_endpoint(self, session):
        """Test GET /api/admin/souvenir-suppliers returns list and counts"""
        response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'suppliers' in data, "Response should contain 'suppliers' key"
        assert 'counts' in data, "Response should contain 'counts' key"
        assert 'all' in data['counts'], "Counts should include 'all'"
        assert 'active' in data['counts'], "Counts should include 'active'"
        assert 'inactive' in data['counts'], "Counts should include 'inactive'"
        
        print(f"PASS - Souvenir suppliers endpoint returns suppliers list with counts: {data['counts']}")
    
    def test_02_create_souvenir_supplier(self, session):
        """Test POST /api/admin/souvenir-suppliers creates new supplier"""
        supplier_data = {
            "company_name": "TEST_Souvenir Gifts Ltd",
            "contact_person": "Test Contact Person",
            "phone_number": "+234-999-TEST-123",
            "whatsapp_number": "+234-999-TEST-456",
            "email": "test.supplier@example.com",
            "address": "123 Test Street",
            "city": "Lagos",
            "state": "Lagos State",
            "country": "Nigeria",
            "products_supplied": "Keychains, Mugs, T-shirts, Caps",
            "notes": "Test supplier for automated testing",
            "status": "active"
        }
        
        response = session.post(f"{BASE_URL}/api/admin/souvenir-suppliers", json=supplier_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'supplier' in data, "Response should contain 'supplier' key"
        assert data['supplier']['company_name'] == supplier_data['company_name']
        assert data['supplier']['phone_number'] == supplier_data['phone_number']
        assert 'supplier_id' in data['supplier'], "Supplier should have a supplier_id"
        assert 'id' in data['supplier'], "Supplier should have an id"
        
        # Store for later tests
        TestSouvenirSuppliersAPI.created_supplier_id = data['supplier']['id']
        TestSouvenirSuppliersAPI.created_supplier_sid = data['supplier']['supplier_id']
        
        print(f"PASS - Created souvenir supplier with ID: {data['supplier']['supplier_id']}")
    
    def test_03_get_single_supplier(self, session):
        """Test GET /api/admin/souvenir-suppliers/{id} returns single supplier"""
        supplier_id = getattr(TestSouvenirSuppliersAPI, 'created_supplier_id', None)
        if not supplier_id:
            pytest.skip("No supplier created in previous test")
        
        response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers/{supplier_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data['company_name'] == "TEST_Souvenir Gifts Ltd"
        assert data['status'] == 'active'
        
        print(f"PASS - Retrieved single supplier: {data['company_name']}")
    
    def test_04_search_suppliers_by_company_name(self, session):
        """Test search functionality for souvenir suppliers"""
        response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers?search=TEST_Souvenir")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should find our test supplier
        suppliers = data['suppliers']
        found = any(s['company_name'] == "TEST_Souvenir Gifts Ltd" for s in suppliers)
        assert found, "Search should find the test supplier"
        
        print(f"PASS - Search by company name works, found {len(suppliers)} supplier(s)")
    
    def test_05_search_suppliers_by_phone(self, session):
        """Test search by phone number"""
        response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers?search=999-TEST")
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"PASS - Search by phone returns {len(data['suppliers'])} supplier(s)")
    
    def test_06_filter_suppliers_by_status_active(self, session):
        """Test filter by active status"""
        response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers?status=active")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned suppliers should be active
        for supplier in data['suppliers']:
            assert supplier['status'] == 'active', f"All suppliers should be active, found: {supplier['status']}"
        
        print(f"PASS - Filter by status=active returns {len(data['suppliers'])} active suppliers")
    
    def test_07_update_supplier(self, session):
        """Test PUT /api/admin/souvenir-suppliers/{id} updates supplier"""
        supplier_id = getattr(TestSouvenirSuppliersAPI, 'created_supplier_id', None)
        if not supplier_id:
            pytest.skip("No supplier created in previous test")
        
        update_data = {
            "company_name": "TEST_Updated Souvenir Company",
            "contact_person": "Updated Contact",
            "notes": "Updated via automated testing"
        }
        
        response = session.put(f"{BASE_URL}/api/admin/souvenir-suppliers/{supplier_id}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update persisted
        get_response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers/{supplier_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data['company_name'] == "TEST_Updated Souvenir Company"
        assert data['contact_person'] == "Updated Contact"
        assert data['notes'] == "Updated via automated testing"
        
        print(f"PASS - Supplier updated successfully: {data['company_name']}")
    
    def test_08_delete_supplier_soft_delete(self, session):
        """Test DELETE /api/admin/souvenir-suppliers/{id} soft deletes (deactivates) supplier"""
        supplier_id = getattr(TestSouvenirSuppliersAPI, 'created_supplier_id', None)
        if not supplier_id:
            pytest.skip("No supplier created in previous test")
        
        response = session.delete(f"{BASE_URL}/api/admin/souvenir-suppliers/{supplier_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify soft delete - supplier should still exist but be inactive
        get_response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers/{supplier_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data['status'] == 'inactive', f"Supplier should be inactive after delete, got: {data['status']}"
        
        print(f"PASS - Supplier soft deleted (status: inactive)")
    
    def test_09_filter_suppliers_by_status_inactive(self, session):
        """Test filter by inactive status"""
        response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers?status=inactive")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned suppliers should be inactive
        for supplier in data['suppliers']:
            assert supplier['status'] == 'inactive'
        
        print(f"PASS - Filter by status=inactive returns {len(data['suppliers'])} inactive suppliers")


# ==================== FILE MANAGER TESTS ====================

class TestFileManagerAPI:
    """Test File Manager endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Authenticated session fixture"""
        return TestSetup.get_auth_session()
    
    def test_10_get_files_endpoint(self, session):
        """Test GET /api/admin/files returns files and stats"""
        response = session.get(f"{BASE_URL}/api/admin/files")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'files' in data, "Response should contain 'files' key"
        assert 'stats' in data, "Response should contain 'stats' key"
        
        # Verify stats structure
        stats = data['stats']
        assert 'total' in stats, "Stats should include 'total'"
        assert 'local' in stats, "Stats should include 'local'"
        assert 'supabase' in stats, "Stats should include 'supabase'"
        assert 'images' in stats, "Stats should include 'images'"
        assert 'documents' in stats, "Stats should include 'documents'"
        assert 'total_size_formatted' in stats, "Stats should include 'total_size_formatted'"
        
        print(f"PASS - File manager returns {stats['total']} files ({stats['local']} local, {stats['supabase']} cloud)")
    
    def test_11_filter_files_by_type_image(self, session):
        """Test filter files by type=image"""
        response = session.get(f"{BASE_URL}/api/admin/files?file_type=image")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned files should be images
        for file in data['files']:
            assert file['type'] == 'image', f"All files should be images, found: {file['type']}"
        
        print(f"PASS - Filter by type=image returns {len(data['files'])} images")
    
    def test_12_filter_files_by_type_document(self, session):
        """Test filter files by type=document"""
        response = session.get(f"{BASE_URL}/api/admin/files?file_type=document")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned files should be documents
        for file in data['files']:
            assert file['type'] == 'document', f"All files should be documents, found: {file['type']}"
        
        print(f"PASS - Filter by type=document returns {len(data['files'])} documents")
    
    def test_13_filter_files_by_source_local(self, session):
        """Test filter files by source=local"""
        response = session.get(f"{BASE_URL}/api/admin/files?source=local")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned files should be local
        for file in data['files']:
            assert file['source'] == 'local', f"All files should be local, found: {file['source']}"
        
        print(f"PASS - Filter by source=local returns {len(data['files'])} local files")
    
    def test_14_filter_files_by_source_supabase(self, session):
        """Test filter files by source=supabase"""
        response = session.get(f"{BASE_URL}/api/admin/files?source=supabase")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned files should be from supabase
        for file in data['files']:
            assert file['source'] == 'supabase', f"All files should be supabase, found: {file['source']}"
        
        print(f"PASS - Filter by source=supabase returns {len(data['files'])} cloud files")
    
    def test_15_search_files(self, session):
        """Test search files by name"""
        response = session.get(f"{BASE_URL}/api/admin/files?search=test")
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"PASS - Search files returns {len(data['files'])} results")
    
    def test_16_file_data_structure(self, session):
        """Test file data structure contains all required fields"""
        response = session.get(f"{BASE_URL}/api/admin/files")
        
        assert response.status_code == 200
        data = response.json()
        
        if data['files']:
            file = data['files'][0]
            required_fields = ['id', 'name', 'path', 'folder', 'size', 'size_formatted', 'type', 'extension', 'source']
            
            for field in required_fields:
                assert field in file, f"File should contain '{field}' field"
            
            print(f"PASS - File data structure contains all required fields: {list(file.keys())}")
        else:
            print("PASS - No files to verify structure (empty list)")
    
    def test_17_combined_filters(self, session):
        """Test combined filters (type + source)"""
        response = session.get(f"{BASE_URL}/api/admin/files?file_type=image&source=local")
        
        assert response.status_code == 200
        data = response.json()
        
        # All files should match both filters
        for file in data['files']:
            assert file['type'] == 'image' and file['source'] == 'local'
        
        print(f"PASS - Combined filters return {len(data['files'])} local images")


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_99_cleanup_test_suppliers(self):
        """Clean up TEST_ prefixed suppliers"""
        session = TestSetup.get_auth_session()
        
        # Get all suppliers with TEST_ prefix
        response = session.get(f"{BASE_URL}/api/admin/souvenir-suppliers?search=TEST_")
        
        if response.status_code == 200:
            data = response.json()
            for supplier in data['suppliers']:
                if supplier['company_name'].startswith('TEST_'):
                    # Delete the test supplier
                    session.delete(f"{BASE_URL}/api/admin/souvenir-suppliers/{supplier['id']}")
                    print(f"Cleaned up: {supplier['company_name']}")
        
        print("PASS - Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
