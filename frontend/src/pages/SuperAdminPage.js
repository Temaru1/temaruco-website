import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Shield, Trash2, Clock, Mail, Eye, EyeOff, ChevronDown, ChevronUp, Check, X, Crown, Filter } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const SuperAdminPage = () => {
  const [admins, setAdmins] = useState([]);
  const [actions, setActions] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admins');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showNewAdminCredentials, setShowNewAdminCredentials] = useState(false);
  const [newAdminCredentials, setNewAdminCredentials] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'super_admin', 'admin'
  
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Default permissions structure
  const defaultPermissions = {
    can_view_site_texts: false,
    can_edit_site_texts: false,
    can_reset_site_texts: false,
    can_view_materials: true,
    can_add_materials: true,
    can_edit_materials: true,
    can_delete_materials: false,
    can_add_material_types: true,
    can_view_material_history: true,
    can_view_products: true,
    can_add_products: true,
    can_edit_products: true,
    can_delete_products: false,
    can_view_designs: true,
    can_download_designs: true,
    can_view_orders: true,
    can_manage_orders: true,
    can_update_order_status: true,
    can_delete_orders: false,
    can_view_production: true,
    can_manage_production: true,
    can_assign_tailors: true,
    can_view_quotes: true,
    can_manage_quotes: true,
    can_view_custom_requests: true,
    can_manage_custom_requests: true,
    can_view_clients: true,
    can_edit_clients: true,
    can_delete_clients: false,
    can_view_financials: false,
    can_manage_financials: false,
    can_delete_payments: false,
    can_view_pricing: true,
    can_manage_pricing: false,
    can_view_inventory: true,
    can_manage_inventory: true,
    can_view_procurement: true,
    can_manage_procurement: true,
    can_view_suppliers: true,
    can_manage_suppliers: true,
    can_manage_cms: false,
    can_manage_images: false,
    can_manage_pod_items: false,
    can_view_analytics: false,
    can_view_website_analytics: false,
    can_export_reports: true,
    can_view_emails: false,
    can_send_notifications: true,
    can_view_admins: false,
    can_create_admins: false,
    can_edit_admins: false,
    can_delete_admins: false,
    can_assign_permissions: false,
    can_view_settings: false,
    can_manage_settings: false,
    can_manage_payment_settings: false,
    can_manage_inventory_settings: true,
  };
  
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    is_super_admin: false,
    role: { ...defaultPermissions }
  });

  const loadPermissions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/super-admin/permissions`, {
        withCredentials: true
      });
      setAvailablePermissions(response.data.modules || {});
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadPermissions();
  }, [loadPermissions]);

  const loadData = async () => {
    try {
      const [adminsRes, actionsRes, emailsRes] = await Promise.all([
        axios.get(`${API_URL}/api/super-admin/admins`, { withCredentials: true }),
        axios.get(`${API_URL}/api/super-admin/actions`, { withCredentials: true }),
        axios.get(`${API_URL}/api/super-admin/emails`, { withCredentials: true })
      ]);
      
      const adminsWithRoles = adminsRes.data.map(admin => ({
        ...admin,
        role: admin.role || { ...defaultPermissions }
      }));
      
      setAdmins(adminsWithRoles);
      setActions(actionsRes.data);
      setEmails(emailsRes.data.emails || []);
    } catch (error) {
      console.error('Failed to load super admin data:', error);
      toast.error(error.response?.data?.detail || 'Failed to load data');
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        setTimeout(() => window.location.href = '/login', 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    if (!newAdmin.username || !newAdmin.email || !newAdmin.name || !newAdmin.password) {
      toast.error('All fields are required');
      return;
    }
    
    if (newAdmin.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API_URL}/api/super-admin/create-admin`,
        newAdmin,
        { withCredentials: true }
      );
      
      setNewAdminCredentials({
        username: newAdmin.username,
        email: newAdmin.email,
        name: newAdmin.name,
        password: newAdmin.password,
        is_super_admin: newAdmin.is_super_admin
      });
      
      toast.success(`${newAdmin.is_super_admin ? 'Super Admin' : 'Admin'} created successfully!`);
      setShowCreateModal(false);
      setShowNewAdminCredentials(true);
      
      // Reset form
      setNewAdmin({ 
        username: '',
        email: '', 
        name: '', 
        password: '',
        is_super_admin: false,
        role: { ...defaultPermissions }
      });
      loadData();
    } catch (error) {
      console.error('Failed to create admin:', error);
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create admin');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedAdmin) return;
    
    try {
      await axios.patch(
        `${API_URL}/api/super-admin/admin/${selectedAdmin.id || selectedAdmin.user_id}/role`,
        newAdmin.role,
        { withCredentials: true }
      );
      toast.success('Permissions updated successfully!');
      setShowRoleModal(false);
      setSelectedAdmin(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update permissions');
    }
  };

  const handlePromoteToSuperAdmin = async (admin) => {
    if (!window.confirm(`Are you sure you want to promote ${admin.name} to Super Admin? They will have full system access.`)) {
      return;
    }
    
    try {
      await axios.patch(
        `${API_URL}/api/super-admin/admin/${admin.id || admin.user_id}/role`,
        { ...admin.role, promote_to_super_admin: true },
        { withCredentials: true }
      );
      toast.success(`${admin.name} promoted to Super Admin!`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to promote admin');
    }
  };

  const handleDemoteSuperAdmin = async (admin) => {
    if (!window.confirm(`Are you sure you want to demote ${admin.name} to regular Admin?`)) {
      return;
    }
    
    try {
      await axios.patch(
        `${API_URL}/api/super-admin/admin/${admin.id || admin.user_id}/demote`,
        {},
        { withCredentials: true }
      );
      toast.success(`${admin.name} demoted to regular Admin`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to demote admin');
    }
  };

  const handleRemoveAdmin = async (userId, adminName) => {
    if (!window.confirm(`Are you sure you want to remove admin privileges from ${adminName}?`)) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/api/super-admin/admins/${userId}`,
        { withCredentials: true }
      );
      toast.success('Admin privileges removed');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove admin');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordChange.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('current_password', passwordChange.currentPassword);
      formData.append('new_password', passwordChange.newPassword);
      
      await axios.post(
        `${API_URL}/api/super-admin/change-password`,
        formData,
        { withCredentials: true }
      );
      
      toast.success('Password changed successfully!');
      setShowChangePasswordModal(false);
      setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to change password');
    }
  };

  const handleChangeAdminPassword = async (admin) => {
    const newPassword = prompt(`Enter new password for ${admin.name}:\n(Minimum 8 characters)`);
    if (!newPassword) return;
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('new_password', newPassword);
      
      await axios.post(
        `${API_URL}/api/super-admin/admin/${admin.id || admin.user_id}/change-password`,
        formData,
        { withCredentials: true }
      );
      
      toast.success(`Password changed! New password: ${newPassword}`, { duration: 10000 });
      alert(`Password for ${admin.name} has been changed.\n\nNew Password: ${newPassword}\n\n⚠️ IMPORTANT: Save this password now!`);
    } catch (error) {
      toast.error('Failed to change password');
    }
  };

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const toggleModulePermissions = (moduleKey, permissions, enabled) => {
    const updates = {};
    permissions.forEach(p => { updates[p.key] = enabled; });
    setNewAdmin(prev => ({
      ...prev,
      role: { ...prev.role, ...updates }
    }));
  };

  const isModuleFullyEnabled = (permissions) => {
    return permissions.every(p => newAdmin.role[p.key]);
  };

  const isModulePartiallyEnabled = (permissions) => {
    const enabled = permissions.filter(p => newAdmin.role[p.key]).length;
    return enabled > 0 && enabled < permissions.length;
  };

  // Filter admins based on role
  const filteredAdmins = admins.filter(admin => {
    if (filterRole === 'all') return true;
    if (filterRole === 'super_admin') return admin.is_super_admin;
    if (filterRole === 'admin') return !admin.is_super_admin;
    return true;
  });

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold flex items-center gap-3" data-testid="super-admin-title">
          <Shield className="text-purple-600" size={36} />
          Super Admin Panel
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="btn-outline flex items-center gap-2"
            data-testid="change-password-btn"
          >
            <Shield size={18} />
            Change Password
          </button>
          {activeTab === 'admins' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
              data-testid="create-admin-btn"
            >
              <UserPlus size={20} />
              Create Admin
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('admins')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'admins' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Admins ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'emails' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Customer Emails ({emails.length})
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'actions' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Action Logs ({actions.length})
        </button>
      </div>

      {/* Admins List */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="font-oswald text-2xl font-semibold flex items-center gap-2">
              <Shield className="text-primary" size={24} />
              Admin Users
            </h2>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-zinc-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
                data-testid="filter-role"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admins Only</option>
                <option value="admin">Regular Admins Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" data-testid="admins-table">
                {filteredAdmins.map(admin => (
                  <tr key={admin.user_id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {admin.is_super_admin && <Crown size={16} className="text-yellow-500" />}
                        <span className="font-medium">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">
                        {admin.username || admin.email}
                      </span>
                    </td>
                    <td className="px-6 py-4">{admin.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        admin.is_super_admin 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {admin.is_super_admin ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {!admin.is_super_admin ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setNewAdmin(prev => ({
                                  ...prev,
                                  role: { ...defaultPermissions, ...(admin.role || {}) }
                                }));
                                setShowRoleModal(true);
                              }}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              Permissions
                            </button>
                            <button
                              onClick={() => handlePromoteToSuperAdmin(admin)}
                              className="text-purple-600 hover:underline text-sm"
                              title="Promote to Super Admin"
                            >
                              Promote
                            </button>
                            <button
                              onClick={() => handleChangeAdminPassword(admin)}
                              className="text-green-600 hover:underline text-sm"
                            >
                              Password
                            </button>
                            <button
                              onClick={() => handleRemoveAdmin(admin.user_id, admin.name)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove Admin"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDemoteSuperAdmin(admin)}
                              className="text-orange-600 hover:underline text-sm"
                              title="Demote to Regular Admin"
                            >
                              Demote
                            </button>
                            <button
                              onClick={() => handleChangeAdminPassword(admin)}
                              className="text-green-600 hover:underline text-sm"
                            >
                              Password
                            </button>
                            <button
                              onClick={() => handleRemoveAdmin(admin.user_id, admin.name)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove Admin"
                            >
                              <Trash2 size={18} />
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
        </div>
      )}

      {/* Customer Emails Tab */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-oswald text-2xl font-semibold flex items-center gap-2">
              <Mail size={24} className="text-primary" />
              Customer Emails
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Sources</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Interactions</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">First Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {emails.length > 0 ? emails.map((email, index) => (
                  <tr key={index} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-medium">{email.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {email.sources?.map((source, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {source}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{email.interaction_count || 0}</td>
                    <td className="px-6 py-4 text-sm">{new Date(email.first_seen).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{new Date(email.last_seen).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-zinc-500">
                      No customer emails collected yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Logs Tab */}
      {activeTab === 'actions' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-oswald text-2xl font-semibold flex items-center gap-2">
              <Clock className="text-primary" size={24} />
              Recent Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {actions.map((action, index) => (
                <div key={index} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">
                      {action.action === 'create_admin' && '✓ Created admin'}
                      {action.action === 'create_super_admin' && '👑 Created super admin'}
                      {action.action === 'remove_admin' && '✗ Removed admin'}
                      {action.action === 'promote_to_super_admin' && '⬆️ Promoted to super admin'}
                      {action.action === 'demote_super_admin' && '⬇️ Demoted from super admin'}
                      {action.action === 'update_admin_role' && '🔧 Updated permissions'}
                    </p>
                    <p className="text-sm text-zinc-600">
                      By: {action.performed_by} | Target: {action.target_email || action.target_user || action.target_user_id}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(action.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">Create New Admin</h2>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-sm mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Admin's full name"
                    data-testid="admin-name"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-2">Username *</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="admin_username"
                    data-testid="admin-username"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="admin@temaruco.com"
                    data-testid="admin-email"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-2">Password *</label>
                  <input
                    type="password"
                    required
                    minLength="8"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Minimum 8 characters"
                    data-testid="admin-password"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAdmin.is_super_admin}
                    onChange={(e) => setNewAdmin({...newAdmin, is_super_admin: e.target.checked})}
                    className="w-5 h-5 accent-purple-600"
                    data-testid="is-super-admin"
                  />
                  <div>
                    <span className="font-semibold text-purple-900 flex items-center gap-2">
                      <Crown size={18} className="text-yellow-500" />
                      Create as Super Admin
                    </span>
                    <p className="text-sm text-purple-700 mt-1">
                      Super Admins have full access to all features and can manage other admins.
                    </p>
                  </div>
                </label>
              </div>

              {/* Granular Permissions (only show if not super admin) */}
              {!newAdmin.is_super_admin && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Assign Permissions</h3>
                  <p className="text-xs text-zinc-600 mb-4">Select which modules and actions this admin can access:</p>
                  
                  <div className="space-y-2">
                    {Object.entries(availablePermissions).map(([moduleKey, moduleData]) => (
                      <div key={moduleKey} className="border rounded-lg">
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-50"
                          onClick={() => toggleModule(moduleKey)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isModuleFullyEnabled(moduleData.permissions)}
                              ref={el => {
                                if (el) el.indeterminate = isModulePartiallyEnabled(moduleData.permissions);
                              }}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleModulePermissions(moduleKey, moduleData.permissions, e.target.checked);
                              }}
                              className="w-4 h-4"
                            />
                            <span className="font-medium">{moduleData.label}</span>
                          </div>
                          {expandedModules[moduleKey] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                        
                        {expandedModules[moduleKey] && (
                          <div className="border-t bg-zinc-50 p-3">
                            <div className="grid grid-cols-2 gap-2">
                              {moduleData.permissions.map(perm => (
                                <label key={perm.key} className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newAdmin.role[perm.key] || false}
                                    onChange={(e) => setNewAdmin({
                                      ...newAdmin,
                                      role: {...newAdmin.role, [perm.key]: e.target.checked}
                                    })}
                                    className="w-4 h-4"
                                  />
                                  <div>
                                    <span>{perm.label}</span>
                                    <p className="text-xs text-zinc-500">{perm.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-yellow-900 mb-1">⚠️ Important</p>
                <p className="text-yellow-700">
                  Password will be shown ONCE after creation. Make sure to copy and save it securely!
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  data-testid="submit-create-admin"
                >
                  Create {newAdmin.is_super_admin ? 'Super Admin' : 'Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleModal && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">
              Manage Permissions: {selectedAdmin.name}
            </h2>

            <div className="space-y-2">
              {Object.entries(availablePermissions).map(([moduleKey, moduleData]) => (
                <div key={moduleKey} className="border rounded-lg">
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-50"
                    onClick={() => toggleModule(moduleKey)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isModuleFullyEnabled(moduleData.permissions)}
                        ref={el => {
                          if (el) el.indeterminate = isModulePartiallyEnabled(moduleData.permissions);
                        }}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleModulePermissions(moduleKey, moduleData.permissions, e.target.checked);
                        }}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">{moduleData.label}</span>
                    </div>
                    {expandedModules[moduleKey] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  
                  {expandedModules[moduleKey] && (
                    <div className="border-t bg-zinc-50 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {moduleData.permissions.map(perm => (
                          <label key={perm.key} className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newAdmin.role[perm.key] || false}
                              onChange={(e) => setNewAdmin({
                                ...newAdmin,
                                role: {...newAdmin.role, [perm.key]: e.target.checked}
                              })}
                              className="w-4 h-4"
                            />
                            <div>
                              <span>{perm.label}</span>
                              <p className="text-xs text-zinc-500">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedAdmin(null);
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                className="btn-primary flex-1"
              >
                Update Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">Change Password</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordChange.currentPassword}
                  onChange={(e) => setPasswordChange({...passwordChange, currentPassword: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordChange.newPassword}
                  onChange={(e) => setPasswordChange({...passwordChange, newPassword: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  minLength="8"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordChange.confirmPassword}
                  onChange={(e) => setPasswordChange({...passwordChange, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Admin Credentials Display Modal */}
      {showNewAdminCredentials && newAdminCredentials && (
        <div className="modal-overlay" onClick={() => setShowNewAdminCredentials(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-4 text-green-600 flex items-center gap-2">
              {newAdminCredentials.is_super_admin && <Crown className="text-yellow-500" size={24} />}
              ✅ {newAdminCredentials.is_super_admin ? 'Super Admin' : 'Admin'} Created!
            </h2>
            
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ IMPORTANT: Save these credentials now!
              </p>
              <p className="text-xs text-yellow-700">
                The password cannot be retrieved later.
              </p>
            </div>
            
            <div className="bg-zinc-50 rounded-lg p-6 space-y-4 border-2 border-primary">
              <div>
                <p className="text-xs text-zinc-600 mb-1">Name</p>
                <p className="font-semibold text-lg">{newAdminCredentials.name}</p>
              </div>
              
              <div>
                <p className="text-xs text-zinc-600 mb-1">Role</p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  newAdminCredentials.is_super_admin 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {newAdminCredentials.is_super_admin ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              
              <div>
                <p className="text-xs text-zinc-600 mb-1">Username</p>
                <p className="font-mono font-bold text-lg text-blue-600">{newAdminCredentials.username}</p>
              </div>
              
              <div>
                <p className="text-xs text-zinc-600 mb-1">Email</p>
                <p className="font-semibold">{newAdminCredentials.email}</p>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-xs text-zinc-600 mb-1">Password (One-time display)</p>
                <p className="font-mono font-bold text-lg text-red-600 bg-white p-3 rounded border-2 border-red-200">
                  {newAdminCredentials.password}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Username: ${newAdminCredentials.username}\nEmail: ${newAdminCredentials.email}\nPassword: ${newAdminCredentials.password}\nRole: ${newAdminCredentials.is_super_admin ? 'Super Admin' : 'Admin'}`
                  );
                  toast.success('Credentials copied to clipboard!');
                }}
                className="btn-outline flex-1"
              >
                📋 Copy Credentials
              </button>
              <button
                onClick={() => {
                  setShowNewAdminCredentials(false);
                  setNewAdminCredentials(null);
                }}
                className="btn-primary flex-1"
              >
                I've Saved It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
