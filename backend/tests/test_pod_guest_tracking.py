"""
Test suite for POD Guest Tracking System (Stateless Design Upload Flow)
Tests the following features:
1. POD design upload returns temp_design_id and saves with status='unassigned'
2. POD link-design endpoint links design to contact and updates status='assigned'
3. Admin API returns correct counts for assigned vs unassigned designs
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "superadmin@temaruco.com"
ADMIN_PASSWORD = "superadmin123"


class TestPODUploadDesign:
    """Test /api/pod/upload-design endpoint - stateless design upload"""
    
    def test_upload_design_returns_temp_design_id(self):
        """Test that uploading a design returns temp_design_id and status='unassigned'"""
        # Create a simple test image (1x1 pixel PNG)
        test_image = io.BytesIO()
        # Minimal PNG file (1x1 transparent pixel)
        test_image.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
        test_image.seek(0)
        
        files = {'design_file': ('test_design.png', test_image, 'image/png')}
        data = {
            'product_id': 'tshirt',
            'item_type': 'T-Shirt'
        }
        
        response = requests.post(f"{BASE_URL}/api/pod/upload-design", files=files, data=data)
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        result = response.json()
        assert 'temp_design_id' in result, "Response should contain temp_design_id"
        assert result['temp_design_id'].startswith('design_'), f"temp_design_id should start with 'design_', got {result['temp_design_id']}"
        assert result['status'] == 'unassigned', f"Status should be 'unassigned', got {result['status']}"
        assert 'original_file_url' in result, "Response should contain original_file_url"
        assert result['original_file_url'].startswith('/api/uploads/designs/original/'), "original_file_url should be a valid path"
        
        # Store for cleanup
        self.temp_design_id = result['temp_design_id']
        print(f"✓ Upload design test passed: temp_design_id={result['temp_design_id']}")
        
        return result['temp_design_id']
    
    def test_upload_design_without_file_fails(self):
        """Test that uploading without a file returns 422"""
        data = {
            'product_id': 'tshirt',
            'item_type': 'T-Shirt'
        }
        
        response = requests.post(f"{BASE_URL}/api/pod/upload-design", data=data)
        
        # Should fail with 422 (validation error)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Upload without file correctly returns 422")


class TestPODLinkDesign:
    """Test /api/pod/link-design endpoint - linking design to contact"""
    
    def test_link_design_to_contact(self):
        """Test that linking a design to contact updates status to 'assigned'"""
        # First, upload a design
        test_image = io.BytesIO()
        test_image.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
        test_image.seek(0)
        
        files = {'design_file': ('test_link.png', test_image, 'image/png')}
        data = {'product_id': 'hoodie', 'item_type': 'Hoodie'}
        
        upload_response = requests.post(f"{BASE_URL}/api/pod/upload-design", files=files, data=data)
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        temp_design_id = upload_response.json()['temp_design_id']
        print(f"  Uploaded design: {temp_design_id}")
        
        # Now link the design to a contact
        link_data = {
            'temp_design_id': temp_design_id,
            'name': 'TEST_John Doe',
            'email': 'test_john.doe@example.com',
            'phone': '+2341234567890'
        }
        
        link_response = requests.post(f"{BASE_URL}/api/pod/link-design", json=link_data)
        
        # Status code assertion
        assert link_response.status_code == 200, f"Expected 200, got {link_response.status_code}: {link_response.text}"
        
        # Data assertions
        result = link_response.json()
        assert result['status'] == 'assigned', f"Status should be 'assigned', got {result['status']}"
        assert 'contact_id' in result, "Response should contain contact_id"
        assert result['contact_id'].startswith('contact_'), f"contact_id should start with 'contact_', got {result['contact_id']}"
        assert result['design_id'] == temp_design_id, "design_id should match temp_design_id"
        
        print(f"✓ Link design test passed: design {temp_design_id} linked to contact {result['contact_id']}")
        
        return temp_design_id, result['contact_id']
    
    def test_link_design_without_temp_design_id_fails(self):
        """Test that linking without temp_design_id returns 400"""
        link_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'phone': '+2341234567890'
        }
        
        response = requests.post(f"{BASE_URL}/api/pod/link-design", json=link_data)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert 'temp_design_id' in response.json().get('detail', '').lower(), "Error should mention temp_design_id"
        print("✓ Link without temp_design_id correctly returns 400")
    
    def test_link_design_without_email_fails(self):
        """Test that linking without email returns 400"""
        link_data = {
            'temp_design_id': 'design_fake123',
            'name': 'Test User',
            'phone': '+2341234567890'
        }
        
        response = requests.post(f"{BASE_URL}/api/pod/link-design", json=link_data)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Link without email correctly returns 400")
    
    def test_link_nonexistent_design_fails(self):
        """Test that linking a non-existent design returns 404"""
        link_data = {
            'temp_design_id': 'design_nonexistent123456',
            'name': 'Test User',
            'email': 'test@example.com',
            'phone': '+2341234567890'
        }
        
        response = requests.post(f"{BASE_URL}/api/pod/link-design", json=link_data)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Link non-existent design correctly returns 404")


class TestAdminGuestDesignsAPI:
    """Test /api/admin/pod/guest-designs endpoint - admin dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup_admin_session(self):
        """Login as admin and get session token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': ADMIN_EMAIL,
            'password': ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.text}")
        
        self.session_token = login_response.json().get('session_token')
        self.cookies = {'session_token': self.session_token}
        print(f"  Admin logged in successfully")
    
    def test_admin_get_all_designs(self):
        """Test admin can get all guest designs"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert 'designs' in result, "Response should contain 'designs' array"
        assert 'assigned_count' in result, "Response should contain 'assigned_count'"
        assert 'unassigned_count' in result, "Response should contain 'unassigned_count'"
        assert 'total' in result, "Response should contain 'total'"
        assert 'pages' in result, "Response should contain 'pages'"
        
        # Verify counts are integers
        assert isinstance(result['assigned_count'], int), "assigned_count should be integer"
        assert isinstance(result['unassigned_count'], int), "unassigned_count should be integer"
        
        print(f"✓ Admin get all designs: total={result['total']}, assigned={result['assigned_count']}, unassigned={result['unassigned_count']}")
    
    def test_admin_filter_assigned_designs(self):
        """Test admin can filter by status='assigned'"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            params={'status': 'assigned'},
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        
        # All returned designs should be assigned
        for design in result['designs']:
            assert design.get('status') == 'assigned' or design.get('is_assigned') == True, \
                f"Design {design.get('id')} should be assigned"
        
        print(f"✓ Admin filter assigned: {len(result['designs'])} designs returned")
    
    def test_admin_filter_unassigned_designs(self):
        """Test admin can filter by status='unassigned'"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            params={'status': 'unassigned'},
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        
        # All returned designs should be unassigned
        for design in result['designs']:
            status = design.get('status')
            assert status in ['unassigned', 'uploaded', None] or design.get('is_assigned') == False, \
                f"Design {design.get('id')} should be unassigned, got status={status}"
        
        print(f"✓ Admin filter unassigned: {len(result['designs'])} designs returned")
    
    def test_admin_counts_match_filters(self):
        """Test that assigned_count and unassigned_count match filtered results"""
        # Get all designs
        all_response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            cookies=self.cookies
        )
        assert all_response.status_code == 200
        all_result = all_response.json()
        
        assigned_count = all_result['assigned_count']
        unassigned_count = all_result['unassigned_count']
        
        # Get assigned designs
        assigned_response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            params={'status': 'assigned', 'limit': 1000},
            cookies=self.cookies
        )
        assert assigned_response.status_code == 200
        assigned_result = assigned_response.json()
        
        # Get unassigned designs
        unassigned_response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            params={'status': 'unassigned', 'limit': 1000},
            cookies=self.cookies
        )
        assert unassigned_response.status_code == 200
        unassigned_result = unassigned_response.json()
        
        # Verify counts match
        assert assigned_result['total'] == assigned_count, \
            f"Assigned count mismatch: header={assigned_count}, filtered={assigned_result['total']}"
        assert unassigned_result['total'] == unassigned_count, \
            f"Unassigned count mismatch: header={unassigned_count}, filtered={unassigned_result['total']}"
        
        print(f"✓ Counts match: assigned={assigned_count}, unassigned={unassigned_count}")


