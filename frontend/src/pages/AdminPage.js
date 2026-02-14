import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Bell, Plus, LogOut, FileText, Settings, FileQuestion, Shield, DollarSign, Image, Users, TrendingUp, ShoppingCart, BarChart3, X, Menu, Shirt, ChevronDown, ArrowLeft, ShoppingBag } from 'lucide-react';
import { getAdminDashboard, getAllOrders, updateOrderStatus, createProduct } from '../utils/api';
import api from '../utils/api';
import { toast } from 'sonner';
import OrderCodeInput from '../components/OrderCodeInput';
import AdminQuotesPage from './AdminQuotesPage';
import AdminCMSPage from './AdminCMSPage';
import AdminCustomRequestsPage from './AdminCustomRequestsPage';
import SuperAdminPage from './SuperAdminPage';
import AdminPricingPage from './AdminPricingPage';
import AdminImageCMSPage from './AdminImageCMSPage';
import AdminProductionPage from './AdminProductionPage';
import AdminClientsPage from './AdminClientsPage';
import AdminFinancialsPage from './AdminFinancialsPage';
import AdminProcurementPage from './AdminProcurementPage';
import AdminMaterialsPage from './AdminMaterialsPage';
import AdminSuppliersPage from './AdminSuppliersPage';
import AdminClothingItemsPage from './AdminClothingItemsPage';
import AdminReminderSettingsPage from './AdminReminderSettingsPage';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await getAdminDashboard();
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !dashboardData) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div>
      <h1 className="font-oswald text-4xl font-bold mb-8" data-testid="admin-dashboard-title">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">Today's Orders</p>
          <p className="text-4xl font-oswald font-bold">{dashboardData.today_stats.total_orders}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">Pending Payment</p>
          <p className="text-4xl font-oswald font-bold text-yellow-600">{dashboardData.today_stats.pending_payment}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">Payment Submitted</p>
          <p className="text-4xl font-oswald font-bold text-blue-600">{dashboardData.today_stats.payment_submitted}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">In Production</p>
          <p className="text-4xl font-oswald font-bold text-purple-600">{dashboardData.today_stats.in_production}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">Ready for Delivery</p>
          <p className="text-4xl font-oswald font-bold text-indigo-600">{dashboardData.today_stats.ready_for_delivery}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">Completed</p>
          <p className="text-4xl font-oswald font-bold text-green-600">{dashboardData.today_stats.completed}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">Delivered</p>
          <p className="text-4xl font-oswald font-bold text-green-700">{dashboardData.today_stats.delivered}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-zinc-600 mb-1">Today's Revenue</p>
          <p className="text-3xl font-oswald font-bold text-primary">₦{dashboardData.today_stats.revenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="font-oswald text-2xl font-semibold">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dashboardData.recent_orders.map(order => (
                <tr key={order.id}>
                  <td className="px-6 py-4 text-sm font-mono font-semibold">{order.order_id || order.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm">{order.user_name}</td>
                  <td className="px-6 py-4 text-sm capitalize">{order.type}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₦{order.total_price.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`order-status-badge status-${order.status}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    if (!searchOrderId) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterStatus]);

  // Auto-highlight and scroll to order from notification
  useEffect(() => {
    if (location.state?.openOrderId && orders.length > 0) {
      const orderId = location.state.openOrderId;
      setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          orderElement.classList.add('highlight-order');
        }
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, orders]);

  const loadOrders = async () => {
    try {
      const params = {};
      if (filterType) params.order_type = filterType;
      if (filterStatus) params.status = filterStatus;
      
      const response = await getAllOrders(params);
      setOrders(response.data);
      setSearchResults(null);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchOrderId.trim()) {
      toast.error('Please enter an Order ID');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/admin/orders/search', {
        params: { order_id: searchOrderId }
      });
      
      if (response.data.length === 0) {
        toast.info('No orders found with that ID');
        setSearchResults([]);
      } else {
        setSearchResults(response.data);
        toast.success(`Found ${response.data.length} order(s)`);
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchOrderId('');
    setSearchResults(null);
    loadOrders();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated');
      if (searchResults) {
        handleSearch();
      } else {
        loadOrders();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const displayOrders = searchResults !== null ? searchResults : orders;

  return (
    <div>
      <h1 className="font-oswald text-4xl font-bold mb-8" data-testid="admin-orders-title">Orders Management</h1>

      {/* Search Box */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <OrderCodeInput
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by Order ID (e.g., TM-0225-000001)"
            className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="order-search-input"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            data-testid="search-order-btn"
          >
            Search
          </button>
          {searchResults !== null && (
            <button
              onClick={handleClearSearch}
              className="px-6 py-2 bg-zinc-500 text-white rounded-lg hover:bg-zinc-600 transition"
              data-testid="clear-search-btn"
            >
              Clear
            </button>
          )}
        </div>
        {searchResults !== null && (
          <p className="text-sm text-zinc-600 mt-2">
            {searchResults.length > 0 
              ? `Found ${searchResults.length} order(s)` 
              : 'No orders found'
            }
          </p>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2"
          data-testid="filter-type"
        >
          <option value="">All Types</option>
          <option value="bulk">Bulk</option>
          <option value="pod">POD</option>
          <option value="boutique">Boutique</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2"
          data-testid="filter-status"
        >
          <option value="">All Status</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="payment_submitted">Payment Submitted</option>
          <option value="payment_verified">Payment Verified</option>
          <option value="in_production">In Production</option>
          <option value="ready_for_delivery">Ready for Delivery</option>
          <option value="completed">Completed</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" data-testid="admin-orders-table">
                {displayOrders.map(order => (
                  <tr 
                    key={order.id}
                    className="order-row"
                    data-order-id={order.order_id || order.id}
                  >
                    <td className="px-6 py-4 text-sm font-mono font-semibold">{order.order_id || order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm">{order.user_name}</td>
                    <td className="px-6 py-4 text-sm capitalize">{order.type}</td>
                    <td className="px-6 py-4 text-sm">{order.quantity}</td>
                    <td className="px-6 py-4 text-sm font-semibold">₦{order.total_price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.order_id || order.id, e.target.value)}
                        className="text-sm px-2 py-1 border rounded"
                        data-testid={`status-select-${order.order_id || order.id}`}
                      >
                        <option value="pending_payment">Pending Payment</option>
                        <option value="payment_submitted">Payment Submitted</option>
                        <option value="payment_verified">Payment Verified</option>
                        <option value="in_production">In Production</option>
                        <option value="ready_for_delivery">Ready for Delivery</option>
                        <option value="completed">Completed</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button 
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                        className="text-primary hover:underline"
                        data-testid={`view-details-${order.order_id || order.id}`}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-oswald text-2xl font-bold">Order Details</h2>
                <p className="font-mono text-lg font-bold text-blue-600 mt-2">
                  {selectedOrder.order_id || selectedOrder.id}
                </p>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Customer Name</p>
                  <p className="font-semibold">{selectedOrder.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Email</p>
                  <p className="font-semibold">{selectedOrder.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Phone</p>
                  <p className="font-semibold">{selectedOrder.user_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Order Type</p>
                  <p className="font-semibold capitalize">{selectedOrder.type}</p>
                </div>
              </div>

              {/* Order Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Quantity</p>
                  <p className="font-semibold">{selectedOrder.quantity} items</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Total Amount</p>
                  <p className="font-semibold text-lg">₦{selectedOrder.total_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Status</p>
                  <p className="font-semibold capitalize">{selectedOrder.status.replace('_', ' ')}</p>
                </div>
              </div>

              {/* POD Specific: Design File Download */}
              {selectedOrder.type === 'pod' && selectedOrder.design_url && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-3">Print-on-Demand Design File</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-semibold text-sm">Design File</p>
                        <p className="text-xs text-zinc-600">{selectedOrder.design_url.split('/').pop()}</p>
                      </div>
                    </div>
                    <a
                      href={`${process.env.REACT_APP_BACKEND_URL}${selectedOrder.design_url}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center gap-2"
                      data-testid="download-design-file"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Design
                    </a>
                  </div>
                </div>
              )}

              {/* Bulk Order Specific */}
              {selectedOrder.type === 'bulk' && (
                <div>
                  <p className="text-sm text-zinc-600 mb-2">Order Details</p>
                  <div className="bg-zinc-50 p-4 rounded-lg space-y-3">
                    {selectedOrder.clothing_item && (
                      <p><span className="font-semibold">Item:</span> {selectedOrder.clothing_item}</p>
                    )}
                    {selectedOrder.print_type && (
                      <p><span className="font-semibold">Print Type:</span> {selectedOrder.print_type}</p>
                    )}
                    {selectedOrder.fabric_quality && (
                      <p><span className="font-semibold">Fabric Quality:</span> {selectedOrder.fabric_quality}</p>
                    )}
                    
                    {/* Color Quantities */}
                    {selectedOrder.color_quantities && Object.keys(selectedOrder.color_quantities).length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Color Breakdown:</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(selectedOrder.color_quantities).map(([color, qty]) => (
                            qty > 0 && (
                              <span key={color} className="px-3 py-1 bg-white rounded-full text-sm border border-zinc-300">
                                {color}: {qty}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Size Breakdown */}
                    {selectedOrder.size_breakdown && Object.keys(selectedOrder.size_breakdown).length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Size Breakdown:</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(selectedOrder.size_breakdown).map(([size, qty]) => (
                            qty > 0 && (
                              <span key={size} className="px-3 py-1 bg-white rounded-full text-sm border border-zinc-300">
                                {size}: {qty}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Design Image for Bulk Orders */}
                    {selectedOrder.design_url && (
                      <div className="mt-3">
                        <p className="font-semibold mb-2">Design Image:</p>
                        <div className="relative group">
                          <img 
                            src={`${process.env.REACT_APP_BACKEND_URL}${selectedOrder.design_url}`} 
                            alt="Design" 
                            className="w-full max-h-64 object-contain rounded-lg border border-zinc-300 bg-white"
                          />
                          <a
                            href={`${process.env.REACT_APP_BACKEND_URL}${selectedOrder.design_url}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* POD Order Specific */}
              {selectedOrder.type === 'pod' && (
                <div>
                  <p className="text-sm text-zinc-600 mb-2">POD Order Details</p>
                  <div className="bg-zinc-50 p-4 rounded-lg space-y-3">
                    {selectedOrder.clothing_item && (
                      <p><span className="font-semibold">Item:</span> {selectedOrder.clothing_item}</p>
                    )}
                    {selectedOrder.print_size && (
                      <p><span className="font-semibold">Print Size:</span> {selectedOrder.print_size}</p>
                    )}
                    {selectedOrder.design_placement && (
                      <p><span className="font-semibold">Design Placement:</span> {selectedOrder.design_placement}</p>
                    )}
                    
                    {/* Color Quantities */}
                    {selectedOrder.color_quantities && Object.keys(selectedOrder.color_quantities).length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Color Breakdown:</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(selectedOrder.color_quantities).map(([color, qty]) => (
                            qty > 0 && (
                              <span key={color} className="px-3 py-1 bg-white rounded-full text-sm border border-zinc-300">
                                {color}: {qty}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Size Breakdown */}
                    {selectedOrder.size_breakdown && Object.keys(selectedOrder.size_breakdown).length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Size Breakdown:</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(selectedOrder.size_breakdown).map(([size, qty]) => (
                            qty > 0 && (
                              <span key={size} className="px-3 py-1 bg-white rounded-full text-sm border border-zinc-300">
                                {size}: {qty}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Design Image Preview */}
                    {selectedOrder.design_url && (
                      <div className="mt-3">
                        <p className="font-semibold mb-2">Customer Design:</p>
                        <div className="relative group">
                          <img 
                            src={`${process.env.REACT_APP_BACKEND_URL}${selectedOrder.design_url}`} 
                            alt="Customer Design" 
                            className="w-full max-h-64 object-contain rounded-lg border border-zinc-300 bg-white"
                          />
                          <a
                            href={`${process.env.REACT_APP_BACKEND_URL}${selectedOrder.design_url}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Download Design
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Boutique Order Specific */}
              {selectedOrder.type === 'boutique' && selectedOrder.items && (
                <div>
                  <p className="text-sm text-zinc-600 mb-2">Boutique Items</p>
                  <div className="bg-zinc-50 p-4 rounded-lg space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-200 last:border-0">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-zinc-600">Size: {item.size} • Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">₦{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Receipt Section */}
              <div className="border-t pt-4">
                <p className="text-sm text-zinc-600 mb-3 font-semibold">Payment Receipt</p>
                {selectedOrder.payment_receipt_url ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="font-semibold text-sm text-green-800">Receipt Uploaded</p>
                          <p className="text-xs text-green-600">{selectedOrder.payment_receipt_url.split('/').pop()}</p>
                        </div>
                      </div>
                      <a
                        href={`${process.env.REACT_APP_BACKEND_URL}${selectedOrder.payment_receipt_url}`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        View/Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-4">
                    <p className="text-sm text-zinc-600 mb-3">No receipt uploaded yet. Upload receipt:</p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        try {
                          const formData = new FormData();
                          formData.append('receipt_file', file);
                          
                          await api.post(`/admin/orders/${selectedOrder.id}/upload-receipt`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                          });
                          
                          toast.success('Receipt uploaded successfully');
                          setShowOrderModal(false);
                          loadOrders();
                        } catch (error) {
                          toast.error('Failed to upload receipt');
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Delivery Information */}
              {(selectedOrder.delivery_address || selectedOrder.delivery_phone) && (
                <div>
                  <p className="text-sm text-zinc-600 mb-2">Delivery Information</p>
                  <div className="bg-zinc-50 p-4 rounded-lg space-y-1">
                    {selectedOrder.recipient_name && <p><span className="font-semibold">Recipient:</span> {selectedOrder.recipient_name}</p>}
                    {selectedOrder.delivery_phone && <p><span className="font-semibold">Phone:</span> {selectedOrder.delivery_phone}</p>}
                    {selectedOrder.delivery_address && <p><span className="font-semibold">Address:</span> {selectedOrder.delivery_address}</p>}
                    {selectedOrder.delivery_city && <p><span className="font-semibold">City:</span> {selectedOrder.delivery_city}</p>}
                    {selectedOrder.delivery_state && <p><span className="font-semibold">State:</span> {selectedOrder.delivery_state}</p>}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Notes</p>
                  <p className="bg-zinc-50 p-4 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Order Date */}
              <div>
                <p className="text-sm text-zinc-600 mb-1">Order Date</p>
                <p className="font-semibold">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.is_super_admin;
  const userRole = user.role || {};
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState('orders');

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Sidebar nav groups
  const navGroups = [
    {
      id: 'orders',
      label: 'Orders',
      icon: Package,
      items: [
        { label: 'Dashboard', path: '/admin/dashboard/', icon: LayoutDashboard },
        { label: 'All Orders', path: '/admin/dashboard/orders', icon: Package },
        { label: 'POD Orders', path: '/admin/pod-orders', icon: Shirt },
        { label: 'Enquiries', path: '/admin/dashboard/custom-requests', icon: FileQuestion },
        { label: 'Quotes', path: '/admin/dashboard/quotes', icon: FileText },
      ]
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      items: [
        { label: 'Clothing Items', path: '/admin/clothing-items', icon: Shirt },
        { label: 'Fabrics & Souvenirs', path: '/admin/products', icon: Package },
        { label: 'Boutique', path: '/admin/inventory', icon: ShoppingBag },
        { label: 'Materials', path: '/admin/dashboard/materials', icon: Package },
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      items: [
        { label: 'Revenue', path: '/admin/revenue-analytics', icon: TrendingUp },
        { label: 'Website', path: '/admin/analytics', icon: BarChart3 },
        ...(isSuperAdmin || userRole.can_view_financials ? [{ label: 'Financials', path: '/admin/dashboard/financials', icon: DollarSign }] : []),
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      items: [
        { label: 'Staff', path: '/admin/staff', icon: Users },
        { label: 'Clients', path: '/admin/dashboard/clients', icon: Users },
        { label: 'Suppliers', path: '/admin/dashboard/suppliers', icon: Users },
        ...(isSuperAdmin || userRole.can_manage_cms ? [{ label: 'Website CMS', path: '/admin/dashboard/cms', icon: Settings }] : []),
        ...(isSuperAdmin ? [{ label: 'Manage Admins', path: '/admin/dashboard/super-admin', icon: Shield }] : []),
      ]
    },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 h-screen
          w-64 bg-zinc-900 text-white
          transition-transform duration-300 ease-in-out
          z-50 lg:z-auto overflow-y-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        data-testid="admin-sidebar"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 lg:hidden text-white hover:text-zinc-300"
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold tracking-wide">
            {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Temaruco Control Panel</p>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navGroups.map((group) => (
            <div key={group.id} className="mb-2">
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.id ? '' : group.id)}
                className={`w-full flex items-center justify-between py-3 px-4 rounded-lg text-left transition-colors ${
                  expandedGroup === group.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <group.icon size={18} />
                  <span className="font-medium">{group.label}</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${expandedGroup === group.id ? 'rotate-180' : ''}`}
                />
              </button>
              
              {expandedGroup === group.id && (
                <div className="mt-1 ml-4 border-l border-zinc-800 pl-4 space-y-1">
                  {group.items.map((item, idx) => (
                    <Link
                      key={idx}
                      to={item.path}
                      className={`flex items-center gap-3 py-2 px-3 rounded-lg text-sm transition-colors ${
                        location.pathname === item.path 
                          ? 'bg-[#D90429] text-white' 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                      }`}
                    >
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800 bg-zinc-900">
          <Link
            to="/"
            className="flex items-center gap-3 py-2 px-4 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Website</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header with Hamburger */}
        <header className="lg:hidden bg-white border-b border-zinc-200 p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-900 hover:text-primary"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-oswald text-xl font-bold">
              {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
            </h1>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/production" element={<AdminProductionPage />} />
            <Route path="/orders" element={<AdminOrders />} />
            <Route path="/custom-requests" element={<AdminCustomRequestsPage />} />
            <Route path="/quotes" element={<AdminQuotesPage />} />
            {(isSuperAdmin || userRole.can_manage_cms || userRole.can_manage_products) && <Route path="/cms" element={<AdminCMSPage />} />}
            {(isSuperAdmin || userRole.can_manage_cms) && <Route path="/images" element={<AdminImageCMSPage />} />}
            <Route path="/clients" element={<AdminClientsPage />} />
            <Route path="/procurement" element={<AdminProcurementPage />} />
            <Route path="/materials" element={<AdminMaterialsPage />} />
            <Route path="/suppliers" element={<AdminSuppliersPage />} />
            <Route path="/clothing-items" element={<AdminClothingItemsPage />} />
            {(isSuperAdmin || userRole.can_view_financials) && <Route path="/financials" element={<AdminFinancialsPage />} />}
            {(isSuperAdmin || userRole.can_manage_products || userRole.can_manage_cms) && <Route path="/pricing" element={<AdminPricingPage />} />}
            {isSuperAdmin && <Route path="/reminder-settings" element={<AdminReminderSettingsPage />} />}
            {isSuperAdmin && <Route path="/super-admin" element={<SuperAdminPage />} />}
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
