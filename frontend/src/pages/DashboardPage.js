import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, MapPin } from 'lucide-react';
import { getMyOrders, updateAddress } from '../utils/api';
import { toast } from 'sonner';

const DashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    loadOrders();
    // Load user address from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setAddress(user.address || '');
  }, []);

  const loadOrders = async () => {
    try {
      const response = await getMyOrders();
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    setSavingAddress(true);
    try {
      await updateAddress(address);
      // Update localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.address = address;
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Address saved successfully!');
      setEditingAddress(false);
    } catch (error) {
      toast.error('Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'status-pending',
      in_production: 'status-in_production',
      ready: 'status-ready',
      completed: 'status-completed'
    };
    return badges[status] || 'status-pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 bg-zinc-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-oswald text-5xl font-bold uppercase mb-8" data-testid="dashboard-title">
          My Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <Package className="text-primary mb-2" size={32} />
            <p className="text-3xl font-oswald font-bold">{orders.length}</p>
            <p className="text-sm text-zinc-600">Total Orders</p>
          </div>

          <div className="stat-card">
            <Clock className="text-yellow-600 mb-2" size={32} />
            <p className="text-3xl font-oswald font-bold">
              {orders.filter(o => o.status === 'in_production').length}
            </p>
            <p className="text-sm text-zinc-600">In Production</p>
          </div>

          <div className="stat-card">
            <CheckCircle className="text-green-600 mb-2" size={32} />
            <p className="text-3xl font-oswald font-bold">
              {orders.filter(o => o.status === 'completed').length}
            </p>
            <p className="text-sm text-zinc-600">Completed</p>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="text-primary" size={24} />
              <h2 className="font-oswald text-xl font-semibold">Delivery Address</h2>
            </div>
            {!editingAddress && (
              <button
                onClick={() => setEditingAddress(true)}
                className="text-sm text-primary hover:underline"
                data-testid="edit-address-btn"
              >
                {address ? 'Edit' : 'Add Address'}
              </button>
            )}
          </div>

          {editingAddress ? (
            <div className="space-y-4">
              <textarea
                rows="3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full"
                placeholder="Enter your full delivery address..."
                data-testid="address-input"
              ></textarea>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveAddress}
                  disabled={savingAddress}
                  className="btn-primary"
                  data-testid="save-address-btn"
                >
                  {savingAddress ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  onClick={() => setEditingAddress(false)}
                  className="btn-outline"
                  data-testid="cancel-address-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-600 font-manrope" data-testid="address-display">
              {address || 'No address added yet. Click "Add Address" to set your delivery location.'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-oswald text-2xl font-semibold">My Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-manrope text-zinc-600">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y" data-testid="orders-table-body">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 text-sm font-mono">{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-sm capitalize">{order.type}</td>
                      <td className="px-6 py-4 text-sm">{order.clothing_item || 'T-Shirt'}</td>
                      <td className="px-6 py-4 text-sm">{order.quantity}</td>
                      <td className="px-6 py-4 text-sm font-semibold">₦{order.total_price.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`order-status-badge ${getStatusBadge(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
