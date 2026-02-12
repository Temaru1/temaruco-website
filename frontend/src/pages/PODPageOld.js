import React, { useState, useRef, useEffect } from 'react';
import { Upload, Move, Plus, Trash2, X } from 'lucide-react';
import { createPODOrder, getPricing } from '../utils/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PODPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [designFile, setDesignFile] = useState(null);
  const [designPreview, setDesignPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [designPosition, setDesignPosition] = useState({ x: 50, y: 30 });
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

  // Available clothing items with images and prices
  const [availableClothingItems, setAvailableClothingItems] = useState([
    { 
      id: 'tshirt', 
      name: 'T-Shirt', 
      basePrice: 2000,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
      description: 'Classic short sleeve'
    },
    { 
      id: 'polo', 
      name: 'Polo Shirt', 
      basePrice: 2500,
      image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&q=80',
      description: 'Collared with buttons'
    },
    { 
      id: 'hoodie', 
      name: 'Hoodie', 
      basePrice: 4500,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
      description: 'With hood and pocket'
    },
    { 
      id: 'joggers', 
      name: 'Joggers', 
      basePrice: 3500,
      image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80',
      description: 'Comfortable track pants'
    },
    { 
      id: 'varsity', 
      name: 'Varsity Jacket', 
      basePrice: 8000,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
      description: 'Classic sporty jacket'
    },
  ]);

  // Multi-item order state - each item has its own variations
  const [selectedItems, setSelectedItems] = useState([]);

  const [deliveryOption, setDeliveryOption] = useState('deliver_to_me');
  const [deliveryInfo, setDeliveryInfo] = useState({
    recipient_name: '',
    delivery_phone: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_notes: ''
  });

  // Fetch dynamic pricing on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await getPricing();
        setPrintSizePrices(response.data.pod_print_prices);
        setShirtQualityPrices(response.data.pod_shirt_quality_prices);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      }
    };
    fetchPricing();
  }, []);

  // Fetch clothing items from API
  useEffect(() => {
    const fetchClothingItems = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/pod/clothing-items`);
        if (response.data && response.data.length > 0) {
          const formattedItems = response.data.map(item => ({
            id: item.id,
            name: item.name,
            basePrice: item.base_price,
            image: item.image_url,
            description: item.description || ''
          }));
          setAvailableClothingItems(formattedItems);
        }
      } catch (error) {
        console.error('Failed to fetch clothing items:', error);
        // Keep default items if fetch fails
      }
    };
    fetchClothingItems();
  }, []);

  // Print size dimensions
  const printSizeDimensions = {
    'Badge': { width: 15, height: 15 },
    'A4': { width: 25, height: 30 },
    'A3': { width: 35, height: 40 },
    'A2': { width: 45, height: 50 },
    'A1': { width: 55, height: 60 }
  };

  // Get size options based on gender
  const getSizeOptions = (gender) => {
    if (gender === 'female') {
      return ['8', '10', '12', '14', '16', '18', '20', '22', 'Other'];
    } else if (gender === 'male') {
      return ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Other'];
    } else {
      return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Other'];
    }
  };

  // Color options
  const colorOptions = [
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
  ];

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    const item = availableClothingItems.find(i => i.id === itemId);
    if (selectedItems.find(si => si.itemId === itemId)) {
      setSelectedItems(selectedItems.filter(si => si.itemId !== itemId));
    } else {
      setSelectedItems([...selectedItems, {
        itemId: itemId,
        itemName: item.name,
        itemPrice: item.basePrice,
        itemImage: item.image,
        gender: 'male',
        sizes: [], // Array of {size, color, quantity, customSize}
        printSize: 'A4',
        quality: 'Standard'
      }]);
    }
  };

  // Add a size/color/quantity combination to an item
  const addSizeToItem = (itemId) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.itemId === itemId) {
        return {
          ...item,
          sizes: [...item.sizes, { size: '', color: '', quantity: '', customSize: '' }]
        };
      }
      return item;
    }));
  };

  // Update a specific size entry
  const updateSizeEntry = (itemId, sizeIndex, field, value) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.itemId === itemId) {
        const newSizes = [...item.sizes];
        newSizes[sizeIndex] = { ...newSizes[sizeIndex], [field]: value };
        return { ...item, sizes: newSizes };
      }
      return item;
    }));
  };

  // Remove a size entry
  const removeSizeEntry = (itemId, sizeIndex) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.itemId === itemId) {
        return {
          ...item,
          sizes: item.sizes.filter((_, idx) => idx !== sizeIndex)
        };
      }
      return item;
    }));
  };

  // Update item-level properties
  const updateItemProperty = (itemId, property, value) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.itemId === itemId) {
        return { ...item, [property]: value };
      }
      return item;
    }));
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    let total = 0;
    selectedItems.forEach(item => {
      const itemBasePrice = item.itemPrice || 2000;
      const qualityMultiplier = item.quality === 'Luxury' ? 1.75 : item.quality === 'Premium' ? 1.4 : 1;
      const printPrice = printSizePrices[item.printSize] || 800;
      
      item.sizes.forEach(sizeEntry => {
        const qty = parseInt(sizeEntry.quantity) || 0;
        const itemPrice = (itemBasePrice * qualityMultiplier) + printPrice;
        total += itemPrice * qty;
      });
    });
    return total;
  };

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
        toast.success('Design uploaded! Adjust position below.');
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
    
    setDesignPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
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

    if (selectedItems.length === 0) {
      toast.error('Please select at least one clothing item');
      return;
    }

    if (!designFile) {
      toast.error('Please upload your design');
      return;
    }

    // Validate each item has at least one size entry
    for (const item of selectedItems) {
      if (item.sizes.length === 0 || !item.sizes.some(s => s.quantity && parseInt(s.quantity) > 0)) {
        toast.error(`Please add size/color/quantity for ${item.itemName}`);
        return;
      }
    }

    if (deliveryOption === 'deliver_to_me') {
      if (!deliveryInfo.recipient_name || !deliveryInfo.delivery_phone || !deliveryInfo.delivery_address) {
        toast.error('Please fill in delivery information');
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const orderData = {
        items: selectedItems,
        design_position: designPosition,
        delivery_option: deliveryOption,
        ...deliveryInfo
      };
      
      formData.append('order_data', JSON.stringify(orderData));
      formData.append('design_file', designFile);
      formData.append('customer_name', customerInfo.name);
      formData.append('customer_email', customerInfo.email);
      formData.append('customer_phone', customerInfo.phone);

      const response = await createPODOrder(formData);
      toast.success('POD order created successfully! Redirecting to payment...');
      
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

  const totalPrice = calculateTotalPrice();
  const totalQuantity = selectedItems.reduce((sum, item) => {
    return sum + item.sizes.reduce((itemSum, s) => itemSum + (parseInt(s.quantity) || 0), 0);
  }, 0);

  return (
    <div className="min-h-screen py-8 md:py-16 px-4 bg-zinc-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-oswald text-4xl md:text-5xl font-bold uppercase mb-4" data-testid="pod-title">
          Print-On-Demand
        </h1>
        <p className="font-manrope text-base md:text-lg text-zinc-600 mb-8">
          Select multiple items, upload your design, and customize each item independently
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Clothing Items */}
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="font-oswald text-2xl font-semibold mb-6">
              1. Select Clothing Items <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              Choose one or more items for your order. Each item can have different sizes and colors.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableClothingItems.map((item) => {
                const isSelected = selectedItems.find(si => si.itemId === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-primary border-primary' : 'bg-white border-zinc-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Item Image */}
                    <div className="aspect-square overflow-hidden bg-zinc-100">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Item Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-sm text-zinc-600 mb-2">{item.description}</p>
                      <p className="text-primary font-bold">From ₦{item.basePrice.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedItems.length === 0 && (
              <p className="text-center text-zinc-500 mt-4 text-sm">
                No items selected yet. Click on items above to add them to your order.
              </p>
            )}
          </div>

          {/* Step 2: Upload Design */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                2. Upload Your Design <span className="text-red-500">*</span>
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Design Preview */}
                <div>
                  <h3 className="font-semibold mb-4">Design Preview</h3>
                  <div className="relative bg-zinc-100 rounded-lg overflow-hidden" style={{ aspectRatio: '3/4' }}>
                    <img 
                      src={selectedItems[0]?.itemImage || availableClothingItems[0].image}
                      alt="Item Preview"
                      className="w-full h-full object-cover"
                    />
                    
                    {designPreview && (
                      <div
                        ref={dragRef}
                        onMouseDown={handleMouseDown}
                        style={{
                          position: 'absolute',
                          left: `${designPosition.x}%`,
                          top: `${designPosition.y}%`,
                          width: `${printSizeDimensions[selectedItems[0]?.printSize || 'A4'].width}%`,
                          height: `${printSizeDimensions[selectedItems[0]?.printSize || 'A4'].height}%`,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          border: '2px dashed #D90429',
                          padding: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          transition: isDragging ? 'none' : 'all 0.2s',
                          transform: 'translate(-50%, -50%)'
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
                      <span>Drag your design to reposition</span>
                    </div>
                  )}
                </div>

                {/* Upload Interface */}
                <div>
                  <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <Upload className="mx-auto text-zinc-400 mb-4" size={48} />
                    <label className="cursor-pointer">
                      <span className="btn-primary inline-block">
                        {designFile ? 'Change Design' : 'Upload Design File'}
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
              </div>
            </div>
          )}

          {/* Step 3: Configure Each Item */}
          {selectedItems.map((item, itemIndex) => (
            <div key={item.itemId} className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={item.itemImage} 
                    alt={item.itemName}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <h2 className="font-oswald text-2xl font-semibold">
                      {itemIndex + 3}. {item.itemName}
                    </h2>
                    <p className="text-sm text-zinc-600">Configure variations for this item</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleItemSelection(item.itemId)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove item"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Item-level Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-zinc-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-semibold mb-2">Gender / Fit</label>
                  <select
                    value={item.gender}
                    onChange={(e) => updateItemProperty(item.itemId, 'gender', e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Fabric Quality</label>
                  <select
                    value={item.quality}
                    onChange={(e) => updateItemProperty(item.itemId, 'quality', e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium (+40%)</option>
                    <option value="Luxury">Luxury (+75%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Print Size</label>
                  <select
                    value={item.printSize}
                    onChange={(e) => updateItemProperty(item.itemId, 'printSize', e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="Badge">Badge (₦{printSizePrices.Badge})</option>
                    <option value="A4">A4 (₦{printSizePrices.A4})</option>
                    <option value="A3">A3 (₦{printSizePrices.A3})</option>
                    <option value="A2">A2 (₦{printSizePrices.A2})</option>
                    <option value="A1">A1 (₦{printSizePrices.A1})</option>
                  </select>
                </div>
              </div>

              {/* Size/Color/Quantity Matrix */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold">
                    Size, Color & Quantity <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => addSizeToItem(item.itemId)}
                    className="btn-outline text-sm flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Size/Color
                  </button>
                </div>

                {item.sizes.length === 0 && (
                  <p className="text-center text-zinc-500 py-4 text-sm">
                    Click "Add Size/Color" to add variations
                  </p>
                )}

                <div className="space-y-3">
                  {item.sizes.map((sizeEntry, sizeIndex) => (
                    <div key={sizeIndex} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border border-zinc-200 rounded-lg">
                      {/* Size Dropdown */}
                      <div className="md:col-span-3">
                        <label className="block text-xs text-zinc-600 mb-1">Size</label>
                        <select
                          value={sizeEntry.size}
                          onChange={(e) => updateSizeEntry(item.itemId, sizeIndex, 'size', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        >
                          <option value="">Select size</option>
                          {getSizeOptions(item.gender).map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Size Input (if "Other" selected) */}
                      {sizeEntry.size === 'Other' && (
                        <div className="md:col-span-3">
                          <label className="block text-xs text-zinc-600 mb-1">Custom Size</label>
                          <input
                            type="text"
                            value={sizeEntry.customSize || ''}
                            onChange={(e) => updateSizeEntry(item.itemId, sizeIndex, 'customSize', e.target.value)}
                            placeholder="Enter size (e.g., 42, XL+)"
                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            required
                          />
                        </div>
                      )}

                      {/* Color Dropdown */}
                      <div className={sizeEntry.size === 'Other' ? 'md:col-span-3' : 'md:col-span-4'}>
                        <label className="block text-xs text-zinc-600 mb-1">Color</label>
                        <select
                          value={sizeEntry.color}
                          onChange={(e) => updateSizeEntry(item.itemId, sizeIndex, 'color', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        >
                          <option value="">Select color</option>
                          {colorOptions.map(color => (
                            <option key={color.name} value={color.name}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className={sizeEntry.size === 'Other' ? 'md:col-span-2' : 'md:col-span-4'}>
                        <label className="block text-xs text-zinc-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={sizeEntry.quantity}
                          onChange={(e) => updateSizeEntry(item.itemId, sizeIndex, 'quantity', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="md:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeSizeEntry(item.itemId, sizeIndex)}
                          className="w-full md:w-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Remove"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Step 4: Delivery Information */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                {selectedItems.length + 3}. Delivery Information
              </h2>

              <div className="mb-6">
                <label className="block font-semibold text-sm mb-3">Delivery Option <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDeliveryOption('deliver_to_me')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      deliveryOption === 'deliver_to_me'
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Deliver to Me</div>
                    <div className="text-sm text-zinc-600">We'll deliver to your address</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setDeliveryOption('pickup')}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      deliveryOption === 'pickup'
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">Pickup</div>
                    <div className="text-sm text-zinc-600">I'll pick up from your location</div>
                  </button>
                </div>
              </div>

              {deliveryOption === 'deliver_to_me' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Recipient Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={deliveryInfo.recipient_name}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, recipient_name: e.target.value})}
                      className="w-full"
                      placeholder="Full name"
                      required={deliveryOption === 'deliver_to_me'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Delivery Phone <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={deliveryInfo.delivery_phone}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, delivery_phone: e.target.value})}
                      className="w-full"
                      placeholder="+234 800 000 0000"
                      required={deliveryOption === 'deliver_to_me'}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Delivery Address <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={deliveryInfo.delivery_address}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, delivery_address: e.target.value})}
                      className="w-full"
                      placeholder="Street address"
                      required={deliveryOption === 'deliver_to_me'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">City</label>
                    <input
                      type="text"
                      value={deliveryInfo.delivery_city}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, delivery_city: e.target.value})}
                      className="w-full"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">State</label>
                    <input
                      type="text"
                      value={deliveryInfo.delivery_state}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, delivery_state: e.target.value})}
                      className="w-full"
                      placeholder="State"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Delivery Notes (Optional)</label>
                    <textarea
                      rows="3"
                      value={deliveryInfo.delivery_notes}
                      onChange={(e) => setDeliveryInfo({...deliveryInfo, delivery_notes: e.target.value})}
                      className="w-full"
                      placeholder="Special delivery instructions..."
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Customer Information */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">
                {selectedItems.length + 4}. Your Contact Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    placeholder="john@example.com"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="+234 800 000 0000"
                    className="w-full"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Order Summary & Submit */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="font-oswald text-2xl font-semibold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {selectedItems.map(item => {
                  const itemTotal = item.sizes.reduce((sum, s) => {
                    const qty = parseInt(s.quantity) || 0;
                    const qualityMultiplier = item.quality === 'Luxury' ? 1.75 : item.quality === 'Premium' ? 1.4 : 1;
                    const printPrice = printSizePrices[item.printSize] || 800;
                    const itemPrice = (item.itemPrice * qualityMultiplier) + printPrice;
                    return sum + (itemPrice * qty);
                  }, 0);

                  return (
                    <div key={item.itemId} className="flex items-start gap-4 p-4 bg-zinc-50 rounded-lg">
                      <img src={item.itemImage} alt={item.itemName} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.itemName}</h3>
                        <p className="text-sm text-zinc-600">{item.quality} Quality, {item.printSize} Print</p>
                        <div className="text-xs text-zinc-500 mt-1">
                          {item.sizes.map((s, idx) => (
                            <div key={idx}>
                              {s.size === 'Other' ? s.customSize : s.size} - {s.color} × {s.quantity}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₦{itemTotal.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">
                          {item.sizes.reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0)} items
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total Quantity:</span>
                  <span className="font-bold">{totalQuantity} items</span>
                </div>
                <div className="flex justify-between items-center text-2xl mt-2">
                  <span className="font-oswald font-bold">Total Amount:</span>
                  <span className="font-oswald font-bold text-primary">₦{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || selectedItems.length === 0}
                className="btn-primary w-full text-lg py-4"
                data-testid="submit-pod-order"
              >
                {loading ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PODPage;
