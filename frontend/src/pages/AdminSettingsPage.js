import React, { useState, useEffect } from 'react';
import { Save, Upload, DollarSign, Image as ImageIcon, Package, Shirt } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pricing');
  
  const [settings, setSettings] = useState({
    // Fabric Quality Pricing
    fabric_quality_prices: {
      standard: 0,
      premium: 500,
      luxury: 1000
    },
    // Print/Embroidery Costs - Bulk Orders
    bulk_print_costs: {
      none: 0,
      front: 500,
      front_back: 800,
      embroidery: 1200
    },
    // Print/Embroidery Costs - POD Orders
    pod_print_costs: {
      Badge: 500,
      A4: 800,
      A3: 1200,
      A2: 1800,
      A1: 2500
    },
    // Clothing Items with Images
    bulk_clothing_items: [],
    pod_clothing_items: []
  });

  const [newBulkItem, setNewBulkItem] = useState({ name: '', base_price: '', image_url: '' });
  const [newPodItem, setNewPodItem] = useState({ name: '', base_price: '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/settings`, {
        withCredentials: true
      });
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/admin/settings`, settings, {
        withCredentials: true
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, itemType, itemIndex = null) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(itemType);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_URL}/api/admin/upload-image`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const imageUrl = response.data.image_url;

      if (itemType === 'new-bulk') {
        setNewBulkItem({ ...newBulkItem, image_url: imageUrl });
      } else if (itemType === 'new-pod') {
        setNewPodItem({ ...newPodItem, image_url: imageUrl });
      } else if (itemType === 'bulk' && itemIndex !== null) {
        const updated = [...settings.bulk_clothing_items];
        updated[itemIndex].image_url = imageUrl;
        setSettings({ ...settings, bulk_clothing_items: updated });
      } else if (itemType === 'pod' && itemIndex !== null) {
        const updated = [...settings.pod_clothing_items];
        updated[itemIndex].image_url = imageUrl;
        setSettings({ ...settings, pod_clothing_items: updated });
      }

      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleAddBulkItem = () => {
    if (!newBulkItem.name || !newBulkItem.base_price) {
      toast.error('Please fill in all fields');
      return;
    }

    setSettings({
      ...settings,
      bulk_clothing_items: [
        ...settings.bulk_clothing_items,
        { ...newBulkItem, base_price: parseFloat(newBulkItem.base_price) }
      ]
    });
    setNewBulkItem({ name: '', base_price: '', image_url: '' });
    toast.success('Item added successfully');
  };

  const handleAddPodItem = () => {
    if (!newPodItem.name || !newPodItem.base_price) {
      toast.error('Please fill in all fields');
      return;
    }

    setSettings({
      ...settings,
      pod_clothing_items: [
        ...settings.pod_clothing_items,
        { ...newPodItem, base_price: parseFloat(newPodItem.base_price) }
      ]
    });
    setNewPodItem({ name: '', base_price: '', image_url: '' });
    toast.success('Item added successfully');
  };

  const handleRemoveItem = (type, index) => {
    if (type === 'bulk') {
      setSettings({
        ...settings,
        bulk_clothing_items: settings.bulk_clothing_items.filter((_, i) => i !== index)
      });
    } else {
      setSettings({
        ...settings,
        pod_clothing_items: settings.pod_clothing_items.filter((_, i) => i !== index)
      });
    }
    toast.success('Item removed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-oswald text-4xl font-bold uppercase">Settings & Pricing</h1>
            <p className="text-zinc-600 mt-2">Manage pricing, clothing items, and images</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
            data-testid="save-settings"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-zinc-200">
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-6 py-4 font-semibold ${
                activeTab === 'pricing'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <DollarSign className="inline mr-2" size={20} />
              Pricing & Costs
            </button>
            <button
              onClick={() => setActiveTab('bulk-items')}
              className={`px-6 py-4 font-semibold ${
                activeTab === 'bulk-items'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Package className="inline mr-2" size={20} />
              Bulk Order Items
            </button>
            <button
              onClick={() => setActiveTab('pod-items')}
              className={`px-6 py-4 font-semibold ${
                activeTab === 'pod-items'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Shirt className="inline mr-2" size={20} />
              POD Items
            </button>
          </div>
        </div>

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Fabric Quality Pricing */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Fabric Quality Pricing (Additional Cost)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Standard (₦)</label>
                  <input
                    type="number"
                    value={settings.fabric_quality_prices.standard}
                    onChange={(e) => setSettings({
                      ...settings,
                      fabric_quality_prices: {
                        ...settings.fabric_quality_prices,
                        standard: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Premium (₦)</label>
                  <input
                    type="number"
                    value={settings.fabric_quality_prices.premium}
                    onChange={(e) => setSettings({
                      ...settings,
                      fabric_quality_prices: {
                        ...settings.fabric_quality_prices,
                        premium: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Luxury (₦)</label>
                  <input
                    type="number"
                    value={settings.fabric_quality_prices.luxury}
                    onChange={(e) => setSettings({
                      ...settings,
                      fabric_quality_prices: {
                        ...settings.fabric_quality_prices,
                        luxury: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Order Print Costs */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Bulk Order Print/Embroidery Costs (₦)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">No Print</label>
                  <input
                    type="number"
                    value={settings.bulk_print_costs.none}
                    onChange={(e) => setSettings({
                      ...settings,
                      bulk_print_costs: {
                        ...settings.bulk_print_costs,
                        none: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Front Print</label>
                  <input
                    type="number"
                    value={settings.bulk_print_costs.front}
                    onChange={(e) => setSettings({
                      ...settings,
                      bulk_print_costs: {
                        ...settings.bulk_print_costs,
                        front: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Front & Back</label>
                  <input
                    type="number"
                    value={settings.bulk_print_costs.front_back}
                    onChange={(e) => setSettings({
                      ...settings,
                      bulk_print_costs: {
                        ...settings.bulk_print_costs,
                        front_back: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Embroidery</label>
                  <input
                    type="number"
                    value={settings.bulk_print_costs.embroidery}
                    onChange={(e) => setSettings({
                      ...settings,
                      bulk_print_costs: {
                        ...settings.bulk_print_costs,
                        embroidery: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* POD Print Costs */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">POD Print Size Costs (₦)</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.keys(settings.pod_print_costs).map((size) => (
                  <div key={size}>
                    <label className="block text-sm font-semibold mb-2">{size}</label>
                    <input
                      type="number"
                      value={settings.pod_print_costs[size]}
                      onChange={(e) => setSettings({
                        ...settings,
                        pod_print_costs: {
                          ...settings.pod_print_costs,
                          [size]: parseFloat(e.target.value) || 0
                        }
                      })}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Items Tab */}
        {activeTab === 'bulk-items' && (
          <div className="space-y-6">
            {/* Add New Item */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Add New Bulk Order Item</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Item Name</label>
                  <input
                    type="text"
                    value={newBulkItem.name}
                    onChange={(e) => setNewBulkItem({ ...newBulkItem, name: e.target.value })}
                    placeholder="e.g., T-Shirt, Hoodie, Shorts"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Base Price (₦)</label>
                  <input
                    type="number"
                    value={newBulkItem.base_price}
                    onChange={(e) => setNewBulkItem({ ...newBulkItem, base_price: e.target.value })}
                    placeholder="1500"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Item Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'new-bulk')}
                    className="hidden"
                    id="new-bulk-image"
                  />
                  <label htmlFor="new-bulk-image" className="btn-outline cursor-pointer flex items-center justify-center gap-2 w-full py-3">
                    <Upload size={16} />
                    Upload
                  </label>
                </div>
              </div>
              {newBulkItem.image_url && (
                <div className="mt-4">
                  <img src={`${API_URL}${newBulkItem.image_url}`} alt="Preview" className="h-24 rounded-lg" />
                </div>
              )}
              <button
                onClick={handleAddBulkItem}
                className="btn-primary mt-4"
              >
                Add Item
              </button>
            </div>

            {/* Existing Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Existing Bulk Order Items</h2>
              <div className="space-y-4">
                {settings.bulk_clothing_items.map((item, index) => (
                  <div key={index} className="border border-zinc-200 rounded-lg p-4 flex items-center gap-4">
                    {item.image_url && (
                      <img src={`${API_URL}${item.image_url}`} alt={item.name} className="h-20 w-20 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{item.name}</p>
                      <p className="text-zinc-600">Base Price: ₦{item.base_price?.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'bulk', index)}
                        className="hidden"
                        id={`bulk-image-${index}`}
                      />
                      <label htmlFor={`bulk-image-${index}`} className="btn-outline cursor-pointer">
                        <ImageIcon size={16} className="inline mr-1" />
                        Change Image
                      </label>
                      <button
                        onClick={() => handleRemoveItem('bulk', index)}
                        className="btn-outline text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POD Items Tab */}
        {activeTab === 'pod-items' && (
          <div className="space-y-6">
            {/* Add New POD Item */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Add New POD Item</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Item Name</label>
                  <input
                    type="text"
                    value={newPodItem.name}
                    onChange={(e) => setNewPodItem({ ...newPodItem, name: e.target.value })}
                    placeholder="e.g., T-Shirt, Hoodie, Tank Top"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Base Price (₦)</label>
                  <input
                    type="number"
                    value={newPodItem.base_price}
                    onChange={(e) => setNewPodItem({ ...newPodItem, base_price: e.target.value })}
                    placeholder="2000"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Item Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'new-pod')}
                    className="hidden"
                    id="new-pod-image"
                  />
                  <label htmlFor="new-pod-image" className="btn-outline cursor-pointer flex items-center justify-center gap-2 w-full py-3">
                    <Upload size={16} />
                    Upload
                  </label>
                </div>
              </div>
              {newPodItem.image_url && (
                <div className="mt-4">
                  <img src={`${API_URL}${newPodItem.image_url}`} alt="Preview" className="h-24 rounded-lg" />
                </div>
              )}
              <button
                onClick={handleAddPodItem}
                className="btn-primary mt-4"
              >
                Add Item
              </button>
            </div>

            {/* Existing POD Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Existing POD Items</h2>
              <div className="space-y-4">
                {settings.pod_clothing_items.map((item, index) => (
                  <div key={index} className="border border-zinc-200 rounded-lg p-4 flex items-center gap-4">
                    {item.image_url && (
                      <img src={`${API_URL}${item.image_url}`} alt={item.name} className="h-20 w-20 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{item.name}</p>
                      <p className="text-zinc-600">Base Price: ₦{item.base_price?.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'pod', index)}
                        className="hidden"
                        id={`pod-image-${index}`}
                      />
                      <label htmlFor={`pod-image-${index}`} className="btn-outline cursor-pointer">
                        <ImageIcon size={16} className="inline mr-1" />
                        Change Image
                      </label>
                      <button
                        onClick={() => handleRemoveItem('pod', index)}
                        className="btn-outline text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
