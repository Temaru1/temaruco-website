import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Trash2, Package, ArrowRight, X, ZoomIn } from 'lucide-react';
import { getBoutiqueProducts, createBoutiqueOrder } from '../utils/api';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

const BoutiquePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'));
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
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
    loadProducts();
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const loadProducts = async () => {
    try {
      const response = await getBoutiqueProducts();
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
    toast.success('Added to cart!');
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.id !== productId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success('Removed from cart');
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Show checkout modal for customer info
    setShowCheckoutModal(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    // Validate customer information
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-oswald text-5xl font-bold uppercase" data-testid="boutique-title">Boutique</h1>
            <p className="font-manrope text-lg text-zinc-600 mt-2">
              Shop our curated collection
            </p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => document.getElementById('cart-section').scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary flex items-center gap-2"
              data-testid="view-cart-btn"
            >
              <ShoppingBag size={20} />
              <span>Cart ({cart.length})</span>
            </button>
          </div>
        </div>

        {/* Category Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link 
            to="/boutique/nigerian" 
            className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-primary to-pink-600 relative">
              <img 
                src="https://images.unsplash.com/photo-1617627143750-d86bc21e425a?w=800&q=80"
                alt=""
                className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <div>
                <h2 className="font-oswald text-3xl font-bold text-white mb-2">Nigerian Traditional Wear</h2>
                <p className="text-white/90 mb-4">Agbada, Senator Wear, Kaftan & More</p>
                <div className="flex items-center gap-2 text-white">
                  <span>Shop Now</span>
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          </Link>

          <Link 
            to="/boutique/modern" 
            className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-zinc-800 to-zinc-600 relative">
              <img 
                src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80"
                alt=""
                className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <div>
                <h2 className="font-oswald text-3xl font-bold text-white mb-2">Modern Wear</h2>
                <p className="text-white/90 mb-4">T-Shirts, Polos, Hoodies & More</p>
                <div className="flex items-center gap-2 text-white">
                  <span>Shop Now</span>
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600">Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
            {products.map(product => (
              <div key={product.id} className="product-card group" data-testid="product-card">
                <div 
                  className="relative overflow-hidden cursor-pointer"
                  onClick={() => setLightboxImage(product)}
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {/* Zoom overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <ZoomIn 
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                      size={48}
                    />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-oswald text-xl font-semibold mb-2">{product.name}</h3>
                  <p className="font-manrope text-sm text-zinc-600 mb-3">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-oswald font-bold text-primary">
                      ₦{product.price.toLocaleString()}
                    </span>
                    <button
                      onClick={() => addToCart(product)}
                      className="btn-primary text-sm py-2 px-4"
                      data-testid={`add-to-cart-${product.id}`}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div id="cart-section" className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="font-oswald text-3xl font-semibold mb-6">Shopping Cart</h2>

          {cart.length === 0 ? (
            <p className="text-center text-zinc-600 py-8">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-4" data-testid="cart-item">
                    <div className="flex-1">
                      <p className="font-manrope font-semibold">{item.name}</p>
                      <p className="text-sm text-zinc-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-oswald text-xl font-bold text-primary">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-sm text-red-600 hover:underline"
                        data-testid={`remove-from-cart-${item.id}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-oswald text-2xl font-semibold">Total:</span>
                  <span className="font-oswald text-3xl font-bold text-primary">
                    ₦{getTotalPrice().toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="btn-primary w-full"
                  data-testid="checkout-btn"
                >
                  {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                </button>
              </div>
            </>
          )}
        </div>
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
                    data-testid="boutique-customer-name"
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
                    data-testid="boutique-customer-email"
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
                    data-testid="boutique-customer-phone"
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
                    data-testid="boutique-delivery-address"
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
                    data-testid="boutique-delivery-city"
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
                    data-testid="boutique-delivery-state"
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
                    data-testid="boutique-delivery-notes"
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
                  data-testid="submit-boutique-order-btn"
                >
                  {checkoutLoading ? 'Submitting...' : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 bg-black/50 rounded-full p-2"
            aria-label="Close lightbox"
          >
            <X size={32} />
          </button>
          
          <div 
            className="max-w-5xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.image_url}
              alt={lightboxImage.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="bg-white rounded-b-lg p-4">
              <h3 className="font-oswald text-2xl font-bold mb-2">{lightboxImage.name}</h3>
              <p className="text-zinc-600 mb-3">{lightboxImage.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-3xl font-oswald font-bold text-primary">
                  ₦{lightboxImage.price.toLocaleString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(lightboxImage);
                    setLightboxImage(null);
                  }}
                  className="btn-primary"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoutiquePage;
