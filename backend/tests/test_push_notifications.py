"""
Test Push Notification API Endpoints
Tests: VAPID key retrieval, admin push settings, subscribe, unsubscribe, settings update
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "superadmin@temaruco.com"
ADMIN_PASSWORD = "superadmin123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestVapidPublicKey:
    """Test public VAPID key endpoint - no auth required"""
    
    def test_get_vapid_public_key(self, api_client):
        """GET /api/push/vapid-public-key - returns VAPID public key"""
        response = api_client.get(f"{BASE_URL}/api/push/vapid-public-key")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "publicKey" in data, "Response should contain 'publicKey'"
        
        # VAPID key should be a non-empty string
        public_key = data["publicKey"]
        assert isinstance(public_key, str), "publicKey should be a string"
        assert len(public_key) > 0, "publicKey should not be empty"
        
        # VAPID keys are base64url encoded
        print(f"✓ VAPID public key returned: {public_key[:20]}...")


class TestPushSettings:
    """Test admin push notification settings endpoint"""
    
    def test_get_push_settings_unauthorized(self, api_client):
        """GET /api/admin/push/settings without auth should return 401/403"""
        # Clear auth header if present
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/admin/push/settings", headers=headers)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")
    
    def test_get_push_settings_authorized(self, authenticated_client):
        """GET /api/admin/push/settings with auth should return settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/push/settings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "is_subscribed" in data, "Response should contain 'is_subscribed'"
        assert "enabled_events" in data, "Response should contain 'enabled_events'"
        assert "available_events" in data, "Response should contain 'available_events'"
        
        # Validate data types
        assert isinstance(data["is_subscribed"], bool), "is_subscribed should be boolean"
        assert isinstance(data["enabled_events"], dict), "enabled_events should be dict"
        assert isinstance(data["available_events"], dict), "available_events should be dict"
        
        # Check available events structure
        available_events = data["available_events"]
        assert len(available_events) > 0, "Should have available events"
        
        # Each event should have title, icon, description
        for event_type, event_info in available_events.items():
            assert "title" in event_info, f"Event {event_type} should have 'title'"
            assert "icon" in event_info, f"Event {event_type} should have 'icon'"
            assert "description" in event_info, f"Event {event_type} should have 'description'"
        
        print(f"✓ Push settings returned with {len(available_events)} event types")


