import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, AlertTriangle, TrendingDown, TrendingUp, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminMaterialsPage = () => {
  const [materials, setMaterials] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [adjustingMaterial, setAdjustingMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [formData, setFormData] = useState({
    material_type: 'Fabrics',
    material_name: '',
    quantity: '',
    unit: 'meters',
    reorder_level: '',
    cost_per_unit: '',
    supplier: '',
    location: '',
    notes: ''
  });

  const [adjustData, setAdjustData] = useState({
    adjustment: '',
    reason: ''
  });

  const materialTypes = ['Fabrics', 'Threads', 'Buttons', 'Zippers', 'Labels', 'Accessories'];
  const units = ['meters', 'yards', 'pieces', 'rolls', 'kg', 'g', 'boxes', 'dozens'];

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/materials-inventory`, {
        withCredentials: true
      });
      setMaterials(response.data.materials);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error('Failed to load materials inventory');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingMaterial(null);
    setFormData({
      material_type: 'Fabrics',
      material_name: '',
      quantity: '',
      unit: 'meters',
      reorder_level: '',
      cost_per_unit: '',
      supplier: '',
      location: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);
    setFormData({
      material_type: material.material_type,
      material_name: material.material_name,
      quantity: material.quantity,
      unit: material.unit,
      reorder_level: material.reorder_level,
      cost_per_unit: material.cost_per_unit,
      supplier: material.supplier || '',
      location: material.location || '',
      notes: material.notes || ''
    });
    setShowModal(true);
  };

  const openAdjustModal = (material) => {
    setAdjustingMaterial(material);
    setAdjustData({ adjustment: '', reason: '' });
    setShowAdjustModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await axios.put(
          `${API_URL}/api/admin/materials-inventory/${editingMaterial.id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Material updated successfully');
      } else {
        const response = await axios.post(
          `${API_URL}/api/admin/materials-inventory`,
          formData,
          { withCredentials: true }
        );
        
        // Show appropriate message based on whether it was created or updated
        if (response.data.action === 'updated') {
          toast.success(`${response.data.message}`, { duration: 5000 });
        } else {
          toast.success('Material added successfully');
        }
      }
      setShowModal(false);
      loadMaterials();
    } catch (error) {
      toast.error('Failed to save material');
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(
        `${API_URL}/api/admin/materials-inventory/${adjustingMaterial.id}/adjust?adjustment=${adjustData.adjustment}&reason=${encodeURIComponent(adjustData.reason)}`,
        {},
        { withCredentials: true }
      );
      toast.success('Quantity adjusted successfully');
      setShowAdjustModal(false);
      loadMaterials();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to adjust quantity');
    }
  };

  const deleteMaterial = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/materials-inventory/${id}`, {
        withCredentials: true
      });
      toast.success('Material deleted successfully');
      loadMaterials();
    } catch (error) {
      toast.error('Failed to delete material');
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.material_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || material.material_type === filterType;
    return matchesSearch && matchesType;
  });

  const lowStockMaterials = materials.filter(m => m.quantity <= m.reorder_level);

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-oswald text-4xl font-bold">Sewing Materials Inventory</h1>
          <p className="text-zinc-600 mt-2">Track fabrics, threads, buttons, zippers, labels & accessories</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
          data-testid="add-material-btn"
        >
          <Plus size={20} />
          Add Material
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100">Total Items</p>
            <Package size={24} className="opacity-50" />
          </div>
          <p className="text-4xl font-bold">{materials.length}</p>
        </div>
        
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-100">Low Stock</p>
            <AlertTriangle size={24} className="opacity-50" />
          </div>
          <p className="text-4xl font-bold">{lowStockMaterials.length}</p>
        </div>

        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100">Total Value</p>
            <TrendingUp size={24} className="opacity-50" />
          </div>
          <p className="text-3xl font-bold">
            ₦{materials.reduce((sum, m) => sum + (m.quantity * m.cost_per_unit), 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100">Categories</p>
            <Package size={24} className="opacity-50" />
          </div>
          <p className="text-4xl font-bold">{Object.keys(summary).length}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockMaterials.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
          <div className="flex items-start">
            <AlertTriangle className="text-red-500 mr-3 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-800">Low Stock Alert</p>
              <p className="text-red-700 text-sm mt-1">
                {lowStockMaterials.length} material(s) need reordering: {lowStockMaterials.slice(0, 3).map(m => m.material_name).join(', ')}
                {lowStockMaterials.length > 3 && ` and ${lowStockMaterials.length - 3} more`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              {materialTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left py-3 px-4">Material Type</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Quantity</th>
                <th className="text-left py-3 px-4">Reorder Level</th>
                <th className="text-left py-3 px-4">Cost/Unit</th>
                <th className="text-left py-3 px-4">Total Value</th>
                <th className="text-left py-3 px-4">Supplier</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => {
                  const isLowStock = material.quantity <= material.reorder_level;
                  return (
                    <tr key={material.id} className={`border-b hover:bg-zinc-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-semibold">
                          {material.material_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold">{material.material_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isLowStock ? 'text-red-600' : ''}`}>
                            {material.quantity} {material.unit}
                          </span>
                          {isLowStock && <AlertTriangle size={16} className="text-red-500" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">{material.reorder_level} {material.unit}</td>
                      <td className="py-3 px-4">₦{material.cost_per_unit.toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold">₦{(material.quantity * material.cost_per_unit).toLocaleString()}</td>
                      <td className="py-3 px-4 text-zinc-600">{material.supplier || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openAdjustModal(material)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Adjust Quantity"
                          >
                            <TrendingDown size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(material)}
                            className="text-primary hover:text-primary/80"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => deleteMaterial(material.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-zinc-500">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No materials found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">
              {editingMaterial ? 'Edit Material' : 'Add Material'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Material Type *</label>
                  <select
                    value={formData.material_type}
                    onChange={(e) => setFormData({...formData, material_type: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    {materialTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Material Name *</label>
                  <input
                    type="text"
                    value={formData.material_name}
                    onChange={(e) => setFormData({...formData, material_name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Premium Cotton - Blue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Reorder Level *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({...formData, reorder_level: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Minimum quantity"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Cost per Unit (₦) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({...formData, cost_per_unit: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Storage Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Shelf A-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingMaterial ? 'Update' : 'Add'} Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Quantity Modal */}
      {showAdjustModal && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Adjust Quantity</h2>
            <p className="text-zinc-600 mb-6">
              Current: <strong>{adjustingMaterial?.quantity} {adjustingMaterial?.unit}</strong>
            </p>
            
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Adjustment *</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustData.adjustment}
                  onChange={(e) => setAdjustData({...adjustData, adjustment: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Use negative for usage, positive for restock"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  New quantity: {(parseFloat(adjustingMaterial?.quantity || 0) + parseFloat(adjustData.adjustment || 0)).toFixed(2)} {adjustingMaterial?.unit}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Reason *</label>
                <textarea
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({...adjustData, reason: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Used for Order #TM-001, Restocked from supplier"
                  rows="3"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Adjust Quantity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaterialsPage;
