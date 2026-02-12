import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { createBoutiqueOrder } from '../utils/api';

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'));
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [previousPage, setPreviousPage] = useState('/boutique');
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_notes: ''
  });

  useEffect(() => {
    // Get previous page from state or localStorage
    const referrer = location.state?.from || localStorage.getItem('cartReferrer') || '/boutique';
    setPreviousPage(referrer);
  }, [location]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  }, [cart]);

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const updateQuantity = (productId, change) => {
    setCart(prevCart => {
      const newCart = prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      return newCart;
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
    toast.success('Item removed from cart');
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    if (!customerInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerInfo.email.trim() || !customerInfo.email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    if (!customerInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!customerInfo.delivery_address.trim()) {
      toast.error('Please enter delivery address');
      return;
    }

    setCheckoutLoading(true);
    try {
      const formData = new FormData();
      formData.append('customer_name', customerInfo.name);
      formData.append('customer_email', customerInfo.email);
      formData.append('customer_phone', customerInfo.phone);
      formData.append('cart_items', JSON.stringify(cart));
      formData.append('delivery_address', customerInfo.delivery_address);
      formData.append('delivery_city', customerInfo.delivery_city || '');
      formData.append('delivery_state', customerInfo.delivery_state || '');
      formData.append('delivery_notes', customerInfo.delivery_notes || '');

      const response = await createBoutiqueOrder(formData);
      toast.success('Order created successfully! Redirecting to payment instructions...');
      
      // Clear cart
      localStorage.removeItem('cart');
      setCart([]);
      setShowCheckoutModal(false);
      
      // Redirect to order summary page
      const orderId = response.data.order_id || response.data.id;
      navigate(`/order-summary/${orderId}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag size={32} className="text-primary" />
          <h1 className="font-oswald text-4xl font-bold">Shopping Cart</h1>
        </div>

        {cart.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <ShoppingBag size={64} className="mx-auto text-zinc-300 mb-4" />
            <h2 className="font-oswald text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-zinc-600 mb-6">Start shopping to add items to your cart</p>
            <button
              onClick={() => navigate(previousPage)}
              className="btn-primary inline-flex items-center gap-2"
              data-testid="continue-shopping-btn"
            >
              Continue Shopping
              <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-lg p-6 flex gap-4"
                  data-testid={`cart-item-${item.id}`}
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    <p className="text-sm text-zinc-600 mb-2">{item.category}</p>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-primary text-xl">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </span>
                      <span className="text-sm text-zinc-500">
                        ₦{item.price.toLocaleString()} each
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 transition"
                      data-testid={`remove-item-${item.id}`}
                    >
                      <Trash2 size={20} />
                    </button>
                    <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition"
                        data-testid={`decrease-qty-${item.id}`}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition"
                        data-testid={`increase-qty-${item.id}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <h2 className="font-oswald text-2xl font-bold mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6 pb-6 border-b">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Items ({cart.length})</span>
                    <span className="font-semibold">₦{getTotalPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Delivery</span>
                    <span className="font-semibold text-green-600">Calculated at checkout</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6 pb-6 border-b">
                  <span className="font-oswald text-xl font-bold">Total</span>
                  <span className="font-oswald text-3xl font-bold text-primary">
                    ₦{getTotalPrice().toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  className="btn-primary w-full text-lg mb-4"
                  data-testid="checkout-btn"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={() => navigate(previousPage)}
                  className="btn-outline w-full"
                  data-testid="continue-shopping-btn"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="font-oswald text-3xl font-bold mb-6">Delivery & Contact Information</h2>
            
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="cart-customer-name"
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
                    data-testid="cart-customer-email"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    placeholder="+234 800 000 0000"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="cart-customer-phone"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Delivery Address *</label>
                  <textarea
                    value={customerInfo.delivery_address}
                    onChange={(e) => setCustomerInfo({...customerInfo, delivery_address: e.target.value})}
                    placeholder="Enter your full delivery address"
                    rows={3}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="cart-delivery-address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">City</label>
                  <input
                    type="text"
                    value={customerInfo.delivery_city}
                    onChange={(e) => setCustomerInfo({...customerInfo, delivery_city: e.target.value})}
                    placeholder="Lagos"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="cart-delivery-city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">State</label>
                  <input
                    type="text"
                    value={customerInfo.delivery_state}
                    onChange={(e) => setCustomerInfo({...customerInfo, delivery_state: e.target.value})}
                    placeholder="Lagos State"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="cart-delivery-state"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Delivery Notes (Optional)</label>
                  <textarea
                    value={customerInfo.delivery_notes}
                    onChange={(e) => setCustomerInfo({...customerInfo, delivery_notes: e.target.value})}
                    placeholder="Any special instructions for delivery"
                    rows={2}
                    className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="cart-delivery-notes"
                  />
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">₦{getTotalPrice().toLocaleString()}</span>
                </div>
                <p className="text-sm text-zinc-600">You will be redirected to payment instructions after submitting your order.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="btn-outline flex-1"
                  data-testid="cancel-checkout-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="btn-primary flex-1"
                  data-testid="submit-order-btn"
                >
                  {checkoutLoading ? 'Submitting...' : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
