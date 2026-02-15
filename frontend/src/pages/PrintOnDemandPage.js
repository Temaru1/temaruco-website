import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shirt, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import SEO from '../components/SEO';
import { Card, CardContent } from '../components/ui/card';
import { useCurrency } from '../contexts/CurrencyContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Product catalog for POD
const POD_PRODUCTS = [
  {
    id: 'tshirt',
    name: 'T-Shirt',
    description: 'Classic cotton t-shirt, perfect for custom prints',
    basePrice: 5000,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    colors: ['White', 'Black', 'Navy', 'Grey', 'Red'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    printAreas: ['front', 'back', 'left_sleeve', 'right_sleeve']
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    description: 'Warm pullover hoodie with kangaroo pocket',
    basePrice: 15000,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
    colors: ['Black', 'Grey', 'Navy', 'White'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: ['front', 'back']
  },
  {
    id: 'polo',
    name: 'Polo Shirt',
    description: 'Premium polo shirt with collar',
    basePrice: 8000,
    image: 'https://images.unsplash.com/photo-1625910513413-5fc4e5b6bc2b?w=400',
    colors: ['White', 'Black', 'Navy', 'Red', 'Blue'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: ['front', 'back', 'left_chest']
  },
  {
    id: 'joggers',
    name: 'Joggers',
    description: 'Comfortable jogger pants with elastic waist',
    basePrice: 12000,
    image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400',
    colors: ['Black', 'Grey', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: ['left_leg', 'right_leg']
  },
  {
    id: 'varsity',
    name: 'Varsity Jacket',
    description: 'Classic varsity jacket with snap buttons',
    basePrice: 25000,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
    colors: ['Black/White', 'Navy/White', 'Red/White'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: ['back', 'left_chest']
  },
  {
    id: 'tank',
    name: 'Tank Top',
    description: 'Sleeveless tank top for warm weather',
    basePrice: 4000,
    image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400',
    colors: ['White', 'Black', 'Grey'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    printAreas: ['front', 'back']
  },
  {
    id: 'sweatshirt',
    name: 'Sweatshirt',
    description: 'Cozy crewneck sweatshirt',
    basePrice: 12000,
    image: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=400',
    colors: ['Black', 'Grey', 'Navy', 'Cream'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: ['front', 'back']
  },
  {
    id: 'cap',
    name: 'Baseball Cap',
    description: 'Adjustable baseball cap',
    basePrice: 3500,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
    colors: ['Black', 'White', 'Navy', 'Red'],
    sizes: ['One Size'],
    printAreas: ['front', 'back']
  }
];

const PrintOnDemandPage = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [hoveredProduct, setHoveredProduct] = useState(null);

  const handleProductSelect = (product) => {
    // Navigate to the design tool with the selected product
    navigate(`/print-on-demand/${product.id}`, { 
      state: { product } 
    });
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
              <span className="text-zinc-500">Design It</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-300 text-zinc-600 rounded-full flex items-center justify-center font-bold">3</div>
              <span className="text-zinc-500">Add to Cart</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-300 text-zinc-600 rounded-full flex items-center justify-center font-bold">4</div>
              <span className="text-zinc-500">Checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Select a Product to Customize</h2>
        <p className="text-zinc-500 mb-8">Click on any product to open the design tool</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {POD_PRODUCTS.map((product) => (
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
              <div className="relative aspect-square bg-zinc-100 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {hoveredProduct === product.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-[#D90429] px-4 py-2 rounded-full font-semibold text-sm">
                      Start Designing →
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg text-zinc-900">{product.name}</h3>
                <p className="text-sm text-zinc-500 mb-2 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#D90429]">
                    {formatPrice(product.basePrice)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {product.colors.length} colors
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center text-zinc-900 mb-12">Why Choose Our Print on Demand?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shirt className="w-8 h-8 text-[#D90429]" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Quality</h3>
              <p className="text-zinc-500">High-quality garments with professional-grade printing that lasts</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#D90429]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast Turnaround</h3>
              <p className="text-zinc-500">Quick production and delivery within 3-5 business days</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-[#D90429]" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Minimum Order</h3>
              <p className="text-zinc-500">Order just one item or hundreds - no minimums required</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintOnDemandPage;
