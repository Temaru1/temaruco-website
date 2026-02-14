import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PaystackPayment from '../components/PaystackPayment';
import SEO from '../components/SEO';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const SouvenirsPage = () => {
  const navigate = useNavigate();
  const [souvenirs, setSouvenirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    loadSouvenirs();
  }, []);

  const loadSouvenirs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/souvenirs`);
      setSouvenirs(response.data);
    } catch (error) {
      console.error('Failed to load souvenirs:', error);
      toast.error('Failed to load souvenirs');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (souvenir, branded) => {
    const cartKey = `${souvenir.id}-${branded ? 'branded' : 'unbranded'}`;
    const existing = cart.find(item => item.cartKey === cartKey);
    
    if (existing) {
      setCart(cart.map(item => 
        item.cartKey === cartKey
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...souvenir, 
        cartKey,
        branded,
        displayName: `${souvenir.name} (${branded ? 'Branded' : 'Unbranded'})`,
        price: branded ? souvenir.branded_price : souvenir.unbranded_price,
        quantity: 1 
      }]);
    }
    toast.success('Added to cart');
  };

  const updateQuantity = (cartKey, change) => {
    setCart(cart.map(item => {
      if (item.cartKey === cartKey) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error('Please fill in your contact information');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/orders/souvenir`,
        {
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          items: cart,
          total_price: getTotalPrice()
        }
      );

      toast.success('Order placed successfully!');
      setOrderId(response.data.order_id);
      setShowPayment(true);
    } catch (error) {
      toast.error('Failed to place order');
    }
  };

  const handlePaymentSuccess = (data) => {
    toast.success('Payment completed! Order confirmed.');
    navigate(`/order-summary/${orderId}`);
  };

  const handlePaymentClose = () => {
    toast.info('You can complete payment later using your Order ID');
    navigate(`/order-summary/${orderId}`);
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-zinc-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-oswald text-5xl font-bold mb-4" data-testid="souvenirs-page-title">
          Buy Souvenirs
        </h1>
        <p className="text-lg text-zinc-600 mb-8">
          Branded and unbranded promotional items
        </p>

        {loading ? (
          <div className="text-center py-20">
            <div className="loading-spinner"></div>
          </div>
        ) : souvenirs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <p className="text-xl text-zinc-600">No souvenirs available at the moment</p>
            <p className="text-zinc-500 mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Souvenirs Grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {souvenirs.map(souvenir => (
                  <div key={souvenir.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <img
                      src={souvenir.image_url}
                      alt={souvenir.name}
                      className="w-full h-64 object-cover"
                    />
                    <div className="p-6">
                      <h3 className="font-semibold text-xl mb-2">{souvenir.name}</h3>
                      <p className="text-zinc-600 text-sm mb-4">{souvenir.description}</p>
                      
                      <div className="space-y-3">
                        {/* Unbranded Option */}
                        <div className="flex justify-between items-center p-3 border-2 border-zinc-200 rounded-lg">
                          <div>
                            <p className="font-semibold">Unbranded</p>
                            <p className="text-lg font-bold text-[#D90429]">₦{souvenir.unbranded_price?.toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => addToCart(souvenir, false)}
                            className="btn-outline text-sm"
                          >
                            <Plus size={16} className="inline mr-1" />
                            Add
                          </button>
                        </div>

                        {/* Branded Option */}
                        <div className="flex justify-between items-center p-3 border-2 border-[#D90429] bg-red-50 rounded-lg">
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              Branded <Check size={16} className="text-[#D90429]" />
                            </p>
                            <p className="text-lg font-bold text-[#D90429]">₦{souvenir.branded_price?.toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => addToCart(souvenir, true)}
                            className="btn-primary text-sm"
                          >
                            <Plus size={16} className="inline mr-1" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <h2 className="font-oswald text-2xl font-bold mb-4">Your Cart</h2>
                
                {cart.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.cartKey} className="flex gap-3 pb-4 border-b">
                          <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{item.displayName}</h4>
                            <p className="text-xs text-zinc-600">₦{item.price.toLocaleString()}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => updateQuantity(item.cartKey, -1)}
                                className="w-6 h-6 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.cartKey, 1)}
                                className="w-6 h-6 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 mb-6">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span className="text-[#D90429]">₦{getTotalPrice().toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        disabled={showPayment}
                      />
                      <input
                        type="email"
                        placeholder="Your Email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        disabled={showPayment}
                      />
                      <input
                        type="tel"
                        placeholder="Your Phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        disabled={showPayment}
                      />
                    </div>

                    {!showPayment ? (
                      <button
                        onClick={handleCheckout}
                        className="w-full btn-primary"
                      >
                        Place Order
                      </button>
                    ) : (
                      <PaystackPayment
                        orderId={orderId}
                        orderType="souvenir"
                        amount={getTotalPrice()}
                        email={customerInfo.email}
                        customerName={customerInfo.name}
                        onSuccess={handlePaymentSuccess}
                        onClose={handlePaymentClose}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SouvenirsPage;