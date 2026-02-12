import React, { useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Clothing suggestions for autocomplete
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
    
    // Validation
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
      
      // Prepare enquiry data
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
      
      // Append design images
      designImages.forEach((image, index) => {
        formDataToSend.append('design_images', image);
      });
      
      // Append measurement file if exists
      if (measurementFile) {
        formDataToSend.append('measurement_file', measurementFile);
      }

      const response = await axios.post(
        `${API_URL}/api/enquiries/create`,
        formDataToSend,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      // Redirect to confirmation page with enquiry code
      const enquiryCode = response.data.enquiry_code;
      navigate('/custom-order-confirmation', { 
        state: { enquiryCode } 
      });
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-zinc-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-oswald text-5xl font-bold uppercase mb-4" data-testid="custom-order-title">
          Custom Order Inquiry
        </h1>
        <p className="font-manrope text-lg text-zinc-600 mb-8">
          Submit your custom tailoring or manufacturing order. Our team will review and send you a personalized quote.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          
          {/* 1. Order Category */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Order Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.order_category}
              onChange={(e) => setFormData({...formData, order_category: e.target.value})}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full mt-2 px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="order-category-other"
              />
            )}
          </div>

          {/* 2. Clothing Name with Auto-suggest */}
          <div className="relative">
            <label className="block font-manrope font-semibold text-sm mb-2">
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
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            <p className="text-xs text-zinc-500 mt-1">Examples: T-Shirt, Agbada, Senator Wear, School Uniform, etc.</p>
          </div>

          {/* 3. Quantity */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="quantity"
            />
          </div>

          {/* 4. Fabric / Material */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Fabric / Material <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.fabric_material}
              onChange={(e) => setFormData({...formData, fabric_material: e.target.value})}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full mt-2 px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="fabric-material-other"
              />
            )}
          </div>

          {/* 5. Colors Multi-Select */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Colors <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorToggle(color)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                    formData.colors.includes(color)
                      ? 'border-primary bg-primary text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-primary'
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
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="color-other"
            />
            {formData.colors.length === 0 && !formData.color_other && (
              <p className="text-xs text-red-500 mt-1">Please select at least one color</p>
            )}
          </div>

          {/* 6. Sizes Section - Gender Structured */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Size Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.size_type}
              onChange={(e) => setFormData({...formData, size_type: e.target.value})}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="size-type"
            >
              <option value="">Select Size Type</option>
              <option value="Male Sizes">Male Sizes</option>
              <option value="Female Sizes">Female Sizes</option>
              <option value="Mixed">Mixed (Both Male & Female)</option>
              <option value="Custom Measurements Only">Custom Measurements Only</option>
            </select>

            {/* Male Sizes */}
            {(formData.size_type === 'Male Sizes' || formData.size_type === 'Mixed') && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Male Sizes</h4>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {Object.keys(formData.male_sizes).map(size => (
                    <div key={size}>
                      <label className="block text-xs text-zinc-600 mb-1">{size}</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.male_sizes[size]}
                        onChange={(e) => handleSizeChange('male', size, e.target.value)}
                        className="w-full px-2 py-2 border border-zinc-300 rounded text-center"
                        data-testid={`male-size-${size.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Female Sizes */}
            {(formData.size_type === 'Female Sizes' || formData.size_type === 'Mixed') && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">Female Sizes</h4>
                <div className="grid grid-cols-4 md:grid-cols-9 gap-2">
                  {Object.keys(formData.female_sizes).map(size => (
                    <div key={size}>
                      <label className="block text-xs text-zinc-600 mb-1">{size}</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.female_sizes[size]}
                        onChange={(e) => handleSizeChange('female', size, e.target.value)}
                        className="w-full px-2 py-2 border border-zinc-300 rounded text-center"
                        data-testid={`female-size-${size}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Measurement Upload */}
            <div className="mt-4">
              <label className="block font-manrope font-semibold text-sm mb-2">
                Custom Measurement File (Optional)
              </label>
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-4">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={handleMeasurementUpload}
                  className="hidden"
                  id="measurement-upload"
                  data-testid="measurement-upload"
                />
                <label htmlFor="measurement-upload" className="btn-outline cursor-pointer">
                  Upload Measurements
                </label>
                {measurementFile && (
                  <p className="mt-2 text-sm text-zinc-600">Selected: {measurementFile.name}</p>
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  Accepts PDF, Word documents, or images
                </p>
              </div>
            </div>
          </div>

          {/* 7. Design Details */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Design Details <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows="6"
              value={formData.design_details}
              onChange={(e) => setFormData({...formData, design_details: e.target.value})}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe the design, embroidery details, patterns, special features, placement of logos, neck style, sleeve type, etc."
              data-testid="design-details"
            ></textarea>
          </div>

          {/* 8. Image Upload (Multiple) */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Design Images (Optional - Max 5)
            </label>
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6">
              <Upload className="mx-auto text-zinc-400 mb-3" size={40} />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="design-images-upload"
                data-testid="design-images-upload"
              />
              <label htmlFor="design-images-upload" className="btn-outline cursor-pointer">
                Upload Design Images
              </label>
              <p className="text-xs text-zinc-500 mt-2">
                Upload reference photos or design sketches (Maximum 5 images)
              </p>
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
                    <p className="text-xs text-zinc-600 mt-1 truncate">{image.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 9. Deadline */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Deadline (Optional)
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="deadline"
            />
          </div>

          {/* 10. Additional Notes */}
          <div>
            <label className="block font-manrope font-semibold text-sm mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              rows="4"
              value={formData.additional_notes}
              onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Any other important information or special requests..."
              data-testid="additional-notes"
            ></textarea>
          </div>

          {/* What Happens Next Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="text-blue-600 mt-1" size={20} />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">What happens next?</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>You'll receive an enquiry code immediately</li>
                  <li>Our team will review your specifications</li>
                  <li>We'll prepare a detailed custom quote with pricing</li>
                  <li>You'll receive the quote via email within 24-48 hours</li>
                  <li>You can accept, discuss modifications, or decline</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Customer Contact Information */}
          <div>
            <h2 className="font-oswald text-2xl font-bold mb-4">Your Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="customer-name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="customer-email"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  placeholder="+234 800 000 0000"
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="customer-phone"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-lg"
            data-testid="submit-enquiry"
          >
            {loading ? 'Submitting Inquiry...' : 'Submit Custom Order Inquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomOrderPage;
