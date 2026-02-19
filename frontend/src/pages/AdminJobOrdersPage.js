import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X, Calendar, Package, ClipboardList, User, Mail, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminJobOrdersPage = () => {
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    date_created: new Date().toISOString().split('T')[0],
    items: [{ item_name: '', quantity: 1 }],
    description: '',
    size: '',
    color: '',
    gender: '',
    delivery_due_date: '',
    other_specifications: '',
    authorized_signature: ''
  });

  useEffect(() => {
    loadJobOrders();
  }, []);

  const loadJobOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (dueDateFrom) params.append('due_date_from', dueDateFrom);
      if (dueDateTo) params.append('due_date_to', dueDateTo);
      
      const response = await axios.get(`${API_URL}/api/admin/job-orders?${params.toString()}`, {
        withCredentials: true
      });
      setJobOrders(response.data.job_orders || []);
    } catch (error) {
      toast.error('Failed to load job orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadJobOrders();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      date_created: new Date().toISOString().split('T')[0],
      items: [{ item_name: '', quantity: 1 }],
      description: '',
      size: '',
      color: '',
      gender: '',
      delivery_due_date: '',
      other_specifications: '',
      authorized_signature: ''
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_name: '', quantity: 1 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/admin/job-orders`, formData, {
        withCredentials: true
      });
      toast.success('Job order created successfully');
      setShowCreateModal(false);
      resetForm();
      loadJobOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create job order');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`${API_URL}/api/admin/job-orders/${selectedOrder.id}`, formData, {
        withCredentials: true
      });
      toast.success('Job order updated successfully');
      setShowEditModal(false);
      loadJobOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update job order');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/api/admin/job-orders/${selectedOrder.id}`, {
        withCredentials: true
      });
      toast.success('Job order deleted');
      setShowDeleteConfirm(false);
      setSelectedOrder(null);
      loadJobOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete job order');
    }
  };

  const openEdit = (order) => {
    setSelectedOrder(order);
    setFormData({
      name: order.name || '',
      email: order.email || '',
      date_created: order.date_created || '',
      items: order.items?.length ? order.items : [{ item_name: '', quantity: 1 }],
      description: order.description || '',
      size: order.size || '',
      color: order.color || '',
      gender: order.gender || '',
      delivery_due_date: order.delivery_due_date || '',
      other_specifications: order.other_specifications || '',
      authorized_signature: order.authorized_signature || ''
    });
    setShowEditModal(true);
  };

  const openView = (order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const JobOrderForm = ({ onSubmit, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            required
            data-testid="job-order-name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            data-testid="job-order-email"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date Created</label>
          <input
            type="date"
            value={formData.date_created}
            onChange={(e) => setFormData(prev => ({ ...prev, date_created: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Delivery Due Date</label>
          <input
            type="date"
            value={formData.delivery_due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, delivery_due_date: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            data-testid="job-order-due-date"
          />
        </div>
      </div>

      {/* Dynamic Items */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">Items</label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="add-item-btn">
            <Plus size={16} className="mr-1" /> Add Row
          </Button>
        </div>
        <div className="space-y-2">
          {formData.items.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Item Name"
                value={item.item_name}
                onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                min="1"
              />
              {formData.items.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          rows="3"
          data-testid="job-order-description"
        />
      </div>

      {/* Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Size</label>
          <input
            type="text"
            value={formData.size}
            onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Color</label>
          <input
            type="text"
            value={formData.color}
            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            data-testid="job-order-gender"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Unisex">Unisex</option>
          </select>
        </div>
      </div>

      {/* Other Specifications */}
      <div>
        <label className="block text-sm font-medium mb-1">Other Specifications</label>
        <textarea
          value={formData.other_specifications}
          onChange={(e) => setFormData(prev => ({ ...prev, other_specifications: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          rows="2"
        />
      </div>

      {/* Authorized Signature */}
      <div>
        <label className="block text-sm font-medium mb-1">Authorized Signature</label>
        <input
          type="text"
          value={formData.authorized_signature}
          onChange={(e) => setFormData(prev => ({ ...prev, authorized_signature: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          placeholder="Enter authorized signature"
          data-testid="job-order-signature"
        />
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" className="flex-1" data-testid="submit-job-order">
          {isEdit ? 'Update Job Order' : 'Create Job Order'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-3xl font-bold uppercase" data-testid="job-orders-title">
            Job Orders
          </h1>
          <p className="text-zinc-600 mt-1">Manage internal job orders and production requests</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }} data-testid="create-job-order-btn">
          <Plus size={18} className="mr-2" /> Create Job Order
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or job ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
              data-testid="search-job-orders"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Due From</label>
            <input
              type="date"
              value={dueDateFrom}
              onChange={(e) => setDueDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Due To</label>
            <input
              type="date"
              value={dueDateTo}
              onChange={(e) => setDueDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSearch} data-testid="search-btn">Search</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Job Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" data-testid="job-orders-table">
              {jobOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <ClipboardList className="mx-auto text-zinc-400 mb-4" size={48} />
                    <p className="text-zinc-600">No job orders found</p>
                  </td>
                </tr>
              ) : (
                jobOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-[#D90429]">{order.job_order_id}</td>
                    <td className="px-4 py-3">{order.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{order.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {order.items?.length || 0} item(s)
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.delivery_due_date ? new Date(order.delivery_due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openView(order)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="View"
                          data-testid={`view-${order.id}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(order)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Edit"
                          data-testid={`edit-${order.id}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => { setSelectedOrder(order); setShowDeleteConfirm(true); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                          data-testid={`delete-${order.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create Job Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>
            <JobOrderForm onSubmit={handleCreate} />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Job Order</h3>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>
            <JobOrderForm onSubmit={handleUpdate} isEdit />
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Job Order Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-[#D90429]">{selectedOrder.job_order_id}</p>
                <p className="text-sm text-zinc-500">Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="text-zinc-400" size={18} />
                  <div>
                    <p className="text-xs text-zinc-500">Name</p>
                    <p className="font-medium">{selectedOrder.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="text-zinc-400" size={18} />
                  <div>
                    <p className="text-xs text-zinc-500">Email</p>
                    <p className="font-medium">{selectedOrder.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="text-zinc-400" size={18} />
                  <div>
                    <p className="text-xs text-zinc-500">Date Created</p>
                    <p className="font-medium">{selectedOrder.date_created}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="text-zinc-400" size={18} />
                  <div>
                    <p className="text-xs text-zinc-500">Delivery Due</p>
                    <p className="font-medium">{selectedOrder.delivery_due_date || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {selectedOrder.items?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Package size={18} /> Items
                  </h4>
                  <table className="w-full border rounded-lg overflow-hidden">
                    <thead className="bg-zinc-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm">Item Name</th>
                        <th className="px-4 py-2 text-left text-sm">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedOrder.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">{item.item_name}</td>
                          <td className="px-4 py-2">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Specifications */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Size</p>
                  <p className="font-medium">{selectedOrder.size || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Color</p>
                  <p className="font-medium">{selectedOrder.color || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Gender</p>
                  <p className="font-medium">{selectedOrder.gender || '-'}</p>
                </div>
              </div>

              {selectedOrder.description && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText size={18} /> Description
                  </h4>
                  <p className="text-zinc-700 bg-zinc-50 p-3 rounded-lg">{selectedOrder.description}</p>
                </div>
              )}

              {selectedOrder.other_specifications && (
                <div>
                  <h4 className="font-semibold mb-2">Other Specifications</h4>
                  <p className="text-zinc-700 bg-zinc-50 p-3 rounded-lg">{selectedOrder.other_specifications}</p>
                </div>
              )}

              {selectedOrder.authorized_signature && (
                <div>
                  <h4 className="font-semibold mb-2">Authorized Signature</h4>
                  <p className="text-zinc-700 italic">{selectedOrder.authorized_signature}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => openEdit(selectedOrder)}>
                  <Edit size={16} className="mr-2" /> Edit
                </Button>
                <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Job Order?</h3>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete job order "{selectedOrder.job_order_id}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  data-testid="confirm-delete-btn"
                >
                  Yes, Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteConfirm(false); setSelectedOrder(null); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJobOrdersPage;
