import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { clearCMSCache } from '../utils/cmsUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminImageCMSPage = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const sections = [
    { id: 'hero', name: 'Hero Section', description: 'Main landing page banner' },
    { id: 'about_hero', name: 'About Page Hero', description: 'About page banner' },
    { id: 'feature_1', name: 'Feature 1', description: 'First feature section' },
    { id: 'feature_2', name: 'Feature 2', description: 'Second feature section' },
    { id: 'feature_3', name: 'Feature 3', description: 'Third feature section' },
    { id: 'testimonial_bg', name: 'Testimonial Background', description: 'Background for testimonials' },
    { id: 'cta_bg', name: 'CTA Background', description: 'Call-to-action section background' },
    { id: 'logo', name: 'Company Logo', description: 'Site logo' }
  ];

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cms/images`, { withCredentials: true });
      setImages(response.data);
    } catch (error) {
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('File must be an image');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedSection || !selectedFile) {
      toast.error('Please select a section and file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('section', selectedSection);
      formData.append('file', selectedFile);

      await axios.post(`${API_URL}/api/admin/cms/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders()
        }
      });

      toast.success('Image uploaded successfully!');
      
      // Clear CMS cache so changes reflect immediately
      clearCMSCache();
      
      setSelectedSection('');
      setSelectedFile(null);
      document.getElementById('file-input').value = '';
      loadImages();
      
      // Force reload of pages using CMS images
      window.dispatchEvent(new Event('cmsUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (section) => {
    if (!window.confirm(`Delete image for ${section}?`)) return;

    try {
      await axios.delete(`${API_URL}/api/admin/cms/images/${section}`, {
        headers: getAuthHeaders()
      });
      toast.success('Image deleted successfully');
      
      // Clear CMS cache so changes reflect immediately
      clearCMSCache();
      
      loadImages();
      
      // Force reload of pages using CMS images
      window.dispatchEvent(new Event('cmsUpdated'));
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getImageForSection = (sectionId) => {
    return images.find(img => img.section === sectionId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-oswald text-4xl font-bold mb-2">Image Management</h1>
        <p className="text-zinc-600">Upload and manage images for different sections of the website</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="font-oswald text-2xl font-semibold mb-6 flex items-center gap-2">
          <Upload className="text-primary" size={24} />
          Upload New Image
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Select Section *
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full"
              required
            >
              <option value="">Choose a section...</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name} - {section.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Select Image File *
            </label>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Max file size: 5MB | Supported: JPG, PNG, WEBP
            </p>
            {selectedFile && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="btn-primary px-8 py-3 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </form>
      </div>

      {/* Current Images Grid */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="font-oswald text-2xl font-semibold mb-6 flex items-center gap-2">
          <ImageIcon className="text-primary" size={24} />
          Current Images
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map(section => {
            const image = getImageForSection(section.id);
            return (
              <div key={section.id} className="border rounded-lg overflow-hidden">
                <div className="bg-zinc-50 p-4 border-b">
                  <h3 className="font-semibold">{section.name}</h3>
                  <p className="text-sm text-zinc-600">{section.description}</p>
                </div>

                <div className="aspect-video bg-zinc-100 flex items-center justify-center">
                  {image ? (
                    <img
                      src={`${API_URL}${image.file_path.replace('/app/backend', '')}`}
                      alt={section.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-zinc-400">
                      <ImageIcon size={48} className="mx-auto mb-2" />
                      <p className="text-sm">No image uploaded</p>
                    </div>
                  )}
                </div>

                {image && (
                  <div className="p-4 bg-white border-t">
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-zinc-500">
                        <p>Uploaded: {new Date(image.uploaded_at).toLocaleDateString()}</p>
                        <p>By: {image.uploaded_by}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(section.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                        title="Delete image"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Best Results:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use high-quality images (minimum 1920x1080 for hero sections)</li>
          <li>• Keep file sizes under 5MB for faster loading</li>
          <li>• WEBP format recommended for better compression</li>
          <li>• Ensure images align with brand colors (#D90429 red)</li>
          <li>• Test on mobile after uploading</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminImageCMSPage;
