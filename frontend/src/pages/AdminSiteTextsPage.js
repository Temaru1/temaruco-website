import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, RotateCcw, Save, Check, X, Filter, FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminSiteTextsPage = () => {
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPage, setFilterPage] = useState('');
  const [availablePages, setAvailablePages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showConfirm, setShowConfirm] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const loadTexts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/site-texts`, {
        params: { 
          page: currentPage, 
          limit: 30, 
          search: searchTerm,
          filter_page: filterPage 
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTexts(response.data.texts || []);
      setTotalPages(response.data.pages || 1);
      setAvailablePages(response.data.available_pages || []);
    } catch (error) {
      console.error('Failed to load texts:', error);
      toast.error('Failed to load site texts');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterPage]);

  useEffect(() => {
    loadTexts();
  }, [loadTexts]);

  const handleSave = async (key) => {
    if (!editValue.trim()) {
      toast.error('Value cannot be empty');
      return;
    }
    
    setSaving(prev => ({ ...prev, [key]: true }));
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/admin/site-texts/${encodeURIComponent(key)}`,
        { value: editValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setTexts(prev => prev.map(t => 
        t.key === key ? { ...t, value: editValue, last_updated: new Date().toISOString() } : t
      ));
      
      setEditingKey(null);
      setEditValue('');
      setShowConfirm(null);
      toast.success('Text updated! Changes will reflect on the website within 60 seconds.');
    } catch (error) {
      console.error('Save failed:', error);
      const message = error.response?.data?.detail || 'Failed to save text';
      toast.error(message);
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleReset = async (key) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/admin/site-texts/reset/${encodeURIComponent(key)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setTexts(prev => prev.map(t => 
        t.key === key ? { ...t, value: response.data.value, last_updated: new Date().toISOString() } : t
      ));
      
      setShowConfirm(null);
      toast.success('Text reset to default');
    } catch (error) {
      console.error('Reset failed:', error);
      toast.error('Failed to reset text');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/admin/site-texts/seed`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(response.data.message);
      loadTexts();
    } catch (error) {
      console.error('Seed failed:', error);
      const message = error.response?.data?.detail || 'Failed to seed texts';
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  };

  const startEdit = (text) => {
    setEditingKey(text.key);
    setEditValue(text.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPageBadgeColor = (page) => {
    const colors = {
      'home': 'bg-blue-100 text-blue-700',
      'bulk': 'bg-purple-100 text-purple-700',
      'pod': 'bg-green-100 text-green-700',
      'boutique': 'bg-pink-100 text-pink-700',
      'fabrics': 'bg-yellow-100 text-yellow-700',
      'souvenirs': 'bg-orange-100 text-orange-700',
      'cart': 'bg-red-100 text-red-700',
      'checkout': 'bg-red-100 text-red-700',
      'global': 'bg-zinc-100 text-zinc-700',
      'contact': 'bg-teal-100 text-teal-700',
      'about': 'bg-indigo-100 text-indigo-700',
      'tracking': 'bg-cyan-100 text-cyan-700',
      'design_services': 'bg-violet-100 text-violet-700'
    };
    return colors[page] || 'bg-zinc-100 text-zinc-700';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Website Text Management
          </h1>
          <p className="text-zinc-500 mt-1">
            Edit all user-visible text on the website. Changes reflect automatically within 60 seconds.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 disabled:opacity-50"
            title="Initialize default texts (Super Admin only)"
          >
            <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Seeding...' : 'Seed Defaults'}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Live Sync Enabled:</strong> Text changes automatically appear on the public website within 60 seconds. 
          No redeploy or manual refresh needed. Changes are cached briefly for performance.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by key, value, or description..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
            data-testid="search-texts"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-zinc-400" />
          <select
            value={filterPage}
            onChange={(e) => { setFilterPage(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429]"
            data-testid="filter-page"
          >
            <option value="">All Pages</option>
            {availablePages.map(page => (
              <option key={page} value={page}>{page}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D90429]"></div>
        </div>
      ) : texts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500">No texts found. Click "Seed Defaults" to initialize.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Page</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase w-1/3">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Last Updated</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {texts.map((text) => (
                <tr key={text.key} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono">
                      {text.key}
                    </code>
                    {text.description && (
                      <p className="text-xs text-zinc-400 mt-1">{text.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPageBadgeColor(text.page)}`}>
                      {text.page}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{text.section}</td>
                  <td className="px-4 py-3">
                    {editingKey === text.key ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] text-sm"
                          rows={3}
                          maxLength={text.max_length || 500}
                          autoFocus
                          data-testid={`edit-${text.key}`}
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-400">
                            {editValue.length}/{text.max_length || 500} chars
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-zinc-500 hover:text-zinc-700"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowConfirm({ type: 'save', key: text.key })}
                              disabled={saving[text.key]}
                              className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p 
                        className="text-sm text-zinc-700 cursor-pointer hover:bg-zinc-100 px-2 py-1 rounded"
                        onClick={() => startEdit(text)}
                        title="Click to edit"
                      >
                        {text.value.length > 100 ? text.value.substring(0, 100) + '...' : text.value}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {formatDate(text.last_updated)}
                    {text.updated_by && (
                      <p className="text-zinc-400">by {text.updated_by}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {editingKey !== text.key && (
                        <>
                          <button
                            onClick={() => startEdit(text)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            data-testid={`edit-btn-${text.key}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setShowConfirm({ type: 'reset', key: text.key })}
                            disabled={saving[text.key]}
                            className="px-3 py-1 text-xs bg-zinc-100 text-zinc-600 rounded hover:bg-zinc-200 disabled:opacity-50"
                            title="Reset to default"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-zinc-50"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-zinc-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">
              {showConfirm.type === 'save' ? 'Confirm Save' : 'Reset to Default?'}
            </h3>
            <p className="text-zinc-600 mb-4">
              {showConfirm.type === 'save' 
                ? 'This will update the text on the live website. Changes will be visible within 60 seconds.'
                : 'This will reset the text to its original default value.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showConfirm.type === 'save') {
                    handleSave(showConfirm.key);
                  } else {
                    handleReset(showConfirm.key);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-white ${
                  showConfirm.type === 'save' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#D90429] hover:bg-[#B90322]'
                }`}
              >
                {showConfirm.type === 'save' ? 'Save Changes' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSiteTextsPage;
