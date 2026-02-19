import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, AlertCircle, TestTube, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

// Convert VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const AdminPushNotificationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settings, setSettings] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [swSupported, setSwSupported] = useState(true);
  
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    checkSupport();
    loadSettings();
  }, []);

  const checkSupport = async () => {
    // Check if service workers and push are supported
    if (!('serviceWorker' in navigator)) {
      setSwSupported(false);
      return;
    }
    if (!('PushManager' in window)) {
      setSwSupported(false);
      return;
    }
    
    // Check current permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/push/settings`, { headers });
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load push settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Your browser does not support notifications');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    
    if (permission !== 'granted') {
      toast.error('Notification permission denied');
      return false;
    }
    return true;
  };

  const subscribeToNotifications = async () => {
    setSubscribing(true);
    
    try {
      // First request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setSubscribing(false);
        return;
      }
      
      // Get VAPID public key
      const keyResponse = await axios.get(`${API_URL}/api/push/vapid-public-key`);
      const vapidPublicKey = keyResponse.data.publicKey;
      
      if (!vapidPublicKey) {
        toast.error('Push notifications not configured on server');
        setSubscribing(false);
        return;
      }
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      // Send subscription to server
      await axios.post(`${API_URL}/api/admin/push/subscribe`, {
        subscription: subscription.toJSON(),
        enabled_events: settings?.enabled_events || {}
      }, { headers });
      
      toast.success('Push notifications enabled!');
      loadSettings();
    } catch (error) {
      console.error('Subscription failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to enable notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const unsubscribeFromNotifications = async () => {
    setSubscribing(true);
    
    try {
      // Unsubscribe from push manager
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      // Update server
      await axios.post(`${API_URL}/api/admin/push/unsubscribe`, {}, { headers });
      
      toast.success('Push notifications disabled');
      loadSettings();
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const toggleEventType = async (eventType, enabled) => {
    const newEnabledEvents = {
      ...settings.enabled_events,
      [eventType]: enabled
    };
    
    try {
      await axios.put(`${API_URL}/api/admin/push/settings`, {
        enabled_events: newEnabledEvents
      }, { headers });
      
      setSettings(prev => ({
        ...prev,
        enabled_events: newEnabledEvents
      }));
      
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} ${eventType.replace(/_/g, ' ')} notifications`);
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const sendTestNotification = async () => {
    setSendingTest(true);
    try {
      await axios.post(`${API_URL}/api/admin/push/test`, {}, { headers });
      toast.success('Test notification sent! Check your device.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test notification');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!swSupported) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <div>
                <h3 className="font-semibold text-amber-800">Push Notifications Not Supported</h3>
                <p className="text-amber-600 text-sm">
                  Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubscribed = settings?.is_subscribed;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Push Notifications</h1>
        <p className="text-zinc-500 mt-1">
          Receive instant alerts on your device even when you're not on the dashboard
        </p>
      </div>

      {/* Permission Status */}
      {permissionStatus === 'denied' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BellOff className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Notifications Blocked</p>
                <p className="text-red-600 text-sm">
                  You've blocked notifications for this site. Please enable them in your browser settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Toggle Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-zinc-400" />
            )}
            Push Notifications
          </CardTitle>
          <CardDescription>
            {isSubscribed 
              ? 'You are receiving push notifications on this device'
              : 'Enable push notifications to stay updated'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Status: {isSubscribed ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-zinc-500">Disabled</span>
                )}
              </p>
              {settings?.subscribed_at && (
                <p className="text-xs text-zinc-400">
                  Subscribed: {new Date(settings.subscribed_at).toLocaleDateString()}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              {isSubscribed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestNotification}
                  disabled={sendingTest}
                  data-testid="test-push-btn"
                >
                  {sendingTest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-1" />
                  )}
                  Test
                </Button>
              )}
              
              <Button
                onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
                disabled={subscribing || permissionStatus === 'denied'}
                variant={isSubscribed ? 'outline' : 'default'}
                className={!isSubscribed ? 'bg-[#D90429] hover:bg-[#B90322]' : ''}
                data-testid="toggle-push-btn"
              >
                {subscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : isSubscribed ? (
                  <BellOff className="w-4 h-4 mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                {isSubscribed ? 'Disable' : 'Enable Notifications'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Types Card */}
      {isSubscribed && settings?.available_events && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Choose which events you want to be notified about
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(settings.available_events).map(([eventType, eventInfo]) => {
                const isEnabled = settings.enabled_events?.[eventType] !== false;
                
                return (
                  <div
                    key={eventType}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{eventInfo.icon}</span>
                      <div>
                        <p className="font-medium text-zinc-900">{eventInfo.title}</p>
                        <p className="text-sm text-zinc-500">{eventInfo.description}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => toggleEventType(eventType, !isEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-[#D90429]' : 'bg-zinc-300'
                      }`}
                      data-testid={`toggle-${eventType}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-zinc-50 border-zinc-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-zinc-500 mt-0.5" />
            <div className="text-sm text-zinc-600">
              <p className="font-medium mb-1">About Push Notifications</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-500">
                <li>Notifications work even when the browser is closed</li>
                <li>Each device needs to be subscribed separately</li>
                <li>You can customize which events trigger notifications</li>
                <li>To receive notifications, keep this device connected to the internet</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPushNotificationsPage;