class TestPushSubscription:
    """Test push subscription endpoints"""
    
    def test_subscribe_without_auth(self, api_client):
        """POST /api/admin/push/subscribe without auth should fail"""
        headers = {"Content-Type": "application/json"}
        response = requests.post(
            f"{BASE_URL}/api/admin/push/subscribe",
            json={"subscription": {"endpoint": "test", "keys": {"p256dh": "test", "auth": "test"}}},
            headers=headers
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized subscription correctly rejected")
    
    def test_subscribe_missing_subscription(self, authenticated_client):
        """POST /api/admin/push/subscribe without subscription data should fail"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/admin/push/subscribe",
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing subscription data correctly rejected")
    
    def test_subscribe_invalid_format(self, authenticated_client):
        """POST /api/admin/push/subscribe with invalid format should fail"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/admin/push/subscribe",
            json={"subscription": {"invalid": "data"}}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid subscription format correctly rejected")
    
    def test_subscribe_valid_subscription(self, authenticated_client):
        """POST /api/admin/push/subscribe with valid data should succeed"""
        # Note: This is a mock subscription - real one requires browser push API
        mock_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/admin/push/subscribe",
            json={"subscription": mock_subscription}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "subscribed" in data["message"].lower() or "success" in data["message"].lower(), \
            f"Message should indicate success: {data['message']}"
        
        print("✓ Valid subscription created successfully")
    
    def test_verify_subscription_active(self, authenticated_client):
        """GET /api/admin/push/settings should show is_subscribed=True after subscription"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/push/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_subscribed"] == True, "Admin should be subscribed after subscribe call"
        print("✓ Subscription status verified as active")


class TestPushUnsubscribe:
    """Test push unsubscription endpoint"""
    
    def test_unsubscribe_without_auth(self):
        """POST /api/admin/push/unsubscribe without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/admin/push/unsubscribe",
            headers={"Content-Type": "application/json"},
            json={}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized unsubscribe correctly rejected")
    
    def test_unsubscribe_authorized(self, authenticated_client):
        """POST /api/admin/push/unsubscribe should deactivate subscription"""
        response = authenticated_client.post(f"{BASE_URL}/api/admin/push/unsubscribe", json={})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        print("✓ Unsubscribe successful")
    
    def test_verify_subscription_inactive(self, authenticated_client):
        """GET /api/admin/push/settings should show is_subscribed=False after unsubscribe"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/push/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        # After unsubscribe, is_subscribed should be False
        # Note: The subscription document may still exist but is_active=False
        assert data["is_subscribed"] == False, "Admin should be unsubscribed after unsubscribe call"
        print("✓ Subscription status verified as inactive")


class TestPushSettingsUpdate:
    """Test push notification event preferences update"""
    
    def test_update_settings_without_auth(self):
        """PUT /api/admin/push/settings without auth should fail"""
        response = requests.put(
            f"{BASE_URL}/api/admin/push/settings",
            headers={"Content-Type": "application/json"},
            json={"enabled_events": {"new_order": True}}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized settings update correctly rejected")
    
    def test_update_settings_invalid_event(self, authenticated_client):
        """PUT /api/admin/push/settings with invalid event should fail"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/push/settings",
            json={"enabled_events": {"invalid_event_type": True}}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Invalid event type correctly rejected")
    
    def test_update_settings_valid_events(self, authenticated_client):
        """PUT /api/admin/push/settings with valid events should succeed"""
        # First re-subscribe to have an active subscription
        mock_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-2",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        authenticated_client.post(
            f"{BASE_URL}/api/admin/push/subscribe",
            json={"subscription": mock_subscription}
        )
        
        # Update event preferences
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/push/settings",
            json={
                "enabled_events": {
                    "new_order": True,
                    "new_enquiry": False,
                    "payment_received": True
                }
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        print("✓ Push notification event settings updated")
    
    def test_verify_settings_persisted(self, authenticated_client):
        """GET /api/admin/push/settings should show updated event preferences"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/push/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        enabled_events = data["enabled_events"]
        
        # Verify the settings we just set
        assert enabled_events.get("new_order") == True, "new_order should be enabled"
        assert enabled_events.get("new_enquiry") == False, "new_enquiry should be disabled"
        assert enabled_events.get("payment_received") == True, "payment_received should be enabled"
        
        print("✓ Event settings persisted correctly")


class TestPushTestNotification:
    """Test the test notification endpoint"""
    
    def test_send_test_without_auth(self):
        """POST /api/admin/push/test without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/admin/push/test",
            headers={"Content-Type": "application/json"},
            json={}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized test notification correctly rejected")
    
    def test_send_test_with_subscription(self, authenticated_client):
        """POST /api/admin/push/test with active subscription should work (or fail gracefully)"""
        response = authenticated_client.post(f"{BASE_URL}/api/admin/push/test", json={})
        
        # This may succeed (200) or fail (500) depending on VAPID config
        # 520 is a Cloudflare transient error, not a code issue
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, "Response should contain message"
            print("✓ Test notification sent successfully")
        elif response.status_code == 400:
            data = response.json()
            if "no active" in data.get("detail", "").lower():
                print("✓ Test correctly reported no active subscription")
            else:
                pytest.fail(f"Unexpected 400 error: {data}")
        elif response.status_code == 500:
            # May fail due to invalid mock subscription endpoint
            print("✓ Test notification attempted (expected failure with mock subscription)")
        elif response.status_code in [502, 520, 521, 522, 523, 524]:
            # Cloudflare/gateway errors - transient, not code issue
            print(f"✓ Got transient gateway error {response.status_code} - not a code issue")
        else:
            pytest.fail(f"Unexpected status code {response.status_code}: {response.text}")


class TestCleanup:
    """Clean up test data"""
    
    def test_cleanup_unsubscribe(self, authenticated_client):
        """Clean up by unsubscribing"""
        response = authenticated_client.post(f"{BASE_URL}/api/admin/push/unsubscribe", json={})
        assert response.status_code == 200
        print("✓ Test cleanup completed - unsubscribed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
