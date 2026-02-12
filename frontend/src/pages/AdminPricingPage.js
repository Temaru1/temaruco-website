import React, { useState, useEffect } from 'react';
import { Save, DollarSign, TrendingUp, Plus, Trash2, Settings } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPricingPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fabricQualities, setFabricQualities] = useState([]);
  const [productionCosts, setProductionCosts] = useState({
    bulk_print_cost_per_piece: 500,
    bulk_embroidery_cost_per_piece: 1200,
    pod_print_cost_per_piece: 800,
    pod_embroidery_cost_per_piece: 1500
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load fabric qualities
      const fabricResponse = await axios.get(`${API_URL}/api/admin/fabric-qualities`, {
        withCredentials: true
      });
      setFabricQualities(fabricResponse.data);

      // Load production costs
      const costsResponse = await axios.get(`${API_URL}/api/admin/production-costs`, {
        withCredentials: true
      });
      setProductionCosts(costsResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFabricQuality = () => {
    const newQuality = {
      id: `new-${Date.now()}`,
      clothing_item: 'default',
      name: 'New Quality',
      price: 0,
      isNew: true
    };
    setFabricQualities([...fabricQualities, newQuality]);
  };

  const handleUpdateFabricQuality = (id, field, value) => {
    setFabricQualities(fabricQualities.map(q => 
      q.id === id ? { ...q, [field]: value, modified: true } : q
    ));
  };

  const handleDeleteFabricQuality = async (id) => {
    if (window.confirm('Are you sure you want to delete this fabric quality?')) {
      try {
        // If it's a new unsaved quality, just remove from array
        if (id.startsWith('new-')) {
          setFabricQualities(fabricQualities.filter(q => q.id !== id));
          return;
        }

        await axios.delete(`${API_URL}/api/admin/fabric-qualities/${id}`, {
          withCredentials: true
        });
        setFabricQualities(fabricQualities.filter(q => q.id !== id));
        toast.success('Fabric quality deleted');
      } catch (error) {
        console.error('Failed to delete:', error);
        toast.error('Failed to delete fabric quality');
      }
    }
  };

  const handleSaveFabricQualities = async () => {
    setSaving(true);
    try {
      // Save new and modified qualities
      for (const quality of fabricQualities) {
        if (quality.isNew) {
          await axios.post(`${API_URL}/api/admin/fabric-qualities`, {
            clothing_item: quality.clothing_item,
            name: quality.name,
            price: parseInt(quality.price) || 0
          }, { withCredentials: true });
        } else if (quality.modified) {
          await axios.put(`${API_URL}/api/admin/fabric-qualities/${quality.id}`, {
            name: quality.name,
            price: parseInt(quality.price) || 0
          }, { withCredentials: true });
        }
      }
      
      toast.success('Fabric qualities saved successfully!');
      await loadData(); // Reload fresh data
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save fabric qualities');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProductionCosts = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/admin/production-costs`, productionCosts, {
        withCredentials: true
      });
      toast.success('Production costs updated successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save production costs');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    await handleSaveFabricQualities();
    await handleSaveProductionCosts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-oswald text-4xl font-bold" data-testid="pricing-title">
            Pricing Management
          </h1>
          <p className="text-zinc-600 mt-2">Manage fabric qualities and production costs</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
          data-testid="save-all-btn"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Fabric Qualities Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign className="text-primary" size={28} />
            <div>
              <h2 className="font-oswald text-2xl font-semibold">Fabric Quality Pricing</h2>
              <p className="text-sm text-zinc-600">Clothing-specific fabric qualities and prices</p>
            </div>
          </div>
          <button
            onClick={handleAddFabricQuality}
            className="btn-secondary flex items-center gap-2"
            data-testid="add-fabric-quality-btn"
          >
            <Plus size={20} />
            Add Quality
          </button>
        </div>

        <div className="space-y-4">
          {fabricQualities.map((quality) => (
            <div
              key={quality.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-2 border-zinc-200 rounded-lg"
            >
              <div>
                <label className="block text-sm font-semibold mb-2">Clothing Item</label>
                <input
                  type="text"
                  value={quality.clothing_item}
                  onChange={(e) => handleUpdateFabricQuality(quality.id, 'clothing_item', e.target.value)}
                  className="w-full"
                  placeholder="e.g., T-Shirt or 'default'"
                  data-testid={`fabric-clothing-${quality.id}`}
                />
                <p className="text-xs text-zinc-500 mt-1">Use 'default' for all items</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Quality Name</label>
                <input
                  type="text"
                  value={quality.name}
                  onChange={(e) => handleUpdateFabricQuality(quality.id, 'name', e.target.value)}
                  className="w-full"
                  placeholder="e.g., Standard"
                  data-testid={`fabric-name-${quality.id}`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Price (₦)</label>
                <input
                  type="number"
                  value={quality.price}
                  onChange={(e) => handleUpdateFabricQuality(quality.id, 'price', e.target.value)}
                  className="w-full"
                  min="0"
                  step="100"
                  data-testid={`fabric-price-${quality.id}`}
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleDeleteFabricQuality(quality.id)}
                  className="btn-danger flex items-center gap-2 w-full"
                  data-testid={`delete-fabric-${quality.id}`}
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            </div>
          ))}

          {fabricQualities.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              No fabric qualities added yet. Click "Add Quality" to create one.
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Display Format</h3>
          <p className="text-sm text-blue-700">
            Frontend will display as: <span className="font-mono bg-blue-100 px-2 py-1 rounded">"Standard — 2000"</span> (no + symbol)
          </p>
        </div>
      </div>

      {/* Production Costs Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-primary" size={28} />
          <div>
            <h2 className="font-oswald text-2xl font-semibold">Production Costs</h2>
            <p className="text-sm text-zinc-600">Set production costs per piece for different order types</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bulk Costs */}
          <div className="border-2 border-primary/20 bg-primary/5 rounded-lg p-6">
            <h3 className="font-oswald text-xl font-semibold mb-4 text-primary">Bulk Orders</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">Print Cost per Piece (₦)</label>
                <input
                  type="number"
                  value={productionCosts.bulk_print_cost_per_piece}
                  onChange={(e) => setProductionCosts({
                    ...productionCosts,
                    bulk_print_cost_per_piece: parseInt(e.target.value) || 0
                  })}
                  className="w-full"
                  min="0"
                  step="50"
                  data-testid="bulk-print-cost"
                />
                <p className="text-xs text-zinc-600 mt-1">For front or front+back printing</p>
              </div>

              <div>
                <label className="block font-semibold mb-2">Embroidery Cost per Piece (₦)</label>
                <input
                  type="number"
                  value={productionCosts.bulk_embroidery_cost_per_piece}
                  onChange={(e) => setProductionCosts({
                    ...productionCosts,
                    bulk_embroidery_cost_per_piece: parseInt(e.target.value) || 0
                  })}
                  className="w-full"
                  min="0"
                  step="50"
                  data-testid="bulk-embroidery-cost"
                />
              </div>
            </div>
          </div>

          {/* POD Costs */}
          <div className="border-2 border-purple-200 bg-purple-50 rounded-lg p-6">
            <h3 className="font-oswald text-xl font-semibold mb-4 text-purple-700">Print-on-Demand</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">Print Cost per Piece (₦)</label>
                <input
                  type="number"
                  value={productionCosts.pod_print_cost_per_piece}
                  onChange={(e) => setProductionCosts({
                    ...productionCosts,
                    pod_print_cost_per_piece: parseInt(e.target.value) || 0
                  })}
                  className="w-full"
                  min="0"
                  step="50"
                  data-testid="pod-print-cost"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Embroidery Cost per Piece (₦)</label>
                <input
                  type="number"
                  value={productionCosts.pod_embroidery_cost_per_piece}
                  onChange={(e) => setProductionCosts({
                    ...productionCosts,
                    pod_embroidery_cost_per_piece: parseInt(e.target.value) || 0
                  })}
                  className="w-full"
                  min="0"
                  step="50"
                  data-testid="pod-embroidery-cost"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important</h3>
          <p className="text-sm text-yellow-700">
            These costs will be automatically applied to all price calculations. No hardcoded values in the system.
          </p>
        </div>
      </div>

      {/* Save Button (bottom) */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
        >
          <Save size={24} />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminPricingPage;
