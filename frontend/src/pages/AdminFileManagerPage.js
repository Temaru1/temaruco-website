import React, { useState, useEffect } from 'react';
import { Search, Folder, File, Image, FileText, Trash2, Download, ExternalLink, RefreshCw, HardDrive, Cloud, Filter, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminFileManagerPage = () => {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({ total: 0, local: 0, supabase: 0, images: 0, documents: 0, total_size_formatted: '0 MB' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    loadFiles();
  }, [filterType, filterSource]);

  const loadFiles = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('file_type', filterType);
      if (filterSource !== 'all') params.append('source', filterSource);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const response = await axios.get(`${API_URL}/api/admin/files?${params.toString()}`, {
        withCredentials: true
      });

      setFiles(response.data.files || []);
      setStats(response.data.stats || {});
    } catch (error) {
      toast.error('Failed to load files');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadFiles();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleDelete = (file) => {
    if (file.source !== 'local') {
      toast.error('Can only delete local files');
      return;
    }
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${API_URL}/api/admin/files?file_path=${encodeURIComponent(fileToDelete.path)}`, {
        withCredentials: true
      });
      toast.success('File deleted successfully');
      setShowDeleteConfirm(false);
      setFileToDelete(null);
      loadFiles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete file');
    }
  };

  const handleDownload = (file) => {
    const url = file.source === 'local' ? `${API_URL}${file.path}` : file.path;
    window.open(url, '_blank');
  };

  const getFileIcon = (file) => {
    if (file.type === 'image') {
      return <Image size={20} className="text-blue-500" />;
    }
    return <FileText size={20} className="text-zinc-500" />;
  };

  const getSourceIcon = (source) => {
    if (source === 'local') {
      return <HardDrive size={14} className="text-green-600" />;
    }
    return <Cloud size={14} className="text-blue-600" />;
  };

  const getFolderColor = (folder) => {
    const colors = {
      'designs': 'bg-purple-100 text-purple-700',
      'products': 'bg-blue-100 text-blue-700',
      'images': 'bg-green-100 text-green-700',
      'enquiries': 'bg-yellow-100 text-yellow-700',
      'mockups': 'bg-pink-100 text-pink-700',
      'fabrics': 'bg-orange-100 text-orange-700',
      'souvenirs': 'bg-cyan-100 text-cyan-700',
      'boutique': 'bg-red-100 text-red-700',
      'pod-designs': 'bg-indigo-100 text-indigo-700',
      'pod-mockups': 'bg-violet-100 text-violet-700',
      'bulk-products': 'bg-amber-100 text-amber-700',
      'pod-products': 'bg-lime-100 text-lime-700'
    };
    return colors[folder] || 'bg-zinc-100 text-zinc-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-3xl font-bold uppercase" data-testid="file-manager-title">
            File Manager
          </h1>
          <p className="text-zinc-600 mt-1">Manage all uploaded files and images</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadFiles(); }}
          className="btn-outline flex items-center gap-2"
          data-testid="refresh-files-btn"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <File size={20} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-zinc-500">Total Files</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <HardDrive size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.local}</p>
              <p className="text-xs text-zinc-500">Local Files</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cloud size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.supabase}</p>
              <p className="text-xs text-zinc-500">Cloud Files</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Image size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.images}</p>
              <p className="text-xs text-zinc-500">Images</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.documents}</p>
              <p className="text-xs text-zinc-500">Documents</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <HardDrive size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_size_formatted}</p>
              <p className="text-xs text-zinc-500">Total Size</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search by file name or folder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
              data-testid="search-files"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
            data-testid="filter-type"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
            data-testid="filter-source"
          >
            <option value="all">All Sources</option>
            <option value="local">Local Storage</option>
            <option value="supabase">Cloud Storage</option>
          </select>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSearch} className="btn-primary px-6" data-testid="search-btn">
            Search
          </button>
          {(searchTerm || filterType !== 'all' || filterSource !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterSource('all');
                setLoading(true);
                setTimeout(loadFiles, 100);
              }}
              className="btn-outline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Files Grid/Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Preview</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Folder</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Modified</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" data-testid="files-table">
              {files.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <Folder className="mx-auto text-zinc-400 mb-4" size={48} />
                    <p className="text-zinc-600">No files found</p>
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      {file.type === 'image' ? (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={file.source === 'local' ? `${API_URL}${file.path}` : file.path}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><path d="M4 3h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>';
                            }}
                          />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center">
                          {getFileIcon(file)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm truncate max-w-[200px]" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-zinc-500">{file.extension}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFolderColor(file.folder)}`}>
                        {file.folder}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="text-sm capitalize">{file.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {file.size_formatted}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(file.source)}
                        <span className="text-sm capitalize">{file.source}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {file.modified_at ? new Date(file.modified_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Open/Download"
                          data-testid={`download-${file.id}`}
                        >
                          <ExternalLink size={16} />
                        </button>
                        {file.source === 'local' && (
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                            data-testid={`delete-${file.id}`}
                          >
                            <Trash2 size={16} />
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

      {/* Image Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-10 right-0 text-white hover:text-zinc-300"
            >
              <X size={32} />
            </button>
            <img
              src={previewFile.source === 'local' ? `${API_URL}${previewFile.path}` : previewFile.path}
              alt={previewFile.name}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-white text-center">
              <p className="font-semibold">{previewFile.name}</p>
              <p className="text-sm text-zinc-300">{previewFile.folder} | {previewFile.size_formatted}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete File?</h3>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete "{fileToDelete?.name}"?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                  data-testid="confirm-delete-btn"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setFileToDelete(null);
                  }}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFileManagerPage;
