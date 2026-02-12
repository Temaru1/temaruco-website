import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Eye, Upload, X, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminStaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    position: '',
    department: '',
    date_of_birth: '',
    hire_date: '',
    emergency_contact: '',
    emergency_phone: '',
    documents: [],
    status: 'active',
    notes: ''
  });

  const departments = ['Production', 'Sales', 'Admin', 'Finance', 'Design', 'Quality Control', 'HR', 'Other'];
  const statuses = ['active', 'inactive', 'on_leave'];

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [staff, searchQuery]);

  const loadStaff = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/staff`, {
        withCredentials: true
      });
      setStaff(response.data);
    } catch (error) {
      toast.error('Failed to load staff');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    if (!searchQuery.trim()) {
      setFilteredStaff(staff);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(query) ||
        (s.email && s.email.toLowerCase().includes(query)) ||
        (s.phone && s.phone.includes(query)) ||
        (s.position && s.position.toLowerCase().includes(query))
      );
      setFilteredStaff(filtered);
    }
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      position: '',
      department: '',
      date_of_birth: '',
      hire_date: '',
      emergency_contact: '',
      emergency_phone: '',
      documents: [],
      status: 'active',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      address: staffMember.address || '',
      position: staffMember.position || '',
      department: staffMember.department || '',
      date_of_birth: staffMember.date_of_birth || '',
      hire_date: staffMember.hire_date || '',
      emergency_contact: staffMember.emergency_contact || '',
      emergency_phone: staffMember.emergency_phone || '',
      documents: staffMember.documents || [],
      status: staffMember.status || 'active',
      notes: staffMember.notes || ''
    });
    setShowModal(true);
  };

  const handleView = (staffMember) => {
    setViewingStaff(staffMember);
    setShowViewModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      if (editingStaff) {
        await axios.put(
          `${API_URL}/api/admin/staff/${editingStaff.id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Staff member updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/admin/staff`,
          formData,
          { withCredentials: true }
        );
        toast.success('Staff member added successfully');
      }
      
      setShowModal(false);
      loadStaff();
    } catch (error) {
      toast.error('Failed to save staff member');
      console.error(error);
    }
  };

  const handleDelete = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}'s record?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/staff/${staffId}`, {
        withCredentials: true
      });
      toast.success('Staff member deleted');
      loadStaff();
    } catch (error) {
      toast.error('Failed to delete staff member');
      console.error(error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/admin/staff/upload-document`,
        formDataUpload,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      // Ask for document type
      const docType = prompt('Enter document type (e.g., Passport, CV, Certificate):') || 'Document';
      
      const newDoc = {
        type: docType,
        file_path: response.data.file_path,
        file_name: response.data.file_name,
        uploaded_at: new Date().toISOString()
      };

      setFormData({
        ...formData,
        documents: [...formData.documents, newDoc]
      });
      
      toast.success('Document uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload document');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index) => {
    const newDocuments = formData.documents.filter((_, i) => i !== index);
    setFormData({...formData, documents: newDocuments});
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-red-100 text-red-800',
      'on_leave': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-zinc-100 text-zinc-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold">Staff Management</h1>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
          data-testid="add-staff-btn"
        >
          <Plus size={20} />
          Add Staff Member
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, phone, or position..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="staff-search-input"
        />
        {searchQuery && (
          <p className="text-sm text-zinc-600 mt-2">
            Found {filteredStaff.length} staff {filteredStaff.length === 1 ? 'member' : 'members'}
          </p>
        )}
      </div>

      {/* Staff Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-sm text-zinc-600 mb-1">Total Staff</p>
          <p className="text-3xl font-bold text-primary">{staff.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-sm text-zinc-600 mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">{staff.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-sm text-zinc-600 mb-1">On Leave</p>
          <p className="text-3xl font-bold text-yellow-600">{staff.filter(s => s.status === 'on_leave').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-sm text-zinc-600 mb-1">Inactive</p>
          <p className="text-3xl font-bold text-red-600">{staff.filter(s => s.status === 'inactive').length}</p>
        </div>
      </div>

      {/* Staff Table */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-600 mb-4">
            {searchQuery ? 'No staff members match your search' : 'No staff members yet'}
          </p>
          {!searchQuery && (
            <button onClick={openAddModal} className="btn-primary">
              Add Your First Staff Member
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Position</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Department</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Phone</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Documents</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStaff.map(staffMember => (
                <tr key={staffMember.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4 font-semibold">{staffMember.name}</td>
                  <td className="px-6 py-4">{staffMember.position || '-'}</td>
                  <td className="px-6 py-4">{staffMember.department || '-'}</td>
                  <td className="px-6 py-4">{staffMember.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(staffMember.status)}`}>
                      {staffMember.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {staffMember.documents?.length || 0} docs
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(staffMember)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                        title="View Details"
                        data-testid={`view-staff-${staffMember.id}`}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(staffMember)}
                        className="text-zinc-600 hover:text-blue-600 p-2 hover:bg-zinc-50 rounded"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(staffMember.id, staffMember.name)}
                        className="text-zinc-600 hover:text-red-600 p-2 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-oswald text-2xl font-bold">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                      data-testid="staff-name-input"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-sm mb-2">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      rows="2"
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Employment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Hire Date
                    </label>
                    <input
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_phone}
                      onChange={(e) => setFormData({...formData, emergency_phone: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Documents</h3>
                <div className="mb-3">
                  <label className="btn-outline flex items-center gap-2 cursor-pointer inline-flex">
                    <Upload size={18} />
                    {uploading ? 'Uploading...' : 'Upload Document'}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-xs text-zinc-500 mt-2">
                    Upload passport, CV, certificates, ID card, etc. (PDF, DOC, DOCX, JPG, PNG - Max 10MB)
                  </p>
                </div>

                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-primary" />
                          <div>
                            <p className="font-semibold text-sm">{doc.type}</p>
                            <p className="text-xs text-zinc-500">{doc.file_name}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-sm mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                  className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Any additional information..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  data-testid="save-staff-btn"
                >
                  {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Staff Details Modal */}
      {showViewModal && viewingStaff && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-oswald text-3xl font-bold">{viewingStaff.name}</h2>
                <p className="text-zinc-600 mt-1">Staff ID: {viewingStaff.id}</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(viewingStaff.status)}`}>
                {viewingStaff.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-zinc-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-600">Phone</p>
                    <p className="font-semibold">{viewingStaff.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600">Email</p>
                    <p className="font-semibold">{viewingStaff.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600">Date of Birth</p>
                    <p className="font-semibold">
                      {viewingStaff.date_of_birth 
                        ? new Date(viewingStaff.date_of_birth).toLocaleDateString()
                        : 'Not provided'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-zinc-600">Address</p>
                    <p className="font-semibold">{viewingStaff.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="bg-zinc-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Employment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-600">Position</p>
                    <p className="font-semibold">{viewingStaff.position || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600">Department</p>
                    <p className="font-semibold">{viewingStaff.department || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600">Hire Date</p>
                    <p className="font-semibold">
                      {viewingStaff.hire_date 
                        ? new Date(viewingStaff.hire_date).toLocaleDateString()
                        : 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {(viewingStaff.emergency_contact || viewingStaff.emergency_phone) && (
                <div className="bg-red-50 border-2 border-red-200 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-zinc-600">Contact Name</p>
                      <p className="font-semibold">{viewingStaff.emergency_contact || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-600">Contact Phone</p>
                      <p className="font-semibold">{viewingStaff.emergency_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              {viewingStaff.documents && viewingStaff.documents.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-4">Documents ({viewingStaff.documents.length})</h3>
                  <div className="space-y-3">
                    {viewingStaff.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText size={24} className="text-primary" />
                          <div>
                            <p className="font-semibold">{doc.type}</p>
                            <p className="text-xs text-zinc-500">{doc.file_name}</p>
                            <p className="text-xs text-zinc-400">
                              Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`${API_URL}${doc.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline btn-sm flex items-center gap-2"
                        >
                          <Download size={16} />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingStaff.notes && (
                <div className="bg-zinc-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-lg mb-4">Notes</h3>
                  <p className="text-zinc-700 whitespace-pre-wrap">{viewingStaff.notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-zinc-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Record Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-600">Created</p>
                    <p className="font-semibold">
                      {new Date(viewingStaff.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-600">Last Updated</p>
                    <p className="font-semibold">
                      {new Date(viewingStaff.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingStaff);
                }}
                className="btn-primary flex-1"
              >
                Edit Staff Member
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="btn-outline flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffPage;
