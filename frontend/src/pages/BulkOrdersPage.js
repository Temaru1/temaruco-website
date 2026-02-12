import React, { useState, useEffect, useRef } from 'react';
import { Upload, Package, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BulkOrdersPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [settings, setSettings] = useState(null);
  const [designImage, setDesignImage] = useState(null);
  const variationsRef = useRef(null);

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [orderData, setOrderData] = useState({
    clothing_item: '',
    quantity: 50,
    print_type: 'none',
    fabric_quality: '',
    color_quantities: {}, // {color: quantity}
    size_breakdown: {},
    design_image: null,
    notes: ''
  });

  const [fabricQualities, setFabricQualities] = useState([]);

  const COLOR_OPTIONS = [
    'Black', 'White', 'Red', 'Blue', 'Navy', 'Green', 'Yellow', 
    'Orange', 'Purple', 'Pink', 'Grey', 'Brown', 'Beige', 'Maroon'
  ];

  const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/settings`, {
        withCredentials: true
      });
      setSettings(response.data);
      
      // Set first item as default if available
      if (response.data.bulk_clothing_items?.length > 0) {
        setOrderData(prev => ({
          ...prev,
          clothing_item: response.data.bulk_clothing_items[0].name
        }));
      }

      // Load fabric qualities (public endpoint)
      const fabricResponse = await axios.get(`${API_URL}/api/fabric-qualities`);
      setFabricQualities(fabricResponse.data);
      
      // Set first fabric quality as default
      if (fabricResponse.data.length > 0) {
        setOrderData(prev => ({
          ...prev,
          fabric_quality: fabricResponse.data[0].name
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults
      setSettings({
        fabric_quality_prices: { standard: 0, premium: 500, luxury: 1000 },
        bulk_print_costs: { none: 0, front: 500, front_back: 800, embroidery: 1200 },
        bulk_clothing_items: [
          { name: 'T-Shirt', base_price: 1500, image_url: '' },
          { name: 'Hoodie', base_price: 4500, image_url: '' },
          { name: 'Joggers', base_price: 3500, image_url: '' }
        ]
      });
      
      // Set default fabric qualities
      setFabricQualities([
        { id: '1', clothing_item: 'default', name: 'Standard', price: 2000 },
        { id: '2', clothing_item: 'default', name: 'Premium', price: 4000 },
        { id: '3', clothing_item: 'default', name: 'Heavyweight', price: 6000 }
      ]);
      
      setOrderData(prev => ({ ...prev, fabric_quality: 'Standard' }));
    }
  };

  const handleClothingItemSelect = (itemName) => {
    setOrderData({ ...orderData, clothing_item: itemName });
    
    // Scroll to variations section
    setTimeout(() => {
      if (variationsRef.current) {
        variationsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleColorQuantityChange = (color, quantity) => {
    const newColorQty = { ...orderData.color_quantities };
    
    if (quantity > 0) {
      newColorQty[color] = parseInt(quantity) || 0;
    } else {
      delete newColorQty[color];
    }
    
    setOrderData({ ...orderData, color_quantities: newColorQty });
  };

  const getTotalColorQuantity = () => {
    return Object.values(orderData.color_quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const handleSizeQuantityChange = (size, quantity) => {
    setOrderData({
      ...orderData,
      size_breakdown: {
        ...orderData.size_breakdown,
        [size]: parseInt(quantity) || 0
      }
    });
  };

  const getTotalSizeQuantity = () => {
    return Object.values(orderData.size_breakdown).reduce((sum, qty) => sum + qty, 0);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDesignImage(file);
      setOrderData({ ...orderData, design_image: file });
    }
  };

  const handleCalculateQuote = async () => {
    // Validation
    if (!orderData.clothing_item) {
      toast.error('Please select a clothing item');
      return;
    }

    if (!orderData.fabric_quality) {
      toast.error('Please select a fabric quality');
      return;
    }

    if (orderData.quantity < 50) {
      toast.error('Minimum bulk order quantity is 50');
      return;
    }

    const totalColorQty = getTotalColorQuantity();
    if (totalColorQty === 0) {
      toast.error('Please add at least one color with quantity');
      return;
    }

    if (totalColorQty !== orderData.quantity) {
      toast.error(`Total color quantities (${totalColorQty}) must equal total quantity (${orderData.quantity})`);
      return;
    }

    const totalSizeQty = getTotalSizeQuantity();
    if (totalSizeQty !== orderData.quantity) {
      toast.error(`Total size quantities (${totalSizeQty}) must equal total quantity (${orderData.quantity})`);
      return;
    }

    setLoading(true);
    try {
      // Call backend to calculate quote using new pricing logic
      const response = await axios.post(`${API_URL}/api/quote/calculate`, {
        clothing_item: orderData.clothing_item,
        quantity: orderData.quantity,
        print_type: orderData.print_type,
        fabric_quality: orderData.fabric_quality
      });

      const breakdown = response.data.breakdown;
      
      setQuote({
        unit_price: breakdown.price_per_item,
        total_price: breakdown.total_price,
        fabric_quality: orderData.fabric_quality,
        breakdown: breakdown,
        clothing_type: orderData.clothing_item,
        quantity: orderData.quantity,
        print_type: orderData.print_type,
        colors: Object.entries(orderData.color_quantities).map(([color, quantity]) => ({ color, quantity })),
        sizes: Object.entries(orderData.size_breakdown).map(([size, quantity]) => ({ size, quantity }))
      });
      setStep(2);
    } catch (error) {
      toast.error('Failed to calculate quote');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToCustomerInfo = () => {
    setStep(3);
  };

  const handleSubmitOrder = async () => {
    // Validate customer info
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all customer information');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      const orderPayload = {
        clothing_item: orderData.clothing_item,
        quantity: orderData.quantity,
        color_quantities: orderData.color_quantities,
        size_breakdown: orderData.size_breakdown,
        print_type: orderData.print_type,
        fabric_quality: orderData.fabric_quality,
        notes: orderData.notes,
        quote: quote
      };
      
      formData.append('order_data', JSON.stringify(orderPayload));
      formData.append('customer_name', customerInfo.name);
      formData.append('customer_email', customerInfo.email);
      formData.append('customer_phone', customerInfo.phone);
      
      if (designImage) {
        formData.append('design_file', designImage);
      }

      const response = await axios.post(
        `${API_URL}/api/orders/bulk`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      const orderId = response.data.order_id || response.data.id;
      toast.success('Order created successfully!');
      
      // Redirect to order summary page
      navigate(`/order-summary/${orderId}`);
    } catch (error) {
      console.error('Order submission error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedItemImage = () => {
    if (!settings || !orderData.clothing_item) return null;
    const item = settings.bulk_clothing_items.find(i => i.name === orderData.clothing_item);
    return item?.image_url ? `${API_URL}${item.image_url}` : null;
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-oswald text-5xl font-bold uppercase mb-4" data-testid="bulk-orders-title">
          Bulk Orders
        </h1>
        <p className="font-manrope text-lg text-zinc-600 mb-2">
          Minimum Order: 50 pieces
        </p>
        <p className="font-manrope text-zinc-600 mb-8">
          Perfect for schools, corporate events, sports teams, and organizations
        </p>

        {step === 1 && (
          <div className="space-y-8">
            {/* Clothing Item Selection */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="font-oswald text-2xl font-bold mb-6">Select Clothing Item</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {settings.bulk_clothing_items.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleClothingItemSelect(item.name)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      orderData.clothing_item === item.name
                        ? 'border-primary bg-primary/5'
                        : 'border-zinc-300 hover:border-primary'
                    }`}
                    data-testid={`clothing-item-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    {item.image_url && (
                      <img
                        src={`${API_URL}${item.image_url}`}
                        alt={item.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <p className="font-semibold text-center">{item.name}</p>
                    <p className="text-sm text-zinc-600 text-center">From ₦{item.base_price?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Variations Section - Shows after selection */}
            {orderData.clothing_item && (
              <div ref={variationsRef} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
                <h2 className="font-oswald text-2xl font-bold mb-6">Order Details</h2>

                {/* Selected Item Image */}
                {getSelectedItemImage() && (
                  <div className="mb-6">
                    <img
                      src={getSelectedItemImage()}
                      alt={orderData.clothing_item}
                      className="h-48 object-cover rounded-lg mx-auto"
                    />
                  </div>
                )}

                {/* Total Quantity */}
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Total Quantity (Minimum 50) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="50"
                    value={orderData.quantity}
                    onChange={(e) => setOrderData({ ...orderData, quantity: parseInt(e.target.value) || 50 })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                    data-testid="total-quantity"
                  />
                  {orderData.quantity < 50 && (
                    <p className="text-red-500 text-sm mt-1">Minimum quantity is 50</p>
                  )}
                </div>

                {/* Colors with Quantities */}
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Colors & Quantities <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-zinc-600 mb-3">
                    Enter quantity for each color (Total must equal {orderData.quantity})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COLOR_OPTIONS.map(color => (
                      <div key={color} className="flex items-center gap-2">
                        <label className="flex-1 text-sm font-medium">{color}</label>
                        <input
                          type="number"
                          min="0"
                          value={orderData.color_quantities[color] || ''}
                          onChange={(e) => handleColorQuantityChange(color, e.target.value)}
                          placeholder="Qty"
                          className="w-20 px-2 py-2 border border-zinc-300 rounded text-center"
                          data-testid={`color-qty-${color.toLowerCase()}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm">
                    <span className={getTotalColorQuantity() === orderData.quantity ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                      Total: {getTotalColorQuantity()} / {orderData.quantity}
                    </span>
                  </div>
                </div>

                {/* Size Breakdown */}
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Size Breakdown <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-zinc-600 mb-3">
                    Enter quantity for each size (Total must equal {orderData.quantity})
                  </p>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                    {SIZE_OPTIONS.map(size => (
                      <div key={size}>
                        <label className="block text-xs text-zinc-600 mb-1 text-center">{size}</label>
                        <input
                          type="number"
                          min="0"
                          value={orderData.size_breakdown[size] || ''}
                          onChange={(e) => handleSizeQuantityChange(size, e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-2 border border-zinc-300 rounded text-center"
                          data-testid={`size-qty-${size.toLowerCase()}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm">
                    <span className={getTotalSizeQuantity() === orderData.quantity ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                      Total: {getTotalSizeQuantity()} / {orderData.quantity}
                    </span>
                  </div>
                </div>

                {/* Fabric Quality */}
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Fabric Quality <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={orderData.fabric_quality}
                    onChange={(e) => setOrderData({ ...orderData, fabric_quality: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                    data-testid="fabric-quality"
                    required
                  >
                    <option value="">Select fabric quality...</option>
                    {fabricQualities.map((quality) => (
                      <option key={quality.id} value={quality.name}>
                        {quality.name} — ₦{quality.price?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {!orderData.fabric_quality && (
                    <p className="text-xs text-red-500 mt-1">Please select a fabric quality</p>
                  )}
                </div>

                {/* Print Type */}
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Print/Embroidery Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={orderData.print_type}
                    onChange={(e) => setOrderData({ ...orderData, print_type: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                    data-testid="print-type"
                  >
                    <option value="none">No Print (+₦{settings.bulk_print_costs.none?.toLocaleString()})</option>
                    <option value="front">Front Print (+₦{settings.bulk_print_costs.front?.toLocaleString()})</option>
                    <option value="front_back">Front & Back Print (+₦{settings.bulk_print_costs.front_back?.toLocaleString()})</option>
                    <option value="embroidery">Embroidery (+₦{settings.bulk_print_costs.embroidery?.toLocaleString()})</option>
                  </select>
                </div>

                {/* Design Image Upload */}
                {orderData.print_type !== 'none' && (
                  <div>
                    <label className="block font-semibold text-sm mb-2">
                      Upload Design (Optional)
                    </label>
                    <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6">
                      <Upload className="mx-auto text-zinc-400 mb-3" size={40} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="design-upload"
                        data-testid="design-upload"
                      />
                      <label htmlFor="design-upload" className="btn-outline cursor-pointer">
                        Upload Design Image
                      </label>
                      {designImage && (
                        <p className="text-sm text-green-600 mt-2">✓ {designImage.name}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows="4"
                    value={orderData.notes}
                    onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                    placeholder="Any special requirements or instructions..."
                    data-testid="order-notes"
                  ></textarea>
                </div>

                <button
                  onClick={handleCalculateQuote}
                  disabled={loading}
                  className="btn-primary w-full py-4 text-lg"
                  data-testid="calculate-quote"
                >
                  {loading ? 'Calculating...' : 'Calculate Quote'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quote Display */}
        {step === 2 && quote && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="font-oswald text-3xl font-bold mb-6">Your Quote</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold">Clothing Type:</span>
                <span>{quote.clothing_type}</span>
              </div>
              
              <div className="border-b pb-3">
                <span className="font-semibold block mb-2">Colors & Quantities:</span>
                <div className="ml-4 space-y-1">
                  {quote.colors.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.color}</span>
                      <span className="font-semibold">{item.quantity} pcs</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b pb-3">
                <span className="font-semibold block mb-2">Sizes & Quantities:</span>
                <div className="ml-4 space-y-1">
                  {quote.sizes.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>Size {item.size}</span>
                      <span className="font-semibold">{item.quantity} pcs</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold">Total Quantity:</span>
                <span>{quote.quantity} pieces</span>
              </div>
              
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold">Fabric Quality:</span>
                <span className="capitalize">{quote.fabric_quality}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b">
                <span className="font-semibold">Print Type:</span>
                <span className="capitalize">{quote.print_type.replace('_', ' ')}</span>
              </div>
              
              <div className="flex justify-between py-3 text-lg">
                <span className="font-semibold">Unit Price:</span>
                <span className="font-bold">₦{quote.unit_price?.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between py-4 text-2xl bg-primary/10 px-4 rounded-lg">
                <span className="font-bold">Total Price:</span>
                <span className="font-bold text-primary">₦{quote.total_price?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="btn-outline flex-1 py-4"
              >
                Modify Order
              </button>
              <button
                onClick={handleProceedToCustomerInfo}
                className="btn-primary flex-1 py-4"
                data-testid="proceed-to-customer-info"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Information */}
        {step === 3 && quote && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="font-oswald text-3xl font-bold mb-6">Customer Information</h2>
            
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block font-semibold text-sm mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  placeholder="Enter your full name"
                  data-testid="customer-name"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  placeholder="your@email.com"
                  data-testid="customer-email"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-sm mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg"
                  placeholder="+234 XXX XXX XXXX"
                  data-testid="customer-phone"
                  required
                />
              </div>

              {/* Order Summary */}
              <div className="bg-zinc-50 rounded-lg p-6 mt-8">
                <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Item:</span>
                    <span className="font-semibold">{orderData.clothing_item}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span className="font-semibold">{orderData.quantity} pieces</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fabric Quality:</span>
                    <span className="font-semibold">{orderData.fabric_quality}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t text-lg">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-primary">₦{quote.total_price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setStep(2)}
                  className="btn-outline flex-1 py-4"
                >
                  Back to Quote
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  className="btn-primary flex-1 py-4"
                  data-testid="submit-order"
                >
                  {loading ? 'Creating Order...' : 'Proceed to Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOrdersPage;
