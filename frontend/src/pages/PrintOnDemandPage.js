import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shirt, Star, Crown, Gem } from 'lucide-react';
import axios from 'axios';
import SEO from '../components/SEO';
import { Card, CardContent } from '../components/ui/card';
import { useCurrency } from '../contexts/CurrencyContext';
import { getImageUrl, getPlaceholderImage } from '../utils/imageUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Quality Variants Configuration
const QUALITY_VARIANTS = [
  { 
    id: 'standard', 
    label: 'Standard', 
    description: 'Quality basics',
    icon: Star,
    badgeColor: 'bg-zinc-600'
  },
  { 
    id: 'premium', 
    label: 'Premium', 
    description: 'Enhanced quality',
    icon: Crown,
    badgeColor: 'bg-blue-600'
  },
  { 
    id: 'luxury', 
    label: 'Luxury', 
    description: 'Top-tier',
    icon: Gem,
    badgeColor: 'bg-amber-500'
  }
];

const PrintOnDemandPage = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pod/clothing-items`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback to default products
      setProducts([
        {
          id: 'tshirt',
          name: 'T-Shirt',
          standard_price: 2000,
          premium_price: 3000,
          luxury_price: 4500,
          image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
          description: 'Classic cotton t-shirt',
          colors: ['White', 'Black', 'Navy', 'Grey', 'Red'],
          sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        },
        {
          id: 'hoodie',
          name: 'Hoodie',
          standard_price: 4500,
          premium_price: 6750,
          luxury_price: 9000,
          image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
          description: 'Warm pullover hoodie',
          colors: ['Black', 'Grey', 'Navy', 'White'],
          sizes: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
          id: 'polo',
          name: 'Polo Shirt',
          standard_price: 2500,
          premium_price: 3750,
          luxury_price: 5000,
          image_url: 'https://images.unsplash.com/photo-1625910513413-5fc4e5b6bc2b?w=400',
          description: 'Premium polo with collar',
          colors: ['White', 'Black', 'Navy', 'Red', 'Blue'],
          sizes: ['S', 'M', 'L', 'XL', 'XXL']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    navigate(`/print-on-demand/${product.id}`, { 
      state: { product } 
    });
  };

  const getLowestPrice = (product) => {
    return product.standard_price || product.base_price || 0;
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <SEO 
        title="Print on Demand" 
        description="Design your own custom clothing. Upload your design and we print it on premium garments."
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#2B2D42] to-[#D90429] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-white/80 hover:text-white mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </button>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Print on Demand</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Choose a product below and start designing. Upload your artwork, 
            position it perfectly, and we'll print it on premium quality garments.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D90429] text-white rounded-full flex items-center justify-center font-bold">1</div>
              <span className="text-zinc-700 font-medium">Choose Product</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-300 text-zinc-600 rounded-full flex items-center justify-center font-bold">2</div>
              <span className="text-zinc-500">Select Quality</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-300 text-zinc-600 rounded-full flex items-center justify-center font-bold">3</div>
              <span className="text-zinc-500">Design It</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-300 text-zinc-600 rounded-full flex items-center justify-center font-bold">4</div>
              <span className="text-zinc-500">Checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Info Banner */}
      <div className="bg-zinc-100 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            {QUALITY_VARIANTS.map((variant) => {
              const Icon = variant.icon;
              return (
                <div key={variant.id} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full ${variant.badgeColor} text-white flex items-center justify-center`}>
                    <Icon className="w-3 h-3" />
                  </span>
                  <span className="font-medium">{variant.label}</span>
                  <span className="text-zinc-500">- {variant.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Select a Product to Customize</h2>
        <p className="text-zinc-500 mb-8">Click on any product to choose quality and start designing</p>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D90429]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className={`cursor-pointer transition-all duration-300 overflow-hidden ${
                  hoveredProduct === product.id 
                    ? 'shadow-xl scale-105 ring-2 ring-[#D90429]' 
                    : 'hover:shadow-lg'
                }`}
                onClick={() => handleProductSelect(product)}
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
                data-testid={`pod-product-${product.id}`}
              >
                {/* ISSUE 2 FIX: Use object-contain to show full outfit without cropping */}
                <div className="relative aspect-square bg-white overflow-hidden flex items-center justify-center">
                  <img
                    src={getImageUrl(product.image_url || product.image)}
                    alt={product.name}
                    className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.target.src = getPlaceholderImage(product.name); }}
                  />
                  {hoveredProduct === product.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
                      <div className="bg-white px-4 py-2 rounded-full font-medium text-sm">
                        <Shirt className="inline w-4 h-4 mr-1" />
                        Start Designing
                      </div>
                    </div>
                  )}
                  {/* Quality badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <span className="bg-zinc-600 text-white text-xs px-2 py-0.5 rounded">3 Qualities</span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-zinc-900 mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-zinc-500 mb-2 line-clamp-1">{product.description}</p>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[#D90429]">
                      From {formatPrice(getLowestPrice(product))}
                    </span>
                  </div>
                  {/* Mini variant prices */}
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-zinc-100 rounded">
                      <Star className="w-3 h-3 inline" /> ₦{(product.standard_price || product.base_price)?.toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                      <Crown className="w-3 h-3 inline" /> ₦{product.premium_price?.toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                      <Gem className="w-3 h-3 inline" /> ₦{product.luxury_price?.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-12 bg-zinc-50 rounded-xl">
            <p className="text-zinc-500">No products available at the moment.</p>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="bg-white border-t py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#D90429]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-[#D90429]" />
              </div>
              <h3 className="font-bold text-lg mb-2">Three Quality Tiers</h3>
              <p className="text-zinc-600">Choose from Standard, Premium, or Luxury quality to match your needs and budget.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#D90429]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shirt className="w-8 h-8 text-[#D90429]" />
              </div>
              <h3 className="font-bold text-lg mb-2">Premium Materials</h3>
              <p className="text-zinc-600">All our garments are made from high-quality materials that look great and last long.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#D90429]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-[#D90429]" />
              </div>
              <h3 className="font-bold text-lg mb-2">Professional Printing</h3>
              <p className="text-zinc-600">State-of-the-art printing technology ensures vibrant, durable prints on all products.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintOnDemandPage;
