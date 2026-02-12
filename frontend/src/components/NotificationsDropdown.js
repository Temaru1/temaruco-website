import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Package, AlertCircle, DollarSign, Users, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const NotificationsDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications count
  const loadNotificationCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/notifications/count`, {
        withCredentials: true
      });
      // Use the unread_count from the API response
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notification count:', error);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/notifications`, {
        withCredentials: true
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(
        `${API_URL}/api/admin/notifications/${notificationId}/read`,
        {},
        { withCredentials: true }
      );
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      
      // Update count
      loadNotificationCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (user && (user.is_admin || user.is_super_admin)) {
      loadNotificationCount();
      
      // Refresh count every 30 seconds
      const interval = setInterval(loadNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'new_enquiry') {
      // Navigate to enquiries page with highlight parameter
      sessionStorage.setItem('notificationReturnPath', window.location.pathname);
      navigate(`/admin/enquiries?highlight=${notification.order_id}`);
    } else if (notification.order_id) {
      // Store current path for back navigation
      sessionStorage.setItem('notificationReturnPath', window.location.pathname);
      
      // Navigate to ORDERS page (not production) with order ID in state
      navigate('/admin/dashboard/orders', { 
        state: { 
          openOrderId: notification.order_id,
          fromNotification: true 
        } 
      });
    } else if (notification.type === 'low_stock') {
      sessionStorage.setItem('notificationReturnPath', window.location.pathname);
      navigate('/admin/inventory');
    } else if (notification.type === 'custom_request') {
      sessionStorage.setItem('notificationReturnPath', window.location.pathname);
      navigate('/admin/dashboard/custom-requests');
    } else {
      // Default to orders page
      sessionStorage.setItem('notificationReturnPath', window.location.pathname);
      navigate('/admin/dashboard/orders');
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order':
        return <Package size={18} className="text-blue-500" />;
      case 'payment_submitted':
        return <DollarSign size={18} className="text-green-500" />;
      case 'low_stock':
        return <AlertCircle size={18} className="text-orange-500" />;
      case 'custom_request':
        return <Users size={18} className="text-purple-500" />;
      case 'new_enquiry':
        return <Users size={18} className="text-indigo-500" />;
      default:
        return <Bell size={18} className="text-zinc-500" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!user || (!user.is_admin && !user.is_super_admin)) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-zinc-100 rounded-lg transition-colors"
        data-testid="notifications-button"
      >
        <Bell size={24} className="text-zinc-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-zinc-200 z-50">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-zinc-200">
            <h3 className="font-semibold text-lg">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-100 rounded"
            >
              <X size={18} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-zinc-500 mt-2">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-zinc-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-zinc-200 text-center">
              <button
                onClick={() => {
                  navigate('/admin/dashboard/production');
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:underline font-medium"
              >
                View All Orders
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
