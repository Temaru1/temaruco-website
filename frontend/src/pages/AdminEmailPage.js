import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Settings, FileText, Users, Send, BarChart2, Plus, Edit2, Trash2, Download, Eye, Clock, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminEmailPage = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [analytics, setAnalytics] = useState({});
  const [settings, setSettings] = useState({});
  const [templates, setTemplates] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Pagination
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [subscriberTotal, setSubscriberTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  
  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  
  // Forms
  const [settingsForm, setSettingsForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    reply_to: '',
    is_active: true
  });
  
  const [templateForm, setTemplateForm] = useState({
    key: '',
    name: '',
    type: 'transactional',
    subject: '',
    html_content: '',
    variables: []
  });
  
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    subject: '',
    html_content: '',
    audience: 'all'
  });
  
  const [subscriberForm, setSubscriberForm] = useState({
    email: '',
    name: '',
    phone: ''
  });
  
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Load data
  const loadAnalytics = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/analytics`, { withCredentials: true });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/settings`, { withCredentials: true });
      setSettings(response.data);
      setSettingsForm(prev => ({ ...prev, ...response.data, smtp_password: '' }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/templates`, { withCredentials: true });
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  const loadSubscribers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/subscribers?page=${subscriberPage}&limit=20`, { withCredentials: true });
      setSubscribers(response.data.subscribers || []);
      setSubscriberTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to load subscribers:', error);
    }
  }, [subscriberPage]);

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/campaigns`, { withCredentials: true });
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/logs?page=${logPage}&limit=20`, { withCredentials: true });
      setLogs(response.data.logs || []);
      setLogTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }, [logPage]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        loadAnalytics(),
        loadSettings(),
        loadTemplates(),
        loadSubscribers(),
        loadCampaigns(),
        loadLogs()
      ]);
      setLoading(false);
    };
    loadAll();
  }, [loadAnalytics, loadSettings, loadTemplates, loadSubscribers, loadCampaigns, loadLogs]);

  // Handlers
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/email/settings`, settingsForm, { withCredentials: true });
      toast.success('Email settings saved!');
      setShowSettingsModal(false);
      loadSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Enter a test email address');
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API_URL}/api/admin/email/test`, { test_email: testEmail }, { withCredentials: true });
      toast.success(`Test email sent to ${testEmail}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await axios.put(`${API_URL}/api/admin/email/templates/${editingTemplate.key}`, templateForm, { withCredentials: true });
        toast.success('Template updated!');
      } else {
        await axios.post(`${API_URL}/api/admin/email/templates`, templateForm, { withCredentials: true });
        toast.success('Template created!');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (key) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/email/templates/${key}`, { withCredentials: true });
      toast.success('Template deleted');
      loadTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete template');
    }
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        await axios.put(`${API_URL}/api/admin/email/campaigns/${editingCampaign.id}`, campaignForm, { withCredentials: true });
        toast.success('Campaign updated!');
      } else {
        await axios.post(`${API_URL}/api/admin/email/campaigns`, campaignForm, { withCredentials: true });
        toast.success('Campaign created!');
      }
      setShowCampaignModal(false);
      setEditingCampaign(null);
      loadCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save campaign');
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Send this campaign to all subscribers?')) return;
    setSending(true);
    try {
      const response = await axios.post(`${API_URL}/api/admin/email/campaigns/${campaignId}/send`, {}, { withCredentials: true });
      toast.success(response.data.message);
      loadCampaigns();
      loadAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/email/campaigns/${campaignId}`, { withCredentials: true });
      toast.success('Campaign deleted');
      loadCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete campaign');
    }
  };

  const handleAddSubscriber = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/email/subscribers`, subscriberForm, { withCredentials: true });
      toast.success('Subscriber added!');
      setShowSubscriberModal(false);
      setSubscriberForm({ email: '', name: '', phone: '' });
      loadSubscribers();
      loadAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add subscriber');
    }
  };

  const handleDeleteSubscriber = async (subscriberId) => {
    if (!window.confirm('Remove this subscriber?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/email/subscribers/${subscriberId}`, { withCredentials: true });
      toast.success('Subscriber removed');
      loadSubscribers();
      loadAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove subscriber');
    }
  };

  const handleExportSubscribers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/subscribers/export`, { 
        withCredentials: true,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'subscribers.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Subscribers exported');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'settings', label: 'SMTP Settings', icon: Settings },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'subscribers', label: 'Subscribers', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: Send },
    { id: 'logs', label: 'Logs', icon: Clock },
  ];

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#D90429] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="text-[#D90429]" />
            Email Marketing System
          </h1>
          <p className="text-zinc-500">Manage transactional and marketing emails</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#D90429] text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6">
              <p className="text-blue-100 text-sm">Total Sent</p>
              <p className="text-4xl font-bold mt-2">{analytics.emails?.total_sent || 0}</p>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6">
              <p className="text-green-100 text-sm">Open Rate</p>
              <p className="text-4xl font-bold mt-2">{analytics.emails?.open_rate || 0}%</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6">
              <p className="text-purple-100 text-sm">Subscribers</p>
              <p className="text-4xl font-bold mt-2">{analytics.subscribers?.total || 0}</p>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-6">
              <p className="text-red-100 text-sm">Failed</p>
              <p className="text-4xl font-bold mt-2">{analytics.emails?.failed || 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-zinc-500">Actual Sent:</span> <strong>{analytics.emails?.actual_sent || 0}</strong></div>
              <div><span className="text-zinc-500">Mocked:</span> <strong>{analytics.emails?.mocked || 0}</strong></div>
              <div><span className="text-zinc-500">Campaigns:</span> <strong>{analytics.campaigns?.sent || 0}/{analytics.campaigns?.total || 0}</strong></div>
              <div><span className="text-zinc-500">Unsubscribed:</span> <strong>{analytics.subscribers?.unsubscribed || 0}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold">SMTP Configuration</h3>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Settings size={18} />
                Edit Settings
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-xs text-zinc-500">SMTP Host</p>
                <p className="font-mono">{settings.smtp_host || 'Not configured'}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-xs text-zinc-500">SMTP Port</p>
                <p className="font-mono">{settings.smtp_port || 587}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-xs text-zinc-500">Username</p>
                <p className="font-mono">{settings.smtp_username || 'Not set'}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-xs text-zinc-500">From Email</p>
                <p className="font-mono">{settings.from_email || 'Not set'}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-xs text-zinc-500">From Name</p>
                <p>{settings.from_name || 'Not set'}</p>
              </div>
              <div className="bg-zinc-50 p-4 rounded-lg">
                <p className="text-xs text-zinc-500">Status</p>
                <span className={`px-2 py-1 rounded text-xs ${settings.has_password ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {settings.has_password ? 'Configured' : 'Mock Mode'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-3">Send Test Email</h4>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={sending}
                  className="btn-primary flex items-center gap-2"
                >
                  {sending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  Send Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Email Templates</h3>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({ key: '', name: '', type: 'transactional', subject: '', html_content: '', variables: [] });
                setShowTemplateModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              New Template
            </button>
          </div>

          <div className="grid gap-4">
            {templates.map(template => (
              <div key={template.key} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{template.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs ${template.type === 'marketing' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {template.type}
                    </span>
                    {template.is_default && <span className="px-2 py-0.5 rounded text-xs bg-zinc-100">Default</span>}
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">{template.subject}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setTemplateForm({ ...template });
                      setShowTemplateModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 size={18} />
                  </button>
                  {!template.is_default && (
                    <button
                      onClick={() => handleDeleteTemplate(template.key)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Subscribers ({subscriberTotal})</h3>
            <div className="flex gap-2">
              <button onClick={handleExportSubscribers} className="btn-outline flex items-center gap-2">
                <Download size={18} />
                Export CSV
              </button>
              <button
                onClick={() => setShowSubscriberModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Add Subscriber
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subscribers.map(sub => (
                    <tr key={sub.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium">{sub.email}</td>
                      <td className="px-4 py-3">{sub.name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {sub.sources?.slice(0, 2).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-zinc-100 rounded text-xs">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${sub.is_subscribed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sub.is_subscribed ? 'Subscribed' : 'Unsubscribed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{formatDate(sub.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteSubscriber(sub.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Email Campaigns</h3>
            <button
              onClick={() => {
                setEditingCampaign(null);
                setCampaignForm({ title: '', subject: '', html_content: '', audience: 'all' });
                setShowCampaignModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              New Campaign
            </button>
          </div>

          <div className="grid gap-4">
            {campaigns.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-zinc-500">
                <Send size={48} className="mx-auto mb-4 opacity-50" />
                <p>No campaigns yet. Create your first campaign!</p>
              </div>
            ) : (
              campaigns.map(campaign => (
                <div key={campaign.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{campaign.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">Subject: {campaign.subject}</p>
                      {campaign.status === 'sent' && (
                        <p className="text-xs text-zinc-400 mt-2">
                          Sent: {campaign.sent_count} | Failed: {campaign.failed_count}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {campaign.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleSendCampaign(campaign.id)}
                            disabled={sending}
                            className="btn-primary text-sm flex items-center gap-1"
                          >
                            <Send size={14} />
                            Send
                          </button>
                          <button
                            onClick={() => {
                              setEditingCampaign(campaign);
                              setCampaignForm({ ...campaign });
                              setShowCampaignModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 size={18} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <h3 className="font-semibold">Email Logs ({logTotal})</h3>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Opened</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium">{log.recipient_email}</td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">{log.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.status === 'sent' ? 'bg-green-100 text-green-700' :
                          log.status === 'mocked' ? 'bg-blue-100 text-blue-700' :
                          log.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.opened ? <Check size={18} className="text-green-600" /> : <X size={18} className="text-zinc-300" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">SMTP Settings</h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={settingsForm.smtp_host}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port</label>
                  <input
                    type="number"
                    value={settingsForm.smtp_port}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtp_port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username/Email</label>
                <input
                  type="text"
                  value={settingsForm.smtp_username}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password {settings.has_password && '(leave blank to keep existing)'}</label>
                <input
                  type="password"
                  value={settingsForm.smtp_password}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From Email</label>
                  <input
                    type="email"
                    value={settingsForm.from_email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, from_email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">From Name</label>
                  <input
                    type="text"
                    value={settingsForm.from_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, from_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reply-To (optional)</label>
                <input
                  type="email"
                  value={settingsForm.reply_to}
                  onChange={(e) => setSettingsForm({ ...settingsForm, reply_to: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSettingsModal(false)} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingTemplate ? 'Edit Template' : 'New Template'}</h2>
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Key (unique identifier)</label>
                  <input
                    type="text"
                    value={templateForm.key}
                    onChange={(e) => setTemplateForm({ ...templateForm, key: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingTemplate}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="transactional">Transactional</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">HTML Content</label>
                <textarea
                  value={templateForm.html_content}
                  onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows="12"
                />
                <p className="text-xs text-zinc-500 mt-1">Use {'{{name}}'}, {'{{email}}'}, {'{{company_name}}'}, etc. for variables</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingTemplate ? 'Update' : 'Create'} Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</h2>
            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Subject</label>
                <input
                  type="text"
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Audience</label>
                <select
                  value={campaignForm.audience}
                  onChange={(e) => setCampaignForm({ ...campaignForm, audience: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="all">All Subscribers</option>
                  <option value="new">New Subscribers (last 30 days)</option>
                  <option value="active">Active Customers</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Content (HTML)</label>
                <textarea
                  value={campaignForm.html_content}
                  onChange={(e) => setCampaignForm({ ...campaignForm, html_content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows="10"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCampaignModal(false)} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingCampaign ? 'Update' : 'Create'} Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscriber Modal */}
      {showSubscriberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Subscriber</h2>
            <form onSubmit={handleAddSubscriber} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={subscriberForm.email}
                  onChange={(e) => setSubscriberForm({ ...subscriberForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={subscriberForm.name}
                  onChange={(e) => setSubscriberForm({ ...subscriberForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={subscriberForm.phone}
                  onChange={(e) => setSubscriberForm({ ...subscriberForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSubscriberModal(false)} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Add Subscriber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmailPage;
