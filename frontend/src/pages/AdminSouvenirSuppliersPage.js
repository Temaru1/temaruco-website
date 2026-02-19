import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, Building2, Phone, Mail, MapPin, Package, Check, XCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminSouvenirSuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [counts, setCounts] = useState({ all: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    phone_number: '',
    whatsapp_number: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    products_supplied: '',
    notes: '',
    status: 'active'
  });

  useEffect(() => {
    loadSuppliers();
  }, [filterStatus]);

  const loadSuppliers = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const response = await axios.get(`${API_URL}/api/admin/souvenir-suppliers?${params.toString()}`, {
        withCredentials: true
      });

      setSuppliers(response.data.suppliers || []);
      setCounts(response.data.counts || { all: 0, active: 0, inactive: 0 });
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadSuppliers();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      phone_number: '',
      whatsapp_number: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'Nigeria',
      products_supplied: '',
      notes: '',
      status: 'active'
    });
    setEditMode(false);
    setSelectedSupplier(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (supplier) => {
    setFormData({
      company_name: supplier.company_name || '',
      contact_person: supplier.contact_person || '',
      phone_number: supplier.phone_number || '',
      whatsapp_number: supplier.whatsapp_number || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      country: supplier.country || 'Nigeria',
      products_supplied: supplier.products_supplied || '',
      notes: supplier.notes || '',
      status: supplier.status || 'active'
    });
    setSelectedSupplier(supplier);
    setEditMode(true);
    setShowModal(true);
  };

  const handleView = (supplier) => {
    setSelectedSupplier(supplier);
    setShowViewModal(true);
  };

  const handleDelete = (supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/api/admin/souvenir-suppliers/${supplierToDelete.id}`, {
        withCredentials: true
      });
      toast.success('Supplier deactivated successfully');
      setShowDeleteConfirm(false);
      setSupplierToDelete(null);
      loadSuppliers();
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!formData.phone_number.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      if (editMode && selectedSupplier) {
        await axios.put(
          `${API_URL}/api/admin/souvenir-suppliers/${selectedSupplier.id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Supplier updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/admin/souvenir-suppliers`,
          formData,
          { withCredentials: true }
        );
        toast.success('Supplier added successfully');
      }
      setShowModal(false);
      resetForm();
      loadSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save supplier');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-3xl font-bold uppercase" data-testid="suppliers-title">
            Souvenir Supplier Contacts
          </h1>
          <p className="text-zinc-600 mt-1">Manage your souvenir suppliers and vendors</p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn-primary flex items-center gap-2"
          data-testid="add-supplier-btn"
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'inactive', label: 'Inactive', count: counts.inactive }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-6 py-4 font-semibold text-sm transition-colors ${
                filterStatus === tab.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 bg-zinc-100 rounded-full text-xs">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search by company, contact, phone, email, products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
              data-testid="search-suppliers"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary px-6">
            Search
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Supplier ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Company Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Contact Person</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" data-testid="suppliers-table">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <Building2 className="mx-auto text-zinc-400 mb-4" size={48} />
                    <p className="text-zinc-600">No suppliers found</p>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-4 font-mono text-primary font-semibold">
                      {supplier.supplier_id}
                    </td>
                    <td className="px-4 py-4 font-semibold">{supplier.company_name}</td>
                    <td className="px-4 py-4">{supplier.contact_person || '-'}</td>
                    <td className="px-4 py-4">{supplier.phone_number}</td>
                    <td className="px-4 py-4 text-sm text-zinc-600">{supplier.email || '-'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        supplier.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(supplier)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-2 text-zinc-600 hover:bg-zinc-100 rounded"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{editMode ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    data-testid="company-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    data-testid="phone-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Products Supplied</label>
                  <textarea
                    rows="2"
                    value={formData.products_supplied}
                    onChange={(e) => setFormData({ ...formData, products_supplied: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Keychains, Mugs, T-shirts, Caps..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Notes</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="Additional notes about this supplier..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1" data-testid="save-supplier-btn">
                  {editMode ? 'Update Supplier' : 'Add Supplier'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Supplier Details</h2>
                <p className="text-primary font-mono">{selectedSupplier.supplier_id}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-zinc-500 hover:text-zinc-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-zinc-50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  Company Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500">Company Name</p>
                    <p className="font-semibold">{selectedSupplier.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Contact Person</p>
                    <p className="font-semibold">{selectedSupplier.contact_person || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedSupplier.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedSupplier.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Phone size={20} className="text-primary" />
                  Contact Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500">Phone</p>
                    <p className="font-semibold">{selectedSupplier.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">WhatsApp</p>
                    <p className="font-semibold">{selectedSupplier.whatsapp_number || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-zinc-500">Email</p>
                    <p className="font-semibold">{selectedSupplier.email || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Address
                </h3>
                <p className="font-semibold">
                  {[selectedSupplier.address, selectedSupplier.city, selectedSupplier.state, selectedSupplier.country]
                    .filter(Boolean)
                    .join(', ') || 'No address provided'}
                </p>
              </div>

              <div className="bg-zinc-50 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Package size={20} className="text-primary" />
                  Products Supplied
                </h3>
                <p>{selectedSupplier.products_supplied || 'Not specified'}</p>
              </div>

              {selectedSupplier.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Notes</h3>
                  <p>{selectedSupplier.notes}</p>
                </div>
              )}

              <div className="text-sm text-zinc-500">
                <p>Created: {new Date(selectedSupplier.created_at).toLocaleString()}</p>
                {selectedSupplier.updated_at && (
                  <p>Last Updated: {new Date(selectedSupplier.updated_at).toLocaleString()}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedSupplier);
                  }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  Edit Supplier
                </button>
                <button onClick={() => setShowViewModal(false)} className="btn-outline flex-1">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Supplier?</h3>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete "{supplierToDelete?.company_name}"? 
                This will set the supplier status to inactive.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSupplierToDelete(null);
                  }}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSouvenirSuppliersPage;
