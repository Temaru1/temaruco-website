import React, { useState, useEffect } from 'react';
import { Package, ChevronRight, CheckCircle, ArrowLeft, Star, Crown, Gem } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get full image URL
const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/uploads')) return `${API_URL}${url}`;
  if (url.startsWith('/uploads')) return `${API_URL}/api${url}`;
  return url;
};

// Quality Variants Configuration
const QUALITY_VARIANTS = [
  { 
    id: 'standard', 
    label: 'Standard', 
    description: 'Quality basics for everyday use',
    icon: Star,
    color: 'bg-zinc-100 border-zinc-300 text-zinc-700',
    activeColor: 'bg-zinc-900 border-zinc-900 text-white'
  },
  { 
    id: 'premium', 
    label: 'Premium', 
    description: 'Enhanced quality with better finish',
    icon: Crown,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    activeColor: 'bg-blue-600 border-blue-600 text-white'
  },
  { 
    id: 'luxury', 
    label: 'Luxury', 
    description: 'Top-tier materials and craftsmanship',
    icon: Gem,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    activeColor: 'bg-amber-500 border-amber-500 text-white'
  }
];

const BulkOrdersPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [clothingItems, setClothingItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState('standard');

  const [orderData, setOrderData] = useState({
    quantity: 50,
    print_type: 'none',
    colors: [],
    sizes: {},
    notes: ''
  });

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const PRINT_OPTIONS = [
    { value: 'none', label: 'No Print', price: 0 },
    { value: 'front', label: 'Front Only', price: 300 },
    { value: 'back', label: 'Back Only', price: 300 },
    { value: 'front_back', label: 'Front & Back', price: 500 },
  ];

  const COLORS = ['Black', 'White', 'Navy', 'Red', 'Grey', 'Blue', 'Green', 'Yellow'];
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

  useEffect(() => {
    loadClothingItems();
  }, []);

  const loadClothingItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bulk/clothing-items`);
      setClothingItems(response.data || []);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  // Get price for current variant
  const getVariantPrice = (item) => {
    if (!item) return 0;
    switch (selectedVariant) {
      case 'premium':
        return item.premium_price || item.base_price * 1.5;
      case 'luxury':
        return item.luxury_price || item.base_price * 2;
      default:
        return item.standard_price || item.base_price;
    }
  };

  // Handle item selection - auto navigate to next step
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setSelectedVariant('standard'); // Reset variant on item change
    setTimeout(() => setStep(2), 300);
  };

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const unitPrice = getVariantPrice(selectedItem);
    const printPrice = PRINT_OPTIONS.find(p => p.value === orderData.print_type)?.price || 0;
    const qty = getTotalFromSizes() > 0 ? getTotalFromSizes() : orderData.quantity;
    return (unitPrice + printPrice) * qty;
  };

  const getUnitPrice = () => {
    if (!selectedItem) return 0;
    const basePrice = getVariantPrice(selectedItem);
    const printPrice = PRINT_OPTIONS.find(p => p.value === orderData.print_type)?.price || 0;
    return basePrice + printPrice;
  };

  // Toggle color selection
  const toggleColor = (color) => {
    const newColors = orderData.colors.includes(color)
      ? orderData.colors.filter(c => c !== color)
      : [...orderData.colors, color];
    setOrderData({...orderData, colors: newColors});
  };

  // Update size quantity
  const updateSizeQty = (size, qty) => {
    const newSizes = { ...orderData.sizes };
    if (qty > 0) {
      newSizes[size] = qty;
    } else {
      delete newSizes[size];
    }
    setOrderData({...orderData, sizes: newSizes});
  };

  // Calculate total from sizes
  const getTotalFromSizes = () => {
    return Object.values(orderData.sizes).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
  };

  const handleSubmit = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all contact details');
      return;
    }

    // Navigate to order details page for review and payment
    navigate('/bulk-orders/details', {
      state: {
        orderData: {
          ...orderData,
          quantity: getTotalFromSizes() > 0 ? getTotalFromSizes() : orderData.quantity,
          product_variant: selectedVariant,
          unit_price: getUnitPrice()
        },
        customerInfo,
        selectedItem,
        selectedVariant
      }
    });
  };

  const steps = [
    { num: 1, label: 'Select Item' },
    { num: 2, label: 'Customize' },
    { num: 3, label: 'Contact Info' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Bulk Clothing Orders"
        description="Order bulk clothing for schools, corporates & events. Minimum 50 pieces."
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
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">Bulk Orders</h1>
          <p className="text-zinc-600 mt-2">Custom uniforms for schools, corporates & events</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  step >= s.num ? 'bg-[#D90429] text-white' : 'bg-zinc-200 text-zinc-500'
                }`}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <span className={`ml-2 text-sm hidden sm:inline ${step >= s.num ? 'text-zinc-900' : 'text-zinc-500'}`}>
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-zinc-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Select Item */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900">Select Clothing Item</h2>
            <p className="text-zinc-500">Click on an item to continue</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clothingItems.map((item) => (
                <Card 
                  key={item.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                    selectedItem?.id === item.id ? 'ring-2 ring-[#D90429]' : ''
                  }`}
                  onClick={() => handleItemSelect(item)}
                  data-testid={`bulk-item-${item.id}`}
                >
                  <div className="aspect-square bg-zinc-100 rounded-t-lg overflow-hidden">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = `https://placehold.co/300x300/e2e8f0/64748b?text=${item.name}`; }}
                    />
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-[#D90429] font-semibold">
                      From ₦{(item.standard_price || item.base_price)?.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">3 quality options</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Customize */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900">Customize Your Order</h2>
            
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Selected Item Summary */}
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
                  <img 
                    src={selectedItem?.image_url}
                    alt={selectedItem?.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-semibold">{selectedItem?.name}</p>
                    <p className="text-sm text-zinc-500">Select quality variant below</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setStep(1)}
                    className="ml-auto"
                  >
                    Change Item
                  </Button>
                </div>

                {/* Quality Variant Selector */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-3">
                    Select Quality Variant *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUALITY_VARIANTS.map((variant) => {
                      const Icon = variant.icon;
                      const price = selectedItem ? (
                        variant.id === 'premium' ? selectedItem.premium_price :
                        variant.id === 'luxury' ? selectedItem.luxury_price :
                        selectedItem.standard_price
                      ) || selectedItem.base_price : 0;
                      
                      const isSelected = selectedVariant === variant.id;
                      
                      return (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                            isSelected ? variant.activeColor : variant.color
                          } hover:scale-[1.02]`}
                          data-testid={`variant-${variant.id}`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2">
                              <CheckCircle className="w-6 h-6 text-white bg-green-500 rounded-full" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-5 h-5" />
                            <span className="font-bold">{variant.label}</span>
                          </div>
                          <p className={`text-xs mb-2 ${isSelected ? 'opacity-90' : 'opacity-70'}`}>
                            {variant.description}
                          </p>
                          <p className="text-xl font-bold">
                            ₦{price?.toLocaleString()}
                            <span className="text-xs font-normal opacity-70">/piece</span>
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Quantity or use Size Breakdown below */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Total Quantity (minimum 50) - Or use size breakdown below
                  </label>
                  <input
                    type="number"
                    min="50"
                    value={getTotalFromSizes() > 0 ? getTotalFromSizes() : orderData.quantity}
                    onChange={(e) => setOrderData({...orderData, quantity: Math.max(50, parseInt(e.target.value) || 50)})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    disabled={getTotalFromSizes() > 0}
                  />
                  {getTotalFromSizes() > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">Quantity calculated from size breakdown</p>
                  )}
                </div>

                {/* Print Type */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Print Option
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {PRINT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setOrderData({...orderData, print_type: opt.value})}
                        className={`p-3 border rounded-lg text-left transition-all ${
                          orderData.print_type === opt.value 
                            ? 'border-[#D90429] bg-red-50' 
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-zinc-500">+₦{opt.price}/piece</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Select Colors (click to toggle)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`px-4 py-2 rounded-full text-sm border transition-all ${
                          orderData.colors.includes(color)
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400'
                        }`}
                        data-testid={`color-${color}`}
                      >
                        {orderData.colors.includes(color) && '✓ '}{color}
                      </button>
                    ))}
                  </div>
                  {orderData.colors.length > 0 && (
                    <p className="text-sm text-zinc-500 mt-2">
                      Selected: {orderData.colors.join(', ')}
                    </p>
                  )}
                </div>

                {/* Size Breakdown */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Size Distribution (Total: {getTotalFromSizes()} pieces)
                  </label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                    {SIZES.map((size) => (
                      <div key={size} className="text-center">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">{size}</label>
                        <input
                          type="number"
                          min="0"
                          value={orderData.sizes[size] || ''}
                          onChange={(e) => updateSizeQty(size, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full px-2 py-2 text-center border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                          data-testid={`size-${size}`}
                        />
                      </div>
                    ))}
                  </div>
                  {getTotalFromSizes() > 0 && getTotalFromSizes() < 50 && (
                    <p className="text-sm text-amber-600 mt-2">
                      ⚠️ Minimum order is 50 pieces. Add {50 - getTotalFromSizes()} more.
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Special Instructions (optional)
                  </label>
                  <textarea
                    value={orderData.notes}
                    onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    placeholder="Any specific requirements..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Summary with Variant */}
            <Card className="bg-zinc-900 text-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-zinc-400 text-sm">Quality:</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedVariant === 'luxury' ? 'bg-amber-500' :
                        selectedVariant === 'premium' ? 'bg-blue-500' : 'bg-zinc-600'
                      }`}>
                        {selectedVariant.charAt(0).toUpperCase() + selectedVariant.slice(1)}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      Unit Price: ₦{getUnitPrice().toLocaleString()}
                    </p>
                    <p className="text-zinc-400 text-sm">
                      Quantity: {getTotalFromSizes() > 0 ? getTotalFromSizes() : orderData.quantity} pieces
                    </p>
                    <p className="text-3xl font-bold mt-2">₦{calculateTotal().toLocaleString()}</p>
                  </div>
                  <Package className="w-12 h-12 text-zinc-600" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => setStep(3)}
                className="bg-[#D90429] hover:bg-[#B90322]"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900">Contact Information</h2>
            
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    placeholder="+234..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Final Summary with Variant */}
            <Card className="bg-zinc-900 text-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Item</span>
                    <span>{selectedItem?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Quality</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      selectedVariant === 'luxury' ? 'bg-amber-500' :
                      selectedVariant === 'premium' ? 'bg-blue-500' : 'bg-zinc-600'
                    }`}>
                      {selectedVariant.charAt(0).toUpperCase() + selectedVariant.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Unit Price</span>
                    <span>₦{getUnitPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Quantity</span>
                    <span>{getTotalFromSizes() > 0 ? getTotalFromSizes() : orderData.quantity} pieces</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Print</span>
                    <span>{PRINT_OPTIONS.find(p => p.value === orderData.print_type)?.label}</span>
                  </div>
                  {orderData.colors.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Colors</span>
                      <span>{orderData.colors.join(', ')}</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-700 my-3"></div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₦{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handleSubmit}
                className="bg-[#D90429] hover:bg-[#B90322]"
              >
                Review Order <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOrdersPage;
