import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Shield, ToggleLeft, ToggleRight, DollarSign, Globe, Printer, ChevronDown, ChevronRight, History } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_ICONS = {
  features: ToggleLeft,
  payments: DollarSign,
  pod_settings: Printer,
  business_rules: Settings,
  pricing: DollarSign,
  localization: Globe,
  pod: Printer,
  general: Settings
};

const CATEGORY_LABELS = {
  features: 'Feature Toggles',
  payments: 'Payment Settings',
  pod_settings: 'Print Size Configurations',
  business_rules: 'Business Rules',
  pricing: 'Pricing Settings',
  localization: 'Localization',
  pod: 'Print-On-Demand',
  general: 'General'
};

const AdminSystemConfigPage = () => {
  const [configs, setConfigs] = useState([]);
  const [byCategory, setByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/system-config`, {
        withCredentials: true
      });
      setConfigs(response.data.configs || []);
      setByCategory(response.data.by_category || {});
      
      // Expand all categories by default
      const expanded = {};
      Object.keys(response.data.by_category || {}).forEach(cat => {
        expanded[cat] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/audit-logs?entity_type=system_config&limit=50`, {
        withCredentials: true
      });
      setAuditLogs(response.data.logs || []);
      setShowAuditModal(true);
    } catch (error) {
      toast.error('Failed to load audit logs');
    }
  };

  const handleValueChange = (key, value) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const saveConfig = async (configKey) => {
    if (!(configKey in editedValues)) return;
    
    setSaving(prev => ({ ...prev, [configKey]: true }));
    try {
      await axios.put(`${API_URL}/api/admin/system-config/${configKey}`, {
        value: editedValues[configKey]
      }, {
        withCredentials: true
      });
      toast.success(`${configKey} updated successfully`);
      
      // Clear edited value and reload
      setEditedValues(prev => {
        const updated = { ...prev };
        delete updated[configKey];
        return updated;
      });
      loadConfigs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(prev => ({ ...prev, [configKey]: false }));
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const renderValue = (config) => {
    const key = config.key;
    const currentValue = key in editedValues ? editedValues[key] : config.value;
    const hasChanges = key in editedValues && editedValues[key] !== config.value;

    // Boolean toggle
    if (typeof config.value === 'boolean') {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleValueChange(key, !currentValue)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              currentValue ? 'bg-green-500' : 'bg-zinc-300'
            }`}
            data-testid={`toggle-${key}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                currentValue ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${currentValue ? 'text-green-600' : 'text-zinc-500'}`}>
            {currentValue ? 'Enabled' : 'Disabled'}
          </span>
          {hasChanges && (
            <button
              onClick={() => saveConfig(key)}
              disabled={saving[key]}
              className="ml-2 px-3 py-1 bg-[#D90429] text-white text-xs rounded-lg hover:bg-[#B90322] disabled:opacity-50"
            >
              {saving[key] ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      );
    }

    // Number input
    if (typeof config.value === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleValueChange(key, parseFloat(e.target.value) || 0)}
            className="w-32 px-3 py-1.5 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
            data-testid={`input-${key}`}
          />
          {hasChanges && (
            <button
              onClick={() => saveConfig(key)}
              disabled={saving[key]}
              className="px-3 py-1.5 bg-[#D90429] text-white text-xs rounded-lg hover:bg-[#B90322] disabled:opacity-50"
            >
              {saving[key] ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      );
    }

    // Object (JSON) - display as readonly for now
    if (typeof config.value === 'object') {
      return (
        <div className="bg-zinc-50 px-3 py-2 rounded-lg text-xs font-mono text-zinc-600 max-w-md overflow-x-auto">
          {JSON.stringify(config.value, null, 2)}
        </div>
      );
    }

    // String input
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={currentValue}
          onChange={(e) => handleValueChange(key, e.target.value)}
          className="w-48 px-3 py-1.5 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
          data-testid={`input-${key}`}
        />
        {hasChanges && (
          <button
            onClick={() => saveConfig(key)}
            disabled={saving[key]}
            className="px-3 py-1.5 bg-[#D90429] text-white text-xs rounded-lg hover:bg-[#B90322] disabled:opacity-50"
          >
            {saving[key] ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D90429]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D90429] rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">System Configuration</h1>
              <p className="text-sm text-zinc-500">Manage feature flags and system settings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAuditLogs}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-100 text-sm"
              data-testid="view-audit-logs"
            >
              <History size={16} />
              Audit Log
            </button>
            <button
              onClick={loadConfigs}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 text-sm"
              data-testid="refresh-configs"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-zinc-500">Total Configs</p>
            <p className="text-2xl font-bold">{configs.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-zinc-500">Categories</p>
            <p className="text-2xl font-bold">{Object.keys(byCategory).length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-zinc-500">Feature Flags</p>
            <p className="text-2xl font-bold">{configs.filter(c => typeof c.value === 'boolean').length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-zinc-500">Enabled Features</p>
            <p className="text-2xl font-bold text-green-600">
              {configs.filter(c => c.value === true).length}
            </p>
          </div>
        </div>

        {/* Config Categories */}
        <div className="space-y-4">
          {Object.entries(byCategory).map(([category, categoryConfigs]) => {
            const Icon = CATEGORY_ICONS[category] || Settings;
            const isExpanded = expandedCategories[category];
            
            return (
              <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
                  data-testid={`category-${category}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 rounded-lg">
                      <Icon size={18} className="text-zinc-600" />
                    </div>
                    <div className="text-left">
                      <h2 className="font-semibold text-zinc-900">
                        {CATEGORY_LABELS[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h2>
                      <p className="text-xs text-zinc-500">{categoryConfigs.length} settings</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {/* Category Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-100">
                    <table className="w-full">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Setting</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {categoryConfigs.map(config => (
                          <tr key={config.key} className="hover:bg-zinc-50">
                            <td className="px-4 py-3">
                              <code className="text-sm font-mono bg-zinc-100 px-2 py-0.5 rounded">
                                {config.key}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600 max-w-xs">
                              {config.description || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {renderValue(config)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Super Admin Only</h3>
              <p className="text-sm text-blue-700">
                Only Super Admins can modify system configuration. All changes are logged in the audit trail.
                Feature flags take effect immediately without requiring a restart.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Configuration Audit Log</h2>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  No audit logs found
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Timestamp</th>
                      <th className="px-4 py-2 text-left">User</th>
                      <th className="px-4 py-2 text-left">Config Key</th>
                      <th className="px-4 py-2 text-left">Action</th>
                      <th className="px-4 py-2 text-left">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-2 text-zinc-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{log.user_email}</td>
                        <td className="px-4 py-2 font-mono text-xs">{log.entity_id}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.action === 'create' ? 'bg-green-100 text-green-700' :
                            log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-600 max-w-xs truncate">
                          {log.changes ? JSON.stringify(log.changes) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemConfigPage;
