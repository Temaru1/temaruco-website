import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, X, ZoomIn, ArrowLeft } from 'lucide-react';
import { getBoutiqueProducts, createBoutiqueOrder } from '../utils/api';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const BoutiquePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'));
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', phone: '',
    delivery_address: '', delivery_city: '', delivery_state: '', delivery_notes: ''
  });

  useEffect(() => {
    loadProducts();
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
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
    let newCart = existingItem
      ? cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { ...product, quantity: 1 }];
    
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

  const getTotalPrice = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!customerInfo.name.trim() || !customerInfo.email.includes('@') || !customerInfo.phone.trim() || !customerInfo.delivery_address.trim()) {
      toast.error('Please fill in all required fields');
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
      toast.success('Order created successfully!');
      localStorage.removeItem('cart');
      setCart([]);
      setShowCheckoutModal(false);
      navigate(`/order-summary/${response.data.order_id || response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D90429]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO title="Boutique" description="Shop our curated fashion collection." />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div>
              <button onClick={() => navigate('/')} className="flex items-center text-zinc-500 hover:text-zinc-900 mb-2 text-sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
              </button>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900" data-testid="boutique-title">Boutique</h1>
              <p className="text-zinc-600 mt-1">Shop our curated collection</p>
            </div>
            <button
              onClick={() => document.getElementById('cart-section').scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-[#D90429] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#B90322] transition-colors"
              data-testid="view-cart-btn"
            >
              <ShoppingBag size={20} />
              Cart ({cart.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link to="/boutique/nigerian" className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="aspect-[16/9] bg-gradient-to-br from-[#D90429] to-pink-600 relative">
              <img src="https://images.unsplash.com/photo-1617627143750-d86bc21e425a?w=800&q=80" alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity group-hover:scale-105 duration-500" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Nigerian Traditional Wear</h2>
                <p className="text-white/90 mb-3">Agbada, Senator Wear, Kaftan & More</p>
                <span className="flex items-center gap-2 text-white font-medium">Shop Now <ArrowRight size={18} /></span>
              </div>
            </div>
          </Link>

          <Link to="/boutique/modern" className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <div className="aspect-[16/9] bg-gradient-to-br from-zinc-800 to-zinc-600 relative">
              <img src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80" alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity group-hover:scale-105 duration-500" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Modern Wear</h2>
                <p className="text-white/90 mb-3">T-Shirts, Polos, Hoodies & More</p>
                <span className="flex items-center gap-2 text-white font-medium">Shop Now <ArrowRight size={18} /></span>
              </div>
            </div>
          </Link>
        </div>

        {/* Products Grid */}
        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {products.map(product => (
              <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all" data-testid="product-card">
                <div className="relative aspect-square cursor-pointer overflow-hidden" onClick={() => setLightboxImage(product)}>
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={40} />
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-zinc-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-[#D90429]">₦{product.price.toLocaleString()}</span>
                    <Button onClick={() => addToCart(product)} size="sm" className="bg-[#D90429] hover:bg-[#B90322]" data-testid={`add-to-cart-${product.id}`}>
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Cart Section */}
        <Card id="cart-section" className="mb-8">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-zinc-900 mb-6">Shopping Cart</h2>

            {cart.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-4" data-testid="cart-item">
                      <div className="flex items-center gap-4">
                        <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                        <div>
                          <p className="font-semibold text-zinc-900">{item.name}</p>
                          <p className="text-sm text-zinc-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#D90429]">₦{(item.price * item.quantity).toLocaleString()}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-sm text-red-500 hover:underline" data-testid={`remove-from-cart-${item.id}`}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xl font-semibold">Total:</span>
                    <span className="text-3xl font-bold text-[#D90429]">₦{getTotalPrice().toLocaleString()}</span>
                  </div>
                  <Button onClick={() => setShowCheckoutModal(true)} disabled={checkoutLoading} className="w-full bg-[#D90429] hover:bg-[#B90322] py-6 text-lg rounded-full" data-testid="checkout-btn">
                    {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6">Delivery & Contact Information</h2>
              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <input type="text" value={customerInfo.name} onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})} placeholder="John Doe" className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]" required data-testid="boutique-customer-name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input type="email" value={customerInfo.email} onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})} placeholder="john@example.com" className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]" required data-testid="boutique-customer-email" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} placeholder="+234 800 000 0000" className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]" required data-testid="boutique-customer-phone" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Delivery Address *</label>
                    <textarea value={customerInfo.delivery_address} onChange={(e) => setCustomerInfo({...customerInfo, delivery_address: e.target.value})} placeholder="Enter your full delivery address" rows={3} className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]" required data-testid="boutique-delivery-address" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <input type="text" value={customerInfo.delivery_city} onChange={(e) => setCustomerInfo({...customerInfo, delivery_city: e.target.value})} placeholder="Lagos" className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]" data-testid="boutique-delivery-city" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State</label>
                    <input type="text" value={customerInfo.delivery_state} onChange={(e) => setCustomerInfo({...customerInfo, delivery_state: e.target.value})} placeholder="Lagos State" className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429]" data-testid="boutique-delivery-state" />
                  </div>
                </div>

                <div className="bg-zinc-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-[#D90429]">₦{getTotalPrice().toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-zinc-500">You'll be redirected to payment instructions after submitting.</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCheckoutModal(false)} className="flex-1" data-testid="cancel-checkout-btn">Cancel</Button>
                  <Button type="submit" disabled={checkoutLoading} className="flex-1 bg-[#D90429] hover:bg-[#B90322]" data-testid="submit-boutique-order-btn">
                    {checkoutLoading ? 'Submitting...' : 'Submit Order'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 text-white hover:text-zinc-300 bg-black/50 rounded-full p-2"><X size={32} /></button>
          <div className="max-w-5xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage.image_url} alt={lightboxImage.name} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            <Card className="mt-4">
              <CardContent className="p-4">
                <h3 className="text-2xl font-bold mb-2">{lightboxImage.name}</h3>
                <p className="text-zinc-600 mb-3">{lightboxImage.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-[#D90429]">₦{lightboxImage.price.toLocaleString()}</span>
                  <Button onClick={(e) => { e.stopPropagation(); addToCart(lightboxImage); setLightboxImage(null); }} className="bg-[#D90429] hover:bg-[#B90322]">Add to Cart</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoutiquePage;
