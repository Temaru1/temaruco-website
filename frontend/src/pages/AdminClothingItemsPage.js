import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, Save, X, Star, Crown, Gem } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const AdminClothingItemsPage = () => {
  const [podItems, setPodItems] = useState([]);
  const [bulkItems, setBulkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bulk'); // Default to bulk for variant pricing
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form data - includes variant pricing for bulk items
  const [formData, setFormData] = useState({
    name: '',
    base_price: '',
    standard_price: '',
    premium_price: '',
    luxury_price: '',
    image_url: '',
    description: '',
    is_active: true
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const [podRes, bulkRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/pod/clothing-items`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/bulk/clothing-items`, { withCredentials: true })
      ]);
      
      setPodItems(podRes.data || []);
      setBulkItems(bulkRes.data || []);
    } catch (error) {
      console.error('Failed to load items:', error);
      toast.error('Failed to load clothing items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    const imageUrl = formData.image_url || `https://placehold.co/400x500/e2e8f0/64748b?text=${encodeURIComponent(formData.name || 'Product')}`;
    
    if (activeTab === 'bulk') {
      // Bulk items require variant pricing
      if (!formData.name || !formData.standard_price || !formData.premium_price || !formData.luxury_price) {
        toast.error('Please fill in name and all variant prices');
        return;
      }
    } else {
      if (!formData.name || !formData.base_price) {
        toast.error('Please fill in name and price');
        return;
      }
    }

    try {
      const endpoint = activeTab === 'pod' 
        ? `${API_URL}/api/admin/pod/clothing-items`
        : `${API_URL}/api/admin/bulk/clothing-items`;
      
      const payload = activeTab === 'bulk' ? {
        name: formData.name,
        standard_price: parseFloat(formData.standard_price),
        premium_price: parseFloat(formData.premium_price),
        luxury_price: parseFloat(formData.luxury_price),
        image_url: imageUrl,
        description: formData.description,
        is_active: formData.is_active
      } : {
        name: formData.name,
        base_price: parseFloat(formData.base_price),
        image_url: imageUrl,
        description: formData.description,
        is_active: formData.is_active
      };
      
      await axios.post(endpoint, payload, { withCredentials: true });
      
      toast.success('Clothing item added successfully!');
      setShowAddModal(false);
      resetForm();
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add item');
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    
    if (!editingItem) return;

    try {
      const endpoint = activeTab === 'pod'
        ? `${API_URL}/api/admin/pod/clothing-items/${editingItem.id}`
        : `${API_URL}/api/admin/bulk/clothing-items/${editingItem.id}`;
      
      const payload = activeTab === 'bulk' ? {
        name: formData.name,
        standard_price: parseFloat(formData.standard_price),
        premium_price: parseFloat(formData.premium_price),
        luxury_price: parseFloat(formData.luxury_price),
        image_url: formData.image_url,
        description: formData.description,
        is_active: formData.is_active
      } : {
        name: formData.name,
        base_price: parseFloat(formData.base_price),
        image_url: formData.image_url,
        description: formData.description,
        is_active: formData.is_active
      };
      
      await axios.put(endpoint, payload, { withCredentials: true });
      
      toast.success('Item updated successfully!');
      setEditingItem(null);
      resetForm();
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const endpoint = activeTab === 'pod'
        ? `${API_URL}/api/admin/pod/clothing-items/${id}`
        : `${API_URL}/api/admin/bulk/clothing-items/${id}`;
      
      await axios.delete(endpoint, { withCredentials: true });
      
      toast.success('Item deleted successfully!');
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete item');
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      base_price: item.base_price?.toString() || '',
      standard_price: item.standard_price?.toString() || item.base_price?.toString() || '',
      premium_price: item.premium_price?.toString() || '',
      luxury_price: item.luxury_price?.toString() || '',
      image_url: item.image_url,
      description: item.description || '',
      is_active: item.is_active !== false
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      base_price: '',
      standard_price: '',
      premium_price: '',
      luxury_price: '',
      image_url: '',
      description: '',
      is_active: true
    });
    setSelectedImageFile(null);
    setImagePreview('');
  };

  const handleImageFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setSelectedImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadImage = async () => {
    if (!selectedImageFile) {
      toast.error('Please select an image first');
      return;
    }

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', selectedImageFile);

      const response = await axios.post(
        `${API_URL}/api/admin/upload-image`,
        formDataUpload,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        }
      );

      const imageUrl = response.data.image_url || response.data.file_path;
      
      if (!imageUrl) {
        throw new Error('No image URL returned from server');
      }
      
      setFormData({ ...formData, image_url: imageUrl });
      toast.success('Image uploaded successfully!');
      setSelectedImageFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Auto-calculate premium and luxury prices when standard price changes
  const handleStandardPriceChange = (value) => {
    const standard = parseFloat(value) || 0;
    setFormData({
      ...formData,
      standard_price: value,
      premium_price: formData.premium_price || Math.round(standard * 1.5).toString(),
      luxury_price: formData.luxury_price || Math.round(standard * 2).toString()
    });
  };

  const currentItems = activeTab === 'pod' ? podItems : bulkItems;

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D90429]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clothing Items Management</h1>
          <p className="text-zinc-500 mt-1">Manage products for POD and Bulk orders</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-[#D90429] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#B90322] transition"
        >
          <Plus size={20} />
          Add New Item
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => { setActiveTab('bulk'); setEditingItem(null); resetForm(); }}
          className={`px-6 py-3 font-medium text-sm transition ${
            activeTab === 'bulk'
              ? 'border-b-2 border-[#D90429] text-[#D90429]'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Bulk Order Items ({bulkItems.length})
        </button>
        <button
          onClick={() => { setActiveTab('pod'); setEditingItem(null); resetForm(); }}
          className={`px-6 py-3 font-medium text-sm transition ${
            activeTab === 'pod'
              ? 'border-b-2 border-[#D90429] text-[#D90429]'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          POD Items ({podItems.length})
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {currentItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
              !item.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="aspect-square bg-zinc-100 relative">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = `https://placehold.co/400x400/e2e8f0/64748b?text=${item.name}`; }}
              />
              {!item.is_active && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Inactive
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-zinc-900">{item.name}</h3>
              
              {/* Variant pricing display for all items */}
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Standard:</span>
                  <span className="font-semibold">₦{(item.standard_price || item.base_price)?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Crown className="w-4 h-4 text-blue-500" />
                  <span className="text-zinc-500">Premium:</span>
                  <span className="font-semibold text-blue-600">₦{(item.premium_price || Math.round((item.standard_price || item.base_price) * 1.5))?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Gem className="w-4 h-4 text-amber-500" />
                  <span className="text-zinc-500">Luxury:</span>
                  <span className="font-semibold text-amber-600">₦{(item.luxury_price || Math.round((item.standard_price || item.base_price) * 2))?.toLocaleString()}</span>
                </div>
              </div>
              
              {item.description && (
                <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{item.description}</p>
              )}
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => startEdit(item)}
                  className="flex-1 py-2 px-3 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition flex items-center justify-center gap-1 text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="py-2 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentItems.length === 0 && (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <p className="text-zinc-500">No {activeTab === 'pod' ? 'POD' : 'bulk order'} items found.</p>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="mt-4 text-[#D90429] hover:underline"
          >
            Add your first item
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Edit' : 'Add New'} {activeTab === 'pod' ? 'POD' : 'Bulk'} Item
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingItem(null); resetForm(); }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                  placeholder="e.g., T-Shirt, Hoodie"
                  required
                />
              </div>

              {activeTab === 'bulk' ? (
                // Variant pricing inputs for bulk items
                <div className="space-y-4 p-4 bg-zinc-50 rounded-lg">
                  <h3 className="font-semibold text-zinc-700 flex items-center gap-2">
                    <span>Quality Variant Pricing</span>
                    <span className="text-xs font-normal text-zinc-500">(per piece)</span>
                  </h3>
                  
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                      <Star className="w-4 h-4 text-zinc-400" />
                      Standard Price *
                    </label>
                    <input
                      type="number"
                      value={formData.standard_price}
                      onChange={(e) => handleStandardPriceChange(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                      placeholder="e.g., 2000"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-blue-500" />
                      Premium Price *
                    </label>
                    <input
                      type="number"
                      value={formData.premium_price}
                      onChange={(e) => setFormData({ ...formData, premium_price: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 3000"
                      required
                    />
                    <p className="text-xs text-zinc-500 mt-1">Suggested: ₦{Math.round((parseFloat(formData.standard_price) || 0) * 1.5).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-1 flex items-center gap-2">
                      <Gem className="w-4 h-4 text-amber-500" />
                      Luxury Price *
                    </label>
                    <input
                      type="number"
                      value={formData.luxury_price}
                      onChange={(e) => setFormData({ ...formData, luxury_price: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="e.g., 4500"
                      required
                    />
                    <p className="text-xs text-zinc-500 mt-1">Suggested: ₦{Math.round((parseFloat(formData.standard_price) || 0) * 2).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                // Single price for POD items
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Base Price (₦) *
                  </label>
                  <input
                    type="number"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    placeholder="e.g., 2500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Image
                </label>
                <div className="space-y-2">
                  {(imagePreview || formData.image_url) && (
                    <img
                      src={imagePreview || formData.image_url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  )}
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-zinc-300 rounded-lg hover:border-[#D90429] transition">
                        <ImageIcon size={20} className="text-zinc-400" />
                        <span className="text-sm text-zinc-600">Select Image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileSelect}
                        className="hidden"
                      />
                    </label>
                    {selectedImageFile && (
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={uploadingImage}
                        className="px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] disabled:opacity-50"
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent text-sm"
                    placeholder="Or paste image URL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the item..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#D90429] rounded"
                />
                <label htmlFor="is_active" className="text-sm text-zinc-700">
                  Active (visible to customers)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingItem(null); resetForm(); }}
                  className="flex-1 py-3 px-4 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] transition flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClothingItemsPage;
