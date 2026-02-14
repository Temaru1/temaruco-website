import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Package } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminProductsPage = () => {
  const [fabrics, setFabrics] = useState([]);
  const [souvenirs, setSouvenirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fabrics');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    branded_price: '',
    image_url: '',
    description: '',
    is_active: true
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [fabricsRes, souvenirsRes] = await Promise.all([
        axios.get(`${API_URL}/api/fabrics`),
        axios.get(`${API_URL}/api/souvenirs`)
      ]);
      setFabrics(fabricsRes.data || []);
      setSouvenirs(souvenirsRes.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast.error('Please fill in name and price');
      return;
    }

    const imageUrl = formData.image_url || `https://placehold.co/400x500/e2e8f0/64748b?text=${encodeURIComponent(formData.name)}`;
    
    const endpoint = activeTab === 'fabrics' 
      ? `${API_URL}/api/admin/fabrics`
      : `${API_URL}/api/admin/souvenirs`;

    try {
      if (editingItem) {
        await axios.put(`${endpoint}/${editingItem.id}`, {
          ...formData,
          price: parseFloat(formData.price),
          branded_price: formData.branded_price ? parseFloat(formData.branded_price) : null,
          image_url: imageUrl
        }, { headers });
        toast.success('Product updated!');
      } else {
        await axios.post(endpoint, {
          ...formData,
          price: parseFloat(formData.price),
          branded_price: formData.branded_price ? parseFloat(formData.branded_price) : null,
          image_url: imageUrl
        }, { headers });
        toast.success('Product added!');
      }
      
      setShowModal(false);
      resetForm();
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    
    const endpoint = activeTab === 'fabrics'
      ? `${API_URL}/api/admin/fabrics/${item.id}`
      : `${API_URL}/api/admin/souvenirs/${item.id}`;

    try {
      await axios.delete(endpoint, { headers });
      toast.success('Product deleted!');
      loadProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price?.toString() || '',
      branded_price: item.branded_price?.toString() || '',
      image_url: item.image_url || '',
      description: item.description || '',
      is_active: item.is_active !== false
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', branded_price: '', image_url: '', description: '', is_active: true });
    setEditingItem(null);
  };

  const currentItems = activeTab === 'fabrics' ? fabrics : souvenirs;

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" data-testid="admin-products-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products Management</h1>
        <Button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-product-btn">
          <Plus className="w-4 h-4 mr-2" /> Add {activeTab === 'fabrics' ? 'Fabric' : 'Souvenir'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button 
          variant={activeTab === 'fabrics' ? 'default' : 'outline'}
          onClick={() => setActiveTab('fabrics')}
        >
          Fabrics ({fabrics.length})
        </Button>
        <Button 
          variant={activeTab === 'souvenirs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('souvenirs')}
        >
          Souvenirs ({souvenirs.length})
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <img 
              src={item.image_url} 
              alt={item.name}
              className="w-full h-40 object-cover bg-zinc-100"
              onError={(e) => { e.target.src = `https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(item.name)}`; }}
            />
            <CardContent className="p-4">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-zinc-600">₦{item.price?.toLocaleString()}</p>
              {item.branded_price && (
                <p className="text-xs text-zinc-500">Branded: ₦{item.branded_price?.toLocaleString()}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currentItems.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {activeTab} found. Add your first product!</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editingItem ? 'Edit' : 'Add'} {activeTab === 'fabrics' ? 'Fabric' : 'Souvenir'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₦) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Branded Price (₦)</label>
                  <input
                    type="number"
                    value={formData.branded_price}
                    onChange={(e) => setFormData({...formData, branded_price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Leave empty for placeholder"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductsPage;
