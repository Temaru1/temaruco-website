import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Clock, CheckCircle, XCircle, Eye, DollarSign, Calendar, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  'New Inquiry': 'bg-blue-100 text-blue-800 border-blue-300',
  'Reviewing': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Quote Sent': 'bg-purple-100 text-purple-800 border-purple-300',
  'Approved': 'bg-green-100 text-green-800 border-green-300',
  'In Production': 'bg-orange-100 text-orange-800 border-orange-300',
  'Completed': 'bg-gray-100 text-gray-800 border-gray-300',
  'Declined': 'bg-red-100 text-red-800 border-red-300'
};

const AdminEnquiriesPage = () => {
  const location = useLocation();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [highlightedId, setHighlightedId] = useState(null);
  
  const [quoteData, setQuoteData] = useState({
    unit_price: '',
    total_price: '',
    estimated_production_days: '',
    valid_until: '',
    notes_to_client: ''
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
  }, [location]);

  const loadEnquiries = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/enquiries`, {
        withCredentials: true
      });
      setEnquiries(response.data);
    } catch (error) {
      toast.error('Failed to load enquiries');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEnquiry = (enquiry) => {
    setSelectedEnquiry(enquiry);
  };

  const handleCreateQuote = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setQuoteData({
      unit_price: '',
      total_price: '',
      estimated_production_days: '',
      valid_until: '',
      notes_to_client: ''
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
    if (!quoteData.unit_price || !quoteData.total_price) {
      toast.error('Please enter unit price and total price');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/admin/enquiries/${selectedEnquiry.id}/quote`,
        quoteData,
        { withCredentials: true }
      );
      toast.success('Quote created successfully');
      setShowQuoteModal(false);
      loadEnquiries();
    } catch (error) {
      toast.error('Failed to create quote');
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

  const filteredEnquiries = enquiries.filter(enquiry => {
    const matchesSearch = 
      enquiry.enquiry_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.clothing_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || enquiry.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

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
              Custom Order Enquiries
            </h1>
            <p className="text-zinc-600 mt-2">Manage custom tailoring and manufacturing requests</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{enquiries.length}</div>
            <div className="text-sm text-zinc-600">Total Enquiries</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Search by enquiry code, customer name, or clothing..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="search-enquiries"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="filter-status"
              >
                <option value="all">All Status</option>
                <option value="New Inquiry">New Inquiry</option>
                <option value="Reviewing">Reviewing</option>
                <option value="Quote Sent">Quote Sent</option>
                <option value="Approved">Approved</option>
                <option value="In Production">In Production</option>
                <option value="Completed">Completed</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enquiries List */}
        <div className="space-y-4">
          {filteredEnquiries.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FileText className="mx-auto text-zinc-400 mb-4" size={48} />
              <p className="text-zinc-600 text-lg">No enquiries found</p>
            </div>
          ) : (
            filteredEnquiries.map((enquiry) => (
              <div
                key={enquiry.id}
                className={`bg-white rounded-lg shadow-sm p-6 transition-all ${
                  highlightedId === enquiry.id ? 'ring-4 ring-yellow-400 animate-pulse' : ''
                }`}
                data-testid={`enquiry-${enquiry.enquiry_code}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-xl text-primary">{enquiry.enquiry_code}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[enquiry.status] || 'bg-gray-100 text-gray-800'}`}>
                        {enquiry.status}
                      </span>
                    </div>
                    <p className="text-zinc-600">
                      <span className="font-semibold">{enquiry.customer_name}</span> • {enquiry.customer_email} • {enquiry.customer_phone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewEnquiry(enquiry)}
                      className="btn-outline py-2 px-4 flex items-center gap-2"
                      data-testid={`view-enquiry-${enquiry.enquiry_code}`}
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                    {enquiry.status === 'New Inquiry' || enquiry.status === 'Reviewing' ? (
                      <button
                        onClick={() => handleCreateQuote(enquiry)}
                        className="btn-primary py-2 px-4 flex items-center gap-2"
                        data-testid={`create-quote-${enquiry.enquiry_code}`}
                      >
                        <DollarSign size={16} />
                        Create Quote
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Category</p>
                    <p className="font-semibold">{enquiry.order_category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Clothing</p>
                    <p className="font-semibold">{enquiry.clothing_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Quantity</p>
                    <p className="font-semibold">{enquiry.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Fabric</p>
                    <p className="font-semibold">{enquiry.fabric_material}</p>
                  </div>
                </div>

                {enquiry.deadline && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 mb-2">
                    <Clock size={16} />
                    <span>Deadline: {new Date(enquiry.deadline).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Quick Status Actions */}
                <div className="flex gap-2 pt-4 border-t border-zinc-200">
                  <select
                    value={enquiry.status}
                    onChange={(e) => handleStatusUpdate(enquiry.id, e.target.value)}
                    className="px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                    data-testid={`status-select-${enquiry.enquiry_code}`}
                  >
                    <option value="New Inquiry">New Inquiry</option>
                    <option value="Reviewing">Reviewing</option>
                    <option value="Quote Sent">Quote Sent</option>
                    <option value="Approved">Approved</option>
                    <option value="In Production">In Production</option>
                    <option value="Completed">Completed</option>
                    <option value="Declined">Declined</option>
                  </select>
                  {enquiry.quote && (
                    <button
                      onClick={() => handleDownloadPDF(enquiry.id)}
                      className="btn-outline py-2 px-4 flex items-center gap-2 text-sm"
                    >
                      <Download size={16} />
                      Download Quote PDF
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Enquiry Details Modal */}
        {selectedEnquiry && !showQuoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Enquiry Details - {selectedEnquiry.enquiry_code}</h2>
                <button
                  onClick={() => setSelectedEnquiry(null)}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Customer Information</h3>
                  <div className="grid grid-cols-3 gap-4">
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
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <h3 className="font-bold text-lg mb-3">Order Specifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-zinc-500">Category</p>
                      <p className="font-semibold">{selectedEnquiry.order_category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Clothing Name</p>
                      <p className="font-semibold">{selectedEnquiry.clothing_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Quantity</p>
                      <p className="font-semibold">{selectedEnquiry.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Fabric/Material</p>
                      <p className="font-semibold">{selectedEnquiry.fabric_material}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Colors</p>
                      <p className="font-semibold">{selectedEnquiry.colors?.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Size Type</p>
                      <p className="font-semibold">{selectedEnquiry.size_type}</p>
                    </div>
                  </div>

                  {/* Size Breakdown */}
                  {selectedEnquiry.size_type !== 'Custom Measurements Only' && (
                    <div className="mb-4">
                      <p className="text-sm text-zinc-500 mb-2">Size Breakdown</p>
                      <div className="bg-zinc-50 p-3 rounded-lg">
                        {(selectedEnquiry.size_type === 'Male Sizes' || selectedEnquiry.size_type === 'Mixed') && (
                          <div className="mb-2">
                            <span className="font-semibold">Male: </span>
                            {Object.entries(selectedEnquiry.male_sizes || {})
                              .filter(([_, qty]) => qty > 0)
                              .map(([size, qty]) => `${size}: ${qty}`)
                              .join(', ')}
                          </div>
                        )}
                        {(selectedEnquiry.size_type === 'Female Sizes' || selectedEnquiry.size_type === 'Mixed') && (
                          <div>
                            <span className="font-semibold">Female: </span>
                            {Object.entries(selectedEnquiry.female_sizes || {})
                              .filter(([_, qty]) => qty > 0)
                              .map(([size, qty]) => `${size}: ${qty}`)
                              .join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Design Details */}
                  <div>
                    <p className="text-sm text-zinc-500 mb-2">Design Details</p>
                    <div className="bg-zinc-50 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedEnquiry.design_details}</p>
                    </div>
                  </div>
                </div>

                {/* Images */}
                {selectedEnquiry.design_images && selectedEnquiry.design_images.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">Design Images</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedEnquiry.design_images.map((img, index) => (
                        <img
                          key={index}
                          src={`${API_URL}${img}`}
                          alt={`Design ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Measurement File */}
                {selectedEnquiry.measurement_file && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">Custom Measurement File</h3>
                    <a
                      href={`${API_URL}${selectedEnquiry.measurement_file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline inline-flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download Measurement File
                    </a>
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

                {/* Deadline */}
                {selectedEnquiry.deadline && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">Deadline</h3>
                    <div className="flex items-center gap-2 text-orange-600">
                      <Calendar size={20} />
                      <span className="font-semibold">
                        {new Date(selectedEnquiry.deadline).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quote if exists */}
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
                      <div>
                        <p className="text-sm text-green-700">Production Time</p>
                        <p className="font-semibold">{selectedEnquiry.quote.estimated_production_days} days</p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700">Valid Until</p>
                        <p className="font-semibold">{new Date(selectedEnquiry.quote.valid_until).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {selectedEnquiry.quote.notes_to_client && (
                      <div className="mt-3">
                        <p className="text-sm text-green-700">Notes to Client</p>
                        <p className="text-green-900">{selectedEnquiry.quote.notes_to_client}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Quote Modal */}
        {showQuoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full">
              <div className="border-b border-zinc-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create Quote - {selectedEnquiry.enquiry_code}</h2>
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="text-zinc-500 hover:text-zinc-700"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Order:</span> {selectedEnquiry.clothing_name} x {selectedEnquiry.quantity}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Unit Price (₦) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={quoteData.unit_price}
                      onChange={(e) => {
                        const unitPrice = parseFloat(e.target.value) || 0;
                        setQuoteData({
                          ...quoteData,
                          unit_price: e.target.value,
                          total_price: (unitPrice * selectedEnquiry.quantity).toString()
                        });
                      }}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Total Price (₦) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={quoteData.total_price}
                      onChange={(e) => setQuoteData({...quoteData, total_price: e.target.value})}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                      placeholder="250000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Estimated Production Time (Days)
                    </label>
                    <input
                      type="number"
                      value={quoteData.estimated_production_days}
                      onChange={(e) => setQuoteData({...quoteData, estimated_production_days: e.target.value})}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                      placeholder="14"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Quote Valid Until
                    </label>
                    <input
                      type="date"
                      value={quoteData.valid_until}
                      onChange={(e) => setQuoteData({...quoteData, valid_until: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Notes to Client
                  </label>
                  <textarea
                    rows="4"
                    value={quoteData.notes_to_client}
                    onChange={(e) => setQuoteData({...quoteData, notes_to_client: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                    placeholder="Additional information about materials, timeline, payment terms, etc."
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmitQuote}
                    className="btn-primary flex-1"
                  >
                    <CheckCircle size={16} className="inline mr-2" />
                    Generate & Send Quote
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