class TestFullGuestTrackingFlow:
    """End-to-end test of the complete guest tracking flow"""
    
    def test_complete_flow_upload_then_link(self):
        """Test complete flow: upload design -> link to contact -> verify in admin"""
        # Step 1: Upload design (stateless - no contact info)
        test_image = io.BytesIO()
        test_image.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
        test_image.seek(0)
        
        files = {'design_file': ('test_flow.png', test_image, 'image/png')}
        data = {'product_id': 'polo', 'item_type': 'Polo Shirt'}
        
        upload_response = requests.post(f"{BASE_URL}/api/pod/upload-design", files=files, data=data)
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        upload_result = upload_response.json()
        temp_design_id = upload_result['temp_design_id']
        assert upload_result['status'] == 'unassigned', "Initial status should be 'unassigned'"
        print(f"  Step 1: Uploaded design {temp_design_id} with status='unassigned'")
        
        # Step 2: Login as admin and verify design is unassigned
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            'email': ADMIN_EMAIL,
            'password': ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        cookies = {'session_token': login_response.json()['session_token']}
        
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            params={'status': 'unassigned'},
            cookies=cookies
        )
        assert admin_response.status_code == 200
        
        # Find our design in unassigned list
        unassigned_designs = admin_response.json()['designs']
        our_design = next((d for d in unassigned_designs if d['id'] == temp_design_id), None)
        assert our_design is not None, f"Design {temp_design_id} should be in unassigned list"
        print(f"  Step 2: Verified design is in unassigned list")
        
        # Step 3: Link design to contact
        link_data = {
            'temp_design_id': temp_design_id,
            'name': 'TEST_Flow User',
            'email': 'test_flow_user@example.com',
            'phone': '+2349876543210'
        }
        
        link_response = requests.post(f"{BASE_URL}/api/pod/link-design", json=link_data)
        assert link_response.status_code == 200, f"Link failed: {link_response.text}"
        
        link_result = link_response.json()
        assert link_result['status'] == 'assigned', "Status should be 'assigned' after linking"
        contact_id = link_result['contact_id']
        print(f"  Step 3: Linked design to contact {contact_id}")
        
        # Step 4: Verify design is now in assigned list
        assigned_response = requests.get(
            f"{BASE_URL}/api/admin/pod/guest-designs",
            params={'status': 'assigned'},
            cookies=cookies
        )
        assert assigned_response.status_code == 200
        
        assigned_designs = assigned_response.json()['designs']
        our_design = next((d for d in assigned_designs if d['id'] == temp_design_id), None)
        assert our_design is not None, f"Design {temp_design_id} should be in assigned list"
        assert our_design.get('guest_email') == 'test_flow_user@example.com', "Guest email should be set"
        assert our_design.get('guest_name') == 'TEST_Flow User', "Guest name should be set"
        print(f"  Step 4: Verified design is in assigned list with contact info")
        
        print(f"✓ Complete flow test passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
