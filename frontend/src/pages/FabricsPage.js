import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PaystackPayment from '../components/PaystackPayment';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCurrency } from '../contexts/CurrencyContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const FabricsPage = () => {
  const navigate = useNavigate();
  const { formatPrice, currency } = useCurrency();
  const [fabrics, setFabrics] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    loadFabrics();
  }, []);

  const loadFabrics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/fabrics`);
      setFabrics(response.data || []);
    } catch (error) {
      console.error('Failed to load fabrics:', error);
    }
  };

  const addToCart = (fabric) => {
    const existing = cart.find(item => item.id === fabric.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === fabric.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...fabric, quantity: 1 }]);
    }
    toast.success(`${fabric.name} added to cart`);
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in all details');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/orders/fabric`, {
        items: cart.map(item => ({
          fabric_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total_price: getTotal()
      });

      setOrderId(response.data.order_id);
      toast.success('Order placed! Complete payment below.');
    } catch (error) {
      toast.error('Failed to place order');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Buy Premium Fabrics"
        description="Shop premium quality fabrics for all your clothing needs."
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
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900" data-testid="fabrics-page-title">
                Premium Fabrics
              </h1>
              <p className="text-zinc-600 mt-2">Quality materials for your projects</p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-3 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors"
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
          {fabrics.map((fabric) => (
            <Card key={fabric.id} className="overflow-hidden group">
              <div className="aspect-square bg-zinc-100 overflow-hidden">
                <img
                  src={fabric.image_url}
                  alt={fabric.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = `https://placehold.co/400x400/e2e8f0/64748b?text=${fabric.name}`; }}
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-zinc-900">{fabric.name}</h3>
                <p className="text-[#D90429] font-bold text-lg mt-1">
                  ₦{fabric.price?.toLocaleString()}
                  <span className="text-zinc-400 text-sm font-normal">/yard</span>
                </p>
                <Button
                  onClick={() => addToCart(fabric)}
                  className="w-full mt-3 bg-zinc-900 hover:bg-zinc-800"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {fabrics.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <p>No fabrics available at the moment.</p>
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
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-zinc-500">₦{item.price?.toLocaleString()}/yard</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-zinc-200 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-zinc-200 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₦{getTotal().toLocaleString()}</span>
                    </div>
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
                      />
                      <input
                        type="email"
                        placeholder="Your Email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg"
                      />
                      <input
                        type="tel"
                        placeholder="Your Phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg"
                      />
                      <Button
                        onClick={handlePlaceOrder}
                        className="w-full bg-[#D90429] hover:bg-[#B90322]"
                      >
                        Place Order
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 font-medium">Order placed successfully!</p>
                        <p className="text-sm text-green-600">Order ID: {orderId}</p>
                      </div>
                      <PaystackPayment
                        orderId={orderId}
                        orderType="fabric"
                        amount={getTotal()}
                        email={customerInfo.email}
                        customerName={customerInfo.name}
                        onSuccess={() => {
                          toast.success('Payment successful!');
                          navigate(`/order-summary/${orderId}`);
                        }}
                      />
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

export default FabricsPage;
