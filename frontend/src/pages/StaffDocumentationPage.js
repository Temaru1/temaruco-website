import React, { useState, useEffect } from 'react';
import { FileText, Search, Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const StaffDocumentationPage = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const categories = ['All', 'Policies', 'Procedures', 'Guidelines', 'Training', 'General'];

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, selectedCategory, searchQuery]);

  const loadDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/staff/documentation`);
      setDocuments(response.data);
    } catch (error) {
      toast.error('Failed to load documentation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query)
      );
    }

    setFilteredDocs(filtered);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Policies': '📋',
      'Procedures': '⚙️',
      'Guidelines': '📖',
      'Training': '🎓',
      'General': '📄'
    };
    return icons[category] || '📄';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Policies': 'bg-blue-100 text-blue-800 border-blue-200',
      'Procedures': 'bg-green-100 text-green-800 border-green-200',
      'Guidelines': 'bg-purple-100 text-purple-800 border-purple-200',
      'Training': 'bg-orange-100 text-orange-800 border-orange-200',
      'General': 'bg-zinc-100 text-zinc-800 border-zinc-200'
    };
    return colors[category] || 'bg-zinc-100 text-zinc-800 border-zinc-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <BookOpen size={64} className="mx-auto mb-4 text-primary" />
          <h1 className="font-oswald text-5xl font-bold mb-4">Staff Documentation</h1>
          <p className="text-xl text-zinc-600">
            Access policies, procedures, guidelines, and training materials
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="search-docs-input"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-3">
            {categories.map(cat => {
              const count = cat === 'All' 
                ? documents.length 
                : documents.filter(d => d.category === cat).length;
              const isActive = selectedCategory === cat;
              
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'border-2 border-zinc-200 hover:border-primary'
                  }`}
                  data-testid={`filter-${cat.toLowerCase()}`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Documents Grid */}
        {filteredDocs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText size={64} className="mx-auto mb-4 text-zinc-400" />
            <h3 className="text-2xl font-bold mb-2">No Documents Found</h3>
            <p className="text-zinc-600">
              {searchQuery
                ? 'Try adjusting your search or filter criteria'
                : 'No documentation available in this category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                data-testid={`doc-card-${doc.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{getCategoryIcon(doc.category)}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(doc.category)}`}>
                    {doc.category}
                  </span>
                </div>
                
                <h3 className="font-oswald text-xl font-bold mb-3 line-clamp-2">
                  {doc.title}
                </h3>
                
                <p className="text-sm text-zinc-600 mb-4 line-clamp-3">
                  {doc.content}
                </p>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-zinc-500">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                  {doc.file_url && (
                    <span className="text-xs text-primary font-semibold flex items-center gap-1">
                      <FileText size={14} />
                      Has attachment
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Document Detail Modal */}
        {selectedDoc && (
          <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
            <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getCategoryColor(selectedDoc.category)}`}>
                    {selectedDoc.category}
                  </span>
                  <h2 className="font-oswald text-3xl font-bold mt-3">
                    {selectedDoc.title}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-2">
                    Last updated: {new Date(selectedDoc.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-zinc-500 hover:text-zinc-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="prose max-w-none mb-6">
                <div className="whitespace-pre-wrap text-zinc-700 leading-relaxed">
                  {selectedDoc.content}
                </div>
              </div>

              {selectedDoc.file_url && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText size={20} className="text-primary" />
                    Attachment
                  </h3>
                  <a
                    href={`${API_URL}${selectedDoc.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Download size={18} />
                    Download File
                  </a>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="btn-primary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDocumentationPage;
