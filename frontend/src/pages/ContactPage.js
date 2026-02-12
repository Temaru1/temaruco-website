import React, { useState } from 'react';
import { Mail, Phone, Instagram, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const ContactPage = () => {
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
    
    // Validate required fields
    if (!formData.name) {
      document.getElementById('contact-name').focus();
      toast.error('Please enter your name');
      return;
    }
    if (!formData.email) {
      document.getElementById('contact-email').focus();
      toast.error('Please enter your email');
      return;
    }
    if (!formData.subject) {
      document.getElementById('contact-subject').focus();
      toast.error('Please enter a subject');
      return;
    }
    if (!formData.message) {
      document.getElementById('contact-message').focus();
      toast.error('Please enter your message');
      return;
    }

    setSending(true);
    try {
      const response = await axios.post(`${API_URL}/api/contact/message`, formData);
      toast.success(response.data.message || 'Message sent successfully!');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to send message. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-oswald text-5xl font-bold uppercase mb-6" data-testid="contact-title">Contact Us</h1>
        
        <p className="font-manrope text-lg text-zinc-700 mb-12">
          Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="font-oswald text-2xl font-semibold mb-6">Get in Touch</h2>
            
            <div className="space-y-6">
              <a 
                href="tel:+2349125423902" 
                className="flex items-start space-x-4 hover:bg-zinc-50 p-3 rounded-lg transition-colors cursor-pointer"
              >
                <Phone className="text-primary mt-1" size={24} />
                <div>
                  <p className="font-manrope font-semibold">Phone</p>
                  <p className="text-primary hover:underline">+234 912 542 3902</p>
                  <p className="text-xs text-zinc-500 mt-1">Click to call</p>
                </div>
              </a>

              <a 
                href="mailto:temarucoltd@gmail.com" 
                className="flex items-start space-x-4 hover:bg-zinc-50 p-3 rounded-lg transition-colors cursor-pointer"
              >
                <Mail className="text-primary mt-1" size={24} />
                <div>
                  <p className="font-manrope font-semibold">Email</p>
                  <p className="text-primary hover:underline">temarucoltd@gmail.com</p>
                  <p className="text-xs text-zinc-500 mt-1">Click to email</p>
                </div>
              </a>

              <a 
                href="https://instagram.com/temaruco_clothing_factory" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start space-x-4 hover:bg-zinc-50 p-3 rounded-lg transition-colors cursor-pointer"
              >
                <Instagram className="text-primary mt-1" size={24} />
                <div>
                  <p className="font-manrope font-semibold">Instagram</p>
                  <p className="text-primary hover:underline">@temaruco_clothing_factory</p>
                  <p className="text-xs text-zinc-500 mt-1">Click to visit</p>
                </div>
              </a>

              <div className="flex items-start space-x-4 p-3">
                <MapPin className="text-primary mt-1" size={24} />
                <div>
                  <p className="font-manrope font-semibold">Address</p>
                  <p className="text-zinc-600">Lagos, Nigeria</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="font-oswald text-2xl font-semibold mb-6">Send a Message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input 
                  id="contact-name"
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full" 
                  placeholder="Your name" 
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input 
                  id="contact-email"
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full" 
                  placeholder="your@email.com" 
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Phone (Optional)
                </label>
                <input 
                  id="contact-phone"
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full" 
                  placeholder="+234 XXX XXX XXXX" 
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input 
                  id="contact-subject"
                  type="text" 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full" 
                  placeholder="What is this about?" 
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea 
                  id="contact-message"
                  rows="4" 
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full" 
                  placeholder="Your message..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={sending}
                className="btn-primary w-full"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 bg-zinc-50 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-primary" size={28} />
            <h2 className="font-oswald text-2xl font-semibold">Business Hours</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-manrope">
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-lg">Monday - Friday</p>
              <p className="text-zinc-600 text-xl">8:00 AM - 5:00 PM</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-semibold text-lg">Saturday</p>
              <p className="text-zinc-600 text-xl">8:00 AM - 1:00 PM</p>
            </div>
          </div>
          <p className="text-zinc-600 mt-4 text-sm">Closed on Sundays and Public Holidays</p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
