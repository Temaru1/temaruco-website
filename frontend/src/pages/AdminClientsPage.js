import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Plus, X, Save, Package } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingClient, setViewingClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    measurements: []
  });

  useEffect(() => {
    loadClients();
  }, []);

  // Filter clients when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(query) ||
        (client.email && client.email.toLowerCase().includes(query)) ||
        (client.phone && client.phone.includes(query))
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/clients`, { withCredentials: true });
      setClients(response.data);
      setFilteredClients(response.data);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const [clientOrders, setClientOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const handleView = async (client) => {
    setViewingClient(client);
    setShowViewModal(true);
    
    // Load client order history
    setLoadingOrders(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/clients/${client.id}/orders`, {
        withCredentials: true
      });
      setClientOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to load client orders:', error);
      setClientOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleAddMeasurement = () => {
    setFormData({
      ...formData,
      measurements: [...formData.measurements, { name: '', value: '' }]
    });
  };

  const handleRemoveMeasurement = (index) => {
    const newMeasurements = formData.measurements.filter((_, i) => i !== index);
    setFormData({ ...formData, measurements: newMeasurements });
  };

  const handleMeasurementChange = (index, field, value) => {
    const newMeasurements = [...formData.measurements];
    newMeasurements[index][field] = value;
    setFormData({ ...formData, measurements: newMeasurements });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(
          `${API_URL}/api/admin/clients/${editingClient.id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Client updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/admin/clients`,
          formData,
          { withCredentials: true }
        );
        toast.success('Client added successfully');
      }
      setShowModal(false);
      setEditingClient(null);
      resetForm();
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save client');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      measurements: client.measurements || []
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/clients/${clientId}`, { withCredentials: true });
      toast.success('Client deleted successfully');
      loadClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      measurements: []
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingClient(null);
    setShowModal(true);
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold">Client Directory</h1>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
          data-testid="add-client-btn"
        >
          <UserPlus size={20} />
          Add Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="client-search-input"
        />
        {searchQuery && (
          <p className="text-sm text-zinc-600 mt-2">
            Found {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}
          </p>
        )}
      </div>

      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <UserPlus size={48} className="mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-600 mb-4">
            {searchQuery ? 'No clients match your search' : 'No clients yet'}
          </p>
          {!searchQuery && (
            <button onClick={openAddModal} className="btn-primary">
              Add Your First Client
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Measurements</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-semibold">{client.name}</td>
                    <td className="px-6 py-4">{client.phone || '-'}</td>
                    <td className="px-6 py-4">{client.email || '-'}</td>
                    <td className="px-6 py-4">{client.address || '-'}</td>
                    <td className="px-6 py-4">
                      {client.measurements && client.measurements.length > 0 ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {client.measurements.length} measurements
                        </span>
                      ) : (
                        <span className="text-zinc-400">No measurements</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(client)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                          title="View Details"
                          data-testid={`view-client-${client.id}`}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-zinc-600 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="text-zinc-600 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="2"
                ></textarea>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold">Measurements</label>
                  <button
                    type="button"
                    onClick={handleAddMeasurement}
                    className="btn-outline text-sm flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Measurement
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {formData.measurements.map((measurement, index) => (
                    <div key={index} className="flex gap-2 bg-zinc-50 p-3 rounded-lg">
                      <input
                        type="text"
                        value={measurement.name}
                        onChange={(e) => handleMeasurementChange(index, 'name', e.target.value)}
                        placeholder="Measurement name (e.g., Chest)"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      <input
                        type="text"
                        value={measurement.value}
                        onChange={(e) => handleMeasurementChange(index, 'value', e.target.value)}
                        placeholder="Value (e.g., 42 inches)"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMeasurement(index)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  {formData.measurements.length === 0 && (
                    <p className="text-zinc-400 text-center py-4">No measurements added yet</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                    resetForm();
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingClient ? 'Update Client' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Client Details Modal */}
      {showViewModal && viewingClient && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-oswald text-2xl font-bold">Client Details</h2>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 p-4 rounded-lg">
                  <p className="text-sm text-zinc-600 mb-1">Name</p>
                  <p className="font-semibold">{viewingClient.name}</p>
                </div>
                <div className="bg-zinc-50 p-4 rounded-lg">
                  <p className="text-sm text-zinc-600 mb-1">Phone</p>
                  <p className="font-semibold">{viewingClient.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-sm text-zinc-600 mb-1">Email</p>
                <p className="font-semibold">{viewingClient.email || 'Not provided'}</p>
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-sm text-zinc-600 mb-1">Address</p>
                <p className="font-semibold">{viewingClient.address || 'Not provided'}</p>
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-sm text-zinc-600 mb-3">Measurements</p>
                {viewingClient.measurements && viewingClient.measurements.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {viewingClient.measurements.map((measurement, index) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <p className="text-sm font-semibold text-zinc-800">{measurement.name}</p>
                        <p className="text-sm text-zinc-600">{measurement.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400">No measurements recorded</p>
                )}
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-sm text-zinc-600 mb-1">Client ID</p>
                <p className="font-mono text-sm">{viewingClient.id}</p>
              </div>

              {viewingClient.created_at && (
                <div className="bg-zinc-50 p-4 rounded-lg">
                  <p className="text-sm text-zinc-600 mb-1">Added On</p>
                  <p className="text-sm">{new Date(viewingClient.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              )}

              {/* Order History Section */}
              <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package size={18} className="text-primary" />
                  Order History
                </h3>
                {loadingOrders ? (
                  <p className="text-sm text-zinc-600">Loading orders...</p>
                ) : clientOrders.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {clientOrders.map((order, index) => (
                      <div key={index} className="bg-white p-3 rounded border flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold font-mono">{order.order_id || order.id}</p>
                          <p className="text-xs text-zinc-600 capitalize">{order.type} • {order.status.replace('_', ' ')}</p>
                          <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">₦{order.total_price?.toLocaleString()}</p>
                          <p className="text-xs text-zinc-600">{order.quantity} items</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <p className="text-sm font-semibold">Total Orders: {clientOrders.length}</p>
                      <p className="text-sm font-semibold">Total Spent: ₦{clientOrders.reduce((sum, o) => sum + (o.total_price || 0), 0).toLocaleString()}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No orders found for this client</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(viewingClient);
                }}
                className="btn-primary flex-1"
              >
                Edit Client
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="btn-outline flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientsPage;