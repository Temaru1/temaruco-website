import React, { useState } from 'react';
import { Mail, Phone, Instagram, MapPin, Clock, Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const ContactPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      const response = await axios.post(`${API_URL}/api/contact/message`, formData);
      toast.success(response.data.message || 'Message sent successfully!');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      value: '+234 912 542 3902',
      href: 'tel:+2349125423902',
      hint: 'Click to call'
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'temarucoltd@gmail.com',
      href: 'mailto:temarucoltd@gmail.com',
      hint: 'Click to email'
    },
    {
      icon: Instagram,
      title: 'Instagram',
      value: '@temaruco_clothing_factory',
      href: 'https://instagram.com/temaruco_clothing_factory',
      hint: 'Click to visit'
    },
    {
      icon: MapPin,
      title: 'Address',
      value: 'Lagos, Nigeria',
      href: null,
      hint: null
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Contact Us"
        description="Get in touch with Temaruco Clothing Factory for all your clothing manufacturing needs."
      />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-zinc-500 hover:text-zinc-900 mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900" data-testid="contact-title">
            Contact Us
          </h1>
          <p className="text-zinc-600 mt-2">
            Have questions? We'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-zinc-900 mb-6">Get in Touch</h2>
                
                <div className="space-y-4">
                  {contactInfo.map((item, index) => (
                    item.href ? (
                      <a 
                        key={index}
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                          <item.icon className="w-5 h-5 text-[#D90429]" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{item.title}</p>
                          <p className="text-[#D90429] group-hover:underline">{item.value}</p>
                          {item.hint && <p className="text-xs text-zinc-500 mt-1">{item.hint}</p>}
                        </div>
                      </a>
                    ) : (
                      <div key={index} className="flex items-start gap-4 p-4">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-5 h-5 text-[#D90429]" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{item.title}</p>
                          <p className="text-zinc-600">{item.value}</p>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#D90429]" />
                  </div>
                  <h2 className="text-xl font-semibold text-zinc-900">Business Hours</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
                    <span className="font-medium">Monday - Friday</span>
                    <span className="text-zinc-600">8:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
                    <span className="font-medium">Saturday</span>
                    <span className="text-zinc-600">8:00 AM - 1:00 PM</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">Closed on Sundays and Public Holidays</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-zinc-900 mb-6">Send a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent" 
                    placeholder="Your name" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent" 
                    placeholder="your@email.com" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Phone (Optional)</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent" 
                    placeholder="+234 XXX XXX XXXX" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent" 
                    placeholder="What is this about?" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    rows="5" 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent" 
                    placeholder="Your message..."
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={sending}
                  className="w-full bg-[#D90429] hover:bg-[#B90322] py-6 text-lg rounded-full"
                >
                  {sending ? 'Sending...' : (
                    <>
                      <Send className="w-5 h-5 mr-2" /> Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
