import React, { useState, useEffect } from 'react';
import { Upload, ArrowLeft, ChevronRight, CheckCircle, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PODPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clothingItems, setClothingItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [designImage, setDesignImage] = useState(null);
  const [designPreview, setDesignPreview] = useState(null);

  const [orderData, setOrderData] = useState({
    quantity: 1,
    print_placement: 'front',
    color: 'White',
    size: 'M',
    notes: ''
  });

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const PRINT_PLACEMENTS = [
    { value: 'front', label: 'Front Only', price: 500 },
    { value: 'back', label: 'Back Only', price: 500 },
    { value: 'front_back', label: 'Front & Back', price: 800 },
  ];

  const COLORS = ['White', 'Black', 'Navy', 'Grey', 'Red', 'Blue'];
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  useEffect(() => {
    loadClothingItems();
  }, []);

  const loadClothingItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pod/clothing-items`);
      setClothingItems(response.data || []);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setDesignImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setDesignPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    const basePrice = selectedItem.base_price || 0;
    const printPrice = PRINT_PLACEMENTS.find(p => p.value === orderData.print_placement)?.price || 0;
    return (basePrice + printPrice) * orderData.quantity;
  };

  const handleSubmit = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all contact details');
      return;
    }

    setLoading(true);
    try {
      // Upload design image first if exists
      let designUrl = null;
      if (designImage) {
        const formData = new FormData();
        formData.append('file', designImage);
        const uploadRes = await axios.post(`${API_URL}/api/upload`, formData);
        designUrl = uploadRes.data.url;
      }

      const response = await axios.post(`${API_URL}/api/orders/pod`, {
        clothing_item: selectedItem.name,
        quantity: orderData.quantity,
        print_placement: orderData.print_placement,
        color: orderData.color,
        size: orderData.size,
        design_url: designUrl,
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
    { num: 2, label: 'Upload Design' },
    { num: 3, label: 'Customize' },
    { num: 4, label: 'Checkout' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Print on Demand"
        description="Upload your design, we print it on premium clothing."
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
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">Print on Demand</h1>
          <p className="text-zinc-600 mt-2">Upload your design, we print it on premium clothing</p>
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
                  <ChevronRight className="w-5 h-5 text-zinc-300 mx-2 md:mx-4" />
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

        {/* Step 2: Upload Design */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900">Upload Your Design</h2>
            
            <Card>
              <CardContent className="p-8">
                {!designPreview ? (
                  <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer hover:border-[#D90429] transition-colors">
                    <Upload className="w-12 h-12 text-zinc-400 mb-4" />
                    <p className="text-zinc-600 font-medium">Click to upload your design</p>
                    <p className="text-zinc-400 text-sm mt-2">PNG, JPG up to 5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <img
                      src={designPreview}
                      alt="Design preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      onClick={() => { setDesignImage(null); setDesignPreview(null); }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-sm text-zinc-500 text-center">
              You can skip this step if you want to discuss your design later
            </p>

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

        {/* Step 3: Customize */}
        {step === 3 && (
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
                  <div className="flex-1">
                    <p className="font-semibold">{selectedItem?.name}</p>
                    <p className="text-sm text-zinc-500">₦{selectedItem?.base_price?.toLocaleString()} base price</p>
                  </div>
                  {designPreview && (
                    <img src={designPreview} alt="Design" className="w-12 h-12 rounded object-cover" />
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={orderData.quantity}
                    onChange={(e) => setOrderData({...orderData, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                  />
                </div>

                {/* Print Placement */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Print Placement</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PRINT_PLACEMENTS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setOrderData({...orderData, print_placement: opt.value})}
                        className={`p-3 border rounded-lg text-center transition-all ${
                          orderData.print_placement === opt.value 
                            ? 'border-[#D90429] bg-red-50' 
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-zinc-500">+₦{opt.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color & Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Color</label>
                    <select
                      value={orderData.color}
                      onChange={(e) => setOrderData({...orderData, color: e.target.value})}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    >
                      {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Size</label>
                    <select
                      value={orderData.size}
                      onChange={(e) => setOrderData({...orderData, size: e.target.value})}
                      className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    >
                      {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Special Instructions</label>
                  <textarea
                    value={orderData.notes}
                    onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
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
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => setStep(4)}
                className="bg-[#D90429] hover:bg-[#B90322]"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Checkout */}
        {step === 4 && (
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
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]"
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
                    <span>{orderData.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Print</span>
                    <span>{PRINT_PLACEMENTS.find(p => p.value === orderData.print_placement)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Color / Size</span>
                    <span>{orderData.color} / {orderData.size}</span>
                  </div>
                  <div className="border-t border-zinc-700 my-3"></div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₦{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
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

export default PODPage;
