import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download, Shirt, X, Upload } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  'pending_payment': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'payment_verified': 'bg-green-100 text-green-800 border-green-300',
  'in_production': 'bg-blue-100 text-blue-800 border-blue-300',
  'completed': 'bg-gray-100 text-gray-800 border-gray-300',
  'cancelled': 'bg-red-100 text-red-800 border-red-300'
};

const AdminPODOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadPODOrders();
  }, []);

  const loadPODOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/orders`, {
        withCredentials: true
      });
      // Filter only POD orders
      const podOrders = response.data.filter(order => order.type === 'pod' || order.type === 'POD');
      setOrders(podOrders);
    } catch (error) {
      toast.error('Failed to load POD orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/api/admin/orders/${orderId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success('Status updated successfully');
      loadPODOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleUploadReceipt = async (orderId, file) => {
    try {
      const formData = new FormData();
      formData.append('receipt_file', file);
      
      await axios.post(
        `${API_URL}/api/admin/orders/${orderId}/upload-receipt`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      toast.success('Receipt uploaded successfully');
      loadPODOrders();
      if (selectedOrder?.id === orderId) {
        setShowDetailsModal(false);
      }
    } catch (error) {
      toast.error('Failed to upload receipt');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clothing_item?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading POD orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-oswald text-4xl font-bold uppercase flex items-center gap-3" data-testid="pod-orders-title">
              <Shirt size={36} className="text-primary" />
              Print on Demand Orders
            </h1>
            <p className="text-zinc-600 mt-2">Manage custom print orders and designs</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{orders.length}</div>
            <div className="text-sm text-zinc-600">Total POD Orders</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Search by order ID, customer name, or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="search-pod-orders"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="filter-status"
              >
                <option value="all">All Status</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="payment_verified">Payment Verified</option>
                <option value="in_production">In Production</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Shirt className="mx-auto text-zinc-400 mb-4" size={48} />
              <p className="text-zinc-600 text-lg">No POD orders found</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm p-6"
                data-testid={`pod-order-${order.order_id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-xl text-primary">{order.order_id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {order.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-zinc-600">
                      <span className="font-semibold">{order.user_name}</span> • {order.user_email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="btn-primary py-2 px-4 flex items-center gap-2"
                      data-testid={`view-order-${order.order_id}`}
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Clothing Item</p>
                    <p className="font-semibold">{order.clothing_item}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Quantity</p>
                    <p className="font-semibold">{order.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Print Size</p>
                    <p className="font-semibold">{order.print_size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Total Price</p>
                    <p className="font-semibold text-primary">₦{order.total_price?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Quick Status Update */}
                <div className="flex gap-2 pt-4 border-t border-zinc-200">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    className="px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                    data-testid={`status-select-${order.order_id}`}
                  >
                    <option value="pending_payment">Pending Payment</option>
                    <option value="payment_verified">Payment Verified</option>
                    <option value="in_production">In Production</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">POD Order Details - {selectedOrder.order_id}</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Customer Information</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-zinc-500">Name</p>
                      <p className="font-semibold">{selectedOrder.user_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Email</p>
                      <p className="font-semibold">{selectedOrder.user_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Phone</p>
                      <p className="font-semibold">{selectedOrder.user_phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Order Specifications</h3>
                  <div className="bg-zinc-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-zinc-500">Clothing Item</p>
                        <p className="font-semibold">{selectedOrder.clothing_item}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Total Quantity</p>
                        <p className="font-semibold">{selectedOrder.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Print Size</p>
                        <p className="font-semibold">{selectedOrder.print_size}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Design Placement</p>
                        <p className="font-semibold">{selectedOrder.design_placement}</p>
                      </div>
                    </div>

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
                  </div>
                </div>

                {/* Customer Design Image */}
                {selectedOrder.design_url && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">Customer Design</h3>
                    <div className="relative group border border-zinc-300 rounded-lg overflow-hidden">
                      <img 
                        src={`${API_URL}${selectedOrder.design_url}`} 
                        alt="Customer Design" 
                        className="w-full max-h-96 object-contain bg-zinc-50 p-4"
                      />
                      <a
                        href={`${API_URL}${selectedOrder.design_url}`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download size={16} />
                        Download Design
                      </a>
                    </div>
                  </div>
                )}

                {/* Payment Receipt */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Payment Receipt</h3>
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
                          href={`${API_URL}${selectedOrder.payment_receipt_url}`}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary inline-flex items-center gap-2"
                        >
                          <Download size={16} />
                          Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-4">
                      <p className="text-sm text-zinc-600 mb-3">No receipt uploaded. Upload receipt:</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) handleUploadReceipt(selectedOrder.id, file);
                          }}
                          className="hidden"
                          id="receipt-upload"
                        />
                        <label htmlFor="receipt-upload" className="btn-outline cursor-pointer flex items-center gap-2">
                          <Upload size={16} />
                          Upload Receipt
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="bg-zinc-50 p-4 rounded-lg">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total Price:</span>
                    <span className="text-primary">₦{selectedOrder.total_price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPODOrdersPage;
