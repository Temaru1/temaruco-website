import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Clock, CheckCircle, XCircle, Eye, DollarSign, Calendar, Download, Plus, Phone, Mail, Package } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'reviewed': 'bg-blue-100 text-blue-800 border-blue-300',
  'approved': 'bg-green-100 text-green-800 border-green-300',
  'rejected': 'bg-red-100 text-red-800 border-red-300',
  'Quote Created': 'bg-purple-100 text-purple-800 border-purple-300',
  'Quote Sent': 'bg-purple-100 text-purple-800 border-purple-300',
  'New Inquiry': 'bg-blue-100 text-blue-800 border-blue-300',
  'Reviewing': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Approved': 'bg-green-100 text-green-800 border-green-300',
  'In Production': 'bg-orange-100 text-orange-800 border-orange-300',
  'Completed': 'bg-gray-100 text-gray-800 border-gray-300',
  'Declined': 'bg-red-100 text-red-800 border-red-300'
};

const AdminEnquiriesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [counts, setCounts] = useState({ all: 0, custom_order: 0, general: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // all, custom_order, general
  const [filterStatus, setFilterStatus] = useState('all');
  const [highlightedId, setHighlightedId] = useState(null);
  
  const [quoteData, setQuoteData] = useState({
    unit_price: '',
    additional_cost: 0,
    discount: 0,
    estimated_production_days: '',
    quote_expiry_date: '',
    notes_to_customer: ''
  });

  useEffect(() => {
    loadEnquiries();
    
    // Check if we need to highlight a specific enquiry (from notification)
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');
    if (highlightId) {
      setHighlightedId(highlightId);
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, [location, filterTab, filterStatus]);

  const loadEnquiries = async () => {
    try {
      const params = new URLSearchParams();
      if (filterTab !== 'all') params.append('enquiry_type', filterTab);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      
      const response = await axios.get(`${API_URL}/api/admin/enquiries?${params.toString()}`, {
        withCredentials: true
      });
      
      // Handle both old and new response format
      if (response.data.enquiries) {
        setEnquiries(response.data.enquiries);
        setCounts(response.data.counts);
      } else {
        setEnquiries(response.data);
      }
    } catch (error) {
      toast.error('Failed to load enquiries');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadEnquiries();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewEnquiry = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setShowViewModal(true);
  };

  const handleCreateQuote = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setQuoteData({
      unit_price: '',
      additional_cost: 0,
      discount: 0,
      estimated_production_days: '',
      quote_expiry_date: '',
      notes_to_customer: ''
    });
    setShowQuoteModal(true);
  };

  const handleStatusUpdate = async (enquiryId, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/api/admin/enquiries/${enquiryId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success('Status updated successfully');
      loadEnquiries();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSubmitQuote = async () => {
    if (!quoteData.unit_price) {
      toast.error('Please enter unit price');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/admin/enquiries/${selectedEnquiry.id}/create-full-quote`,
        quoteData,
        { withCredentials: true }
      );
      toast.success(`Quote ${response.data.quote_number} created successfully!`);
      setShowQuoteModal(false);
      setShowViewModal(false);
      loadEnquiries();
      
      // Navigate to quotes page
      navigate('/admin/quotes');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create quote');
    }
  };

  const handleDownloadPDF = async (enquiryId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/enquiries/${enquiryId}/quote-pdf`,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote-${enquiryId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  // Calculate total from quote data
  const calculateTotal = () => {
    const unitPrice = parseFloat(quoteData.unit_price) || 0;
    const quantity = selectedEnquiry?.quantity || 1;
    const additionalCost = parseFloat(quoteData.additional_cost) || 0;
    const discount = parseFloat(quoteData.discount) || 0;
    return (unitPrice * quantity) + additionalCost - discount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading enquiries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-oswald text-4xl font-bold uppercase" data-testid="enquiries-title">
              Enquiries
            </h1>
            <p className="text-zinc-600 mt-2">Manage custom orders and general enquiries</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{counts.all || enquiries.length}</div>
            <div className="text-sm text-zinc-600">Total Enquiries</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-6 py-4 font-semibold text-sm transition-colors ${
                filterTab === 'all' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
              data-testid="tab-all"
            >
              All Enquiries
              <span className="ml-2 px-2 py-0.5 bg-zinc-100 rounded-full text-xs">
                {counts.all || enquiries.length}
              </span>
            </button>
            <button
              onClick={() => setFilterTab('custom_order')}
              className={`px-6 py-4 font-semibold text-sm transition-colors ${
                filterTab === 'custom_order' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
              data-testid="tab-custom"
            >
              Custom Orders
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                {counts.custom_order || 0}
              </span>
            </button>
            <button
              onClick={() => setFilterTab('general')}
              className={`px-6 py-4 font-semibold text-sm transition-colors ${
                filterTab === 'general' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
              data-testid="tab-general"
            >
              General Enquiries
              <span className="ml-2 px-2 py-0.5 bg-zinc-100 rounded-full text-xs">
                {counts.general || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Search by Order ID, customer name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="search-enquiries"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="btn-primary flex items-center gap-2 px-6"
                data-testid="search-btn"
              >
                <Search size={18} />
                Search
              </button>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setLoading(true);
                    setTimeout(loadEnquiries, 100);
                  }}
                  className="btn-outline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enquiries Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full min-w-[900px]">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" data-testid="enquiries-table">
                {enquiries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center">
                      <FileText className="mx-auto text-zinc-400 mb-4" size={48} />
                      <p className="text-zinc-600 text-lg">No enquiries found</p>
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enquiry) => (
                    <tr 
                      key={enquiry.id} 
                      className={`hover:bg-zinc-50 transition-all ${
                        highlightedId === enquiry.id ? 'ring-4 ring-yellow-400 animate-pulse' : ''
                      }`}
                      data-testid={`enquiry-row-${enquiry.order_id || enquiry.enquiry_code}`}
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-primary">
                          {enquiry.order_id || enquiry.enquiry_code}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold">{enquiry.customer_name}</td>
                      <td className="px-4 py-4 text-sm">{enquiry.customer_phone}</td>
                      <td className="px-4 py-4 text-sm text-zinc-600">{enquiry.customer_email}</td>
                      <td className="px-4 py-4 font-semibold">{enquiry.quantity || enquiry.total_quantity || '-'}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          STATUS_COLORS[enquiry.status] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {enquiry.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-600">
                        {new Date(enquiry.created_at).toLocaleDateString()}
                        <br />
                        <span className="text-xs">{new Date(enquiry.created_at).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewEnquiry(enquiry)}
                            className="btn-outline py-1.5 px-3 text-sm flex items-center gap-1"
                            data-testid={`view-${enquiry.id}`}
                          >
                            <Eye size={14} />
                            View
                          </button>
                          {enquiry.quote && (
                            <button
                              onClick={() => handleDownloadPDF(enquiry.id)}
                              className="btn-outline py-1.5 px-3 text-sm flex items-center gap-1"
                              title="Download Quote PDF"
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Details Modal */}
        {showViewModal && selectedEnquiry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Enquiry Details</h2>
                  <p className="text-primary font-mono font-bold">
                    {selectedEnquiry.order_id || selectedEnquiry.enquiry_code}
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Customer Information */}
                <div className="bg-zinc-50 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Mail size={20} className="text-primary" />
                    Customer Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-zinc-500">Name</p>
                      <p className="font-semibold">{selectedEnquiry.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Email</p>
                      <p className="font-semibold">{selectedEnquiry.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Phone</p>
                      <p className="font-semibold">{selectedEnquiry.customer_phone}</p>
                    </div>
                    {selectedEnquiry.delivery_address && (
                      <div className="col-span-3">
                        <p className="text-sm text-zinc-500">Delivery Address</p>
                        <p className="font-semibold">{selectedEnquiry.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Details */}
                <div className="bg-zinc-50 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Package size={20} className="text-primary" />
                    Order Specifications
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-zinc-500">Product Type</p>
                      <p className="font-semibold">{selectedEnquiry.clothing_name || selectedEnquiry.product_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Category</p>
                      <p className="font-semibold">{selectedEnquiry.order_category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Quantity</p>
                      <p className="font-semibold text-lg">{selectedEnquiry.quantity || selectedEnquiry.total_quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Fabric/Material</p>
                      <p className="font-semibold">{selectedEnquiry.fabric_material}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Colors</p>
                      <p className="font-semibold">{selectedEnquiry.colors?.join(', ') || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Size Type</p>
                      <p className="font-semibold">{selectedEnquiry.size_type}</p>
                    </div>
                  </div>

                  {/* Size Breakdown */}
                  {(selectedEnquiry.sizes_selected && Object.keys(selectedEnquiry.sizes_selected).length > 0) && (
                    <div className="mt-4 p-3 bg-white rounded-lg">
                      <p className="text-sm text-zinc-500 mb-2">Sizes Breakdown</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedEnquiry.sizes_selected).map(([size, qty]) => (
                          <span key={size} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">
                            {size}: <strong>{qty}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEnquiry.size_type !== 'Custom Measurements Only' && (
                    <>
                      {(selectedEnquiry.size_type === 'Male Sizes' || selectedEnquiry.size_type === 'Mixed') && 
                        Object.entries(selectedEnquiry.male_sizes || {}).some(([_, qty]) => qty > 0) && (
                        <div className="mt-4 p-3 bg-white rounded-lg">
                          <p className="text-sm text-zinc-500 mb-2">Male Sizes</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(selectedEnquiry.male_sizes || {})
                              .filter(([_, qty]) => qty > 0)
                              .map(([size, qty]) => (
                                <span key={size} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                  {size}: {qty}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                      {(selectedEnquiry.size_type === 'Female Sizes' || selectedEnquiry.size_type === 'Mixed') &&
                        Object.entries(selectedEnquiry.female_sizes || {}).some(([_, qty]) => qty > 0) && (
                        <div className="mt-4 p-3 bg-white rounded-lg">
                          <p className="text-sm text-zinc-500 mb-2">Female Sizes</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(selectedEnquiry.female_sizes || {})
                              .filter(([_, qty]) => qty > 0)
                              .map(([size, qty]) => (
                                <span key={size} className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm">
                                  {size}: {qty}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Design Details */}
                {selectedEnquiry.design_details && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">Design Details</h3>
                    <div className="bg-zinc-50 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedEnquiry.design_details}</p>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedEnquiry.additional_notes && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">Additional Notes</h3>
                    <div className="bg-zinc-50 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedEnquiry.additional_notes}</p>
                    </div>
                  </div>
                )}

                {/* Design Images */}
                {selectedEnquiry.design_images && selectedEnquiry.design_images.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">Uploaded Design Files</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedEnquiry.design_images.map((img, index) => (
                        <a
                          key={index}
                          href={`${API_URL}${img}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={`${API_URL}${img}`}
                            alt={`Design ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500 mb-2">Status</p>
                    <select
                      value={selectedEnquiry.status}
                      onChange={(e) => {
                        handleStatusUpdate(selectedEnquiry.id, e.target.value);
                        setSelectedEnquiry({...selectedEnquiry, status: e.target.value});
                      }}
                      className="px-3 py-2 border border-zinc-300 rounded-lg"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="Quote Created">Quote Created</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-2">Submitted</p>
                    <p className="font-semibold">
                      {new Date(selectedEnquiry.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                {selectedEnquiry.deadline && (
                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                    <Calendar size={20} />
                    <span className="font-semibold">
                      Deadline: {new Date(selectedEnquiry.deadline).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {/* Existing Quote */}
                {selectedEnquiry.quote && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 text-green-800">Quote Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-700">Unit Price</p>
                        <p className="font-bold text-lg">₦{selectedEnquiry.quote.unit_price?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700">Total Price</p>
                        <p className="font-bold text-lg">₦{selectedEnquiry.quote.total_price?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {!selectedEnquiry.linked_quote_id && (
                    <button
                      onClick={() => handleCreateQuote(selectedEnquiry)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                      data-testid="create-quote-btn"
                    >
                      <DollarSign size={18} />
                      Create Quote
                    </button>
                  )}
                  {selectedEnquiry.linked_quote_id && (
                    <button
                      onClick={() => navigate('/admin/quotes')}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <Eye size={18} />
                      View Quote
                    </button>
                  )}
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="btn-outline flex-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Quote Modal */}
        {showQuoteModal && selectedEnquiry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Create Quote</h2>
                  <p className="text-zinc-600">For: {selectedEnquiry.customer_name}</p>
                </div>
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Customer Details (Auto-filled, readonly) */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Customer Details (Auto-filled)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Name:</span> {selectedEnquiry.customer_name}
                    </div>
                    <div>
                      <span className="text-blue-600">Email:</span> {selectedEnquiry.customer_email}
                    </div>
                    <div>
                      <span className="text-blue-600">Phone:</span> {selectedEnquiry.customer_phone}
                    </div>
                    <div>
                      <span className="text-blue-600">Product:</span> {selectedEnquiry.clothing_name}
                    </div>
                  </div>
                </div>

                {/* Order Details (Auto-filled) */}
                <div className="bg-zinc-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Order Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Category:</span> {selectedEnquiry.order_category}
                    </div>
                    <div>
                      <span className="text-zinc-500">Quantity:</span> <strong>{selectedEnquiry.quantity}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Fabric:</span> {selectedEnquiry.fabric_material}
                    </div>
                    <div>
                      <span className="text-zinc-500">Colors:</span> {selectedEnquiry.colors?.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Pricing Inputs */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Unit Price (₦) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        value={quoteData.unit_price}
                        onChange={(e) => setQuoteData({...quoteData, unit_price: e.target.value})}
                        className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="5000"
                        data-testid="quote-unit-price"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Additional Costs (₦)
                      </label>
                      <input
                        type="number"
                        value={quoteData.additional_cost}
                        onChange={(e) => setQuoteData({...quoteData, additional_cost: e.target.value})}
                        className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Discount (₦)
                      </label>
                      <input
                        type="number"
                        value={quoteData.discount}
                        onChange={(e) => setQuoteData({...quoteData, discount: e.target.value})}
                        className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Production Days
                      </label>
                      <input
                        type="number"
                        value={quoteData.estimated_production_days}
                        onChange={(e) => setQuoteData({...quoteData, estimated_production_days: e.target.value})}
                        className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="14"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Quote Expiry Date
                    </label>
                    <input
                      type="date"
                      value={quoteData.quote_expiry_date}
                      onChange={(e) => setQuoteData({...quoteData, quote_expiry_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Notes to Customer
                    </label>
                    <textarea
                      rows="3"
                      value={quoteData.notes_to_customer}
                      onChange={(e) => setQuoteData({...quoteData, notes_to_customer: e.target.value})}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="Additional information about materials, timeline, payment terms, etc."
                    />
                  </div>
                </div>

                {/* Price Calculation Preview */}
                <div className="bg-zinc-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Unit Price × {selectedEnquiry.quantity}:</span>
                      <span>₦{((parseFloat(quoteData.unit_price) || 0) * selectedEnquiry.quantity).toLocaleString()}</span>
                    </div>
                    {quoteData.additional_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Additional Costs:</span>
                        <span>+ ₦{parseFloat(quoteData.additional_cost).toLocaleString()}</span>
                      </div>
                    )}
                    {quoteData.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>- ₦{parseFloat(quoteData.discount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-xl font-bold">
                      <span>Total Price:</span>
                      <span className="text-primary">₦{calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmitQuote}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    data-testid="submit-quote-btn"
                  >
                    <CheckCircle size={18} />
                    Create & Save Quote
                  </button>
                  <button
                    onClick={() => setShowQuoteModal(false)}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEnquiriesPage;
