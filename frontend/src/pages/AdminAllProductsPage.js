import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Package, ShoppingBag, Shirt, Scissors, Gift, Eye, Download, X, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminAllProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [counts, setCounts] = useState({});
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'boutique', description: '' });
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', description: '', category: '', image_url: '', is_active: true, type: 'fabric'
  });

  const productTypes = [
    { id: 'all', label: 'All Products', icon: Package },
    { id: 'bulk', label: 'Bulk', icon: ShoppingBag },
    { id: 'pod', label: 'Print on Demand', icon: Shirt },
    { id: 'boutique', label: 'Boutique', icon: ShoppingBag },
    { id: 'fabric', label: 'Fabrics', icon: Scissors },
    { id: 'souvenir', label: 'Souvenirs', icon: Gift },
  ];

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('product_type', filterType);
      params.append('include_placeholders', showPlaceholders);
      
      const response = await axios.get(`${API_URL}/api/admin/all-products?${params}`, {
        withCredentials: true
      });
      
      setProducts(response.data.products || []);
      setCounts(response.data.counts || {});
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filterType, showPlaceholders]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/categories`, {
        withCredentials: true
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const handleDeleteProduct = async (productType, productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/products/${productType}/${productId}`, {
        withCredentials: true
      });
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API_URL}/api/admin/categories/${editingCategory.id}`, categoryForm, {
          withCredentials: true
        });
        toast.success('Category updated');
      } else {
        await axios.post(`${API_URL}/api/admin/categories`, categoryForm, {
          withCredentials: true
        });
        toast.success('Category created');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', type: 'boutique', description: '' });
      loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  // Image upload handler for products
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload JPG, PNG, or WebP image');
      return;
    }

    // Show preview
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/admin/upload/product-image`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setProductForm({ ...productForm, image_url: response.data.image_url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) {
      toast.error('Name and price are required');
      return;
    }

    try {
      const productType = productForm.type || 'fabric';
      const endpoint = productType === 'souvenir' ? '/api/admin/souvenirs' : '/api/admin/fabrics';
      
      if (editingProduct) {
        await axios.put(`${API_URL}${endpoint.replace('/admin/', `/admin/${productType}s/`)}${editingProduct.id}`, productForm, {
          withCredentials: true
        });
        toast.success('Product updated');
      } else {
        await axios.post(`${API_URL}${endpoint}`, productForm, {
          withCredentials: true
        });
        toast.success('Product created');
      }
      
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ name: '', price: '', description: '', category: '', image_url: '', is_active: true, type: 'fabric' });
      setImagePreview(null);
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}"? Products using this category must be moved first.`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/categories/${categoryId}`, {
        withCredentials: true
      });
      toast.success('Category deleted');
      loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getTypeColor = (type) => {
    const colors = {
      bulk: 'bg-blue-100 text-blue-700',
      pod: 'bg-purple-100 text-purple-700',
      boutique: 'bg-pink-100 text-pink-700',
      fabric: 'bg-yellow-100 text-yellow-700',
      souvenir: 'bg-green-100 text-green-700',
    };
    return colors[type] || 'bg-zinc-100 text-zinc-700';
  };

  const getProductImage = (product) => {
    const img = product.image_url || product.image || product.images?.[0];
    if (!img) return null;
    if (img.startsWith('http')) return img;
    if (img.startsWith('/api')) return `${API_URL}${img}`;
    return `${API_URL}/api/uploads/${img}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">All Products</h1>
          <p className="text-zinc-500">Manage products across all categories</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { 
              setEditingProduct(null); 
              setProductForm({ name: '', price: '', description: '', category: '', image_url: '', is_active: true, type: 'fabric' }); 
              setImagePreview(null);
              setShowProductModal(true); 
            }}
            className="btn-primary flex items-center gap-2"
            data-testid="add-product-btn"
          >
            <Plus size={18} />
            Add Product
          </button>
          <button
            onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', type: 'boutique', description: '' }); setShowCategoryModal(true); }}
            className="btn-outline flex items-center gap-2"
            data-testid="add-category-btn"
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
      </div>

      {/* Product Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        {productTypes.map((type) => {
          const Icon = type.icon;
          const count = type.id === 'all' 
            ? Object.values(counts).reduce((a, b) => a + b, 0) 
            : counts[type.id] || 0;
          return (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                filterType === type.id
                  ? 'bg-[#D90429] text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
              data-testid={`filter-${type.id}`}
            >
              <Icon size={18} />
              {type.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                filterType === type.id ? 'bg-white/20' : 'bg-zinc-200'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              data-testid="search-products"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPlaceholders}
              onChange={(e) => setShowPlaceholders(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-zinc-600">Show placeholders</span>
          </label>
        </div>
      </div>

      {/* Categories Section */}
      {categories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Filter size={18} />
            Categories
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 rounded-lg group">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  cat.type === 'boutique' ? 'bg-pink-100 text-pink-700' :
                  cat.type === 'fabric' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {cat.type}
                </span>
                <span className="font-medium">{cat.name}</span>
                <span className="text-xs text-zinc-500">({cat.product_count || 0})</span>
                <button
                  onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, type: cat.type, description: cat.description || '' }); setShowCategoryModal(true); }}
                  className="opacity-0 group-hover:opacity-100 text-blue-600 ml-1"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="opacity-0 group-hover:opacity-100 text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-[#D90429] border-t-transparent rounded-full mx-auto"></div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-zinc-500">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No products found</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={`${product.product_type}-${product.id}`} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      {getProductImage(product) ? (
                        <img 
                          src={getProductImage(product)} 
                          alt={product.name}
                          className="w-12 h-12 object-contain rounded border"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-zinc-100 rounded border flex items-center justify-center">
                          <ImageIcon size={20} className="text-zinc-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{product.name}</p>
                      {product.is_placeholder && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Placeholder</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(product.product_type)}`}>
                        {product.product_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {product.category || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      ₦{(product.price || product.base_price || product.standard_price || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteProduct(product.product_type, product.id, product.name)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  data-testid="category-name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  disabled={editingCategory}
                  data-testid="category-type"
                >
                  <option value="boutique">Boutique</option>
                  <option value="fabric">Fabric</option>
                  <option value="souvenir">Souvenir</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322]"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAllProductsPage;
