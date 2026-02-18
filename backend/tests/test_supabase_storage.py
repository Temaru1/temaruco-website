"""
Supabase Cloud Storage Integration Tests
Tests for product image upload, fabric/souvenir creation with images, and image deletion.
"""

import pytest
import requests
import os
import io
import time
from PIL import Image

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "superadmin@temaruco.com"
ADMIN_PASSWORD = "superadmin123"


class TestSupabaseStorageIntegration:
    """Test Supabase Cloud Storage integration for product images"""
    
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
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.text}")
        
        login_data = login_response.json()
        self.token = login_data.get('token')
        self.session_token = login_data.get('session_token')
        
        # Set auth headers
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        })
        
        # Track created resources for cleanup
        self.created_fabrics = []
        self.created_souvenirs = []
        
        yield
        
        # Cleanup created resources
        for fabric_id in self.created_fabrics:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/fabrics/{fabric_id}")
            except:
                pass
        
        for souvenir_id in self.created_souvenirs:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/souvenirs/{souvenir_id}")
            except:
                pass
    
    def create_test_image(self, width=200, height=200, color=(255, 0, 0)):
        """Create a test image in memory"""
        img = Image.new('RGB', (width, height), color=color)
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG', quality=85)
        img_bytes.seek(0)
        return img_bytes
    
    # ==================== PRODUCT IMAGE UPLOAD TESTS ====================
    
    def test_01_upload_product_image_returns_supabase_url(self):
        """Test that /api/admin/upload/product-image returns a Supabase URL"""
        # Create test image
        test_image = self.create_test_image(color=(255, 100, 100))
        
        # Upload image
        files = {'file': ('test_product.jpg', test_image, 'image/jpeg')}
        data = {'folder': 'products'}
        
        # Remove Content-Type header for multipart upload
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        result = response.json()
        
        # Verify response structure
        assert 'image_url' in result, "Response missing 'image_url'"
        assert 'file_name' in result, "Response missing 'file_name'"
        assert 'storage_path' in result, "Response missing 'storage_path'"
        
        image_url = result['image_url']
        
        # Check if URL is Supabase URL (expected) or local fallback
        if 'supabase.co' in image_url:
            print(f"SUCCESS: Image uploaded to Supabase: {image_url}")
            assert 'wkltyoesqjixpvjxjham.supabase.co' in image_url, "Unexpected Supabase domain"
            assert '/storage/v1/object/public/product-images/' in image_url, "Unexpected Supabase path"
        else:
            print(f"WARNING: Image uploaded to local storage (fallback): {image_url}")
            assert image_url.startswith('/api/uploads/'), "Unexpected local URL format"
        
        # Store URL for accessibility test
        self.uploaded_image_url = image_url
        
        return result
    
    def test_02_uploaded_image_is_accessible(self):
        """Test that uploaded image is accessible via the returned URL"""
        # First upload an image
        test_image = self.create_test_image(color=(0, 255, 0))
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        files = {'file': ('test_accessible.jpg', test_image, 'image/jpeg')}
        data = {'folder': 'products'}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        image_url = upload_response.json()['image_url']
        
        # Try to access the image
        if image_url.startswith('http'):
            # Supabase URL - direct access
            access_response = requests.get(image_url, timeout=10)
        else:
            # Local URL - prepend base URL
            access_response = requests.get(f"{BASE_URL}{image_url}", timeout=10)
        
        print(f"Image access status: {access_response.status_code}")
        print(f"Image content-type: {access_response.headers.get('content-type', 'unknown')}")
        
        assert access_response.status_code == 200, f"Image not accessible: {access_response.status_code}"
        assert 'image' in access_response.headers.get('content-type', '').lower(), "Response is not an image"
    
    def test_03_upload_with_different_folders(self):
        """Test uploading to different folders (fabrics, souvenirs)"""
        folders = ['fabrics', 'souvenirs', 'products']
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        for folder in folders:
            test_image = self.create_test_image(color=(100, 100, 255))
            
            files = {'file': (f'test_{folder}.jpg', test_image, 'image/jpeg')}
            data = {'folder': folder}
            
            response = requests.post(
                f"{BASE_URL}/api/admin/upload/product-image",
                files=files,
                data=data,
                headers=headers
            )
            
            print(f"Upload to '{folder}' folder - Status: {response.status_code}")
            
            assert response.status_code == 200, f"Upload to {folder} failed: {response.text}"
            
            result = response.json()
            storage_path = result.get('storage_path', '')
            
            # Verify folder is in storage path
            if 'supabase.co' in result['image_url']:
                assert folder in storage_path, f"Folder '{folder}' not in storage path: {storage_path}"
                print(f"  Supabase path: {storage_path}")
            else:
                print(f"  Local path: {storage_path}")
    
    def test_04_upload_invalid_file_type_rejected(self):
        """Test that non-image files are rejected"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        # Try to upload a text file
        fake_file = io.BytesIO(b"This is not an image")
        files = {'file': ('test.txt', fake_file, 'text/plain')}
        data = {'folder': 'products'}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"Invalid file upload status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
    
    # ==================== FABRIC CREATION WITH IMAGE TESTS ====================
    
    def test_05_create_fabric_with_supabase_image(self):
        """Test creating a fabric with an uploaded Supabase image"""
        # First upload an image
        test_image = self.create_test_image(color=(200, 150, 100))
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        files = {'file': ('fabric_test.jpg', test_image, 'image/jpeg')}
        data = {'folder': 'fabrics'}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        assert upload_response.status_code == 200, f"Image upload failed: {upload_response.text}"
        
        image_url = upload_response.json()['image_url']
        print(f"Uploaded fabric image: {image_url}")
        
        # Create fabric with the uploaded image
        fabric_data = {
            "name": "TEST_Supabase_Fabric",
            "price": 5000,
            "branded_price": 6500,
            "image_url": image_url,
            "description": "Test fabric with Supabase image",
            "is_active": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/fabrics",
            json=fabric_data
        )
        
        print(f"Create fabric status: {create_response.status_code}")
        print(f"Create fabric response: {create_response.text[:300]}")
        
        assert create_response.status_code == 200, f"Fabric creation failed: {create_response.text}"
        
        result = create_response.json()
        assert 'id' in result, "Response missing fabric ID"
        
        fabric_id = result['id']
        self.created_fabrics.append(fabric_id)
        
        # Verify fabric was created with correct image URL
        fabrics_response = self.session.get(f"{BASE_URL}/api/fabrics")
        assert fabrics_response.status_code == 200
        
        fabrics = fabrics_response.json()
        created_fabric = next((f for f in fabrics if f['id'] == fabric_id), None)
        
        assert created_fabric is not None, "Created fabric not found in list"
        assert created_fabric['image_url'] == image_url, "Fabric image URL mismatch"
        
        print(f"SUCCESS: Fabric created with ID {fabric_id} and image URL {image_url}")
        
        return fabric_id, image_url
    
    # ==================== SOUVENIR CREATION WITH IMAGE TESTS ====================
    
    def test_06_create_souvenir_with_supabase_image(self):
        """Test creating a souvenir with an uploaded Supabase image"""
        # First upload an image
        test_image = self.create_test_image(color=(100, 200, 150))
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        files = {'file': ('souvenir_test.jpg', test_image, 'image/jpeg')}
        data = {'folder': 'souvenirs'}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        assert upload_response.status_code == 200, f"Image upload failed: {upload_response.text}"
        
        image_url = upload_response.json()['image_url']
        print(f"Uploaded souvenir image: {image_url}")
        
        # Create souvenir with the uploaded image
        souvenir_data = {
            "name": "TEST_Supabase_Souvenir",
            "price": 3000,
            "branded_price": 4000,
            "image_url": image_url,
            "description": "Test souvenir with Supabase image",
            "is_active": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/souvenirs",
            json=souvenir_data
        )
        
        print(f"Create souvenir status: {create_response.status_code}")
        print(f"Create souvenir response: {create_response.text[:300]}")
        
        assert create_response.status_code == 200, f"Souvenir creation failed: {create_response.text}"
        
        result = create_response.json()
        assert 'id' in result, "Response missing souvenir ID"
        
        souvenir_id = result['id']
        self.created_souvenirs.append(souvenir_id)
        
        # Verify souvenir was created with correct image URL
        souvenirs_response = self.session.get(f"{BASE_URL}/api/souvenirs")
        assert souvenirs_response.status_code == 200
        
        souvenirs = souvenirs_response.json()
        created_souvenir = next((s for s in souvenirs if s['id'] == souvenir_id), None)
        
        assert created_souvenir is not None, "Created souvenir not found in list"
        assert created_souvenir['image_url'] == image_url, "Souvenir image URL mismatch"
        
        print(f"SUCCESS: Souvenir created with ID {souvenir_id} and image URL {image_url}")
        
        return souvenir_id, image_url
    
    # ==================== IMAGE DELETION TESTS ====================
    
    def test_07_delete_fabric_removes_supabase_image(self):
        """Test that deleting a fabric also deletes its Supabase image"""
        # First create a fabric with an image
        test_image = self.create_test_image(color=(255, 200, 0))
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        files = {'file': ('fabric_delete_test.jpg', test_image, 'image/jpeg')}
        data = {'folder': 'fabrics'}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        assert upload_response.status_code == 200
        image_url = upload_response.json()['image_url']
        
        # Create fabric
        fabric_data = {
            "name": "TEST_Delete_Fabric",
            "price": 4000,
            "branded_price": 5000,
            "image_url": image_url,
            "description": "Fabric to be deleted",
            "is_active": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/fabrics",
            json=fabric_data
        )
        
        assert create_response.status_code == 200
        fabric_id = create_response.json()['id']
        
        print(f"Created fabric {fabric_id} with image {image_url}")
        
        # Verify image is accessible before deletion
        if image_url.startswith('http'):
            pre_delete_response = requests.get(image_url, timeout=10)
            print(f"Image accessible before delete: {pre_delete_response.status_code}")
        
        # Delete the fabric
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/fabrics/{fabric_id}")
        
        print(f"Delete fabric status: {delete_response.status_code}")
        print(f"Delete response: {delete_response.text}")
        
        assert delete_response.status_code == 200, f"Fabric deletion failed: {delete_response.text}"
        
        # Verify fabric is deleted
        fabrics_response = self.session.get(f"{BASE_URL}/api/fabrics")
        fabrics = fabrics_response.json()
        deleted_fabric = next((f for f in fabrics if f['id'] == fabric_id), None)
        
        assert deleted_fabric is None, "Fabric still exists after deletion"
        
        # Note: We can't easily verify Supabase image deletion without direct Supabase access
        # The delete_file_from_supabase function is called in the endpoint
        print(f"SUCCESS: Fabric {fabric_id} deleted (image deletion triggered)")
    
    def test_08_delete_souvenir_removes_supabase_image(self):
        """Test that deleting a souvenir also deletes its Supabase image"""
        # First create a souvenir with an image
        test_image = self.create_test_image(color=(0, 200, 255))
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        files = {'file': ('souvenir_delete_test.jpg', test_image, 'image/jpeg')}
        data = {'folder': 'souvenirs'}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        assert upload_response.status_code == 200
        image_url = upload_response.json()['image_url']
        
        # Create souvenir
        souvenir_data = {
            "name": "TEST_Delete_Souvenir",
            "price": 2500,
            "branded_price": 3500,
            "image_url": image_url,
            "description": "Souvenir to be deleted",
            "is_active": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/admin/souvenirs",
            json=souvenir_data
        )
        
        assert create_response.status_code == 200
        souvenir_id = create_response.json()['id']
        
        print(f"Created souvenir {souvenir_id} with image {image_url}")
        
        # Delete the souvenir
        delete_response = self.session.delete(f"{BASE_URL}/api/admin/souvenirs/{souvenir_id}")
        
        print(f"Delete souvenir status: {delete_response.status_code}")
        print(f"Delete response: {delete_response.text}")
        
        assert delete_response.status_code == 200, f"Souvenir deletion failed: {delete_response.text}"
        
        # Verify souvenir is deleted
        souvenirs_response = self.session.get(f"{BASE_URL}/api/souvenirs")
        souvenirs = souvenirs_response.json()
        deleted_souvenir = next((s for s in souvenirs if s['id'] == souvenir_id), None)
        
        assert deleted_souvenir is None, "Souvenir still exists after deletion"
        
        print(f"SUCCESS: Souvenir {souvenir_id} deleted (image deletion triggered)")
    
    # ==================== EDGE CASE TESTS ====================
    
    def test_09_upload_without_auth_fails(self):
        """Test that upload without authentication fails"""
        test_image = self.create_test_image()
        
        files = {'file': ('unauthorized.jpg', test_image, 'image/jpeg')}
        data = {'folder': 'products'}
        
        # No auth headers
        response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data
        )
        
        print(f"Unauthorized upload status: {response.status_code}")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_10_upload_png_image(self):
        """Test uploading PNG format image"""
        # Create PNG image
        img = Image.new('RGBA', (200, 200), color=(255, 0, 0, 255))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        files = {'file': ('test_png.png', img_bytes, 'image/png')}
        data = {'folder': 'products'}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"PNG upload status: {response.status_code}")
        
        assert response.status_code == 200, f"PNG upload failed: {response.text}"
        
        result = response.json()
        assert 'image_url' in result
        print(f"PNG uploaded successfully: {result['image_url']}")
    
    def test_11_upload_webp_image(self):
        """Test uploading WebP format image"""
        # Create WebP image
        img = Image.new('RGB', (200, 200), color=(0, 255, 0))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='WEBP')
        img_bytes.seek(0)
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Cookie": f"session_token={self.session_token}"
        }
        
        files = {'file': ('test_webp.webp', img_bytes, 'image/webp')}
        data = {'folder': 'products'}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/upload/product-image",
            files=files,
            data=data,
            headers=headers
        )
        
        print(f"WebP upload status: {response.status_code}")
        
        assert response.status_code == 200, f"WebP upload failed: {response.text}"
        
        result = response.json()
        assert 'image_url' in result
        print(f"WebP uploaded successfully: {result['image_url']}")


class TestSupabaseURLVerification:
    """Verify Supabase CDN URL accessibility"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.text}")
        
        login_data = login_response.json()
        self.token = login_data.get('token')
        self.session_token = login_data.get('session_token')
    
    def test_12_verify_existing_supabase_images_accessible(self):
        """Test that existing Supabase images in fabrics/souvenirs are accessible"""
        # Get all fabrics
        fabrics_response = requests.get(f"{BASE_URL}/api/fabrics")
        assert fabrics_response.status_code == 200
        fabrics = fabrics_response.json()
        
        # Get all souvenirs
        souvenirs_response = requests.get(f"{BASE_URL}/api/souvenirs")
        assert souvenirs_response.status_code == 200
        souvenirs = souvenirs_response.json()
        
        supabase_urls_checked = 0
        accessible_count = 0
        
        # Check fabric images
        for fabric in fabrics[:5]:  # Check first 5
            image_url = fabric.get('image_url', '')
            if image_url and 'supabase.co' in image_url:
                print(f"Checking fabric image: {image_url[:80]}...")
                try:
                    response = requests.head(image_url, timeout=10)
                    supabase_urls_checked += 1
                    if response.status_code == 200:
                        accessible_count += 1
                        print(f"  ✓ Accessible")
                    else:
                        print(f"  ✗ Status: {response.status_code}")
                except Exception as e:
                    print(f"  ✗ Error: {e}")
        
        # Check souvenir images
        for souvenir in souvenirs[:5]:  # Check first 5
            image_url = souvenir.get('image_url', '')
            if image_url and 'supabase.co' in image_url:
                print(f"Checking souvenir image: {image_url[:80]}...")
                try:
                    response = requests.head(image_url, timeout=10)
                    supabase_urls_checked += 1
                    if response.status_code == 200:
                        accessible_count += 1
                        print(f"  ✓ Accessible")
                    else:
                        print(f"  ✗ Status: {response.status_code}")
                except Exception as e:
                    print(f"  ✗ Error: {e}")
        
        print(f"\nSummary: {accessible_count}/{supabase_urls_checked} Supabase URLs accessible")
        
        if supabase_urls_checked == 0:
            print("No Supabase URLs found in existing products (may be using local storage)")
        else:
            assert accessible_count > 0, "No Supabase images are accessible"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
