import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, Upload, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminDocumentationPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Policies',
    file_url: '',
    status: 'draft'
  });

  const categories = ['Policies', 'Procedures', 'Guidelines', 'Training', 'General'];
  const statuses = ['draft', 'published'];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/documentation`, {
        withCredentials: true
      });
      setDocuments(response.data);
    } catch (error) {
      toast.error('Failed to load documentation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingDoc(null);
    setFormData({
      title: '',
      content: '',
      category: 'Policies',
      file_url: '',
      status: 'draft'
    });
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      category: doc.category,
      file_url: doc.file_url || '',
      status: doc.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    try {
      if (editingDoc) {
        await axios.put(
          `${API_URL}/api/admin/documentation/${editingDoc.id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Documentation updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/admin/documentation`,
          formData,
          { withCredentials: true }
        );
        toast.success('Documentation created successfully');
      }
      
      setShowModal(false);
      loadDocuments();
    } catch (error) {
      toast.error('Failed to save documentation');
      console.error(error);
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/documentation/${docId}`, {
        withCredentials: true
      });
      toast.success('Documentation deleted');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to delete documentation');
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
        `${API_URL}/api/admin/documentation/upload`,
        formDataUpload,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      setFormData({
        ...formData,
        file_url: response.data.file_path
      });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Policies': 'bg-blue-100 text-blue-800',
      'Procedures': 'bg-green-100 text-green-800',
      'Guidelines': 'bg-purple-100 text-purple-800',
      'Training': 'bg-orange-100 text-orange-800',
      'General': 'bg-zinc-100 text-zinc-800'
    };
    return colors[category] || 'bg-zinc-100 text-zinc-800';
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
        <h1 className="font-oswald text-4xl font-bold">Staff Documentation</h1>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2"
          data-testid="add-doc-btn"
        >
          <Plus size={20} />
          Add Document
        </button>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">
            All ({documents.length})
          </button>
          {categories.map(cat => {
            const count = documents.filter(d => d.category === cat).length;
            return (
              <button
                key={cat}
                className="px-4 py-2 rounded-lg border-2 border-zinc-200 hover:border-primary transition-colors"
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Table */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-600 mb-4">No documentation yet</p>
          <button onClick={openAddModal} className="btn-primary">
            Create Your First Document
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Title</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Category</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Created</th>
                <th className="px-6 py-4 text-left font-oswald font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-primary" />
                      <div>
                        <p className="font-semibold">{doc.title}</p>
                        {doc.file_url && (
                          <p className="text-xs text-zinc-500">Has attachment</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(doc.category)}`}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      doc.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(doc)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded"
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
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-oswald text-2xl font-bold">
                {editingDoc ? 'Edit Document' : 'Add New Document'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-semibold text-sm mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="doc-title-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows="10"
                  className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  data-testid="doc-content-textarea"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2">
                  Attachment (Optional)
                </label>
                <div className="flex gap-3 items-center">
                  <label className="btn-outline flex items-center gap-2 cursor-pointer">
                    <Upload size={18} />
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={uploading}
                    />
                  </label>
                  {formData.file_url && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <FileText size={16} />
                      File attached
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  data-testid="save-doc-btn"
                >
                  <Save size={20} />
                  {editingDoc ? 'Update Document' : 'Create Document'}
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
    </div>
  );
};

export default AdminDocumentationPage;
