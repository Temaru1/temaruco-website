import React, { useState, useEffect } from 'react';
import { ShoppingCart, ZoomIn } from 'lucide-react';
import { getBoutiqueProducts, initializePayment } from '../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const BoutiqueModernPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const { user, loading: authLoading } = useAuth();  // Added loading state
  const navigate = useNavigate();

  const modernCategories = ['T-Shirts', 'Polo Shirts', 'Hoodies', 'Button-Down Shirts'];

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
      // Filter for modern wear
      const modernProducts = response.data.filter(p => 
        modernCategories.includes(p.category)
      );
      setProducts(modernProducts);
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

    // Collect email for guest checkout
    const email = prompt('Please enter your email address for receipt:');
    if (!email || !email.includes('@')) {
      toast.error('Valid email is required for checkout');
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await initializePayment({
        email: email,
        amount: getTotalPrice(),
        order_type: 'boutique',
        order_id: 'boutique_' + Date.now(),
        metadata: { cart_items: cart }
      });

      if (response.data.status && response.data.data.authorization_url) {
        window.location.href = response.data.data.authorization_url;
      }
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
            <h1 className="font-oswald text-5xl font-bold uppercase" data-testid="boutique-title">Modern Wear</h1>
            <p className="font-manrope text-lg text-zinc-600 mt-2">
              Contemporary fashion - T-shirts, Polos, Hoodies, and more
            </p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => document.getElementById('cart-section').scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary flex items-center gap-2"
              data-testid="view-cart-btn"
            >
              <ShoppingCart size={20} />
              <span>Cart ({cart.length})</span>
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-600">No modern wear available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
            {products.map(product => (
              <div key={product.id} className="product-card group">
                <div className="relative overflow-hidden rounded-lg mb-4 bg-zinc-100 aspect-square">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                    onClick={() => setZoomedImage(product)}
                  />
                  <button
                    onClick={() => setZoomedImage(product)}
                    className="absolute top-2 right-2 bg-white/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ZoomIn size={20} className="text-zinc-700" />
                  </button>
                </div>
                <h3 className="font-oswald text-lg font-semibold mb-2">{product.name}</h3>
                <p className="text-zinc-600 text-sm mb-3">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="font-oswald text-2xl font-bold text-primary">
                    ₦{product.price.toLocaleString()}
                  </span>
                  <button
                    onClick={() => addToCart(product)}
                    className="btn-primary px-4 py-2 text-sm"
                    data-testid={`add-to-cart-${product.id}`}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cart Section */}
        <div id="cart-section" className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="font-oswald text-3xl font-bold mb-6">Shopping Cart</h2>
          
          {cart.length === 0 ? (
            <p className="text-zinc-600">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border border-zinc-200 rounded-lg">
                    <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-zinc-600">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">₦{(item.price * item.quantity).toLocaleString()}</p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-oswald text-2xl font-semibold">Total</span>
                  <span className="font-oswald text-3xl font-bold text-primary">
                    ₦{getTotalPrice().toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="btn-primary w-full text-lg py-4"
                  data-testid="checkout-btn"
                >
                  {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                </button>
                {!user && (
                  <p className="text-sm text-zinc-600 mt-2 text-center">
                    You'll be redirected to login before checkout
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl"
            >
              ✕
            </button>
            <img 
              src={zoomedImage.image_url} 
              alt={zoomedImage.name}
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="bg-white p-4 rounded-b-lg">
              <h3 className="font-oswald text-xl font-bold">{zoomedImage.name}</h3>
              <p className="text-zinc-600">{zoomedImage.description}</p>
              <p className="font-oswald text-2xl font-bold text-primary mt-2">
                ₦{zoomedImage.price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoutiqueModernPage;
