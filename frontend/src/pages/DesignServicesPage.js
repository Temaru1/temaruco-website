import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Shirt, Building2, Instagram, Calendar, PenTool, Upload, X, CheckCircle, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DESIGN_SERVICES = [
  {
    id: 'logo',
    name: 'Logo Design',
    description: 'Professional logo design for your brand or business. Includes multiple concepts and revisions.',
    icon: Building2,
    color: 'bg-blue-500'
  },
  {
    id: 'tshirt_artwork',
    name: 'T-Shirt Artwork',
    description: 'Custom artwork designed specifically for t-shirt printing. Perfect for events, brands, or personal use.',
    icon: Shirt,
    color: 'bg-red-500'
  },
  {
    id: 'brand_identity',
    name: 'Brand Identity',
    description: 'Complete brand package including logo, colors, typography, and brand guidelines.',
    icon: Palette,
    color: 'bg-purple-500'
  },
  {
    id: 'social_media',
    name: 'Social Media Graphics',
    description: 'Eye-catching graphics for Instagram, Facebook, Twitter, and other social platforms.',
    icon: Instagram,
    color: 'bg-pink-500'
  },
  {
    id: 'event_flyers',
    name: 'Event Flyers',
    description: 'Professional flyers and posters for events, promotions, and announcements.',
    icon: Calendar,
    color: 'bg-orange-500'
  },
  {
    id: 'custom_illustration',
    name: 'Custom Illustrations',
    description: 'Unique hand-drawn or digital illustrations tailored to your specific needs.',
    icon: PenTool,
    color: 'bg-teal-500'
  }
];

const BUDGET_RANGES = [
  'Under ₦10,000',
  '₦10,000 - ₦25,000',
  '₦25,000 - ₦50,000',
  '₦50,000 - ₦100,000',
  'Above ₦100,000',
  'Not sure / Open to suggestions'
];

