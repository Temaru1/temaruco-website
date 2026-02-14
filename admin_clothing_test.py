#!/usr/bin/env python3
"""
Admin Clothing Items Management Testing
Tests image upload, CRUD operations for POD and Bulk clothing items
"""

import requests
import sys
import json
import io
from datetime import datetime
from typing import Dict, Any, Optional

class AdminClothingTester:
    def __init__(self, base_url="https://temaru-web-clone.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_items = []  # Track created items for cleanup

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append(f"{test_name}: {details}")
            print(f"❌ {test_name} - FAILED: {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    files: Optional[Dict] = None, headers: Optional[Dict] = None, 
                    cookies: Optional[Dict] = None) -> tuple[bool, Dict, int]:
        """Make HTTP request and return success, response data, status code"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        request_headers = {}
        if headers:
            request_headers.update(headers)
        
        # Add authorization
        if self.admin_token:
            request_headers['Authorization'] = f'Bearer {self.admin_token}'
        
        # Add cookies for session-based auth
        request_cookies = {}
        if self.session_token:
            request_cookies['session_token'] = self.session_token
        if cookies:
            request_cookies.update(cookies)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, cookies=request_cookies, timeout=30)
            elif method == 'POST':
                if files:
                    # For file uploads, don't set Content-Type
                    response = requests.post(url, data=data, files=files, headers=request_headers, cookies=request_cookies, timeout=30)
                else:
                    request_headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=request_headers, cookies=request_cookies, timeout=30)
            elif method == 'PUT':
                request_headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=request_headers, cookies=request_cookies, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, cookies=request_cookies, timeout=30)
            else:
                return False, {}, 0

            try:
                response_data = response.json() if response.content else {}
            except json.JSONDecodeError:
                response_data = {'raw_response': response.text}

            return response.status_code < 400, response_data, response.status_code

        except requests.exceptions.RequestException as e:
            return False, {'error': str(e)}, 0

    def test_admin_login(self):
        """Test admin login functionality"""
        print("\n🔐 Testing Admin Login...")
        
        login_data = {
            "email": "superadmin@temaruco.com",
            "password": "superadmin123"
        }
        
        success, data, status = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'token' in data:
            self.admin_token = data['token']
            self.session_token = data.get('session_token')
            self.log_result("Admin Login", True)
            print(f"   Logged in as: {data.get('user', {}).get('email', 'Unknown')}")
            print(f"   Is Admin: {data.get('user', {}).get('is_admin', False)}")
            print(f"   Is Super Admin: {data.get('user', {}).get('is_super_admin', False)}")
            return True
        else:
            self.log_result("Admin Login", False, f"Status: {status}, Data: {data}")
            return False

    def test_image_upload(self):
        """Test image upload functionality"""
        print("\n📷 Testing Image Upload...")
        
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x12IDATx\x9cc```bPPP\x00\x02\xd2\x00\x05\xc4\x00\x01\xe2\x18\xdd\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'image': ('test_image.png', io.BytesIO(test_image_data), 'image/png')
        }
        
        success, data, status = self.make_request('POST', 'admin/upload-image', files=files)
        
        if success and 'image_url' in data:
            self.log_result("Image Upload", True)
            print(f"   Uploaded image URL: {data['image_url']}")
            return data['image_url']
        else:
            self.log_result("Image Upload", False, f"Status: {status}, Data: {data}")
            return None

    def test_get_pod_items(self):
        """Test getting POD clothing items"""
        print("\n👕 Testing Get POD Items...")
        
        success, data, status = self.make_request('GET', 'admin/pod/clothing-items')
        
        if success and isinstance(data, list):
            self.log_result("Get POD Items", True)
            print(f"   Found {len(data)} POD items")
            return data
        else:
            self.log_result("Get POD Items", False, f"Status: {status}, Data: {data}")
            return []

    def test_get_bulk_items(self):
        """Test getting Bulk clothing items"""
        print("\n👔 Testing Get Bulk Items...")
        
        success, data, status = self.make_request('GET', 'admin/bulk/clothing-items')
        
        if success and isinstance(data, list):
            self.log_result("Get Bulk Items", True)
            print(f"   Found {len(data)} Bulk items")
            return data
        else:
            self.log_result("Get Bulk Items", False, f"Status: {status}, Data: {data}")
            return []

    def test_create_pod_item(self, image_url=None):
        """Test creating POD clothing item"""
        print("\n➕ Testing Create POD Item...")
        
        # Use timestamp to ensure unique name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        item_name = f"Test Polo Shirt {timestamp}"
        item_data = {
            "name": item_name,
            "base_price": 2500,
            "image_url": image_url or "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&q=80",
            "description": "Test polo shirt for automated testing",
            "is_active": True
        }
        
        success, data, status = self.make_request('POST', 'admin/pod/clothing-items', item_data)
        
        if success and 'id' in data:
            item_id = data['id']
            self.created_items.append(('pod', item_id))
            self.log_result("Create POD Item", True)
            print(f"   Created POD item ID: {item_id}")
            return item_id, item_name  # Return both ID and name
        else:
            self.log_result("Create POD Item", False, f"Status: {status}, Data: {data}")
            return None, None

    def test_create_bulk_item(self, image_url=None):
        """Test creating Bulk clothing item"""
        print("\n➕ Testing Create Bulk Item...")
        
        # Use timestamp to ensure unique name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        item_data = {
            "name": f"Test Bulk T-Shirt {timestamp}",
            "base_price": 1800,
            "image_url": image_url or "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
            "description": "Test t-shirt for bulk orders",
            "is_active": True
        }
        
        success, data, status = self.make_request('POST', 'admin/bulk/clothing-items', item_data)
        
        if success and 'id' in data:
            item_id = data['id']
            self.created_items.append(('bulk', item_id))
            self.log_result("Create Bulk Item", True)
            print(f"   Created Bulk item ID: {item_id}")
            return item_id
        else:
            self.log_result("Create Bulk Item", False, f"Status: {status}, Data: {data}")
            return None

    def test_update_pod_item(self, item_id):
        """Test updating POD clothing item"""
        print("\n✏️ Testing Update POD Item...")
        
        if not item_id:
            self.log_result("Update POD Item", False, "No item ID provided")
            return False
        
        update_data = {
            "name": "Updated Test Polo Shirt",
            "base_price": 2800,
            "image_url": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&q=80",
            "description": "Updated test polo shirt description",
            "is_active": True
        }
        
        success, data, status = self.make_request('PUT', f'admin/pod/clothing-items/{item_id}', update_data)
        
        if success:
            self.log_result("Update POD Item", True)
            print(f"   Updated POD item: {item_id}")
            return True
        else:
            self.log_result("Update POD Item", False, f"Status: {status}, Data: {data}")
            return False

    def test_update_bulk_item(self, item_id):
        """Test updating Bulk clothing item"""
        print("\n✏️ Testing Update Bulk Item...")
        
        if not item_id:
            self.log_result("Update Bulk Item", False, "No item ID provided")
            return False
        
        update_data = {
            "name": "Updated Test Bulk T-Shirt",
            "base_price": 2000,
            "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80",
            "description": "Updated test t-shirt for bulk orders",
            "is_active": True
        }
        
        success, data, status = self.make_request('PUT', f'admin/bulk/clothing-items/{item_id}', update_data)
        
        if success:
            self.log_result("Update Bulk Item", True)
            print(f"   Updated Bulk item: {item_id}")
            return True
        else:
            self.log_result("Update Bulk Item", False, f"Status: {status}, Data: {data}")
            return False

    def test_delete_pod_item(self, item_id):
        """Test deleting POD clothing item"""
        print("\n🗑️ Testing Delete POD Item...")
        
        if not item_id:
            self.log_result("Delete POD Item", False, "No item ID provided")
            return False
        
        success, data, status = self.make_request('DELETE', f'admin/pod/clothing-items/{item_id}')
        
        if success:
            self.log_result("Delete POD Item", True)
            print(f"   Deleted POD item: {item_id}")
            # Remove from cleanup list
            self.created_items = [(t, i) for t, i in self.created_items if not (t == 'pod' and i == item_id)]
            return True
        else:
            self.log_result("Delete POD Item", False, f"Status: {status}, Data: {data}")
            return False

    def test_delete_bulk_item(self, item_id):
        """Test deleting Bulk clothing item"""
        print("\n🗑️ Testing Delete Bulk Item...")
        
        if not item_id:
            self.log_result("Delete Bulk Item", False, "No item ID provided")
            return False
        
        success, data, status = self.make_request('DELETE', f'admin/bulk/clothing-items/{item_id}')
        
        if success:
            self.log_result("Delete Bulk Item", True)
            print(f"   Deleted Bulk item: {item_id}")
            # Remove from cleanup list
            self.created_items = [(t, i) for t, i in self.created_items if not (t == 'bulk' and i == item_id)]
            return True
        else:
            self.log_result("Delete Bulk Item", False, f"Status: {status}, Data: {data}")
            return False

    def test_public_endpoints(self):
        """Test public endpoints to verify items appear"""
        print("\n🌐 Testing Public Endpoints...")
        
        # Test public POD endpoint
        success, data, status = self.make_request('GET', 'pod/clothing-items')
        if success and isinstance(data, list):
            self.log_result("Public POD Endpoint", True)
            print(f"   Public POD items: {len(data)}")
        else:
            self.log_result("Public POD Endpoint", False, f"Status: {status}")
        
        # Test public Bulk endpoint
        success, data, status = self.make_request('GET', 'bulk/clothing-items')
        if success and isinstance(data, list):
            self.log_result("Public Bulk Endpoint", True)
            print(f"   Public Bulk items: {len(data)}")
        else:
            self.log_result("Public Bulk Endpoint", False, f"Status: {status}")

    def test_error_handling(self, created_pod_name=None):
        """Test error handling scenarios"""
        print("\n⚠️ Testing Error Handling...")
        
        # Test creating duplicate item
        duplicate_data = {
            "name": created_pod_name or "Test Polo Shirt",  # Use the name that was created earlier
            "base_price": 2500,
            "image_url": "https://example.com/image.jpg",
            "description": "Duplicate test",
            "is_active": True
        }
        
        success, data, status = self.make_request('POST', 'admin/pod/clothing-items', duplicate_data)
        if not success and status == 400:
            self.log_result("Duplicate Item Prevention", True)
            print("   Correctly prevented duplicate item creation")
        else:
            self.log_result("Duplicate Item Prevention", False, f"Expected 400 error, got {status}")
        
        # Test updating non-existent item
        fake_id = "non-existent-id"
        update_data = {
            "name": "Non-existent Item",
            "base_price": 1000,
            "image_url": "https://example.com/image.jpg",
            "description": "This should fail",
            "is_active": True
        }
        
        success, data, status = self.make_request('PUT', f'admin/pod/clothing-items/{fake_id}', update_data)
        if not success and status == 404:
            self.log_result("Update Non-existent Item", True)
            print("   Correctly returned 404 for non-existent item")
        else:
            self.log_result("Update Non-existent Item", False, f"Expected 404 error, got {status}")
        
        # Test deleting non-existent item
        success, data, status = self.make_request('DELETE', f'admin/pod/clothing-items/{fake_id}')
        if not success and status == 404:
            self.log_result("Delete Non-existent Item", True)
            print("   Correctly returned 404 for non-existent item")
        else:
            self.log_result("Delete Non-existent Item", False, f"Expected 404 error, got {status}")

    def cleanup_created_items(self):
        """Clean up any items created during testing"""
        print("\n🧹 Cleaning up created items...")
        
        for item_type, item_id in self.created_items:
            if item_type == 'pod':
                self.make_request('DELETE', f'admin/pod/clothing-items/{item_id}')
            elif item_type == 'bulk':
                self.make_request('DELETE', f'admin/bulk/clothing-items/{item_id}')
            print(f"   Cleaned up {item_type} item: {item_id}")

    def run_all_tests(self):
        """Run all admin clothing management tests"""
        print("🚀 Starting Admin Clothing Items Management Tests")
        print("=" * 60)
        
        # Test admin login first
        if not self.test_admin_login():
            print("❌ Admin login failed - cannot proceed with admin tests")
            return False
        
        # Test image upload
        uploaded_image_url = self.test_image_upload()
        
        # Test getting existing items
        existing_pod_items = self.test_get_pod_items()
        existing_bulk_items = self.test_get_bulk_items()
        
        # Test creating new items
        pod_result = self.test_create_pod_item(uploaded_image_url)
        pod_item_id, created_pod_name = pod_result if pod_result else (None, None)
        bulk_item_id = self.test_create_bulk_item(uploaded_image_url)
        
        # Test updating items
        self.test_update_pod_item(pod_item_id)
        self.test_update_bulk_item(bulk_item_id)
        
        # Test public endpoints
        self.test_public_endpoints()
        
        # Test error handling (before deleting items)
        self.test_error_handling(created_pod_name)
        
        # Test deleting items
        self.test_delete_pod_item(pod_item_id)
        self.test_delete_bulk_item(bulk_item_id)
        
        # Clean up any remaining items
        self.cleanup_created_items()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 ADMIN CLOTHING MANAGEMENT TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure}")
        
        print("\n🎯 CRITICAL ISSUES TO ADDRESS:")
        critical_issues = []
        
        # Check for critical failures
        for failure in self.failed_tests:
            if any(keyword in failure.lower() for keyword in ['admin login', 'image upload', 'create', 'update', 'delete']):
                critical_issues.append(failure)
        
        if critical_issues:
            for issue in critical_issues:
                print(f"🔴 {issue}")
        else:
            print("✅ No critical issues found!")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = AdminClothingTester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())