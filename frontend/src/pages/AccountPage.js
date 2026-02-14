import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, MapPin, Palette, Edit2, Trash2, Plus, ChevronRight, LogOut, Save, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import SEO from '../components/SEO';
import {
  getAccountProfile,
  updateAccountProfile,
  getAccountAddresses,
  addAccountAddress,
  deleteAccountAddress,
  getAccountOrders,
  getSavedMockups,
  deleteMockup
} from '../utils/api';

const AccountPage = () => {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mockups, setMockups] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'Nigeria',
    postal_code: '',
    is_default: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, addressRes, ordersRes, mockupsRes] = await Promise.allSettled([
        getAccountProfile(),
        getAccountAddresses(),
        getAccountOrders(),
        getSavedMockups()
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
        setProfileForm({
          name: profileRes.value.data.name || '',
          phone: profileRes.value.data.phone || ''
        });
      }
      if (addressRes.status === 'fulfilled') setAddresses(addressRes.value.data);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data);
      if (mockupsRes.status === 'fulfilled') setMockups(mockupsRes.value.data);
    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await updateAccountProfile(profileForm);
      toast.success('Profile updated successfully');
      setEditingProfile(false);
      loadData();
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleAddAddress = async () => {
    try {
      await addAccountAddress(addressForm);
      toast.success('Address added successfully');
      setShowAddressModal(false);
      setAddressForm({
        label: 'Home',
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        country: 'Nigeria',
        postal_code: '',
        is_default: false
      });
      loadData();
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await deleteAccountAddress(addressId);
      toast.success('Address deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleDeleteMockup = async (mockupId) => {
    if (!window.confirm('Are you sure you want to delete this design?')) return;
    try {
      await deleteMockup(mockupId);
      toast.success('Design deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete design');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      payment_submitted: 'bg-blue-100 text-blue-800',
      payment_verified: 'bg-purple-100 text-purple-800',
      in_production: 'bg-indigo-100 text-indigo-800',
      ready_for_delivery: 'bg-cyan-100 text-cyan-800',
      completed: 'bg-green-100 text-green-800',
      delivered: 'bg-green-200 text-green-900',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-zinc-100 text-zinc-800';
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Orders', icon: Package, count: orders.length },
    { id: 'addresses', label: 'Addresses', icon: MapPin, count: addresses.length },
    { id: 'designs', label: 'Saved Designs', icon: Palette, count: mockups.length }
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO title="My Account" description="Manage your Temaruco account, orders, and saved designs" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">My Account</h1>
            <p className="text-zinc-600 mt-1">Welcome back, {profile?.name || user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-zinc-600 hover:text-red-600 transition-colors"
            data-testid="logout-btn"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-50 text-[#D90429] border-l-4 border-[#D90429]'
                      : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon size={18} />
                    <span className="font-medium">{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      activeTab === tab.id ? 'bg-[#D90429] text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm p-6" data-testid="profile-section">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Profile Information</h2>
                  {!editingProfile && (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="flex items-center gap-2 text-[#D90429] hover:underline"
                      data-testid="edit-profile-btn"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                  )}
                </div>

                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                        data-testid="profile-name-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                        data-testid="profile-phone-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full px-4 py-2 border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-500"
                      />
                      <p className="text-xs text-zinc-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleUpdateProfile}
                        className="flex items-center gap-2 px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] transition-colors"
                        data-testid="save-profile-btn"
                      >
                        <Save size={16} /> Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileForm({
                            name: profile?.name || '',
                            phone: profile?.phone || ''
                          });
                        }}
                        className="px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
                      <div className="w-16 h-16 bg-[#D90429] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {(profile?.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{profile?.name || 'N/A'}</h3>
                        <p className="text-zinc-600">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-zinc-200 rounded-lg">
                        <p className="text-sm text-zinc-500 mb-1">Phone Number</p>
                        <p className="font-medium">{profile?.phone || 'Not set'}</p>
                      </div>
                      <div className="p-4 border border-zinc-200 rounded-lg">
                        <p className="text-sm text-zinc-500 mb-1">Member Since</p>
                        <p className="font-medium">
                          {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-xl shadow-sm p-6" data-testid="orders-section">
                <h2 className="text-xl font-bold mb-6">Order History</h2>
                
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={48} className="mx-auto text-zinc-300 mb-4" />
                    <h3 className="font-semibold text-zinc-600 mb-2">No orders yet</h3>
                    <p className="text-zinc-500 mb-4">Start shopping to see your orders here</p>
                    <button
                      onClick={() => navigate('/boutique')}
                      className="px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] transition-colors"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id || order.order_id}
                        className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <p className="font-mono font-semibold text-[#D90429]">
                              {order.order_id || order.id}
                            </p>
                            <p className="text-sm text-zinc-500 mt-1">
                              {new Date(order.created_at).toLocaleDateString()} • {order.type?.toUpperCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status?.replace(/_/g, ' ')}
                            </span>
                            <p className="font-bold">₦{(order.total_price || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between items-center">
                          <p className="text-sm text-zinc-600">
                            {order.quantity || order.items?.length || 1} item(s)
                          </p>
                          <button
                            onClick={() => navigate(`/order-summary/${order.order_id || order.id}`)}
                            className="text-sm text-[#D90429] hover:underline flex items-center gap-1"
                          >
                            View Details <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-white rounded-xl shadow-sm p-6" data-testid="addresses-section">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Saved Addresses</h2>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] transition-colors"
                    data-testid="add-address-btn"
                  >
                    <Plus size={16} /> Add Address
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin size={48} className="mx-auto text-zinc-300 mb-4" />
                    <h3 className="font-semibold text-zinc-600 mb-2">No saved addresses</h3>
                    <p className="text-zinc-500">Add addresses for faster checkout</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border rounded-lg p-4 relative ${
                          address.is_default ? 'border-[#D90429] bg-red-50' : 'border-zinc-200'
                        }`}
                      >
                        {address.is_default && (
                          <span className="absolute top-2 right-2 bg-[#D90429] text-white text-xs px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                        <h3 className="font-semibold mb-2">{address.label}</h3>
                        <p className="text-sm text-zinc-600">{address.full_name}</p>
                        <p className="text-sm text-zinc-600">{address.address_line1}</p>
                        {address.address_line2 && (
                          <p className="text-sm text-zinc-600">{address.address_line2}</p>
                        )}
                        <p className="text-sm text-zinc-600">
                          {address.city}, {address.state}
                        </p>
                        <p className="text-sm text-zinc-600">{address.phone}</p>
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="mt-3 text-sm text-red-600 hover:underline flex items-center gap-1"
                          data-testid={`delete-address-${address.id}`}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Saved Designs Tab */}
            {activeTab === 'designs' && (
              <div className="bg-white rounded-xl shadow-sm p-6" data-testid="designs-section">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Saved Designs</h2>
                  <button
                    onClick={() => navigate('/mockup-builder')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] transition-colors"
                  >
                    <Plus size={16} /> Create New Design
                  </button>
                </div>

                {mockups.length === 0 ? (
                  <div className="text-center py-12">
                    <Palette size={48} className="mx-auto text-zinc-300 mb-4" />
                    <h3 className="font-semibold text-zinc-600 mb-2">No saved designs</h3>
                    <p className="text-zinc-500 mb-4">Create mockups in our Design Tool and save them here</p>
                    <button
                      onClick={() => navigate('/mockup-builder')}
                      className="px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] transition-colors"
                    >
                      Open Design Tool
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockups.map((mockup) => (
                      <div
                        key={mockup.id}
                        className="border border-zinc-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-square bg-zinc-100 flex items-center justify-center">
                          {mockup.thumbnail ? (
                            <img
                              src={mockup.thumbnail}
                              alt={mockup.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Palette size={48} className="text-zinc-300" />
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm truncate">{mockup.name}</h3>
                          <p className="text-xs text-zinc-500 mt-1">
                            {mockup.template?.replace(/_/g, ' ')} • {mockup.color}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            {new Date(mockup.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => navigate(`/mockup-builder?load=${mockup.id}`)}
                              className="flex-1 text-xs px-3 py-1.5 border border-zinc-200 rounded hover:bg-zinc-50 flex items-center justify-center gap-1"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => handleDeleteMockup(mockup.id)}
                              className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded hover:bg-red-50"
                              data-testid={`delete-mockup-${mockup.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddressModal(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Add New Address</h2>
              <button onClick={() => setShowAddressModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Label</label>
                <select
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                >
                  <option>Home</option>
                  <option>Work</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  value={addressForm.address_line1}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  placeholder="Street address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={addressForm.address_line2}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">State *</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="is_default" className="text-sm text-zinc-600">Set as default address</label>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={handleAddAddress}
                className="flex-1 px-4 py-2 bg-[#D90429] text-white rounded-lg hover:bg-[#B90322] transition-colors"
                data-testid="save-address-btn"
              >
                Save Address
              </button>
              <button
                onClick={() => setShowAddressModal(false)}
                className="px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
