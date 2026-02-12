import React, { useState, useRef, useEffect } from 'react';
import { Upload, Move } from 'lucide-react';
import { createPODOrder, getPricing } from '../utils/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PODPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [designFile, setDesignFile] = useState(null);
  const [designPreview, setDesignPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [designPosition, setDesignPosition] = useState({ x: 50, y: 30 }); // Center position
  const dragRef = useRef(null);
  
  // Customer information
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  // Dynamic pricing from backend
  const [printSizePrices, setPrintSizePrices] = useState({
    'Badge': 500, 'A4': 800, 'A3': 1200, 'A2': 1800, 'A1': 2500
  });
  const [shirtQualityPrices, setShirtQualityPrices] = useState({
    'Standard': 2000, 'Premium': 2800, 'Luxury': 3500
  });

  const [orderData, setOrderData] = useState({
    clothing_type: 'T-Shirt', // NEW: Clothing type selection
    gender: 'male', // NEW: Gender selection
    quantity: 1,
    size_breakdown: { S: 0, M: 1, L: 0, XL: 0, XXL: 0, '3XL': 0 },
    custom_sizes: [], // [{size: 'Custom Size', quantity: 5}]
    shirt_quality: 'Standard',
    print_size: 'A4',
    colors: [],
    delivery_option: 'deliver_to_me',
    recipient_name: '',
    delivery_phone: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_notes: ''
  });

  // Size options based on gender
  const getSizeOptions = () => {
    if (orderData.gender === 'female') {
      return ['8', '10', '12', '14', '16', '18', '20', '22'];
    } else if (orderData.gender === 'male') {
      return ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
    } else {
      return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
    }
  };

  // Update size breakdown when gender changes
  const handleGenderChange = (newGender) => {
    const newSizes = getSizeOptions();
    const newSizeBreakdown = {};
    
    newSizes.forEach(size => {
      newSizeBreakdown[size] = 0;
    });
    
    // Set middle size to current quantity
    const middleSize = newGender === 'female' ? '12' : 'M';
    newSizeBreakdown[middleSize] = orderData.quantity;
    
    setOrderData({
      ...orderData,
      gender: newGender,
      size_breakdown: newSizeBreakdown
    });
  };

  const clothingOptions = [
    { value: 'T-Shirt', label: 'T-Shirt', description: 'Classic short sleeve' },
    { value: 'Polo Shirt', label: 'Polo Shirt', description: 'Collared with buttons' },
    { value: 'Hoodie', label: 'Hoodie', description: 'With hood and pocket' },
    { value: 'Joggers', label: 'Joggers', description: 'Comfortable track pants' },
    { value: 'Varsity Jacket', label: 'Varsity Jacket', description: 'Classic sporty jacket' },
  ];

  const [showCustomSize, setShowCustomSize] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState({ size: '', quantity: 1 });

  // Fetch dynamic pricing on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await getPricing();
        setPrintSizePrices(response.data.pod_print_prices);
        setShirtQualityPrices(response.data.pod_shirt_quality_prices);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        // Use default values already set
      }
    };
    fetchPricing();
    
    // Listen for pricing updates
    const handlePricingUpdate = () => {
      fetchPricing();
    };
    window.addEventListener('pricingUpdated', handlePricingUpdate);
    
    return () => {
      window.removeEventListener('pricingUpdated', handlePricingUpdate);
    };
  }, []);

  // Print size dimensions (percentage of shirt)
  const printSizeDimensions = {
    'Badge': { width: 15, height: 15 },
    'A4': { width: 25, height: 30 },
    'A3': { width: 35, height: 40 },
    'A2': { width: 45, height: 50 },
    'A1': { width: 55, height: 60 }
  };

  const shirtPrice = shirtQualityPrices[orderData.shirt_quality] || 2000;
  const printPrice = printSizePrices[orderData.print_size] || 800;
  const pricePerItem = shirtPrice + printPrice;

  const handleDesignUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB');
        return;
      }
      setDesignFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDesignPreview(reader.result);
        toast.success('Design uploaded! Adjust size and position below.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragRef.current) return;
    
    const container = dragRef.current.parentElement;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Constrain within bounds
    const dimensions = printSizeDimensions[orderData.print_size];
    const maxX = 100 - dimensions.width;
    const maxY = 100 - dimensions.height;
    
    setDesignPosition({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate customer information
    if (!customerInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerInfo.email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!customerInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    
    if (!designFile) {
      toast.error('Please upload your design');
      document.getElementById('design-upload').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (orderData.delivery_option === 'deliver_to_me') {
      if (!orderData.recipient_name) {
        toast.error('Recipient name is required');
        document.getElementById('recipient-name').focus();
        return;
      }
      if (!orderData.delivery_phone) {
        toast.error('Delivery phone is required');
        document.getElementById('delivery-phone').focus();
        return;
      }
      if (!orderData.delivery_address) {
        toast.error('Delivery address is required');
        document.getElementById('delivery-address').focus();
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const orderWithPosition = {
        ...orderData,
        design_position: designPosition
      };
      formData.append('order_data', JSON.stringify(orderWithPosition));
      formData.append('design_file', designFile);
      formData.append('customer_name', customerInfo.name);
      formData.append('customer_email', customerInfo.email);
      formData.append('customer_phone', customerInfo.phone);

      const response = await createPODOrder(formData);
      toast.success('POD order created successfully! Redirecting to payment instructions...');
      
      // Redirect to order summary page
      const orderId = response.data.order_id || response.data.id;
      navigate(`/order-summary/${orderId}`);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to create order';
      toast.error(errorMsg);
      console.error('POD Order Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = orderData.quantity * pricePerItem;
  const dimensions = printSizeDimensions[orderData.print_size];

  return (
    <div className="min-h-screen py-16 px-4 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-oswald text-5xl font-bold uppercase mb-4" data-testid="pod-title">
          Print-On-Demand
        </h1>
        <p className="font-manrope text-lg text-zinc-600 mb-8">
          Upload your design, choose print size, and we'll print it on premium Temaruco T-shirts
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Design Preview & Positioning */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="font-oswald text-2xl font-semibold mb-6">{orderData.clothing_type} Preview</h2>
            
            {/* Clothing Mockup */}
            <div className="relative bg-zinc-100 rounded-lg overflow-hidden" style={{ aspectRatio: '3/4' }}>
              {/* Default T-shirt mockup - white T-shirt */}
              <img 
                src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80"
                alt={`${orderData.clothing_type} Mockup`}
                className="w-full h-full object-cover"
              />
              
              {/* Design Overlay */}
              {designPreview && (
                <div
                  ref={dragRef}
                  onMouseDown={handleMouseDown}
                  style={{
                    position: 'absolute',
                    left: `${designPosition.x}%`,
                    top: `${designPosition.y}%`,
                    width: `${dimensions.width}%`,
                    height: `${dimensions.height}%`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    border: '2px dashed #D90429',
                    padding: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transition: isDragging ? 'none' : 'all 0.2s'
                  }}
                  className="flex items-center justify-center"
                >
                  <img 
                    src={designPreview} 
                    alt="Your Design" 
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
              )}
            </div>

            {designPreview && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
                <Move size={16} />
                <span>Drag your design to reposition it on the T-shirt</span>
              </div>
            )}
          </div>

          {/* Order Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8" id="design-upload">
              <h2 className="font-oswald text-2xl font-semibold mb-6">Upload Your Design</h2>
              
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="mx-auto text-zinc-400 mb-4" size={48} />
                <label className="cursor-pointer">
                  <span className="btn-primary inline-block">
                    Upload Design File <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDesignUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-zinc-500 mt-2">PNG, JPG, or SVG (Max 10MB)</p>
                {designFile && (
                  <p className="text-sm text-primary mt-2 font-semibold">✓ {designFile.name}</p>
                )}
              </div>
            </div>

            {/* Clothing Type Selection */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                Select Clothing Item <span className="text-red-500">*</span>
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clothingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOrderData({...orderData, clothing_type: option.value})}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      orderData.clothing_type === option.value
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                    data-testid={`clothing-${option.value}`}
                  >
                    <div className="font-oswald text-xl font-semibold mb-2">{option.label}</div>
                    <div className="text-sm text-zinc-600">{option.description}</div>
                    {orderData.clothing_type === option.value && (
                      <div className="mt-3 text-primary font-semibold text-sm">✓ Selected</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Shirt Quality Selection */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                {orderData.clothing_type} Quality <span className="text-red-500">*</span>
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(shirtQualityPrices).map(([quality, price]) => (
                  <button
                    key={quality}
                    type="button"
                    onClick={() => setOrderData({...orderData, shirt_quality: quality})}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      orderData.shirt_quality === quality
                        ? 'border-primary bg-primary/5'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-oswald text-xl font-semibold mb-2">{quality}</div>
                    <div className="text-sm text-zinc-600 mb-3">
                      {quality === 'Standard' && 'Good quality cotton'}
                      {quality === 'Premium' && 'Soft premium cotton'}
                      {quality === 'Luxury' && 'Ultra-soft premium'}
                    </div>
                    <div className="text-primary font-bold text-lg">₦{price.toLocaleString()}</div>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Selected:</span> {orderData.shirt_quality} quality - ₦{shirtPrice.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Print Size Selection */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                Print Size <span className="text-red-500">*</span>
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(printSizePrices).map(([size, price]) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setOrderData({...orderData, print_size: size})}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      orderData.print_size === size
                        ? 'border-primary bg-primary/5'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-oswald text-lg font-semibold">{size}</div>
                    <div className="text-sm text-zinc-600">
                      {size === 'Badge' ? 'Pocket' : `${printSizeDimensions[size].width}% size`}
                    </div>
                    <div className="text-primary font-semibold mt-2">+₦{price.toLocaleString()}</div>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-4 bg-zinc-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-manrope text-sm text-zinc-600">{orderData.clothing_type} ({orderData.shirt_quality})</span>
                  <span className="font-semibold">₦{shirtPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-manrope text-sm text-zinc-600">Print ({orderData.print_size})</span>
                  <span className="font-semibold">₦{printPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="font-manrope font-semibold">Price per Item</span>
                  <span className="text-primary font-bold text-lg">₦{pricePerItem.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Color Selection */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                {orderData.clothing_type} Colors (Optional)
              </h2>
              <p className="text-sm text-zinc-600 mb-4">
                Select the colors you need for your shirts
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'Black', code: '#000000' },
                  { name: 'White', code: '#FFFFFF' },
                  { name: 'Navy Blue', code: '#000080' },
                  { name: 'Royal Blue', code: '#4169E1' },
                  { name: 'Red', code: '#DC143C' },
                  { name: 'Green', code: '#228B22' },
                  { name: 'Yellow', code: '#FFD700' },
                  { name: 'Orange', code: '#FF8C00' },
                  { name: 'Purple', code: '#800080' },
                  { name: 'Pink', code: '#FFC0CB' },
                  { name: 'Grey', code: '#808080' },
                  { name: 'Brown', code: '#8B4513' }
                ].map((color) => {
                  const isSelected = orderData.colors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setOrderData({
                            ...orderData,
                            colors: orderData.colors.filter(c => c !== color.name)
                          });
                        } else {
                          setOrderData({
                            ...orderData,
                            colors: [...orderData.colors, color.name]
                          });
                        }
                      }}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                      data-testid={`color-${color.name.toLowerCase().replace(' ', '-')}`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-zinc-300"
                        style={{ backgroundColor: color.code }}
                      ></div>
                      <span className="text-sm font-medium">{color.name}</span>
                      {isSelected && <span className="ml-auto text-primary">✓</span>}
                    </button>
                  );
                })}
              </div>
              {orderData.colors.length > 0 && (
                <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary font-semibold">
                    {orderData.colors.length} color{orderData.colors.length > 1 ? 's' : ''} selected: {orderData.colors.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Quantity & Size Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                Quantity & Sizes <span className="text-red-500">*</span>
              </h2>
              
              {/* Gender Selection */}
              <div className="mb-6">
                <label className="block font-manrope font-semibold text-sm mb-3">
                  Gender / Fit Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleGenderChange('male')}
                    className={`p-3 rounded-lg border-2 transition-all text-sm ${
                      orderData.gender === 'male'
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Male</div>
                    <div className="text-xs text-zinc-600">S-3XL</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleGenderChange('female')}
                    className={`p-3 rounded-lg border-2 transition-all text-sm ${
                      orderData.gender === 'female'
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Female</div>
                    <div className="text-xs text-zinc-600">8-22</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleGenderChange('unisex')}
                    className={`p-3 rounded-lg border-2 transition-all text-sm ${
                      orderData.gender === 'unisex'
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Unisex</div>
                    <div className="text-xs text-zinc-600">XS-3XL</div>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                {getSizeOptions().map(size => (
                  <div key={size}>
                    <label className="block font-manrope font-semibold text-sm mb-2">{size}</label>
                    <input
                      type="number"
                      min="0"
                      placeholder=""
                      value={orderData.size_breakdown[size] === 0 ? '' : orderData.size_breakdown[size]}
                      onChange={(e) => {
                        const newBreakdown = {...orderData.size_breakdown, [size]: parseInt(e.target.value) || 0};
                        const standardTotal = Object.values(newBreakdown).reduce((sum, val) => sum + val, 0);
                        const customTotal = orderData.custom_sizes.reduce((sum, item) => sum + item.quantity, 0);
                        setOrderData({...orderData, size_breakdown: newBreakdown, quantity: standardTotal + customTotal});
                      }}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                    />
                  </div>
                ))}
              </div>

              {/* Other/Custom Size Option */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowCustomSize(!showCustomSize)}
                  className="text-primary hover:underline font-medium"
                >
                  + Add Custom Size
                </button>
              </div>

              {showCustomSize && (
                <div className="bg-zinc-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block font-manrope font-semibold text-sm mb-2">Custom Size</label>
                      <input
                        type="text"
                        placeholder="e.g., 4XL, Custom"
                        value={customSizeInput.size}
                        onChange={(e) => setCustomSizeInput({...customSizeInput, size: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block font-manrope font-semibold text-sm mb-2">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        placeholder=""
                        value={customSizeInput.quantity}
                        onChange={(e) => setCustomSizeInput({...customSizeInput, quantity: parseInt(e.target.value) || 1})}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (customSizeInput.size.trim()) {
                        const newCustomSizes = [...orderData.custom_sizes, customSizeInput];
                        const standardTotal = Object.values(orderData.size_breakdown).reduce((sum, val) => sum + val, 0);
                        const customTotal = newCustomSizes.reduce((sum, item) => sum + item.quantity, 0);
                        setOrderData({
                          ...orderData,
                          custom_sizes: newCustomSizes,
                          quantity: standardTotal + customTotal
                        });
                        setCustomSizeInput({ size: '', quantity: 1 });
                        setShowCustomSize(false);
                        toast.success('Custom size added');
                      }
                    }}
                    className="btn-primary px-4 py-2"
                  >
                    Add Size
                  </button>
                </div>
              )}

              {/* Display Custom Sizes */}
              {orderData.custom_sizes.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-manrope font-semibold text-sm mb-2">Custom Sizes:</h3>
                  <div className="space-y-2">
                    {orderData.custom_sizes.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-zinc-50 p-3 rounded">
                        <span>{item.size}: {item.quantity} pcs</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newCustomSizes = orderData.custom_sizes.filter((_, i) => i !== index);
                            const standardTotal = Object.values(orderData.size_breakdown).reduce((sum, val) => sum + val, 0);
                            const customTotal = newCustomSizes.reduce((sum, item) => sum + item.quantity, 0);
                            setOrderData({
                              ...orderData,
                              custom_sizes: newCustomSizes,
                              quantity: standardTotal + customTotal
                            });
                          }}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                <span className="font-manrope font-semibold">Total Quantity: {orderData.quantity}</span>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                Delivery <span className="text-red-500">*</span>
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="deliver_to_me"
                    checked={orderData.delivery_option === 'deliver_to_me'}
                    onChange={(e) => setOrderData({...orderData, delivery_option: e.target.value})}
                    className="form-radio text-primary"
                  />
                  <span className="font-manrope">Deliver to me</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="pickup"
                    checked={orderData.delivery_option === 'pickup'}
                    onChange={(e) => setOrderData({...orderData, delivery_option: e.target.value})}
                    className="form-radio text-primary"
                  />
                  <span className="font-manrope">I'll pick up from your office</span>
                </label>
              </div>

              {orderData.delivery_option === 'deliver_to_me' && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block font-manrope font-semibold text-sm mb-2">
                      Recipient Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="recipient-name"
                      type="text"
                      required={orderData.delivery_option === 'deliver_to_me'}
                      value={orderData.recipient_name}
                      onChange={(e) => setOrderData({...orderData, recipient_name: e.target.value})}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-manrope font-semibold text-sm mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="delivery-phone"
                      type="tel"
                      required={orderData.delivery_option === 'deliver_to_me'}
                      value={orderData.delivery_phone}
                      onChange={(e) => setOrderData({...orderData, delivery_phone: e.target.value})}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-manrope font-semibold text-sm mb-2">
                      Delivery Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="delivery-address"
                      required={orderData.delivery_option === 'deliver_to_me'}
                      value={orderData.delivery_address}
                      onChange={(e) => setOrderData({...orderData, delivery_address: e.target.value})}
                      className="w-full"
                      rows="2"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-manrope font-semibold text-sm mb-2">City</label>
                      <input
                        type="text"
                        value={orderData.delivery_city}
                        onChange={(e) => setOrderData({...orderData, delivery_city: e.target.value})}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block font-manrope font-semibold text-sm mb-2">State</label>
                      <input
                        type="text"
                        value={orderData.delivery_state}
                        onChange={(e) => setOrderData({...orderData, delivery_state: e.target.value})}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="font-oswald text-2xl font-bold mb-6">Your Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="pod-customer-name-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="pod-customer-email-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="+234 800 000 0000"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="pod-customer-phone-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Total & Submit */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <span className="font-oswald text-2xl font-semibold">Total</span>
                <span className="font-oswald text-3xl font-bold text-primary">
                  ₦{totalPrice.toLocaleString()}
                </span>
              </div>
              
              <button
                type="submit"
                disabled={loading || !designFile}
                className="btn-primary w-full text-lg py-4"
                data-testid="create-pod-order-btn"
              >
                {loading ? 'Creating Order...' : 'Create Order'}
              </button>

              <p className="text-sm text-zinc-500 mt-4 text-center">
                You'll be redirected to your dashboard after order creation
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PODPage;
