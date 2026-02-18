import React, { useState, useEffect } from 'react';
import { Search, Eye, Trash2, X, User, Mail, Phone, Calendar, Image as ImageIcon, FileImage, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { getImageUrl } from '../utils/imageUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminGuestDesignsPage = () => {
  const [designs, setDesigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('designs'); // 'designs' or 'contacts'
  const [statusFilter, setStatusFilter] = useState(''); // '', 'assigned', 'unassigned'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewType, setPreviewType] = useState('original'); // 'original' or 'mockup'
  const [downloading, setDownloading] = useState(null); // 'original' | 'mockup' | null
  const [assignedCount, setAssignedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  useEffect(() => {
    if (activeTab === 'designs') {
      loadDesigns();
    } else {
      loadContacts();
    }
  }, [activeTab, currentPage, searchTerm, statusFilter]);

  const loadDesigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/pod/guest-designs`, {
        params: { page: currentPage, limit: 20, search: searchTerm, status: statusFilter }
      });
      setDesigns(response.data.designs || []);
      setTotalPages(response.data.pages || 1);
      setAssignedCount(response.data.assigned_count || 0);
      setUnassignedCount(response.data.unassigned_count || 0);
    } catch (error) {
      console.error('Failed to load designs:', error);
      toast.error('Failed to load guest designs');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/admin/pod/guest-contacts`, {
        params: { page: currentPage, limit: 20, search: searchTerm }
      });
      setContacts(response.data.contacts || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load guest contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDesign = async (designId) => {
    if (!window.confirm('Are you sure you want to delete this design?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/pod/design/${designId}`);
      toast.success('Design deleted successfully');
      loadDesigns();
    } catch (error) {
      console.error('Failed to delete design:', error);
      toast.error('Failed to delete design');
    }
  };

  // Download original file (full resolution)
  const downloadOriginal = async (designId) => {
    if (!designId) return;
    
    setDownloading('original');
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/pod/download/original/${designId}`,
        { responseType: 'blob' }
      );
      
      // Get filename from content-disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `design_${designId}_original.png`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Original file downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download original file');
    } finally {
      setDownloading(null);
    }
  };

  // Download mockup file (full resolution)
  const downloadMockup = async (designId) => {
    if (!designId) return;
    
    setDownloading('mockup');
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/pod/download/mockup/${designId}`,
        { responseType: 'blob' }
      );
      
      // Get filename from content-disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `design_${designId}_mockup.png`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Mockup file downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      if (error.response?.status === 404) {
        toast.error('Mockup file not available');
      } else {
        toast.error('Failed to download mockup file');
      }
    } finally {
      setDownloading(null);
    }
  };

  const openPreview = (design, type = 'original') => {
    setSelectedDesign(design);
    setPreviewType(type);
    setShowPreviewModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Guest Designs</h1>
        <p className="text-zinc-500">View and manage guest uploaded designs and contact records</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => { setActiveTab('designs'); setCurrentPage(1); setStatusFilter(''); }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'designs'
              ? 'border-[#D90429] text-[#D90429]'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <FileImage className="w-4 h-4 inline mr-2" />
          All Designs
        </button>
        <button
          onClick={() => { setActiveTab('contacts'); setCurrentPage(1); }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'contacts'
              ? 'border-[#D90429] text-[#D90429]'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Guest Contacts
        </button>
      </div>

      {/* Status Filter Tabs (only for designs) */}
      {activeTab === 'designs' && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setStatusFilter(''); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === ''
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
            data-testid="filter-all"
          >
            All ({assignedCount + unassignedCount})
          </button>
          <button
            onClick={() => { setStatusFilter('assigned'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'assigned'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
            data-testid="filter-assigned"
          >
            Assigned ({assignedCount})
          </button>
          <button
            onClick={() => { setStatusFilter('unassigned'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'unassigned'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
            data-testid="filter-unassigned"
          >
            Unassigned ({unassignedCount})
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === 'designs' ? 'Search by email or product...' : 'Search by name, email, or phone...'}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D90429]"></div>
        </div>
      ) : activeTab === 'designs' ? (
        /* Designs Table with horizontal/vertical scroll */
        <div className="bg-white rounded-lg shadow overflow-auto max-h-[70vh]">
          <table className="w-full min-w-[900px]">
            <thead className="bg-zinc-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Original</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Mockup</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {designs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-zinc-500">
                    No guest designs found
                  </td>
                </tr>
              ) : (
                designs.map((design) => (
                  <tr key={design.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{design.guest_name || 'Unknown'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{design.guest_email || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{design.guest_phone || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {design.product_id || design.item_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        design.status === 'assigned' || design.is_assigned
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {design.status === 'assigned' || design.is_assigned ? 'Assigned' : 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {design.original_file_url ? (
                        <button
                          onClick={() => openPreview(design, 'original')}
                          className="w-12 h-12 bg-zinc-100 rounded overflow-hidden hover:ring-2 hover:ring-[#D90429] transition-all"
                        >
                          <img
                            src={getImageUrl(design.original_file_url)}
                            alt="Original"
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.src = 'https://placehold.co/48x48/e2e8f0/64748b?text=N/A'; }}
                          />
                        </button>
                      ) : (
                        <span className="text-zinc-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {design.mockup_file_url ? (
                        <button
                          onClick={() => openPreview(design, 'mockup')}
                          className="w-12 h-12 bg-zinc-100 rounded overflow-hidden hover:ring-2 hover:ring-[#D90429] transition-all"
                        >
                          <img
                            src={getImageUrl(design.mockup_file_url)}
                            alt="Mockup"
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.src = 'https://placehold.co/48x48/e2e8f0/64748b?text=N/A'; }}
                          />
                        </button>
                      ) : (
                        <span className="text-zinc-400 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{formatDate(design.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openPreview(design, 'original')}
                          className="p-1 text-zinc-500 hover:text-blue-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadOriginal(design.id)}
                          className="p-1 text-zinc-500 hover:text-green-600 transition-colors"
                          title="Download Original"
                          disabled={!design.original_file_url}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDesign(design.id)}
                          className="p-1 text-zinc-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Contacts Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Designs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Latest Design</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-zinc-500">
                    No guest contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-zinc-500" />
                        </div>
                        <span className="font-medium text-zinc-900">{contact.name || 'Guest'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-zinc-600">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-zinc-600">
                        <Phone className="w-3 h-3" />
                        {contact.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {contact.design_count || 0} designs
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {contact.latest_design?.original_file_url ? (
                        <button
                          onClick={() => openPreview(contact.latest_design, 'original')}
                          className="w-10 h-10 bg-zinc-100 rounded overflow-hidden hover:ring-2 hover:ring-[#D90429]"
                        >
                          <img
                            src={getImageUrl(contact.latest_design.original_file_url)}
                            alt="Latest"
                            className="w-full h-full object-contain"
                          />
                        </button>
                      ) : (
                        <span className="text-zinc-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(contact.created_at)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-zinc-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedDesign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Design Preview</h2>
                <p className="text-sm text-zinc-500">{selectedDesign.guest_email || 'Guest'} • {selectedDesign.product_id}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPreviewType('original')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    previewType === 'original'
                      ? 'bg-[#D90429] text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  Original Design
                </button>
                <button
                  onClick={() => setPreviewType('mockup')}
                  disabled={!selectedDesign.mockup_file_url}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    previewType === 'mockup'
                      ? 'bg-[#D90429] text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <FileImage className="w-4 h-4 inline mr-1" />
                  Mockup Preview
                </button>
              </div>
              
              {/* Image Preview */}
              <div className="bg-zinc-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                {previewType === 'original' && selectedDesign.original_file_url ? (
                  <img
                    src={getImageUrl(selectedDesign.original_file_url)}
                    alt="Original Design"
                    className="max-w-full max-h-[500px] object-contain"
                  />
                ) : previewType === 'mockup' && selectedDesign.mockup_file_url ? (
                  <img
                    src={getImageUrl(selectedDesign.mockup_file_url)}
                    alt="Mockup"
                    className="max-w-full max-h-[500px] object-contain"
                  />
                ) : (
                  <div className="text-center text-zinc-500">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                    <p>{previewType === 'mockup' ? 'Mockup not available' : 'Image not available'}</p>
                  </div>
                )}
              </div>
              
              {/* Download Buttons */}
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={() => downloadOriginal(selectedDesign.id)}
                  disabled={!selectedDesign.original_file_url || downloading === 'original'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {downloading === 'original' ? 'Downloading...' : 'Download Original'}
                </button>
                <button
                  onClick={() => downloadMockup(selectedDesign.id)}
                  disabled={!selectedDesign.mockup_file_url || downloading === 'mockup'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {downloading === 'mockup' ? 'Downloading...' : 'Download Mockup'}
                </button>
              </div>
              
              {/* Design Details */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 uppercase">Print Size</p>
                  <p className="font-medium">{selectedDesign.print_size?.toUpperCase() || 'A4'}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 uppercase">File Size</p>
                  <p className="font-medium">{selectedDesign.file_size ? `${(selectedDesign.file_size / 1024).toFixed(1)} KB` : 'N/A'}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 uppercase">Status</p>
                  <p className="font-medium capitalize">{selectedDesign.status || 'Uploaded'}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 uppercase">Created</p>
                  <p className="font-medium text-sm">{formatDate(selectedDesign.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGuestDesignsPage;
