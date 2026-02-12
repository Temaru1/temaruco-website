import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign, Plus, RefreshCw, Search, Eye, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminInventoryPage = () => {
  const [inventory, setInventory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockData, setRestockData] = useState({
    color: '',
    size: '',
    quantity: 0,
    supplier: '',
    cost_per_unit: 0,
    notes: ''
  });
  const [newProductData, setNewProductData] = useState({
    name: '',
    category: '',
    price: 0,
    description: '',
    image_url: '',
    colors: [],
    sizes: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (inventory) {
      filterProducts();
    }
  }, [inventory, searchQuery]);

  const loadInventory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/inventory`, {
        withCredentials: true
      });
      setInventory(response.data);
      setFilteredProducts(response.data.products);
    } catch (error) {
      toast.error('Failed to load inventory');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(inventory.products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = inventory.products.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  };

  const openRestockModal = (product) => {
    setSelectedProduct(product);
    setRestockData({
      color: Object.keys(product.inventory || {})[0] || '',
      size: '',
      quantity: 0,
      supplier: '',
      cost_per_unit: product.price || 0,
      notes: ''
    });
    setShowRestockModal(true);
  };

  const handleRestock = async (e) => {
    e.preventDefault();

    if (!restockData.color || !restockData.size || restockData.quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/admin/inventory/restock`,
        {
          product_id: selectedProduct.product_id,
          product_name: selectedProduct.name,
          ...restockData
        },
        { withCredentials: true }
      );

      toast.success('Restock recorded successfully');
      setShowRestockModal(false);
      loadInventory();
    } catch (error) {
      toast.error('Failed to record restock');
      console.error(error);
    }

  };

  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!newProductData.name || !newProductData.category || newProductData.price <= 0) {
      toast.error('Please fill all required fields (Name, Category, Price)');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/admin/boutique/products`,
        newProductData,
        { withCredentials: true }
      );

      toast.success(`Product "${newProductData.name}" created successfully!`);
      setShowAddProductModal(false);
      setNewProductData({
        name: '',
        category: '',
        price: 0,
        description: '',
        image_url: '',
        colors: [],
        sizes: []
      });
      setImagePreview('');
      loadInventory();
    } catch (error) {
      toast.error('Failed to create product');
      console.error(error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, WEBP, or GIF');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/api/admin/boutique/products/upload-image`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const imageUrl = `${API_URL}${response.data.image_url}`;
      setNewProductData({...newProductData, image_url: imageUrl});
      setImagePreview(imageUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setNewProductData({...newProductData, image_url: ''});
    setImagePreview('');
  };

  const getStockStatus = (totalStock) => {
    if (totalStock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800 border-red-200' };
    } else if (totalStock < 5) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else if (totalStock < 20) {
      return { label: 'Medium Stock', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else {
      return { label: 'In Stock', color: 'bg-green-100 text-green-800 border-green-200' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const summary = inventory?.summary || {};

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold">Boutique Inventory</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddProductModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-product-btn"
          >
            <Plus size={20} />
            Add New Product
          </button>
          <button
            onClick={loadInventory}
            className="btn-outline flex items-center gap-2"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-600">Total Products</p>
            <Package size={24} className="text-primary" />
          </div>
          <p className="text-3xl font-bold">{summary.total_products || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-600">Stock Value</p>
            <DollarSign size={24} className="text-green-500" />
          </div>
          <p className="text-3xl font-bold">₦{(summary.total_stock_value || 0).toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-600">Low Stock</p>
            <AlertTriangle size={24} className="text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{summary.low_stock_count || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-zinc-600">Out of Stock</p>
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">{summary.out_of_stock_count || 0}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="inventory-search-input"
          />
        </div>
      </div>

      {/* Low Stock Alerts */}
      {summary.low_stock_items && summary.low_stock_items.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle size={24} className="text-yellow-600" />
            <h2 className="font-oswald text-xl font-bold">Low Stock Alerts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.low_stock_items.map(item => (
              <div key={item.product_id} className="bg-white p-4 rounded-lg border border-yellow-200">
                <p className="font-semibold mb-1">{item.name}</p>
                <p className="text-sm text-zinc-600">Stock: {item.total_stock} items</p>
                <button
                  onClick={() => openRestockModal(item)}
                  className="mt-2 text-sm text-primary hover:underline font-semibold"
                >
                  Restock Now →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-oswald font-semibold">Product</th>
              <th className="px-6 py-4 text-left font-oswald font-semibold">Category</th>
              <th className="px-6 py-4 text-left font-oswald font-semibold">Price</th>
              <th className="px-6 py-4 text-left font-oswald font-semibold">Total Stock</th>
              <th className="px-6 py-4 text-left font-oswald font-semibold">Status</th>
              <th className="px-6 py-4 text-left font-oswald font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredProducts.map(product => {
              const totalStock = product.total_stock || 0;
              const status = getStockStatus(totalStock);
              
              return (
                <tr key={product.product_id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-zinc-100 rounded flex items-center justify-center">
                          <Package size={24} className="text-zinc-400" />
                        </div>
                      )}
                      <span className="font-semibold">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{product.category || '-'}</td>
                  <td className="px-6 py-4 font-semibold">₦{(product.price || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="text-xl font-bold">{totalStock}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openRestockModal(product)}
                      className="btn-primary btn-sm flex items-center gap-2"
                      data-testid={`restock-btn-${product.product_id}`}
                    >
                      <Plus size={16} />
                      Restock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {showRestockModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">
              Restock: {selectedProduct.name}
            </h2>

            <form onSubmit={handleRestock} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Color *
                  </label>
                  <select
                    value={restockData.color}
                    onChange={(e) => setRestockData({...restockData, color: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select Color</option>
                    {Object.keys(selectedProduct.inventory || {}).map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Size *
                  </label>
                  <select
                    value={restockData.size}
                    onChange={(e) => setRestockData({...restockData, size: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={!restockData.color}
                  >
                    <option value="">Select Size</option>
                    {restockData.color && selectedProduct.inventory[restockData.color] &&
                      Object.keys(selectedProduct.inventory[restockData.color]).map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={restockData.quantity}
                    onChange={(e) => setRestockData({...restockData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Cost per Unit
                  </label>
                  <input
                    type="number"
                    value={restockData.cost_per_unit}
                    onChange={(e) => setRestockData({...restockData, cost_per_unit: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2">
                  Supplier
                </label>
                <input
                  type="text"
                  value={restockData.supplier}
                  onChange={(e) => setRestockData({...restockData, supplier: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2">
                  Notes
                </label>
                <textarea
                  value={restockData.notes}
                  onChange={(e) => setRestockData({...restockData, notes: e.target.value})}
                  rows="3"
                  className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Any additional notes..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  data-testid="confirm-restock-btn"
                >
                  Confirm Restock
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div className="modal-overlay" onClick={() => setShowAddProductModal(false)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">Add New Boutique Product</h2>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold mb-2">Product Name *</label>
                <input
                  type="text"
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                  placeholder="e.g., Premium Cotton T-Shirt"
                  className="input-field"
                  required
                  data-testid="product-name-input"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold mb-2">Category *</label>
                <select
                  value={newProductData.category}
                  onChange={(e) => setNewProductData({...newProductData, category: e.target.value})}
                  className="input-field"
                  required
                  data-testid="product-category-select"
                >
                  <option value="">Select Category</option>
                  <option value="Nigerian Traditional">Nigerian Traditional</option>
                  <option value="Modern Wear">Modern Wear</option>
                  <option value="Casual">Casual</option>
                  <option value="Formal">Formal</option>
                  <option value="Sportswear">Sportswear</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold mb-2">Price (₦) *</label>
                <input
                  type="number"
                  value={newProductData.price}
                  onChange={(e) => setNewProductData({...newProductData, price: parseFloat(e.target.value) || 0})}
                  placeholder="e.g., 5000"
                  min="0"
                  step="100"
                  className="input-field"
                  required
                  data-testid="product-price-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({...newProductData, description: e.target.value})}
                  placeholder="Product description..."
                  rows="3"
                  className="input-field"
                  data-testid="product-description-input"
                />
              </div>

              {/* Product Image Upload */}
              <div>
                <label className="block text-sm font-semibold mb-2">Product Image</label>
                
                {/* Upload Section */}
                <div className="space-y-3">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Product preview" 
                        className="w-32 h-32 object-cover rounded-lg border-2 border-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  {!imagePreview && (
                    <div>
                      <input
                        type="file"
                        id="product-image-upload"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="product-image-file-input"
                      />
                      <label
                        htmlFor="product-image-upload"
                        className={`btn-outline flex items-center justify-center gap-2 cursor-pointer ${uploadingImage ? 'opacity-50' : ''}`}
                      >
                        {uploadingImage ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Upload Image
                          </>
                        )}
                      </label>
                      <p className="text-xs text-zinc-500 mt-1">
                        JPG, PNG, WEBP, GIF - Max 5MB
                      </p>
                    </div>
                  )}
                  
                  {/* OR divider */}
                  {!imagePreview && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t border-zinc-300"></div>
                      <span className="text-sm text-zinc-500">OR</span>
                      <div className="flex-1 border-t border-zinc-300"></div>
                    </div>
                  )}
                  
                  {/* URL Input */}
                  {!imagePreview && (
                    <div>
                      <input
                        type="url"
                        value={newProductData.image_url}
                        onChange={(e) => {
                          const url = e.target.value;
                          setNewProductData({...newProductData, image_url: url});
                          if (url) setImagePreview(url);
                        }}
                        placeholder="Or paste image URL"
                        className="input-field"
                        data-testid="product-image-url-input"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Available Colors */}
              <div>
                <label className="block text-sm font-semibold mb-2">Available Colors (comma-separated)</label>
                <input
                  type="text"
                  value={newProductData.colors.join(', ')}
                  onChange={(e) => setNewProductData({
                    ...newProductData, 
                    colors: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                  })}
                  placeholder="e.g., Black, White, Navy Blue"
                  className="input-field"
                  data-testid="product-colors-input"
                />
              </div>

              {/* Available Sizes */}
              <div>
                <label className="block text-sm font-semibold mb-2">Available Sizes (comma-separated)</label>
                <input
                  type="text"
                  value={newProductData.sizes.join(', ')}
                  onChange={(e) => setNewProductData({
                    ...newProductData, 
                    sizes: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  })}
                  placeholder="e.g., S, M, L, XL, XXL"
                  className="input-field"
                  data-testid="product-sizes-input"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After creating the product, use the "Restock" button to add inventory for specific colors and sizes.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  data-testid="create-product-btn"
                >
                  <Plus size={18} />
                  Create Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventoryPage;
