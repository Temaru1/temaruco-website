import React, { useState, useEffect } from 'react';
import { Package, ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BulkOrdersPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clothingItems, setClothingItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

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

  // Handle item selection - auto navigate to next step
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    // Auto navigate to customize step
    setTimeout(() => setStep(2), 300);
  };

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const basePrice = selectedItem.base_price || 0;
    const printPrice = PRINT_OPTIONS.find(p => p.value === orderData.print_type)?.price || 0;
    return (basePrice + printPrice) * orderData.quantity;
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

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/orders/bulk`, {
        clothing_item: selectedItem.name,
        quantity: orderData.quantity,
        print_type: orderData.print_type,
        colors: orderData.colors,
        notes: orderData.notes,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total_price: calculateTotal()
      });

      toast.success('Order placed successfully!');
      navigate(`/order-summary/${response.data.order_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clothingItems.map((item) => (
                <Card 
                  key={item.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedItem?.id === item.id ? 'ring-2 ring-[#D90429]' : ''
                  }`}
                  onClick={() => setSelectedItem(item)}
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
                    <p className="text-[#D90429] font-semibold">₦{item.base_price?.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {selectedItem && (
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setStep(2)}
                  className="bg-[#D90429] hover:bg-[#B90322]"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
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
                    <p className="text-sm text-zinc-500">₦{selectedItem?.base_price?.toLocaleString()} per piece</p>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Quantity (minimum 50)
                  </label>
                  <input
                    type="number"
                    min="50"
                    value={orderData.quantity}
                    onChange={(e) => setOrderData({...orderData, quantity: Math.max(50, parseInt(e.target.value) || 50)})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                  />
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
                    Select Colors
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          const newColors = orderData.colors.includes(color)
                            ? orderData.colors.filter(c => c !== color)
                            : [...orderData.colors, color];
                          setOrderData({...orderData, colors: newColors});
                        }}
                        className={`px-4 py-2 rounded-full text-sm border transition-all ${
                          orderData.colors.includes(color)
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
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

            {/* Order Summary */}
            <Card className="bg-zinc-900 text-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-zinc-400 text-sm">Estimated Total</p>
                    <p className="text-3xl font-bold">₦{calculateTotal().toLocaleString()}</p>
                    <p className="text-zinc-400 text-sm mt-1">{orderData.quantity} pieces × ₦{((calculateTotal() / orderData.quantity) || 0).toLocaleString()}</p>
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

            {/* Final Summary */}
            <Card className="bg-zinc-900 text-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Item</span>
                    <span>{selectedItem?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Quantity</span>
                    <span>{orderData.quantity} pieces</span>
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
                disabled={loading}
                className="bg-[#D90429] hover:bg-[#B90322]"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOrdersPage;
