import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Filter, Eye, Mail, Phone, Calendar, 
  DollarSign, MessageSquare, CheckCircle, Clock, XCircle,
  Palette, Shirt, Building2, Instagram, PenTool, X, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DESIGN_TYPE_ICONS = {
  logo: Building2,
  tshirt_artwork: Shirt,
  brand_identity: Palette,
  social_media: Instagram,
  event_flyers: Calendar,
  custom_illustration: PenTool,
  other: Palette
};

const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  quoted: { label: 'Quote Sent', color: 'bg-blue-100 text-blue-800', icon: DollarSign },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Palette },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
};

const AdminDesignInquiriesPage = () => {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form state for updates
  const [updateForm, setUpdateForm] = useState({
    status: '',
    quote_amount: '',
    admin_notes: ''
  });

  useEffect(() => {
    loadInquiries();
  }, []);

  const loadInquiries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/design-inquiries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInquiries(response.data || []);
    } catch (error) {
      console.error('Failed to load inquiries:', error);
      toast.error('Failed to load design inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInquiry = (inquiry) => {
    setSelectedInquiry(inquiry);
    setUpdateForm({
      status: inquiry.status,
      quote_amount: inquiry.quote_amount || '',
      admin_notes: inquiry.admin_notes || ''
    });
    setShowDetailModal(true);
  };

  const handleUpdateInquiry = async () => {
    if (!selectedInquiry) return;
    
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/api/admin/design-inquiries/${selectedInquiry.inquiry_code}`,
        {
          status: updateForm.status,
          quote_amount: updateForm.quote_amount ? parseFloat(updateForm.quote_amount) : null,
          admin_notes: updateForm.admin_notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Inquiry updated successfully');
      loadInquiries();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update inquiry');
    } finally {
      setUpdating(false);
    }
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      inquiry.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.inquiry_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <config.icon size={12} />
        {config.label}
      </span>
    );
  };

  const getDesignTypeLabel = (type) => {
    const labels = {
      logo: 'Logo Design',
      tshirt_artwork: 'T-Shirt Artwork',
      brand_identity: 'Brand Identity',
      social_media: 'Social Media',
      event_flyers: 'Event Flyers',
      custom_illustration: 'Custom Illustration',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats
  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'pending_review').length,
    quoted: inquiries.filter(i => i.status === 'quoted').length,
    inProgress: inquiries.filter(i => i.status === 'in_progress').length,
    completed: inquiries.filter(i => i.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D90429]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center text-zinc-500 hover:text-zinc-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-zinc-900">Design Inquiries</h1>
            <p className="text-zinc-500">Manage design service requests</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-zinc-900">{stats.total}</p>
              <p className="text-sm text-zinc-500">Total</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-zinc-500">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.quoted}</p>
              <p className="text-sm text-zinc-500">Quoted</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.inProgress}</p>
              <p className="text-sm text-zinc-500">In Progress</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-zinc-500">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, email, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-zinc-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="quoted">Quote Sent</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inquiries Table */}
        <Card>
          <CardContent className="p-0">
            {filteredInquiries.length === 0 ? (
              <div className="text-center py-12">
                <Palette className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">No design inquiries found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">Code</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">Customer</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">Design Type</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">Quote</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">Date</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-zinc-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInquiries.map((inquiry) => {
                      const IconComponent = DESIGN_TYPE_ICONS[inquiry.design_type] || Palette;
                      return (
                        <tr key={inquiry.inquiry_code} className="hover:bg-zinc-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-medium text-[#D90429]">
                              {inquiry.inquiry_code}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-zinc-900">{inquiry.full_name}</p>
                              <p className="text-sm text-zinc-500">{inquiry.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <IconComponent size={16} className="text-zinc-500" />
                              <span className="text-sm">{getDesignTypeLabel(inquiry.design_type)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(inquiry.status)}
                          </td>
                          <td className="px-4 py-3">
                            {inquiry.quote_amount ? (
                              <span className="font-semibold text-green-600">
                                ₦{inquiry.quote_amount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-500">
                            {formatDate(inquiry.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewInquiry(inquiry)}
                              >
                                <Eye size={14} className="mr-1" /> View
                              </Button>
                              {inquiry.phone && (
                                <a
                                  href={`https://wa.me/${inquiry.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="WhatsApp"
                                >
                                  <Phone size={16} />
                                </a>
                              )}
                              <a
                                href={`mailto:${inquiry.email}`}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Email"
                              >
                                <Mail size={16} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedInquiry && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Inquiry Details</h2>
                <p className="text-sm text-zinc-500 font-mono">{selectedInquiry.inquiry_code}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-500 mb-1">Customer Name</p>
                  <p className="font-semibold">{selectedInquiry.full_name}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-500 mb-1">Email</p>
                  <a href={`mailto:${selectedInquiry.email}`} className="font-semibold text-blue-600 hover:underline">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-500 mb-1">Phone / WhatsApp</p>
                  {selectedInquiry.phone ? (
                    <a 
                      href={`https://wa.me/${selectedInquiry.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-green-600 hover:underline flex items-center gap-1"
                    >
                      {selectedInquiry.phone} <ExternalLink size={14} />
                    </a>
                  ) : (
                    <p className="text-zinc-400">Not provided</p>
                  )}
                </div>
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-500 mb-1">Design Type</p>
                  <p className="font-semibold">{getDesignTypeLabel(selectedInquiry.design_type)}</p>
                </div>
              </div>

              {/* Request Details */}
              <div>
                <h3 className="font-semibold mb-2">Project Description</h3>
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedInquiry.description}</p>
                </div>
              </div>

              {/* Deadline & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-500 mb-1">Deadline</p>
                  <p className="font-semibold">
                    {selectedInquiry.deadline 
                      ? new Date(selectedInquiry.deadline).toLocaleDateString('en-NG', { dateStyle: 'long' })
                      : 'Flexible'
                    }
                  </p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-500 mb-1">Customer Budget Range</p>
                  <p className="font-semibold">{selectedInquiry.budget_range || 'Not specified'}</p>
                </div>
              </div>

              {/* Reference Images */}
              {selectedInquiry.reference_files?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Reference Images</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedInquiry.reference_files.map((file, index) => (
                      <a
                        key={index}
                        href={`${API_URL}${file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-24 h-24 bg-zinc-100 rounded-lg overflow-hidden hover:opacity-80"
                      >
                        <img
                          src={`${API_URL}${file}`}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Update Section */}
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Update Inquiry</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
                    <select
                      value={updateForm.status}
                      onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    >
                      <option value="pending_review">Pending Review</option>
                      <option value="quoted">Quote Sent</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Quote Amount (₦)</label>
                    <input
                      type="number"
                      value={updateForm.quote_amount}
                      onChange={(e) => setUpdateForm({ ...updateForm, quote_amount: e.target.value })}
                      placeholder="Enter quote amount"
                      className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Admin Notes</label>
                  <textarea
                    value={updateForm.admin_notes}
                    onChange={(e) => setUpdateForm({ ...updateForm, admin_notes: e.target.value })}
                    rows={3}
                    placeholder="Add internal notes about this inquiry..."
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleUpdateInquiry}
                    disabled={updating}
                    className="bg-[#D90429] hover:bg-[#B90322]"
                  >
                    {updating ? 'Updating...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-zinc-400 border-t pt-4">
                <p>Created: {formatDate(selectedInquiry.created_at)}</p>
                {selectedInquiry.updated_at !== selectedInquiry.created_at && (
                  <p>Last Updated: {formatDate(selectedInquiry.updated_at)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDesignInquiriesPage;
