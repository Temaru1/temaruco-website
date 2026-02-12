import React, { useState } from 'react';
import { Search, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import OrderCodeInput from '../components/OrderCodeInput';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const OrderTrackingPage = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingCode.trim()) {
      toast.error('Please enter an order or enquiry code');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setOrderData(null);

    try {
      const response = await axios.get(
        `${API_URL}/api/public/track/${trackingCode.trim()}`
      );
      setOrderData(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error('Failed to track order');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      payment_verification: 'bg-blue-100 text-blue-800',
      in_production: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    if (status === 'completed' || status === 'accepted') return <CheckCircle className="text-green-600" />;
    if (status === 'cancelled' || status === 'rejected') return <XCircle className="text-red-600" />;
    if (status === 'in_production') return <Package className="text-purple-600" />;
    return <Clock className="text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="font-oswald text-5xl font-bold mb-4">Track Your Order</h1>
          <p className="text-zinc-600">Enter your order or enquiry code to check the status</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Order/Enquiry Code
              </label>
              <OrderCodeInput
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="TM-0226-090001 or ENQ-0226-090001"
                className="w-full px-4 py-4 text-base md:text-lg border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Format: TM-MMYY-DDXXXX for orders or ENQ-MMYY-DDXXXX for enquiries
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base md:text-lg"
            >
              <Search size={20} />
              {loading ? 'Tracking...' : 'Track Order'}
            </button>
          </form>
        </div>

        {notFound && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle size={48} className="mx-auto mb-3 text-red-600" />
            <h3 className="font-bold text-lg mb-2">Order Not Found</h3>
            <p className="text-zinc-600">No order or enquiry found with code: {trackingCode}</p>
            <p className="text-sm text-zinc-500 mt-2">Please check your code and try again</p>
          </div>
        )}

        {orderData && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6 pb-6 border-b">
              <div>
                <p className="text-sm text-zinc-600">Order Code</p>
                <p className="font-mono text-2xl font-bold text-primary">{orderData.code}</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusIcon(orderData.status)}
                <span className={`px-4 py-2 rounded-full font-semibold ${getStatusBadge(orderData.status)}`}>
                  {orderData.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-sm text-zinc-600 mb-1">Type</p>
                <p className="font-semibold text-lg capitalize">{orderData.type}</p>
              </div>

              {orderData.type !== 'custom_request' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-zinc-600 mb-1">Quantity</p>
                      <p className="font-semibold">{orderData.quantity} items</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600 mb-1">Total Amount</p>
                      <p className="font-semibold text-lg">₦{orderData.total_price?.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              )}

              {orderData.type === 'custom_request' && (
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Description</p>
                  <p className="font-semibold">{orderData.item_description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-zinc-600 mb-1">Created</p>
                <p className="font-semibold">{new Date(orderData.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric'
                })}</p>
              </div>

              {orderData.notes && (
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Notes</p>
                  <p className="bg-zinc-50 p-4 rounded-lg">{orderData.notes}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <p className="text-sm font-semibold text-blue-800 mb-2">Need Help?</p>
                <p className="text-sm text-blue-700">
                  For inquiries about your order, please contact us at <span className="font-semibold">admin@temaruco.com</span> or call <span className="font-semibold">+234 XXX XXX XXXX</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;