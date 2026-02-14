#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Temaruco Web App
Tests all major API endpoints including fabrics, souvenirs, bulk orders, design lab, and admin functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TemarucoAPITester:
    def __init__(self, base_url="https://temaru-web-clone.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

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
                    files: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict, int]:
        """Make HTTP request and return success, response data, status code"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        
        if self.admin_token:
            request_headers['Authorization'] = f'Bearer {self.admin_token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    if 'Content-Type' in request_headers:
                        del request_headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=request_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)
            else:
                return False, {}, 0

            try:
                response_data = response.json() if response.content else {}
            except json.JSONDecodeError:
                response_data = {'raw_response': response.text}

            return response.status_code < 400, response_data, response.status_code

        except requests.exceptions.RequestException as e:
            return False, {'error': str(e)}, 0

    def test_fabrics_api(self):
        """Test fabrics API endpoint"""
        print("\n🧵 Testing Fabrics API...")
        
        success, data, status = self.make_request('GET', 'fabrics')
        
        if success and isinstance(data, list):
            self.log_result("Fabrics API - Get all fabrics", True)
            print(f"   Found {len(data)} fabric products")
            
            # Check if fabrics have required fields
            if data and len(data) > 0:
                fabric = data[0]
                required_fields = ['name', 'price', 'image_url']
                missing_fields = [field for field in required_fields if field not in fabric]
                
                if not missing_fields:
                    self.log_result("Fabrics API - Data structure", True)
                else:
                    self.log_result("Fabrics API - Data structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Fabrics API - Data availability", False, "No fabric data found")
        else:
            self.log_result("Fabrics API - Get all fabrics", False, f"Status: {status}, Data: {data}")

    def test_souvenirs_api(self):
        """Test souvenirs API endpoint"""
        print("\n🎁 Testing Souvenirs API...")
        
        success, data, status = self.make_request('GET', 'souvenirs')
        
        if success and isinstance(data, list):
            self.log_result("Souvenirs API - Get all souvenirs", True)
            print(f"   Found {len(data)} souvenir products")
            
            # Check if souvenirs have branded/unbranded options
            if data and len(data) > 0:
                souvenir = data[0]
                required_fields = ['name', 'unbranded_price', 'branded_price']
                missing_fields = [field for field in required_fields if field not in souvenir]
                
                if not missing_fields:
                    self.log_result("Souvenirs API - Branded/Unbranded structure", True)
                else:
                    self.log_result("Souvenirs API - Branded/Unbranded structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Souvenirs API - Data availability", False, "No souvenir data found")
        else:
            self.log_result("Souvenirs API - Get all souvenirs", False, f"Status: {status}, Data: {data}")

    def test_bulk_clothing_items_api(self):
        """Test bulk clothing items API endpoint"""
        print("\n👕 Testing Bulk Clothing Items API...")
        
        success, data, status = self.make_request('GET', 'bulk/clothing-items')
        
        if success and isinstance(data, list):
            self.log_result("Bulk Clothing Items API - Get items", True)
            print(f"   Found {len(data)} clothing items")
            
            if data and len(data) > 0:
                item = data[0]
                required_fields = ['name', 'base_price']
                missing_fields = [field for field in required_fields if field not in item]
                
                if not missing_fields:
                    self.log_result("Bulk Clothing Items API - Data structure", True)
                else:
                    self.log_result("Bulk Clothing Items API - Data structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Bulk Clothing Items API - Data availability", False, "No clothing items found")
        else:
            self.log_result("Bulk Clothing Items API - Get items", False, f"Status: {status}, Data: {data}")

    def test_pod_clothing_items_api(self):
        """Test POD clothing items API endpoint"""
        print("\n🎨 Testing POD Clothing Items API...")
        
        success, data, status = self.make_request('GET', 'pod/clothing-items')
        
        if success and isinstance(data, list):
            self.log_result("POD Clothing Items API - Get items", True)
            print(f"   Found {len(data)} POD clothing items")
        else:
            self.log_result("POD Clothing Items API - Get items", False, f"Status: {status}, Data: {data}")

    def test_fabric_order_creation(self):
        """Test fabric order creation"""
        print("\n📦 Testing Fabric Order Creation...")
        
        order_data = {
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "+2348012345678",
            "items": [
                {
                    "name": "Premium Cotton",
                    "quantity": 2,
                    "price": 5000
                }
            ],
            "total_price": 10000
        }
        
        success, data, status = self.make_request('POST', 'orders/fabric', order_data)
        
        if success and 'order_id' in data:
            self.log_result("Fabric Order Creation", True)
            print(f"   Created order: {data['order_id']}")
            return data['order_id']
        else:
            self.log_result("Fabric Order Creation", False, f"Status: {status}, Data: {data}")
            return None

    def test_souvenir_order_creation(self):
        """Test souvenir order creation"""
        print("\n🎁 Testing Souvenir Order Creation...")
        
        order_data = {
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "+2348012345678",
            "items": [
                {
                    "name": "Branded Mug",
                    "type": "branded",
                    "quantity": 1,
                    "price": 3000
                },
                {
                    "name": "Umbrella",
                    "type": "unbranded",
                    "quantity": 1,
                    "price": 2000
                }
            ],
            "total_price": 5000
        }
        
        success, data, status = self.make_request('POST', 'orders/souvenir', order_data)
        
        if success and 'order_id' in data:
            self.log_result("Souvenir Order Creation", True)
            print(f"   Created order: {data['order_id']}")
            return data['order_id']
        else:
            self.log_result("Souvenir Order Creation", False, f"Status: {status}, Data: {data}")
            return None

    def test_design_lab_request(self):
        """Test design lab request submission"""
        print("\n🎨 Testing Design Lab Request...")
        
        # Test with form data (multipart) - the API expects Form data, not JSON
        form_data = {
            'customer_name': 'Test Client',
            'customer_email': 'test@example.com',
            'customer_phone': '+2348012345678',
            'service_type': 'Logo Design',
            'description': 'Need a professional logo for my business',
            'deadline': '2025-02-15',
            'budget': '₦50,000 - ₦100,000'
        }
        
        # Use requests directly for form data
        url = f"{self.base_url}/api/design-lab/request"
        try:
            response = requests.post(url, data=form_data, timeout=30)
            success = response.status_code < 400
            try:
                data = response.json() if response.content else {}
            except json.JSONDecodeError:
                data = {'raw_response': response.text}
            status = response.status_code
        except requests.exceptions.RequestException as e:
            success, data, status = False, {'error': str(e)}, 0
        
        if success and 'enquiry_code' in data:
            self.log_result("Design Lab Request Submission", True)
            print(f"   Created enquiry: {data['enquiry_code']}")
            return data['enquiry_code']
        else:
            self.log_result("Design Lab Request Submission", False, f"Status: {status}, Data: {data}")
            return None

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
            return True
        else:
            self.log_result("Admin Login", False, f"Status: {status}, Data: {data}")
            return False

    def test_bank_details_api(self):
        """Test bank details API (public endpoint)"""
        print("\n🏦 Testing Bank Details API...")
        
        success, data, status = self.make_request('GET', 'bank-details')
        
        if success and 'bank_name' in data and 'account_number' in data:
            self.log_result("Bank Details API", True)
            print(f"   Bank: {data['bank_name']}")
            print(f"   Account: {data['account_number']}")
        else:
            self.log_result("Bank Details API", False, f"Status: {status}, Data: {data}")

    def test_quick_quote_calculation(self):
        """Test quick quote calculation"""
        print("\n💰 Testing Quick Quote Calculation...")
        
        quote_data = {
            "clothing_item": "T-Shirt",
            "quantity": 100,
            "print_type": "front",
            "fabric_quality": "Standard"
        }
        
        success, data, status = self.make_request('POST', 'quote/calculate', quote_data)
        
        if success and 'estimated_price' in data:
            self.log_result("Quick Quote Calculation", True)
            print(f"   Estimated price: ₦{data['estimated_price']:,.2f}")
            print(f"   Estimated days: {data.get('estimated_days', 'N/A')}")
        else:
            self.log_result("Quick Quote Calculation", False, f"Status: {status}, Data: {data}")

    def test_payment_initialization(self):
        """Test Paystack payment initialization"""
        print("\n💳 Testing Payment Initialization...")
        
        payment_data = {
            "email": "test@payment.com",
            "amount": 7000,
            "order_type": "boutique",  # Use valid enum value
            "order_id": "FAB-TEST-001"
        }
        
        success, data, status = self.make_request('POST', 'payments/initialize', payment_data)
        
        if success and 'data' in data:
            self.log_result("Payment Initialization", True)
            print(f"   Reference: {data['data'].get('reference', 'N/A')}")
            print(f"   Authorization URL: {data['data'].get('authorization_url', 'N/A')[:50]}...")
            return data['data'].get('reference')
        else:
            self.log_result("Payment Initialization", False, f"Status: {status}, Data: {data}")
            return None

    def test_payment_verification(self, reference):
        """Test payment verification"""
        if not reference:
            self.log_result("Payment Verification", False, "No reference to verify")
            return
            
        print("\n✅ Testing Payment Verification...")
        
        success, data, status = self.make_request('GET', f'payments/verify/{reference}')
        
        if success:
            self.log_result("Payment Verification", True)
            print(f"   Status: {data.get('data', {}).get('status', 'N/A')}")
        else:
            self.log_result("Payment Verification", False, f"Status: {status}, Data: {data}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Temaruco Backend API Tests")
        print("=" * 50)
        
        # Test public APIs first
        self.test_fabrics_api()
        self.test_souvenirs_api()
        self.test_bulk_clothing_items_api()
        self.test_pod_clothing_items_api()
        self.test_bank_details_api()
        self.test_quick_quote_calculation()
        
        # Test order creation
        fabric_order_id = self.test_fabric_order_creation()
        souvenir_order_id = self.test_souvenir_order_creation()
        self.test_design_lab_request()
        
        # Test payment functionality
        payment_ref = self.test_payment_initialization()
        self.test_payment_verification(payment_ref)
        
        # Test admin functionality
        admin_login_success = self.test_admin_login()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
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
            if any(keyword in failure.lower() for keyword in ['fabrics api', 'souvenirs api', 'admin login', 'bulk clothing']):
                critical_issues.append(failure)
        
        if critical_issues:
            for issue in critical_issues:
                print(f"🔴 {issue}")
        else:
            print("✅ No critical issues found!")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = TemarucoAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())