import React, { useState } from 'react';
import { Upload, ArrowLeft, FileText, X, CheckCircle, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CLOTHING_SUGGESTIONS = [
  'T-Shirt', 'Hoodie', 'Joggers', 'Polo', 'Varsity Jacket',
  'Agbada', 'Senator Wear', 'Ankara Set', 'Kaftan', 'Two-Piece Set',
  'School Uniform', 'Shirt & Trouser', 'Skirt & Blouse', 'Tracksuit',
  'Dress', 'Bubu', 'Dashiki', 'Corporate Shirt', 'Coverall'
];

const COLOR_OPTIONS = [
  'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple',
  'Pink', 'Brown', 'Grey', 'Beige', 'Navy', 'Maroon', 'Gold'
];

const CustomOrderPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [designImages, setDesignImages] = useState([]);
  const [measurementFile, setMeasurementFile] = useState(null);
  const [showClothingSuggestions, setShowClothingSuggestions] = useState(false);
  const [clothingSearchTerm, setClothingSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    order_category: '',
    order_category_other: '',
    clothing_name: '',
    quantity: 1,
    fabric_material: '',
    fabric_material_other: '',
    colors: [],
    color_other: '',
    size_type: '',
    male_sizes: { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 },
    female_sizes: { '6': 0, '8': 0, '10': 0, '12': 0, '14': 0, '16': 0, '18': 0, '20': 0, '22': 0 },
    design_details: '',
    deadline: '',
    additional_notes: ''
  });
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const filteredClothingSuggestions = CLOTHING_SUGGESTIONS.filter(item =>
    item.toLowerCase().includes(clothingSearchTerm.toLowerCase())
  );

  const handleColorToggle = (color) => {
    if (formData.colors.includes(color)) {
      setFormData({
        ...formData,
        colors: formData.colors.filter(c => c !== color)
      });
    } else {
      setFormData({
        ...formData,
        colors: [...formData.colors, color]
      });
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (designImages.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setDesignImages([...designImages, ...files]);
  };

  const removeImage = (index) => {
    setDesignImages(designImages.filter((_, i) => i !== index));
  };

  const handleMeasurementUpload = (e) => {
    setMeasurementFile(e.target.files[0]);
  };

  const handleSizeChange = (sizeType, size, value) => {
    if (sizeType === 'male') {
      setFormData({
        ...formData,
        male_sizes: { ...formData.male_sizes, [size]: parseInt(value) || 0 }
      });
    } else {
      setFormData({
        ...formData,
        female_sizes: { ...formData.female_sizes, [size]: parseInt(value) || 0 }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerInfo.email.trim() || !customerInfo.email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    if (!customerInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!formData.order_category) {
      toast.error('Please select an order category');
      return;
    }
    if (!formData.clothing_name.trim()) {
      toast.error('Please enter a clothing name');
      return;
    }
    if (!formData.design_details.trim()) {
      toast.error('Please provide design details');
      return;
    }
    
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      const enquiryData = {
        order_category: formData.order_category === 'Other' ? formData.order_category_other : formData.order_category,
        clothing_name: formData.clothing_name,
        quantity: formData.quantity,
        fabric_material: formData.fabric_material === 'Other' ? formData.fabric_material_other : formData.fabric_material,
        colors: formData.color_other ? [...formData.colors, formData.color_other] : formData.colors,
        size_type: formData.size_type,
        male_sizes: formData.male_sizes,
        female_sizes: formData.female_sizes,
        design_details: formData.design_details,
        deadline: formData.deadline || null,
        additional_notes: formData.additional_notes || null
      };
      
      formDataToSend.append('enquiry_data', JSON.stringify(enquiryData));
      formDataToSend.append('customer_name', customerInfo.name);
      formDataToSend.append('customer_email', customerInfo.email);
      formDataToSend.append('customer_phone', customerInfo.phone);
      
      designImages.forEach((image) => {
        formDataToSend.append('design_images', image);
      });
      
      if (measurementFile) {
        formDataToSend.append('measurement_file', measurementFile);
      }

      const response = await axios.post(
        `${API_URL}/api/enquiries/create`,
        formDataToSend,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const enquiryCode = response.data.enquiry_code;
      navigate('/custom-order-confirmation', { state: { enquiryCode } });
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Custom Order"
        description="Submit your custom tailoring or manufacturing order request."
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
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900" data-testid="custom-order-title">
            Custom Order Inquiry
          </h1>
          <p className="text-zinc-600 mt-2">
            Submit your custom tailoring or manufacturing order. We'll send you a personalized quote.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Order Category */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Order Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Order Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.order_category}
                    onChange={(e) => setFormData({...formData, order_category: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    data-testid="order-category"
                  >
                    <option value="">Select Category</option>
                    <option value="Casual Wear">Casual Wear</option>
                    <option value="Native Wear">Native Wear</option>
                    <option value="Corporate / Uniform">Corporate / Uniform</option>
                    <option value="School Uniform">School Uniform</option>
                    <option value="Sportswear">Sportswear</option>
                    <option value="Two-Piece Set">Two-Piece Set</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.order_category === 'Other' && (
                    <input
                      type="text"
                      required
                      value={formData.order_category_other}
                      onChange={(e) => setFormData({...formData, order_category_other: e.target.value})}
                      placeholder="Please specify category"
                      className="w-full mt-2 px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                      data-testid="order-category-other"
                    />
                  )}
                </div>

                {/* Clothing Name */}
                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Clothing Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clothing_name}
                    onChange={(e) => {
                      setFormData({...formData, clothing_name: e.target.value});
                      setClothingSearchTerm(e.target.value);
                      setShowClothingSuggestions(true);
                    }}
                    onFocus={() => setShowClothingSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowClothingSuggestions(false), 200)}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="Type clothing name or select from suggestions"
                    data-testid="clothing-name"
                  />
                  {showClothingSuggestions && clothingSearchTerm && filteredClothingSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClothingSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setFormData({...formData, clothing_name: suggestion});
                            setShowClothingSuggestions(false);
                          }}
                          className="px-4 py-2 hover:bg-zinc-100 cursor-pointer"
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">Examples: T-Shirt, Agbada, Senator Wear, School Uniform</p>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    data-testid="quantity"
                  />
                </div>

                {/* Fabric Material */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Fabric / Material <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.fabric_material}
                    onChange={(e) => setFormData({...formData, fabric_material: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    data-testid="fabric-material"
                  >
                    <option value="">Select Fabric</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Ankara">Ankara</option>
                    <option value="Lace">Lace</option>
                    <option value="Aso-Oke">Aso-Oke</option>
                    <option value="Polyester">Polyester</option>
                    <option value="Chiffon">Chiffon</option>
                    <option value="Client Provides Fabric">Client Provides Fabric</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.fabric_material === 'Other' && (
                    <input
                      type="text"
                      required
                      value={formData.fabric_material_other}
                      onChange={(e) => setFormData({...formData, fabric_material_other: e.target.value})}
                      placeholder="Please specify fabric"
                      className="w-full mt-2 px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                      data-testid="fabric-material-other"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Colors</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorToggle(color)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.colors.includes(color)
                        ? 'bg-[#D90429] text-white'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                    data-testid={`color-${color.toLowerCase()}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.color_other}
                onChange={(e) => setFormData({...formData, color_other: e.target.value})}
                placeholder="Other color (type here)"
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                data-testid="color-other"
              />
              {formData.colors.length === 0 && !formData.color_other && (
                <p className="text-xs text-red-500 mt-2">Please select at least one color</p>
              )}
            </CardContent>
          </Card>

          {/* Sizes */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Sizes</h2>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Size Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.size_type}
                  onChange={(e) => setFormData({...formData, size_type: e.target.value})}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                  data-testid="size-type"
                >
                  <option value="">Select Size Type</option>
                  <option value="Male Sizes">Male Sizes</option>
                  <option value="Female Sizes">Female Sizes</option>
                  <option value="Mixed">Mixed (Both Male & Female)</option>
                  <option value="Custom Measurements Only">Custom Measurements Only</option>
                </select>

                {(formData.size_type === 'Male Sizes' || formData.size_type === 'Mixed') && (
                  <div className="mt-4 p-4 bg-zinc-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-3">Male Sizes</h4>
                    <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                      {Object.keys(formData.male_sizes).map(size => (
                        <div key={size}>
                          <label className="block text-xs text-zinc-600 mb-1 text-center">{size}</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.male_sizes[size]}
                            onChange={(e) => handleSizeChange('male', size, e.target.value)}
                            className="w-full px-2 py-2 border border-zinc-300 rounded-lg text-center text-sm"
                            data-testid={`male-size-${size.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.size_type === 'Female Sizes' || formData.size_type === 'Mixed') && (
                  <div className="mt-4 p-4 bg-zinc-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-3">Female Sizes</h4>
                    <div className="grid grid-cols-4 md:grid-cols-9 gap-3">
                      {Object.keys(formData.female_sizes).map(size => (
                        <div key={size}>
                          <label className="block text-xs text-zinc-600 mb-1 text-center">{size}</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.female_sizes[size]}
                            onChange={(e) => handleSizeChange('female', size, e.target.value)}
                            className="w-full px-2 py-2 border border-zinc-300 rounded-lg text-center text-sm"
                            data-testid={`female-size-${size}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Custom Measurement File (Optional)
                  </label>
                  <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-[#D90429] transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={handleMeasurementUpload}
                      className="hidden"
                      id="measurement-upload"
                      data-testid="measurement-upload"
                    />
                    <label htmlFor="measurement-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
                      <span className="text-sm text-zinc-600">Upload Measurements</span>
                    </label>
                    {measurementFile && (
                      <p className="mt-2 text-sm text-[#D90429] font-medium">{measurementFile.name}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">Accepts PDF, Word documents, or images</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Design Details */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Design Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Design Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows="5"
                    value={formData.design_details}
                    onChange={(e) => setFormData({...formData, design_details: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="Describe the design, embroidery details, patterns, special features, placement of logos, neck style, sleeve type, etc."
                    data-testid="design-details"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Design Images (Optional - Max 5)
                  </label>
                  <div className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-[#D90429] transition-colors">
                    <Upload className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="design-images-upload"
                      data-testid="design-images-upload"
                    />
                    <label htmlFor="design-images-upload" className="cursor-pointer">
                      <span className="text-[#D90429] font-medium">Click to upload</span>
                      <span className="text-zinc-500"> or drag and drop</span>
                    </label>
                    <p className="text-xs text-zinc-500 mt-2">PNG, JPG up to 5MB each (Maximum 5 images)</p>
                  </div>
                  
                  {designImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                      {designImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Design ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Deadline (Optional)</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                      data-testid="deadline"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows="3"
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="Any other important information or special requests..."
                    data-testid="additional-notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What Happens Next */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <FileText className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">What happens next?</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800">
                    <li>You'll receive an enquiry code immediately</li>
                    <li>Our team will review your specifications</li>
                    <li>We'll prepare a detailed custom quote with pricing</li>
                    <li>You'll receive the quote via email within 24-48 hours</li>
                    <li>You can accept, discuss modifications, or decline</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Your Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    data-testid="customer-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    data-testid="customer-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="+234 800 000 0000"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    data-testid="customer-phone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D90429] hover:bg-[#B90322] py-6 text-lg rounded-full"
            data-testid="submit-enquiry"
          >
            {loading ? 'Submitting Inquiry...' : 'Submit Custom Order Inquiry'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CustomOrderPage;
