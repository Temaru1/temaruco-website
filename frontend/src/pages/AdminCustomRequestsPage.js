import React, { useState, useEffect } from 'react';
import { FileQuestion, Eye, Check, X, FileText, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import OrderCodeInput from '../components/OrderCodeInput';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCustomRequestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  // Auto-highlight and scroll to enquiry from notification
  useEffect(() => {
    if (location.state?.openOrderId && requests.length > 0) {
      const enquiryId = location.state.openOrderId;
      setTimeout(() => {
        const enquiryElement = document.querySelector(`[data-enquiry-id="${enquiryId}"]`);
        if (enquiryElement) {
          enquiryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          enquiryElement.classList.add('highlight-order');
        }
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, requests]);

  const loadRequests = async () => {
    try {
      let url = `${API_URL}/api/admin/custom-requests`;
      const params = [];
      
      if (filterStatus) {
        params.push(`status=${filterStatus}`);
      }
      if (searchCode.trim()) {
        params.push(`enquiry_code=${encodeURIComponent(searchCode.trim())}`);
      }
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
        
      const response = await axios.get(url, { withCredentials: true });
      setRequests(response.data);
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadRequests();
  };

  const handleViewDetails = async (requestId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/admin/custom-requests/${requestId}`,
        { withCredentials: true }
      );
      setSelectedRequest(response.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load request details');
    }
  };

  const handleUpdateStatus = async (requestId, newStatus, notes = '') => {
    try {
      await axios.patch(
        `${API_URL}/api/admin/custom-requests/${requestId}/status`,
        { status: newStatus, admin_notes: notes },
        {
          params: { status: newStatus, admin_notes: notes },
          withCredentials: true
        }
      );
      toast.success('Status updated successfully');
      loadRequests();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateQuote = (request) => {
    // Navigate to manual quote creator with pre-filled data
    navigate('/admin/quotes', {
      state: {
        prefillData: {
          client_name: request.user_name,
          client_email: request.user_email,
          items: [{
            description: request.item_description,
            quantity: request.quantity,
            unit_price: 0,
            total: 0
          }]
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-zinc-100 text-zinc-800';
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold" data-testid="custom-requests-title">
          Custom Order Requests & Enquiries
        </h1>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Enquiry Code Search */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2">Search by Enquiry Code</label>
          <div className="flex gap-2">
            <OrderCodeInput
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="ENQ-0225-000001"
              className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg"
              data-testid="search-enquiry-code"
            />
            <button
              onClick={handleSearch}
              className="btn-primary px-6"
              data-testid="search-btn"
            >
              <Search size={18} className="inline mr-2" />
              Search
            </button>
            {searchCode && (
              <button
                onClick={() => {
                  setSearchCode('');
                  setLoading(true);
                  setTimeout(() => loadRequests(), 100);
                }}
                className="btn-outline px-6"
                data-testid="clear-search-btn"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-semibold mb-2">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 rounded-lg"
            data-testid="filter-status"
          >
            <option value="">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="quoted">Quote Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-zinc-600">
        Showing {requests.length} enquir{requests.length === 1 ? 'y' : 'ies'}
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Enquiry Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Item Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Target Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" data-testid="custom-requests-table">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-zinc-500">
                    <FileQuestion size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No enquiries found</p>
                    {searchCode && <p className="text-sm mt-1">Try a different enquiry code</p>}
                    {filterStatus && <p className="text-sm mt-1">Try changing the status filter</p>}
                  </td>
                </tr>
              ) : (
                requests.map(request => (
                  <tr 
                    key={request.id} 
                    className="hover:bg-zinc-50 enquiry-row"
                    data-enquiry-id={request.enquiry_code || request.id}
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-bold text-blue-600">
                        {request.enquiry_code}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{request.user_name}</p>
                        <p className="text-sm text-zinc-600">{request.user_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{request.item_description}</p>
                    </td>
                    <td className="px-6 py-4">{request.quantity}</td>
                    <td className="px-6 py-4">
                      {request.target_price ? `₦${request.target_price.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(request.status)}`}>
                        {request.status === 'pending_review' ? 'Pending' :
                         request.status === 'quoted' ? 'Quote Sent' :
                         request.status === 'accepted' ? 'Accepted' :
                         request.status === 'rejected' ? 'Rejected' :
                         request.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(request.id)}
                          className="text-blue-600 hover:underline"
                          data-testid={`view-${request.id}`}
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {request.status === 'pending_review' && (
                          <button
                            onClick={() => handleCreateQuote(request)}
                            className="text-green-600 hover:underline"
                            data-testid={`quote-${request.id}`}
                            title="Create Quote"
                          >
                            <FileText size={18} />
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

      {/* Details Modal */}
      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-oswald text-2xl font-bold">Custom Request Details</h2>
                <p className="font-mono text-lg font-bold text-blue-600 mt-2">
                  {selectedRequest.enquiry_code}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Client Name</p>
                  <p className="font-semibold">{selectedRequest.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Email</p>
                  <p className="font-semibold">{selectedRequest.user_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedRequest.status)}`}>
                    {selectedRequest.status === 'pending_review' ? 'Pending Review' :
                     selectedRequest.status === 'quoted' ? 'Quote Sent' :
                     selectedRequest.status === 'accepted' ? 'Accepted' :
                     selectedRequest.status === 'rejected' ? 'Rejected' :
                     selectedRequest.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Date Submitted</p>
                  <p className="font-semibold">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-600 mb-1">Item Description</p>
                <p className="font-semibold text-lg">{selectedRequest.item_description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Quantity</p>
                  <p className="font-semibold">{selectedRequest.quantity} units</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Target Price</p>
                  <p className="font-semibold">
                    {selectedRequest.target_price ? `₦${selectedRequest.target_price.toLocaleString()}` : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Deadline</p>
                  <p className="font-semibold">
                    {selectedRequest.deadline ? new Date(selectedRequest.deadline).toLocaleDateString() : 'Flexible'}
                  </p>
                </div>
              </div>

              {selectedRequest.specifications && (
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Specifications</p>
                  <p className="bg-zinc-50 p-4 rounded-lg">{selectedRequest.specifications}</p>
                </div>
              )}

              {selectedRequest.notes && (
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Additional Notes</p>
                  <p className="bg-zinc-50 p-4 rounded-lg">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.reference_image_url && (
                <div>
                  <p className="text-sm text-zinc-600 mb-2">Reference Image</p>
                  <img 
                    src={`${API_URL}${selectedRequest.reference_image_url}`}
                    alt="Reference"
                    className="max-w-full h-auto rounded-lg border"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleCreateQuote(selectedRequest)}
                  className="btn-primary flex-1"
                  data-testid="create-quote-btn"
                >
                  <FileText size={18} className="inline mr-2" />
                  Create Quote
                </button>
                {selectedRequest.status === 'pending_review' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected', 'Not feasible')}
                    className="btn-outline flex-1 border-red-600 text-red-600 hover:bg-red-50"
                    data-testid="reject-btn"
                  >
                    <X size={18} className="inline mr-2" />
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomRequestsPage;
