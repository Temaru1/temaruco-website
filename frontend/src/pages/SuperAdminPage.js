import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2, Clock, Mail } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
console.log('SuperAdminPage API_URL:', API_URL);

const SuperAdminPage = () => {
  const [admins, setAdmins] = useState([]);
  const [actions, setActions] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admins'); // admins, emails, roles
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showNewAdminCredentials, setShowNewAdminCredentials] = useState(false);
  const [newAdminCredentials, setNewAdminCredentials] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    role: {
      can_view_orders: true,
      can_manage_orders: true,
      can_view_quotes: true,
      can_manage_quotes: true,
      can_view_products: true,
      can_manage_products: true,
      can_view_emails: false,
      can_view_analytics: true,
      can_manage_cms: false,
      can_manage_production: true,
      can_view_clients: true,
      can_manage_clients: true,
      can_view_procurement: false,
      can_manage_procurement: false,
      can_view_financials: false,
      can_manage_financials: false
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading super admin data from:', API_URL);
      const [adminsRes, actionsRes, emailsRes] = await Promise.all([
        axios.get(`${API_URL}/api/super-admin/admins`, { withCredentials: true }),
        axios.get(`${API_URL}/api/super-admin/actions`, { withCredentials: true }),
        axios.get(`${API_URL}/api/super-admin/emails`, { withCredentials: true })
      ]);
      console.log('Admins loaded:', adminsRes.data.length);
      
      // Ensure all admins have a role object (for backward compatibility)
      const adminsWithRoles = adminsRes.data.map(admin => ({
        ...admin,
        role: admin.role || {
          can_view_orders: true,
          can_manage_orders: true,
          can_view_quotes: true,
          can_manage_quotes: true,
          can_view_products: true,
          can_manage_products: true,
          can_view_emails: false,
          can_view_analytics: true,
          can_manage_cms: false,
          can_manage_production: true,
          can_view_clients: true,
          can_manage_clients: true,
          can_view_procurement: false,
          can_manage_procurement: false,
          can_view_financials: false,
          can_manage_financials: false
        }
      }));
      
      setAdmins(adminsWithRoles);
      setActions(actionsRes.data);
      setEmails(emailsRes.data.emails || []);
    } catch (error) {
      console.error('Failed to load super admin data:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to load data';
      toast.error(errorMessage);
      
      // If unauthorized, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
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
    
    try {
      console.log('Creating admin:', newAdmin.username);
      const response = await axios.post(
        `${API_URL}/api/super-admin/create-admin`,
        newAdmin,
        { withCredentials: true }
      );
      console.log('Admin created:', response.data);
      
      // Save credentials for display
      setNewAdminCredentials({
        username: newAdmin.username,
        email: newAdmin.email,
        name: newAdmin.name,
        password: newAdmin.password
      });
      
      toast.success('Admin created successfully!');
      setShowCreateModal(false);
      setShowNewAdminCredentials(true); // Show credentials modal
      
      // Reset form
      setNewAdmin({ 
        username: '',
        email: '', 
        name: '', 
        password: '',
        role: {
          can_view_orders: true,
          can_manage_orders: true,
          can_view_quotes: true,
          can_manage_quotes: true,
          can_view_products: true,
          can_manage_products: true,
          can_view_emails: false,
          can_view_analytics: true,
          can_manage_cms: false,
          can_manage_production: true,
          can_view_clients: true,
          can_manage_clients: true,
          can_view_procurement: false,
          can_manage_procurement: false,
          can_view_financials: false,
          can_manage_financials: false
        }
      });
      loadData();
    } catch (error) {
      console.error('Failed to create admin:', error);
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : 'Failed to create admin';
      toast.error(errorMessage);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedAdmin) return;
    
    try {
      await axios.patch(
        `${API_URL}/api/super-admin/admin/${selectedAdmin.id}/role`,
        newAdmin.role,
        { withCredentials: true }
      );
      toast.success('Admin role updated successfully!');
      setShowRoleModal(false);
      setSelectedAdmin(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleRemoveAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to remove admin privileges from this user?')) {
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
      setPasswordChange({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : 'Failed to change password';
      toast.error(errorMessage);
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
        `${API_URL}/api/super-admin/admin/${admin.id}/change-password`,
        formData,
        { withCredentials: true }
      );
      
      // Show password once in success message
      toast.success(`Password changed! New password: ${newPassword}`, { duration: 10000 });
      
      // Also show in alert so user can copy
      alert(`Password for ${admin.name} has been changed.\n\nNew Password: ${newPassword}\n\n⚠️ IMPORTANT: Save this password now! It won't be shown again.`);
      
    } catch (error) {
      toast.error('Failed to change password');
    }
  };



  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold" data-testid="super-admin-title">
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
          <div className="p-6 border-b">
            <h2 className="font-oswald text-2xl font-semibold flex items-center gap-2">
              <Shield className="text-primary" size={24} />
              Admin Users
            </h2>
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
                {admins.map(admin => (
                  <tr key={admin.user_id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-medium">{admin.name}</td>
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
                      {!admin.is_super_admin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              // Properly merge role with defaults to avoid undefined issues
                              const adminRole = admin.role || {};
                              setNewAdmin({
                                ...newAdmin, 
                                role: {
                                  can_view_orders: adminRole.can_view_orders ?? true,
                                  can_manage_orders: adminRole.can_manage_orders ?? true,
                                  can_view_quotes: adminRole.can_view_quotes ?? true,
                                  can_manage_quotes: adminRole.can_manage_quotes ?? true,
                                  can_view_products: adminRole.can_view_products ?? true,
                                  can_manage_products: adminRole.can_manage_products ?? true,
                                  can_view_emails: adminRole.can_view_emails ?? false,
                                  can_view_analytics: adminRole.can_view_analytics ?? true,
                                  can_manage_cms: adminRole.can_manage_cms ?? false,
                                  can_manage_production: adminRole.can_manage_production ?? true,
                                  can_view_clients: adminRole.can_view_clients ?? true,
                                  can_manage_clients: adminRole.can_manage_clients ?? true,
                                  can_view_procurement: adminRole.can_view_procurement ?? false,
                                  can_manage_procurement: adminRole.can_manage_procurement ?? false,
                                  can_view_financials: adminRole.can_view_financials ?? false,
                                  can_manage_financials: adminRole.can_manage_financials ?? false
                                }
                              });
                              setShowRoleModal(true);
                            }}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Manage Role
                          </button>
                          <button
                            onClick={() => handleChangeAdminPassword(admin)}
                            className="text-green-600 hover:underline text-sm"
                          >
                            Change Password
                          </button>
                          <button
                            onClick={() => handleRemoveAdmin(admin.user_id)}
                            className="text-red-600 hover:underline"
                            data-testid={`remove-${admin.user_id}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Emails */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="font-oswald text-2xl font-semibold flex items-center gap-2">
              <Mail size={24} className="text-primary" />
              Customer Emails
            </h2>
            <p className="text-sm text-zinc-600 mt-2">
              All customer emails collected from orders, payments, and checkouts
            </p>
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

      {/* Action Logs */}
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
                      {action.action === 'create_admin' ? '✓ Created admin' : '✗ Removed admin'}
                    </p>
                    <p className="text-sm text-zinc-600">
                      By: {action.performed_by} | Target: {action.target_user || action.target_user_id}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">Create New Admin</h2>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                  className="w-full"
                  placeholder="Admin's full name"
                  data-testid="admin-name"
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Username *</label>
                <input
                  type="text"
                  required
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                  className="w-full"
                  placeholder="admin_username"
                  data-testid="admin-username"
                />
                <p className="text-xs text-zinc-500 mt-1">Admin will use this username to login</p>
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  className="w-full"
                  placeholder="admin@temaruco.com"
                  data-testid="admin-email"
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Password *</label>
                <input
                  type="password"
                  required
                  minLength="8"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  className="w-full"
                  placeholder="Minimum 8 characters"
                  data-testid="admin-password"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-yellow-900 mb-1">⚠️ Important</p>
                <p className="text-yellow-700">
                  Password will be shown ONCE after creation. Make sure to copy and save it securely!
                </p>
              </div>

              {/* Granular Role Permissions */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Assign Permissions</h3>
                <p className="text-xs text-zinc-600 mb-4">Select which functions this admin can access:</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_orders}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_orders: e.target.checked}
                      })}
                    />
                    <span>View Orders</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_orders}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_orders: e.target.checked}
                      })}
                    />
                    <span>Manage Orders</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_quotes}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_quotes: e.target.checked}
                      })}
                    />
                    <span>View Quotes</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_quotes}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_quotes: e.target.checked}
                      })}
                    />
                    <span>Manage Quotes</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_products}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_products: e.target.checked}
                      })}
                    />
                    <span>View Products</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_products}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_products: e.target.checked}
                      })}
                    />
                    <span>Manage Products</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_analytics}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_analytics: e.target.checked}
                      })}
                    />
                    <span>View Analytics</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_cms}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_cms: e.target.checked}
                      })}
                    />
                    <span>Manage Website</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_emails}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_emails: e.target.checked}
                      })}
                    />
                    <span>View Customer Emails</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_production}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_production: e.target.checked}
                      })}
                    />
                    <span>Manage Production</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_clients}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_clients: e.target.checked}
                      })}
                    />
                    <span>View Clients</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_clients}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_clients: e.target.checked}
                      })}
                    />
                    <span>Manage Clients</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_procurement}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_procurement: e.target.checked}
                      })}
                    />
                    <span>View Procurement</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_procurement}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_procurement: e.target.checked}
                      })}
                    />
                    <span>Manage Procurement</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_view_financials}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_view_financials: e.target.checked}
                      })}
                    />
                    <span>View Financials</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAdmin.role.can_manage_financials}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, can_manage_financials: e.target.checked}
                      })}
                    />
                    <span>Manage Financials</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline flex-1"
                  data-testid="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  data-testid="submit-create-admin"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleModal && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">
              Manage Permissions: {selectedAdmin.name}
            </h2>

            <div className="space-y-4">
              {Object.keys(newAdmin.role).map(permission => (
                <div key={permission} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {permission.includes('view') ? 'Can view this section' : 'Can modify this section'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAdmin.role[permission]}
                      onChange={(e) => setNewAdmin({
                        ...newAdmin,
                        role: {...newAdmin.role, [permission]: e.target.checked}
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
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
                <p className="text-xs text-zinc-600 mt-1">Minimum 8 characters</p>
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
            <h2 className="font-oswald text-2xl font-bold mb-4 text-green-600">
              ✅ Admin Created Successfully!
            </h2>
            
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ IMPORTANT: Save these credentials now!
              </p>
              <p className="text-xs text-yellow-700">
                For security reasons, the password cannot be retrieved later. Make sure to copy and save these credentials securely.
              </p>
            </div>
            
            <div className="bg-zinc-50 rounded-lg p-6 space-y-4 border-2 border-primary">
              <div>
                <p className="text-xs text-zinc-600 mb-1">Name</p>
                <p className="font-semibold text-lg">{newAdminCredentials.name}</p>
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
                    `Username: ${newAdminCredentials.username}\nEmail: ${newAdminCredentials.email}\nPassword: ${newAdminCredentials.password}`
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