const DesignServicesPage = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState([]);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    design_type: '',
    description: '',
    deadline: '',
    budget_range: ''
  });

  const handleServiceClick = (serviceId) => {
    setSelectedService(serviceId);
    setFormData({ ...formData, design_type: serviceId });
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (referenceFiles.length + files.length > 5) {
      toast.error('Maximum 5 reference images allowed');
      return;
    }
    
    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    setReferenceFiles([...referenceFiles, ...newFiles]);
  };

  const removeFile = (index) => {
    const newFiles = [...referenceFiles];
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setReferenceFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.design_type || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    try {
      // Create form data for file upload
      const submitData = new FormData();
      submitData.append('full_name', formData.full_name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('design_type', formData.design_type);
      submitData.append('description', formData.description);
      submitData.append('deadline', formData.deadline);
      submitData.append('budget_range', formData.budget_range);
      
      // Append reference files
      referenceFiles.forEach((fileObj, index) => {
        submitData.append(`reference_${index}`, fileObj.file);
      });

      await axios.post(`${API_URL}/api/design-inquiries`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmitted(true);
      toast.success('Your design inquiry has been submitted!');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      design_type: '',
      description: '',
      deadline: '',
      budget_range: ''
    });
    setReferenceFiles([]);
    setSelectedService('');
    setShowForm(false);
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Design Services" 
        description="Professional graphic design services. Logo design, t-shirt artwork, brand identity, and more."
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#2B2D42] via-[#3d3f5c] to-[#D90429] text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Professional Design Services
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Need a logo or custom artwork? Our design team will create it for you. 
              From brand identity to t-shirt graphics, we bring your ideas to life.
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              size="lg"
              className="bg-white text-[#D90429] hover:bg-zinc-100 font-semibold"
            >
              Request Design <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-zinc-900 mb-4">Our Services</h2>
        <p className="text-center text-zinc-600 mb-12 max-w-2xl mx-auto">
          Choose a service below or request a custom design. Prices are quoted based on your specific requirements.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DESIGN_SERVICES.map((service) => (
            <Card 
              key={service.id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              onClick={() => handleServiceClick(service.id)}
              data-testid={`service-${service.id}`}
            >
              <CardContent className="p-6">
                <div className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 mb-2">{service.name}</h3>
                <p className="text-zinc-600 mb-4">{service.description}</p>
                <span className="text-[#D90429] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Request Design <ArrowRight className="w-4 h-4" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-zinc-900 mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#D90429] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Submit Request</h3>
              <p className="text-zinc-600 text-sm">Tell us about your design needs and share any references</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#D90429] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Get a Quote</h3>
              <p className="text-zinc-600 text-sm">We review your request and send you a custom price quote</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#D90429] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Design & Revise</h3>
              <p className="text-zinc-600 text-sm">Our team creates your design with unlimited revisions</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#D90429] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
              <h3 className="font-semibold mb-2">Receive Files</h3>
              <p className="text-zinc-600 text-sm">Get your final design files in all formats you need</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h2>
          <p className="text-zinc-300 mb-8 max-w-2xl mx-auto">
            Submit your design request today and get a free quote within 24 hours. 
            No commitment required.
          </p>
          <Button 
            onClick={() => setShowForm(true)}
            size="lg"
            className="bg-[#D90429] hover:bg-[#B90322] text-white font-semibold"
            data-testid="request-design-btn"
          >
            Request Design Now
          </Button>
        </div>
      </div>

      {/* Inquiry Form Modal */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !submitting && resetForm()}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              /* Success State */
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-4">Inquiry Submitted!</h2>
                <p className="text-zinc-600 mb-6">
                  Thank you for your design request. Our team will review your inquiry and 
                  get back to you within 24 hours with a custom quote.
                </p>
                <p className="text-sm text-zinc-500 mb-8">
                  Check your email ({formData.email}) for updates.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={resetForm} variant="outline">
                    Close
                  </Button>
                  <Button onClick={() => navigate('/')} className="bg-[#D90429] hover:bg-[#B90322]">
                    Back to Home
                  </Button>
                </div>
              </div>
            ) : (
              /* Form */
              <>
                <div className="flex items-center justify-between p-6 border-b">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">Request Design</h2>
                    <p className="text-sm text-zinc-500">Fill out the form below and we'll get back to you</p>
                  </div>
                  <button 
                    onClick={resetForm}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                      placeholder="Your full name"
                      data-testid="input-name"
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                        placeholder="your@email.com"
                        data-testid="input-email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                        placeholder="+234 800 000 0000"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>

                  {/* Design Type */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Type of Design <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="design_type"
                      value={formData.design_type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                      data-testid="select-design-type"
                    >
                      <option value="">Select a service</option>
                      {DESIGN_SERVICES.map(service => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                      <option value="other">Other / Custom</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Description of Your Idea <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent resize-none"
                      placeholder="Tell us about your design project. Include details about colors, style, and any specific requirements..."
                      data-testid="input-description"
                    />
                  </div>

                  {/* Reference Images */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Reference Images (Optional)
                    </label>
                    <p className="text-xs text-zinc-500 mb-2">Upload up to 5 images for inspiration</p>
                    
                    <div className="flex flex-wrap gap-3">
                      {referenceFiles.map((fileObj, index) => (
                        <div key={index} className="relative w-20 h-20">
                          <img
                            src={fileObj.preview}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      {referenceFiles.length < 5 && (
                        <label className="w-20 h-20 border-2 border-dashed border-zinc-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#D90429] transition-colors">
                          <Upload className="w-5 h-5 text-zinc-400" />
                          <span className="text-xs text-zinc-400 mt-1">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Deadline & Budget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Deadline Needed
                      </label>
                      <input
                        type="date"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                        data-testid="input-deadline"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Budget Range (Optional)
                      </label>
                      <select
                        name="budget_range"
                        value={formData.budget_range}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                        data-testid="select-budget"
                      >
                        <option value="">Select budget range</option>
                        {BUDGET_RANGES.map(range => (
                          <option key={range} value={range}>{range}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#D90429] hover:bg-[#B90322] text-white py-3 font-semibold"
                      data-testid="submit-inquiry-btn"
                    >
                      {submitting ? 'Submitting...' : 'Submit Inquiry'}
                    </Button>
                    <p className="text-xs text-zinc-500 text-center mt-3">
                      No payment required. We'll send you a quote via email.
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignServicesPage;
