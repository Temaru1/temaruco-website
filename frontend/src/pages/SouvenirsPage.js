import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, ArrowLeft, Upload, Palette, FileText, AlertCircle, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PaymentSelector from '../components/PaymentSelector';
import SEO, { SEO_CONFIG } from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCurrency } from '../contexts/CurrencyContext';
import { getImageUrl, getPlaceholderImage } from '../utils/imageUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const SouvenirsPage = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [souvenirs, setSouvenirs] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [brandingChoices, setBrandingChoices] = useState({}); // {productId: 'unbranded' | 'branded'}
  
  // Design source state
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [designSource, setDesignSource] = useState(null); // 'client_upload' | 'temaruco_design'
  const [brandingImageUrl, setBrandingImageUrl] = useState(null);
  const [designBrief, setDesignBrief] = useState({
    company_name: '',
    colors: '',
    style_preferences: '',
    additional_notes: ''
  });
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [requiresDesignQuote, setRequiresDesignQuote] = useState(false);

  useEffect(() => {
    loadSouvenirs();
  }, []);

  const loadSouvenirs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/souvenirs`);
      setSouvenirs(response.data || []);
    } catch (error) {
      console.error('Failed to load souvenirs:', error);
    }
  };

  // Check if cart has any branded items
  const cartHasBrandedItems = () => {
    return cart.some(item => item.is_branded === true);
  };

  // Get the effective price for an item based on branding choice
  const getEffectivePrice = (souvenir, brandingChoice) => {
    // Support both 'price' and 'unbranded_price' for backward compatibility
    const basePrice = souvenir.price || souvenir.unbranded_price || 0;
    if (brandingChoice === 'branded' && souvenir.branded_price) {
      return souvenir.branded_price;
    }
    return basePrice;
  };

  // Get base price (handles both price and unbranded_price fields)
  const getBasePrice = (souvenir) => {
    return souvenir.price || souvenir.unbranded_price || 0;
  };

  const addToCart = (souvenir) => {
    const moq = souvenir.moq_value || 1;
    const selectedQty = selectedQuantities[souvenir.id] || moq;
    const brandingChoice = brandingChoices[souvenir.id] || 'unbranded';
    
    // MOQ Validation
    if (selectedQty < moq) {
      toast.error(`Minimum order for this item is ${moq} pieces.`);
      return;
    }

    // For products with branding option, ensure a choice is made
    if (souvenir.has_branding && souvenir.branded_price && !brandingChoices[souvenir.id]) {
      toast.error('Please select Unbranded or Branded option before adding to cart.');
      return;
    }
    
    const effectivePrice = getEffectivePrice(souvenir, brandingChoice);
    const existing = cart.find(item => item.id === souvenir.id && item.is_branded === (brandingChoice === 'branded'));
    
    if (existing) {
      setCart(cart.map(item => 
        (item.id === souvenir.id && item.is_branded === (brandingChoice === 'branded')) 
          ? { ...item, quantity: item.quantity + selectedQty } 
          : item
      ));
    } else {
      setCart([...cart, { 
        ...souvenir, 
        quantity: selectedQty, 
        price: effectivePrice,
        is_branded: brandingChoice === 'branded',
        original_price: souvenir.price,
        branded_price: souvenir.branded_price
      }]);
    }
    toast.success(`${souvenir.name} (${brandingChoice === 'branded' ? 'Branded' : 'Unbranded'}, ${selectedQty} pcs) added to cart`);
  };

  const updateSelectedQuantity = (souvenirId, value) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [souvenirId]: parseInt(value) || 1
    }));
  };

  const updateBrandingChoice = (souvenirId, choice) => {
    setBrandingChoices(prev => ({
      ...prev,
      [souvenirId]: choice
    }));
  };

  const updateQuantity = (id, isBranded, delta) => {
    setCart(cart.map(item => {
      if (item.id === id && item.is_branded === isBranded) {
        const moq = item.moq_value || 1;
        const newQty = Math.max(moq, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id, isBranded) => {
    setCart(cart.filter(item => !(item.id === id && item.is_branded === isBranded)));
  };

  const getTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Handle design file upload
  const handleDesignUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Only JPG and PNG files are allowed');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploadingDesign(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/branding/upload-design`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBrandingImageUrl(response.data.url);
      toast.success('Design uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload design');
    } finally {
      setUploadingDesign(false);
    }
  };

  // Validate design selection before proceeding to checkout
  const validateDesignSelection = () => {
    if (!cartHasBrandedItems()) return true;
    
    if (!designSource) {
      toast.error('Please select how you want to handle your branding design');
      return false;
    }

    if (designSource === 'client_upload' && !brandingImageUrl) {
      toast.error('Please upload your design file');
      return false;
    }

    if (designSource === 'temaruco_design' && !designBrief.company_name) {
      toast.error('Please provide at least your company/brand name in the design brief');
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all details');
      return;
    }

    // Validate design selection for branded items
    if (!validateDesignSelection()) {
      return;
    }

    // CHECKOUT MOQ VALIDATION - Safety layer
    for (const item of cart) {
      const moq = item.moq_value || 1;
      if (item.quantity < moq) {
        toast.error(`Minimum order for "${item.name}" is ${moq} pieces.`);
        return;
      }
    }

    const hasBranded = cartHasBrandedItems();

    try {
      const response = await axios.post(`${API_URL}/api/orders/souvenir`, {
        items: cart.map(item => ({
          souvenir_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          moq_value: item.moq_value || 1,
          is_branded: item.is_branded
        })),
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total_price: getTotal(),
        // Branding fields
        contains_branded_items: hasBranded,
        design_source: hasBranded ? designSource : null,
        branding_image_url: designSource === 'client_upload' ? brandingImageUrl : null,
        design_brief: designSource === 'temaruco_design' ? designBrief : null
      });

      setOrderId(response.data.order_id);
      setRequiresDesignQuote(response.data.requires_design_quote || false);
      
      if (response.data.requires_design_quote) {
        toast.success('Order placed! Our design team will send you a quote within 24-48 hours.');
      } else {
        toast.success('Order placed! Complete payment below.');
      }
    } catch (error) {
      toast.error('Failed to place order');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title={SEO_CONFIG.souvenirs.title}
        description={SEO_CONFIG.souvenirs.description}
        image={SEO_CONFIG.souvenirs.image}
        url={SEO_CONFIG.souvenirs.url}
      />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-between items-start">
            <div>
              <button 
                onClick={() => navigate('/')}
                className="flex items-center text-zinc-500 hover:text-zinc-900 mb-4 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
              </button>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
                {SEO_CONFIG.souvenirs.h1}
              </h1>
              <p className="text-zinc-600 mt-2">Branded and unbranded promotional items</p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-3 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors"
              data-testid="cart-button"
            >
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D90429] text-white text-xs rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {souvenirs.map((souvenir) => (
            <Card key={souvenir.id} className="overflow-hidden group" data-testid={`souvenir-card-${souvenir.id}`}>
              <div className="aspect-square bg-white overflow-hidden flex items-center justify-center">
                <img
                  src={getImageUrl(souvenir.image_url)}
                  alt={souvenir.name}
                  className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = getPlaceholderImage(souvenir.name); }}
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-zinc-900">{souvenir.name}</h3>
                
                {/* Price display */}
                <div className="mt-1">
                  {souvenir.has_branding && souvenir.branded_price ? (
                    <div className="space-y-1">
                      <p className="text-zinc-600 text-sm">
                        Unbranded: <span className="font-bold">{formatPrice(souvenir.price)}</span>
                      </p>
                      <p className="text-[#D90429] text-sm">
                        Branded: <span className="font-bold">{formatPrice(souvenir.branded_price)}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#D90429] font-bold text-lg">
                      {formatPrice(souvenir.price)}
                    </p>
                  )}
                </div>

                {/* Branding Option Selector */}
                {souvenir.has_branding && souvenir.branded_price && (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-medium text-zinc-600">Choose Option:</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBrandingChoice(souvenir.id, 'unbranded')}
                        className={`flex-1 py-2 px-2 text-xs rounded-lg border-2 transition-all ${
                          brandingChoices[souvenir.id] === 'unbranded'
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                        data-testid={`branding-unbranded-${souvenir.id}`}
                      >
                        Unbranded
                      </button>
                      <button
                        onClick={() => updateBrandingChoice(souvenir.id, 'branded')}
                        className={`flex-1 py-2 px-2 text-xs rounded-lg border-2 transition-all ${
                          brandingChoices[souvenir.id] === 'branded'
                            ? 'border-[#D90429] bg-[#D90429] text-white'
                            : 'border-zinc-200 hover:border-[#D90429]'
                        }`}
                        data-testid={`branding-branded-${souvenir.id}`}
                      >
                        <Palette className="w-3 h-3 inline mr-1" />
                        Branded
                      </button>
                    </div>
                  </div>
                )}

                {/* MOQ Display */}
                <p className="text-xs text-zinc-500 mt-2" data-testid={`moq-display-${souvenir.id}`}>
                  Minimum Order: {souvenir.moq_value || 1} Pieces
                </p>

                {/* Quantity Selector */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-zinc-600">Qty:</label>
                  <input
                    type="number"
                    min={souvenir.moq_value || 1}
                    step="1"
                    value={selectedQuantities[souvenir.id] || souvenir.moq_value || 1}
                    onChange={(e) => updateSelectedQuantity(souvenir.id, e.target.value)}
                    className="w-20 px-2 py-1 text-sm border rounded"
                    data-testid={`qty-input-${souvenir.id}`}
                  />
                </div>

                <Button
                  onClick={() => addToCart(souvenir)}
                  className="w-full mt-3 bg-zinc-900 hover:bg-zinc-800"
                  size="sm"
                  data-testid={`add-to-cart-${souvenir.id}`}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {souvenirs.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <p>No souvenirs available at the moment.</p>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Your Cart</h2>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={`${item.id}-${item.is_branded}`} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                          <img
                            src={getImageUrl(item.image_url)}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          {item.is_branded && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#D90429]/10 text-[#D90429] font-medium">
                              <Palette className="w-3 h-3 mr-1" /> Branded
                            </span>
                          )}
                          <p className="text-sm text-zinc-500">{formatPrice(item.price)}</p>
                          <p className="text-xs text-zinc-400">Min: {item.moq_value || 1} pcs</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.is_branded, -1)}
                            className="p-1 hover:bg-zinc-200 rounded"
                            disabled={item.quantity <= (item.moq_value || 1)}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm">{item.quantity} pcs</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.is_branded, 1)}
                            className="p-1 hover:bg-zinc-200 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.is_branded)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Branding Design Section - Only show if cart has branded items */}
                  {cartHasBrandedItems() && !orderId && (
                    <div className="border-t pt-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-5 h-5 text-[#D90429]" />
                        <h3 className="font-semibold">Branding Design</h3>
                      </div>
                      
                      <p className="text-sm text-zinc-600 mb-4">
                        Your cart contains branded items. How would you like to handle your design?
                      </p>

                      <div className="space-y-3">
                        {/* Option 1: Upload own design */}
                        <button
                          onClick={() => setDesignSource('client_upload')}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            designSource === 'client_upload'
                              ? 'border-[#D90429] bg-red-50'
                              : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                          data-testid="design-source-upload"
                        >
                          <div className="flex items-center gap-3">
                            <Upload className={`w-5 h-5 ${designSource === 'client_upload' ? 'text-[#D90429]' : 'text-zinc-400'}`} />
                            <div>
                              <p className="font-medium">I will upload my design</p>
                              <p className="text-xs text-zinc-500">JPG or PNG, max 2MB</p>
                            </div>
                            {designSource === 'client_upload' && <Check className="w-5 h-5 text-[#D90429] ml-auto" />}
                          </div>
                        </button>

                        {/* Upload area - show when client_upload selected */}
                        {designSource === 'client_upload' && (
                          <div className="ml-8 p-3 bg-zinc-50 rounded-lg">
                            {brandingImageUrl ? (
                              <div className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-green-500" />
                                <span className="text-sm text-green-600">Design uploaded successfully</span>
                                <button 
                                  onClick={() => setBrandingImageUrl(null)}
                                  className="text-xs text-zinc-500 hover:text-zinc-700"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center gap-2 cursor-pointer py-4 border-2 border-dashed border-zinc-300 rounded-lg hover:border-[#D90429]">
                                <Upload className="w-6 h-6 text-zinc-400" />
                                <span className="text-sm text-zinc-600">
                                  {uploadingDesign ? 'Uploading...' : 'Click to upload your design'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png"
                                  onChange={handleDesignUpload}
                                  className="hidden"
                                  disabled={uploadingDesign}
                                  data-testid="design-upload-input"
                                />
                              </label>
                            )}
                          </div>
                        )}

                        {/* Option 2: TEMARUCO creates design */}
                        <button
                          onClick={() => setDesignSource('temaruco_design')}
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            designSource === 'temaruco_design'
                              ? 'border-[#D90429] bg-red-50'
                              : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                          data-testid="design-source-temaruco"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className={`w-5 h-5 ${designSource === 'temaruco_design' ? 'text-[#D90429]' : 'text-zinc-400'}`} />
                            <div>
                              <p className="font-medium">I want TEMARUCO to create the design</p>
                              <p className="text-xs text-zinc-500">Additional design fee applies</p>
                            </div>
                            {designSource === 'temaruco_design' && <Check className="w-5 h-5 text-[#D90429] ml-auto" />}
                          </div>
                        </button>

                        {/* Design brief form - show when temaruco_design selected */}
                        {designSource === 'temaruco_design' && (
                          <div className="ml-8 p-4 bg-zinc-50 rounded-lg space-y-3">
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700">
                                A design fee will be quoted separately and is <strong>not included</strong> in the cart total. 
                                Our team will contact you with the design fee before proceeding.
                              </p>
                            </div>
                            
                            <div>
                              <label className="text-xs font-medium text-zinc-600">Company/Brand Name *</label>
                              <input
                                type="text"
                                value={designBrief.company_name}
                                onChange={(e) => setDesignBrief({...designBrief, company_name: e.target.value})}
                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
                                placeholder="Your brand name"
                                data-testid="design-brief-company"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-600">Preferred Colors</label>
                              <input
                                type="text"
                                value={designBrief.colors}
                                onChange={(e) => setDesignBrief({...designBrief, colors: e.target.value})}
                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
                                placeholder="e.g., Red, Blue, Gold"
                                data-testid="design-brief-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-600">Style Preferences</label>
                              <input
                                type="text"
                                value={designBrief.style_preferences}
                                onChange={(e) => setDesignBrief({...designBrief, style_preferences: e.target.value})}
                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
                                placeholder="e.g., Minimalist, Bold, Classic"
                                data-testid="design-brief-style"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-zinc-600">Additional Notes</label>
                              <textarea
                                value={designBrief.additional_notes}
                                onChange={(e) => setDesignBrief({...designBrief, additional_notes: e.target.value})}
                                rows={2}
                                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg resize-none"
                                placeholder="Any other design requirements..."
                                data-testid="design-brief-notes"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(getTotal())}</span>
                    </div>
                    {cartHasBrandedItems() && designSource === 'temaruco_design' && (
                      <p className="text-xs text-amber-600 mt-1">
                        * Design fee not included - will be quoted separately
                      </p>
                    )}
                  </div>

                  {!orderId ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Contact Details</h3>
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg"
                        data-testid="customer-name"
                      />
                      <input
                        type="email"
                        placeholder="Your Email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg"
                        data-testid="customer-email"
                      />
                      <input
                        type="tel"
                        placeholder="Your Phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg"
                        data-testid="customer-phone"
                      />
                      <Button
                        onClick={handlePlaceOrder}
                        className="w-full bg-[#D90429] hover:bg-[#B90322]"
                        data-testid="place-order-btn"
                      >
                        Place Order
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 border rounded-lg ${requiresDesignQuote ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                        <p className={`font-medium ${requiresDesignQuote ? 'text-amber-800' : 'text-green-800'}`}>
                          {requiresDesignQuote ? 'Order Received - Design Quote Pending' : 'Order placed successfully!'}
                        </p>
                        <p className={`text-sm ${requiresDesignQuote ? 'text-amber-600' : 'text-green-600'}`}>Order ID: {orderId}</p>
                        {requiresDesignQuote && (
                          <p className="text-xs text-amber-600 mt-2">
                            Our design team will review your brief and send a design fee quote to your email within 24-48 hours.
                          </p>
                        )}
                      </div>
                      
                      {!requiresDesignQuote && (
                        <PaymentSelector
                          orderId={orderId}
                          orderType="souvenir"
                          amount={getTotal()}
                          email={customerInfo.email}
                          customerName={customerInfo.name}
                          phone={customerInfo.phone}
                          onSuccess={() => {
                            toast.success('Payment successful!');
                            navigate(`/order-summary/${orderId}`);
                          }}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SouvenirsPage;
