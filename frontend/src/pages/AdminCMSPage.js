import React, { useState, useEffect } from 'react';
import { Save, Upload, Image } from 'lucide-react';
import { getCMSSettings, updateCMSSettings, getCMSContent, updateCMSContent } from '../utils/api';
import { toast } from 'sonner';

const AdminCMSPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // general, pricing, content
  
  const [settings, setSettings] = useState({
    logo_url: '',
    company_name: 'Temaruco Clothing Factory',
    tagline: 'Inspire • Empower • Accomplish',
    phone: '+234 912 542 3902',
    email: 'temarucoltd@gmail.com',
    address: 'Lagos, Nigeria',
    instagram: '@temaruco_clothing_factory',
    // Pricing
    pod_base_tshirt_price: 2000,
    pod_print_prices: {
      Badge: 500,
      A4: 800,
      A3: 1200,
      A2: 1800,
      A1: 2500
    },
    bulk_order_discounts: {
      '50': 5,
      '100': 10,
      '200': 15,
      '500': 20
    }
  });

  const [content, setContent] = useState({
    hero_title: 'TEMARUCO CLOTHING FACTORY',
    hero_description: 'Premium clothing manufacturing for bulk orders, print-on-demand, and boutique collections. Quality craftsmanship meets modern design.',
    about_title: 'About Temaruco',
    about_description: 'Temaruco Clothing Factory is Nigeria\'s premier clothing manufacturing company...',
    services_bulk_title: 'BULK ORDERS',
    services_bulk_desc: 'Large-scale clothing production with custom designs. Perfect for businesses, schools, and events.',
    services_pod_title: 'PRINT-ON-DEMAND',
    services_pod_desc: 'Upload your design, we print and deliver. Start your clothing brand with zero inventory.',
    services_boutique_title: 'BOUTIQUE STORE',
    services_boutique_desc: 'Shop our curated collection of ready-to-wear premium clothing pieces.',
    quote_calculator_title: 'QUICK PRICE CALCULATOR',
    quote_calculator_desc: 'Get an instant estimate for your bulk order',
    factory_section_title: 'Our Factory',
    factory_section_desc: 'State-of-the-art manufacturing facility',
    testimonials_title: 'What Our Clients Say',
    cta_title: 'Ready to Get Started?',
    cta_description: 'Join thousands of satisfied customers who trust Temaruco for their clothing needs.'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, contentRes] = await Promise.all([
        getCMSSettings(),
        getCMSContent()
      ]);
      
      setSettings(settingsRes.data);
      
      // Convert content array to object
      const contentObj = {};
      contentRes.data.forEach(item => {
        contentObj[item.key] = item.value;
      });
      setContent({...content, ...contentObj});
    } catch (error) {
      toast.error('Failed to load CMS data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateCMSSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async (key, value, section) => {
    try {
      await updateCMSContent({ key, value, section });
      toast.success('Content updated!');
    } catch (error) {
      toast.error('Failed to update content');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, we'll use a placeholder. In production, upload to storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({...settings, logo_url: reader.result});
        toast.info('Logo will be uploaded when you click Save');
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div>
      <h1 className="font-oswald text-4xl font-bold mb-8" data-testid="cms-title">
        Website Content Management
      </h1>

      {/* Company Settings */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <h2 className="font-oswald text-2xl font-semibold mb-6">Company Settings</h2>

        <div className="space-y-6">
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">Company Logo</label>
            <div className="flex items-center gap-4">
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-16 w-auto" />
              )}
              <label className="btn-outline cursor-pointer flex items-center gap-2">
                <Upload size={18} />
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  data-testid="logo-upload"
                />
              </label>
            </div>
            <p className="text-sm text-zinc-600 mt-2">Recommended: 200x60px PNG with transparent background</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-manrope font-semibold text-sm mb-2">Company Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                className="w-full"
                data-testid="company-name"
              />
            </div>
            <div>
              <label className="block font-manrope font-semibold text-sm mb-2">Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({...settings, tagline: e.target.value})}
                className="w-full"
                data-testid="tagline"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-manrope font-semibold text-sm mb-2">Phone</label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({...settings, phone: e.target.value})}
                className="w-full"
                data-testid="phone"
              />
            </div>
            <div>
              <label className="block font-manrope font-semibold text-sm mb-2">Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({...settings, email: e.target.value})}
                className="w-full"
                data-testid="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-manrope font-semibold text-sm mb-2">Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({...settings, address: e.target.value})}
                className="w-full"
                data-testid="address"
              />
            </div>
            <div>
              <label className="block font-manrope font-semibold text-sm mb-2">Instagram Handle</label>
              <input
                type="text"
                value={settings.instagram}
                onChange={(e) => setSettings({...settings, instagram: e.target.value})}
                className="w-full"
                data-testid="instagram"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
            data-testid="save-settings-btn"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <h2 className="font-oswald text-2xl font-semibold mb-6">Page Content</h2>

        <div className="space-y-8">
          {/* Hero Section */}
          <div className="border-b pb-6">
            <h3 className="font-oswald text-lg font-semibold mb-4 text-primary">Hero Section</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Hero Title</label>
                <input
                  type="text"
                  value={content.hero_title}
                  onChange={(e) => setContent({...content, hero_title: e.target.value})}
                  onBlur={(e) => handleSaveContent('hero_title', e.target.value, 'hero')}
                  className="w-full"
                  data-testid="hero-title"
                />
              </div>
              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Hero Description</label>
                <textarea
                  rows="3"
                  value={content.hero_description}
                  onChange={(e) => setContent({...content, hero_description: e.target.value})}
                  onBlur={(e) => handleSaveContent('hero_description', e.target.value, 'hero')}
                  className="w-full"
                  data-testid="hero-desc"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="border-b pb-6">
            <h3 className="font-oswald text-lg font-semibold mb-4 text-primary">Services Section</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Bulk Orders Title</label>
                  <input
                    type="text"
                    value={content.services_bulk_title}
                    onChange={(e) => setContent({...content, services_bulk_title: e.target.value})}
                    onBlur={(e) => handleSaveContent('services_bulk_title', e.target.value, 'services')}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Bulk Orders Description</label>
                  <textarea
                    rows="2"
                    value={content.services_bulk_desc}
                    onChange={(e) => setContent({...content, services_bulk_desc: e.target.value})}
                    onBlur={(e) => handleSaveContent('services_bulk_desc', e.target.value, 'services')}
                    className="w-full"
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">POD Title</label>
                  <input
                    type="text"
                    value={content.services_pod_title}
                    onChange={(e) => setContent({...content, services_pod_title: e.target.value})}
                    onBlur={(e) => handleSaveContent('services_pod_title', e.target.value, 'services')}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">POD Description</label>
                  <textarea
                    rows="2"
                    value={content.services_pod_desc}
                    onChange={(e) => setContent({...content, services_pod_desc: e.target.value})}
                    onBlur={(e) => handleSaveContent('services_pod_desc', e.target.value, 'services')}
                    className="w-full"
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Boutique Title</label>
                  <input
                    type="text"
                    value={content.services_boutique_title}
                    onChange={(e) => setContent({...content, services_boutique_title: e.target.value})}
                    onBlur={(e) => handleSaveContent('services_boutique_title', e.target.value, 'services')}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Boutique Description</label>
                  <textarea
                    rows="2"
                    value={content.services_boutique_desc}
                    onChange={(e) => setContent({...content, services_boutique_desc: e.target.value})}
                    onBlur={(e) => handleSaveContent('services_boutique_desc', e.target.value, 'services')}
                    className="w-full"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Other Sections */}
          <div>
            <h3 className="font-oswald text-lg font-semibold mb-4 text-primary">Other Content</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Quote Calculator Title</label>
                  <input
                    type="text"
                    value={content.quote_calculator_title}
                    onChange={(e) => setContent({...content, quote_calculator_title: e.target.value})}
                    onBlur={(e) => handleSaveContent('quote_calculator_title', e.target.value, 'calculator')}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Factory Section Title</label>
                  <input
                    type="text"
                    value={content.factory_section_title}
                    onChange={(e) => setContent({...content, factory_section_title: e.target.value})}
                    onBlur={(e) => handleSaveContent('factory_section_title', e.target.value, 'factory')}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">CTA Title</label>
                  <input
                    type="text"
                    value={content.cta_title}
                    onChange={(e) => setContent({...content, cta_title: e.target.value})}
                    onBlur={(e) => handleSaveContent('cta_title', e.target.value, 'cta')}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">CTA Description</label>
                  <textarea
                    rows="2"
                    value={content.cta_description}
                    onChange={(e) => setContent({...content, cta_description: e.target.value})}
                    onBlur={(e) => handleSaveContent('cta_description', e.target.value, 'cta')}
                    className="w-full"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Branding Equipment Images */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="font-oswald text-2xl font-semibold mb-6">Branding Equipment Gallery</h2>
        <p className="text-zinc-600 mb-4">Images of printing and embroidery equipment used in your production process</p>
        
        <div className="grid grid-cols-3 gap-4">
          <img 
            src="https://images.unsplash.com/photo-1614494731690-53925976ea29?crop=entropy&cs=srgb&fm=jpg&q=85" 
            alt="Screen printing equipment" 
            className="w-full h-48 object-cover rounded-lg"
          />
          <img 
            src="https://images.unsplash.com/photo-1693031630177-b897fb9d7154?crop=entropy&cs=srgb&fm=jpg&q=85" 
            alt="Digital printing machine" 
            className="w-full h-48 object-cover rounded-lg"
          />
          <img 
            src="https://images.unsplash.com/photo-1630930737762-95fba69e2dad?crop=entropy&cs=srgb&fm=jpg&q=85" 
            alt="Industrial sewing machine" 
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminCMSPage;
