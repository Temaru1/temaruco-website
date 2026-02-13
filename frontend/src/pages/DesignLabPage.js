import React, { useState } from 'react';
import { Upload, FileImage, Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const DesignLabPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_type: 'logo_design',
    description: '',
    deadline: '',
    budget: ''
  });
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const serviceTypes = [
    { value: 'logo_design', label: 'Logo Design' },
    { value: 'brand_identity', label: 'Brand Identity' },
    { value: 'graphics_design', label: 'Graphics Design' },
    { value: 'mockup_creation', label: 'Mockup Creation' },
    { value: 'print_design', label: 'Print Design' },
    { value: 'other', label: 'Other' }
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setReferenceFiles(files);

    // Create preview URLs
    const urls = files.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    });
    setPreviewUrls(urls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.description) {
      toast.error('Please describe what you need');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('customer_name', formData.customer_name);
      formDataToSend.append('customer_email', formData.customer_email);
      formDataToSend.append('customer_phone', formData.customer_phone);
      formDataToSend.append('service_type', formData.service_type);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('deadline', formData.deadline);
      formDataToSend.append('budget', formData.budget);

      // Append reference files
      referenceFiles.forEach((file, index) => {
        formDataToSend.append('reference_files', file);
      });

      const response = await axios.post(
        `${API_URL}/api/design-lab/request`,
        formDataToSend,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      toast.success('Design request submitted! We\'ll contact you with a quote.');
      navigate(`/enquiry/${response.data.enquiry_code}`);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-zinc-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-oswald text-5xl font-bold mb-4" data-testid="design-lab-title">
            Design Lab
          </h1>
          <p className="text-lg text-zinc-600 mb-2">
            Professional graphic design services for your brand
          </p>
          <p className="text-zinc-500">
            Submit your requirements and our team will provide a custom quote
          </p>
        </div>

        {/* Services Overview */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="font-oswald text-2xl font-bold mb-4">Our Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {serviceTypes.map(service => (
              <div key={service.value} className="p-4 border-2 border-zinc-200 rounded-lg text-center hover:border-[#D90429] transition-colors">
                <p className="font-semibold">{service.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Request Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="font-oswald text-2xl font-bold mb-6">Submit Design Request</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">Your Name *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-[#D90429]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-[#D90429]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Phone *</label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-[#D90429]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Service Type *</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-[#D90429]"
                  required
                >
                  {serviceTypes.map(service => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold mb-2">Describe Your Project *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="6"
                placeholder="Tell us about your design needs, style preferences, target audience, etc."
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-[#D90429]"
                required
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">Deadline (Optional)</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-[#D90429]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Budget Range (Optional)</label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="e.g., ₦50,000 - ₦100,000"
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-[#D90429]"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block font-semibold mb-2">Reference Files / Inspiration (Optional)</label>
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center hover:border-[#D90429] transition-colors">
                <Upload className="mx-auto text-zinc-400 mb-3" size={48} />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="reference-files"
                />
                <label htmlFor="reference-files" className="btn-outline cursor-pointer">
                  <FileImage size={20} className="inline mr-2" />
                  Choose Files
                </label>
                <p className="text-sm text-zinc-500 mt-2">Upload images or PDFs as references</p>
              </div>

              {/* File Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {previewUrls.map((url, index) => (
                    url && (
                      <img
                        key={index}
                        src={url}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Our design team will review your request within 24 hours</li>
            <li>• You'll receive a custom quote via email</li>
            <li>• Once approved, we'll start working on your design</li>
            <li>• You'll receive drafts for review and feedback</li>
            <li>• Final files delivered in your preferred format</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DesignLabPage;