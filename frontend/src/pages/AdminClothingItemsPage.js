import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const AdminClothingItemsPage = () => {
  const [podItems, setPodItems] = useState([]);
  const [bulkItems, setBulkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pod');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    base_price: '',
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
    
    if (!formData.name || !formData.base_price || !formData.image_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const endpoint = activeTab === 'pod' 
        ? `${API_URL}/api/admin/pod/clothing-items`
        : `${API_URL}/api/admin/bulk/clothing-items`;
      
      await axios.post(endpoint, {
        name: formData.name,
        base_price: parseFloat(formData.base_price),
        image_url: formData.image_url,
        description: formData.description,
        is_active: formData.is_active
      }, { withCredentials: true });
      
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
      
      await axios.put(endpoint, {
        name: formData.name,
        base_price: parseFloat(formData.base_price),
        image_url: formData.image_url,
        description: formData.description,
        is_active: formData.is_active
      }, { withCredentials: true });
      
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
      base_price: item.base_price.toString(),
      image_url: item.image_url,
      description: item.description || '',
      is_active: item.is_active !== false
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      base_price: '',
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

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setSelectedImageFile(file);
    
    // Create preview
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

      const imageUrl = response.data.file_path;
      setFormData({ ...formData, image_url: imageUrl });
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const currentItems = activeTab === 'pod' ? podItems : bulkItems;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-oswald text-4xl font-bold">Clothing Items Management</h1>
          <p className="text-zinc-600">Add, edit, or remove clothing items for POD and Bulk Orders</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingItem(null);
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add New Item
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('pod')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'pod'
              ? 'border-b-2 border-primary text-primary'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Print-on-Demand Items ({podItems.length})
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'bulk'
              ? 'border-b-2 border-primary text-primary'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Bulk Order Items ({bulkItems.length})
        </button>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-zinc-600">Loading items...</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <ImageIcon className="mx-auto text-zinc-400 mb-4" size={48} />
          <h3 className="font-semibold text-lg mb-2">No items yet</h3>
          <p className="text-zinc-600 mb-4">Add your first clothing item to get started</p>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="btn-primary"
          >
            Add Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="aspect-square overflow-hidden bg-zinc-100">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400?text=No+Image';
                  }}
                />
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <p className="text-sm text-zinc-600">{item.description || 'No description'}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      item.is_active !== false
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-primary font-bold text-xl mb-4">
                  ₦{item.base_price.toLocaleString()}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="flex-1 btn-outline text-sm flex items-center justify-center gap-2"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-oswald text-2xl font-bold">
                  {editingItem ? 'Edit' : 'Add'} {activeTab === 'pod' ? 'POD' : 'Bulk Order'} Item
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-4">
                <div>
                  <label className="block font-semibold mb-2">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., T-Shirt, Hoodie, Joggers"
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Base Price (₦) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    placeholder="e.g., 2000"
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Product Image <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Image Upload Section */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileSelect}
                        className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg"
                        data-testid="image-file-input"
                      />
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={!selectedImageFile || uploadingImage}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="upload-image-btn"
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                    
                    <p className="text-xs text-zinc-500">
                      Upload your own image (max 5MB) or enter a URL below
                    </p>
                    
                    {/* Image Preview */}
                    {(imagePreview || formData.image_url) && (
                      <div className="mt-3 border border-zinc-300 rounded-lg p-3 bg-zinc-50">
                        <p className="text-sm font-semibold mb-2">Image Preview:</p>
                        <img
                          src={imagePreview || `${API_URL}${formData.image_url}`}
                          alt="Preview"
                          className="w-full h-64 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                          }}
                        />
                        {formData.image_url && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Image uploaded successfully
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Alternative: Manual URL Entry */}
                    <div className="border-t pt-3">
                      <label className="block text-sm font-semibold mb-2">
                        Or enter image URL manually:
                      </label>
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the item"
                    rows="3"
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="font-semibold">
                    Active (Visible to customers)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2">
                    <Save size={20} />
                    {editingItem ? 'Update' : 'Add'} Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClothingItemsPage;
