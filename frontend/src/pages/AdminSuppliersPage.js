import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Plus, Phone, Mail, X, Package } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminSuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    product: '',
    phone_number: '',
    email: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/suppliers`, {
        withCredentials: true
      });
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/suppliers`, supplierForm, {
        withCredentials: true
      });
      toast.success('Supplier added successfully');
      setShowAddModal(false);
      setSupplierForm({
        name: '',
        product: '',
        phone_number: '',
        email: '',
        address: '',
        notes: ''
      });
      loadSuppliers();
    } catch (error) {
      toast.error('Failed to add supplier');
    }
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      product: supplier.product,
      phone_number: supplier.phone_number,
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setShowEditModal(true);
  };

  const updateSupplier = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/admin/suppliers/${editingSupplier.id}`, supplierForm, {
        withCredentials: true
      });
      toast.success('Supplier updated successfully');
      setShowEditModal(false);
      setEditingSupplier(null);
      setSupplierForm({
        name: '',
        product: '',
        phone_number: '',
        email: '',
        address: '',
        notes: ''
      });
      loadSuppliers();
    } catch (error) {
      toast.error('Failed to update supplier');
    }
  };

  const deleteSupplier = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/suppliers/${supplierId}`, {
        withCredentials: true
      });
      toast.success('Supplier deleted');
      loadSuppliers();
    } catch (error) {
      toast.error('Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold">Suppliers Directory</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 text-zinc-400" size={20} />
        <input
          type="text"
          placeholder="Search by name or product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-100">
            <tr>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Product</th>
              <th className="text-left py-3 px-4">Phone</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b hover:bg-zinc-50">
                  <td className="py-3 px-4 font-semibold">{supplier.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-zinc-500" />
                      {supplier.product}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <a href={`tel:${supplier.phone_number}`} className="flex items-center gap-1 text-primary hover:underline">
                      <Phone size={14} />
                      {supplier.phone_number}
                    </a>
                  </td>
                  <td className="py-3 px-4">
                    {supplier.email && (
                      <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Mail size={14} />
                        {supplier.email}
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="text-primary hover:text-primary/80 text-sm font-semibold"
                        data-testid={`edit-supplier-${supplier.id}`}
                      >
                        Edit
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        onClick={() => deleteSupplier(supplier.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-semibold"
                        data-testid={`delete-supplier-${supplier.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-zinc-500">
                  {searchTerm ? 'No suppliers found matching your search' : 'No suppliers added yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Supplier</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={addSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Supplier Name *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="ABC Fabrics Ltd"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Product/Service *</label>
                <input
                  type="text"
                  value={supplierForm.product}
                  onChange={(e) => setSupplierForm({ ...supplierForm, product: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Cotton Fabric, Buttons, Thread, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={supplierForm.phone_number}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="+234..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="supplier@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Address</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Shop location"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Notes</label>
                <textarea
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Add Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Edit Supplier</h2>
              <button onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={updateSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Supplier Name *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="ABC Fabrics Ltd"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Product/Service *</label>
                <input
                  type="text"
                  value={supplierForm.product}
                  onChange={(e) => setSupplierForm({ ...supplierForm, product: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Cotton Fabric, Buttons, Thread, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={supplierForm.phone_number}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="+234..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="supplier@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Address</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Shop location"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Notes</label>
                <textarea
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSupplier(null);
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Update Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliersPage;
