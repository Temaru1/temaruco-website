import React, { useState } from 'react';
import { ArrowLeft, Paintbrush, CheckCircle, Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const DesignLabPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [enquiryCode, setEnquiryCode] = useState('');

  const [formData, setFormData] = useState({
    service_type: '',
    name: '',
    email: '',
    phone: '',
    description: '',
    budget: ''
  });

  const services = [
    { id: 'logo', label: 'Logo Design', description: 'Professional logos for your brand' },
    { id: 'brand', label: 'Brand Identity', description: 'Complete branding package' },
    { id: 'graphics', label: 'Graphics Design', description: 'Social media & marketing graphics' },
    { id: 'mockup', label: 'Mockup Creation', description: 'Product mockups for your designs' },
    { id: 'print', label: 'Print Design', description: 'Flyers, banners, business cards' },
    { id: 'other', label: 'Other', description: 'Custom design requests' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.service_type || !formData.name || !formData.email || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/design-enquiries`, formData);
      setEnquiryCode(response.data.enquiry_code);
      setSubmitted(true);
      toast.success('Enquiry submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Request Submitted!</h2>
            <p className="text-zinc-600 mb-6">
              Our design team will review your request and get back to you within 24-48 hours.
            </p>
            <div className="bg-zinc-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-zinc-500">Your Reference Code</p>
              <p className="text-xl font-bold text-[#D90429]">{enquiryCode}</p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Design Lab"
        description="Professional graphic design services for your brand."
      />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-zinc-500 hover:text-zinc-900 mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Paintbrush className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">Design Lab</h1>
              <p className="text-zinc-600">Professional design services for your brand</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service Selection */}
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Select Service</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setFormData({...formData, service_type: service.id})}
                  className={`p-4 border rounded-xl text-left transition-all ${
                    formData.service_type === service.id
                      ? 'border-[#D90429] bg-red-50'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <p className="font-semibold text-zinc-900">{service.label}</p>
                  <p className="text-sm text-zinc-500 mt-1">{service.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900">Your Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="+234..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Budget Range</label>
                  <select
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                  >
                    <option value="">Select budget</option>
                    <option value="under_20k">Under ₦20,000</option>
                    <option value="20k_50k">₦20,000 - ₦50,000</option>
                    <option value="50k_100k">₦50,000 - ₦100,000</option>
                    <option value="above_100k">Above ₦100,000</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Project Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={5}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                  placeholder="Describe your project, goals, and any specific requirements..."
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#D90429] hover:bg-[#B90322] py-6 text-lg"
          >
            {loading ? 'Submitting...' : (
              <>
                <Send className="w-5 h-5 mr-2" /> Submit Request
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DesignLabPage;
