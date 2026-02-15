import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, CheckCircle, CreditCard, Receipt, Copy, Check, Star, Crown, Gem } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import FlutterwavePayment from '../components/FlutterwavePayment';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get full image URL
const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/uploads')) return `${API_URL}${url}`;
  if (url.startsWith('/uploads')) return `${API_URL}/api${url}`;
  return url;
};

// Variant display config
const VARIANT_CONFIG = {
  standard: { label: 'Standard', icon: Star, color: 'bg-zinc-100 text-zinc-700', badgeColor: 'bg-zinc-600' },
  premium: { label: 'Premium', icon: Crown, color: 'bg-blue-50 text-blue-700', badgeColor: 'bg-blue-600' },
  luxury: { label: 'Luxury', icon: Gem, color: 'bg-amber-50 text-amber-700', badgeColor: 'bg-amber-500' }
};

const BulkOrderDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get order data from navigation state
  const orderData = location.state?.orderData;
  const customerInfo = location.state?.customerInfo;
  const selectedItem = location.state?.selectedItem;
  const selectedVariant = location.state?.selectedVariant || orderData?.product_variant || 'standard';

  const PRINT_OPTIONS = [
    { value: 'none', label: 'No Print', price: 0 },
    { value: 'front', label: 'Front Only', price: 300 },
    { value: 'back', label: 'Back Only', price: 300 },
    { value: 'front_back', label: 'Front & Back', price: 500 },
  ];

  useEffect(() => {
    if (!orderData || !customerInfo || !selectedItem) {
      toast.error('No order data found. Please start again.');
      navigate('/bulk-orders');
    }
  }, [orderData, customerInfo, selectedItem, navigate]);

  if (!orderData || !customerInfo || !selectedItem) {
    return null;
  }

  // Get variant info
  const variantInfo = VARIANT_CONFIG[selectedVariant] || VARIANT_CONFIG.standard;
  const VariantIcon = variantInfo.icon;

  const calculateTotal = () => {
    const unitPrice = orderData.unit_price || 0;
    const qty = orderData.quantity;
    return unitPrice * qty;
  };

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      
      const orderDataPayload = {
        clothing_item: selectedItem.name,
        clothing_item_id: selectedItem.id,
        quantity: orderData.quantity,
        product_variant: selectedVariant,
        unit_price: orderData.unit_price,
        print_type: orderData.print_type,
        colors: orderData.colors,
        color_quantities: orderData.colors.reduce((acc, color) => {
          acc[color] = orderData.quantity;
          return acc;
        }, {}),
        size_breakdown: orderData.sizes || {},
        notes: orderData.notes || '',
        quote: { total_price: calculateTotal() }
      };
      
      formData.append('order_data', JSON.stringify(orderDataPayload));
      formData.append('customer_name', customerInfo.name);
      formData.append('customer_email', customerInfo.email);
      formData.append('customer_phone', customerInfo.phone);

      const response = await axios.post(`${API_URL}/api/orders/bulk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newOrderId = response.data.order_id || response.data.id;
      setOrderId(newOrderId);
      setOrderPlaced(true);
      toast.success('Order created! Please complete payment.');
    } catch (error) {
      console.error('Order creation error:', error);
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        toast.error(errorMsg);
      } else {
        toast.error('Failed to create order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    setPaymentSuccess(true);
    toast.success('Payment successful! Your order is confirmed.');
  };

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      toast.success('Order ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTotalFromSizes = () => {
    if (!orderData.sizes) return 0;
    return Object.values(orderData.sizes).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Order Details - Bulk Order"
        description="Review and confirm your bulk order"
      />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button 
            onClick={() => !orderPlaced && navigate('/bulk-orders', { state: { orderData, customerInfo, selectedItem } })}
            className={`flex items-center text-zinc-500 hover:text-zinc-900 mb-4 text-sm ${orderPlaced ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={orderPlaced}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Order Form
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
            {paymentSuccess ? 'Order Confirmed!' : orderPlaced ? 'Complete Payment' : 'Review Your Order'}
          </h1>
          <p className="text-zinc-600 mt-2">
            {paymentSuccess 
              ? 'Thank you for your order. You can track it using the Order ID below.'
              : orderPlaced 
                ? 'Complete payment to confirm your order'
                : 'Please review all details before proceeding to payment'
            }
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success State */}
        {paymentSuccess && orderId && (
          <Card className="mb-8 bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-800">Payment Successful!</h2>
                  <p className="text-green-600">Your order has been confirmed and is being processed.</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-sm text-zinc-500 mb-2">Your Order ID (save this for tracking)</p>
                <div className="flex items-center gap-3">
                  <code className="text-2xl font-mono font-bold text-zinc-900 bg-zinc-100 px-4 py-2 rounded-lg flex-1">
                    {orderId}
                  </code>
                  <Button
                    onClick={copyOrderId}
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid="copy-order-id-btn"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <Button
                  onClick={() => navigate(`/track-order?orderId=${orderId}`)}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                  data-testid="track-order-btn"
                >
                  Track Your Order
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Receipt className="w-5 h-5 text-[#D90429]" />
              <h2 className="text-xl font-bold">Order Details</h2>
            </div>

            {/* Product Info with Variant Badge */}
            <div className="flex items-start gap-4 p-4 bg-zinc-50 rounded-lg mb-6">
              <img 
                src={getImageUrl(selectedItem.image_url)}
                alt={selectedItem.name}
                className="w-24 h-24 rounded-lg object-cover"
                onError={(e) => { e.target.src = `https://placehold.co/300x300/e2e8f0/64748b?text=${selectedItem.name}`; }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{selectedItem.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${variantInfo.badgeColor}`}>
                    <VariantIcon className="w-3 h-3 inline mr-1" />
                    {variantInfo.label}
                  </span>
                </div>
                <p className="text-zinc-500">₦{orderData.unit_price?.toLocaleString()} per piece</p>
                {selectedItem.description && (
                  <p className="text-sm text-zinc-600 mt-1">{selectedItem.description}</p>
                )}
              </div>
              <div className="text-right">
                <Package className="w-8 h-8 text-zinc-400" />
              </div>
            </div>

            {/* Order Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-zinc-700 border-b pb-2">Order Specifications</h4>
                
                <div className="flex justify-between py-2 border-b border-zinc-100 items-center">
                  <span className="text-zinc-500">Quality Variant</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${variantInfo.color}`}>
                    <VariantIcon className="w-4 h-4 inline mr-1" />
                    {variantInfo.label}
                  </span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Unit Price</span>
                  <span className="font-semibold">₦{orderData.unit_price?.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Quantity</span>
                  <span className="font-semibold">{orderData.quantity} pieces</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Print Option</span>
                  <span className="font-semibold">
                    {PRINT_OPTIONS.find(p => p.value === orderData.print_type)?.label}
                  </span>
                </div>
                
                {orderData.colors && orderData.colors.length > 0 && (
                  <div className="py-2 border-b border-zinc-100">
                    <span className="text-zinc-500 block mb-2">Selected Colors</span>
                    <div className="flex flex-wrap gap-2">
                      {orderData.colors.map(color => (
                        <span key={color} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {getTotalFromSizes() > 0 && (
                  <div className="py-2 border-b border-zinc-100">
                    <span className="text-zinc-500 block mb-2">Size Distribution</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(orderData.sizes).filter(([_, qty]) => qty > 0).map(([size, qty]) => (
                        <span key={size} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">
                          {size}: {qty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {orderData.notes && (
                  <div className="py-2">
                    <span className="text-zinc-500 block mb-2">Special Instructions</span>
                    <p className="text-sm bg-zinc-50 p-3 rounded-lg">{orderData.notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-zinc-700 border-b pb-2">Contact Information</h4>
                
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Name</span>
                  <span className="font-semibold">{customerInfo.name}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Email</span>
                  <span className="font-semibold">{customerInfo.email}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">Phone</span>
                  <span className="font-semibold">{customerInfo.phone}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card className="mb-6 bg-zinc-900 text-white">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Pricing Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-zinc-300">
                <span className="flex items-center gap-2">
                  {selectedItem.name}
                  <span className={`px-2 py-0.5 rounded text-xs ${variantInfo.badgeColor}`}>
                    {variantInfo.label}
                  </span>
                </span>
                <span>₦{orderData.unit_price?.toLocaleString()} × {orderData.quantity}</span>
              </div>
              
              {orderData.print_type !== 'none' && (
                <div className="flex justify-between text-zinc-300">
                  <span>Print ({PRINT_OPTIONS.find(p => p.value === orderData.print_type)?.label})</span>
                  <span>Included in unit price</span>
                </div>
              )}
              
              <div className="border-t border-zinc-700 my-3"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">Total Amount</span>
                <span className="text-3xl font-bold text-[#F5A623]">₦{calculateTotal().toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {!paymentSuccess && (
          <Card>
            <CardContent className="p-6">
              {!orderPlaced ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-[#D90429]" />
                    <h3 className="text-lg font-bold">Proceed to Payment</h3>
                  </div>
                  
                  <p className="text-zinc-600 mb-6">
                    Click the button below to proceed to checkout. You will be redirected to Flutterwave to complete your payment securely.
                  </p>
                  
                  <Button
                    onClick={handleProceedToPayment}
                    disabled={loading}
                    className="w-full bg-[#D90429] hover:bg-[#B90322] text-lg py-6"
                    data-testid="proceed-to-checkout-btn"
                  >
                    {loading ? 'Creating Order...' : `Checkout - ₦${calculateTotal().toLocaleString()}`}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-[#D90429]" />
                    <h3 className="text-lg font-bold">Complete Payment</h3>
                  </div>
                  
                  {orderId && (
                    <div className="bg-zinc-50 p-4 rounded-lg mb-6">
                      <p className="text-sm text-zinc-500 mb-1">Order ID</p>
                      <p className="font-mono font-bold text-lg">{orderId}</p>
                    </div>
                  )}
                  
                  <FlutterwavePayment
                    orderId={orderId}
                    orderType="bulk"
                    amount={calculateTotal()}
                    email={customerInfo.email}
                    customerName={customerInfo.name}
                    phone={customerInfo.phone}
                    currency="NGN"
                    onSuccess={handlePaymentSuccess}
                    onClose={() => toast.info('Payment cancelled. You can try again.')}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BulkOrderDetailsPage;
