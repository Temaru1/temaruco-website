import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, Package, Star, Upload, Search } from 'lucide-react';
import { calculateQuote } from '../utils/api';
import { toast } from 'sonner';
import MockupPreview from '../components/MockupPreview';
import PWAInstallButton from '../components/PWAInstallButton';
import OrderCodeInput from '../components/OrderCodeInput';
import axios from 'axios';
import { STATUS_LABELS, getStatusColor } from '../utils/orderStatusValidation';
import SEO from '../components/SEO';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const LandingPage = () => {
  const navigate = useNavigate();
  
  // CMS Images State
  const [cmsImages, setCmsImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);
  
  // Quick Quote Calculator State
  const [quoteData, setQuoteData] = useState({
    clothing_item: 'T-Shirt',
    quantity: 50,
    print_type: 'none',
    fabric_quality: 'standard'
  });
  const [quoteResult, setQuoteResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [designImage, setDesignImage] = useState(null);

  // Order Tracking State
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Load CMS Images on mount
  useEffect(() => {
    const loadCMSImages = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/cms/images`);
        const imagesMap = {};
        response.data.forEach(img => {
          imagesMap[img.section] = `${API_URL}${img.file_path}`;
        });
        setCmsImages(imagesMap);
      } catch (error) {
        console.error('Failed to load CMS images:', error);
        // Will use fallback default images
      } finally {
        setLoadingImages(false);
      }
    };
    loadCMSImages();
    
    // Listen for CMS updates
    const handleCMSUpdate = () => {
      setLoadingImages(true);
      loadCMSImages();
    };
    window.addEventListener('cmsUpdated', handleCMSUpdate);
    
    return () => {
      window.removeEventListener('cmsUpdated', handleCMSUpdate);
    };
  }, []);

  // Listen for pricing updates and recalculate if quote exists
  useEffect(() => {
    const handlePricingUpdate = async () => {
      // If there's an existing quote, recalculate it with new prices
      if (quoteResult && quoteData) {
        console.log('Pricing updated - recalculating quote...');
        setCalculating(true);
        try {
          const response = await calculateQuote(quoteData);
          setQuoteResult(response.data);
          toast.success('Quote updated with new pricing!');
        } catch (error) {
          console.error('Failed to recalculate quote:', error);
        } finally {
          setCalculating(false);
        }
      }
    };
    
    window.addEventListener('pricingUpdated', handlePricingUpdate);
    
    return () => {
      window.removeEventListener('pricingUpdated', handlePricingUpdate);
    };
  }, [quoteResult, quoteData]);

  const clothingItems = [
    'T-Shirt', 'Hoodie', 'Joggers', 'Varsity Jacket', 'Polo',
    'Button-Down Shirt', 'Coverall', 'Hospital Scrubs', 'Shorts',
    'School Uniform', 'Security Uniform', 'Dress',
    'Agbada', 'Senator Wear', 'Kaftan', 'Bubu Dress', 'Ankara Dress', 'Dashiki'
  ];

  const handleProceedToOrder = () => {
    if (quoteResult) {
      // Save quote data to localStorage for persistence
      const quoteToSave = {
        ...quoteData,
        estimated_price: quoteResult.estimated_price,
        estimated_days: quoteResult.estimated_days,
        timestamp: Date.now()
      };
      localStorage.setItem('pendingQuote', JSON.stringify(quoteToSave));
      toast.success('Quote saved! Redirecting to order page...');
    }
    navigate('/bulk-orders');
  };

  const handleCalculateQuote = async () => {
    setCalculating(true);
    try {
      const response = await calculateQuote(quoteData);
      setQuoteResult(response.data);
      toast.success('Quote calculated successfully!');
    } catch (error) {
      toast.error('Failed to calculate quote');
    } finally {
      setCalculating(false);
    }
  };

  const handleDesignUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDesignImage(reader.result);
        toast.success('Design uploaded! Preview will update automatically.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOrderIdChange = (e) => {
    setTrackingOrderId(e.target.value);
  };

  const handleTrackOrder = async () => {
    if (!trackingOrderId.trim()) {
      toast.error('Please enter an order ID');
      return;
    }

    setTrackingLoading(true);
    setTrackedOrder(null);

    try {
      const response = await axios.get(`${API_URL}/api/orders/${trackingOrderId}`);
      setTrackedOrder(response.data);
      toast.success('Order found!');
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Order not found. Please check the order ID.');
      } else {
        toast.error('Failed to track order. Please try again.');
      }
    } finally {
      setTrackingLoading(false);
    }
  };

  const testimonials = [
    {
      name: 'Chioma Adebayo',
      role: 'Event Planner',
      text: 'Exceptional quality and fast delivery. Our team uniforms look amazing!',
      image: 'https://images.unsplash.com/photo-1670881391783-9c55ba592f93?w=100&h=100&fit=crop'
    },
    {
      name: 'Michael Okonkwo',
      role: 'Business Owner',
      text: 'Best bulk order experience. Professional service from start to finish.',
      image: 'https://images.unsplash.com/photo-1668752600261-e56e7f3780b6?w=100&h=100&fit=crop'
    },
    {
      name: 'Fatima Ibrahim',
      role: 'Fashion Designer',
      text: 'Their POD service is incredible. My customers love the quality!',
      image: 'https://images.unsplash.com/photo-1668752741330-8adc5cef7485?w=100&h=100&fit=crop'
    }
  ];

  return (
    <div className="App">
      <SEO 
        title="Premium Bulk Orders & Custom Clothing"
        description="Nigeria's leading clothing factory for bulk orders, print-on-demand, corporate uniforms, school uniforms, and custom fashion. Quality craftsmanship meets modern design."
        keywords="bulk clothing Nigeria, custom uniforms, print on demand, corporate clothing, school uniforms, fabric supplier Lagos"
      />
      {/* PWA Install Prompt */}
      <PWAInstallButton />
      
      {/* Hero Section */}
      <section 
        className="hero-section" 
        style={{
          backgroundImage: `url('${cmsImages.hero || 'https://customer-assets.emergentagent.com/job_7aeb087a-f6e4-4eea-9dca-48ba486735b4/artifacts/4bcin02c_227246.png'}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
        data-testid="hero-section"
      >
        <div className="hero-overlay"></div>
        <div className="hero-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-white max-w-3xl">
            <p className="font-manrope text-sm tracking-widest uppercase mb-4 fade-in">
              Inspire • Empower • Accomplish
            </p>
            <h1 className="font-oswald font-bold text-6xl md:text-8xl tracking-tight uppercase leading-none mb-6 slide-in-up">
              TEMARUCO<br />CLOTHING<br />FACTORY
            </h1>
            <p className="font-manrope text-lg md:text-xl leading-relaxed text-zinc-200 mb-8 max-w-2xl fade-in">
              Premium clothing manufacturing for bulk orders, print-on-demand, and boutique collections. 
              Quality craftsmanship meets modern design.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <button 
                onClick={() => document.getElementById('quick-quote').scrollIntoView({ behavior: 'smooth' })}
                className="btn-primary w-48"
                data-testid="get-quote-btn"
              >
                Get Quick Quote
              </button>
              <button 
                onClick={() => navigate('/boutique')}
                className="btn-primary w-48"
                data-testid="shop-boutique-btn"
              >
                Shop Boutique
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Quote Calculator */}
      <section id="quick-quote" className="py-24 bg-zinc-50" data-testid="quick-quote-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-oswald text-4xl md:text-5xl font-semibold uppercase mb-4">
              Quick Price Calculator
            </h2>
            <p className="font-manrope text-lg text-zinc-600">
              Get an instant estimate for your bulk order
            </p>
          </div>

          <div className="calculator-card max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Clothing Item
                </label>
                <select
                  value={quoteData.clothing_item}
                  onChange={(e) => setQuoteData({...quoteData, clothing_item: e.target.value})}
                  className="w-full"
                  data-testid="quote-clothing-item"
                >
                  {clothingItems.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quoteData.quantity}
                  onChange={(e) => setQuoteData({...quoteData, quantity: parseInt(e.target.value)})}
                  className="w-full"
                  data-testid="quote-quantity"
                />
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Print Type
                </label>
                <select
                  value={quoteData.print_type}
                  onChange={(e) => setQuoteData({...quoteData, print_type: e.target.value})}
                  className="w-full"
                  data-testid="quote-print-type"
                >
                  <option value="none">No Print</option>
                  <option value="front">Front Only</option>
                  <option value="front_back">Front & Back</option>
                  <option value="embroidery">Embroidery</option>
                </select>
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">
                  Fabric Quality
                </label>
                <select
                  value={quoteData.fabric_quality}
                  onChange={(e) => setQuoteData({...quoteData, fabric_quality: e.target.value})}
                  className="w-full"
                  data-testid="quote-fabric-quality"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
            </div>

            {/* Design Upload Section */}
            <div className="mb-6">
              <label className="block font-manrope font-semibold text-sm mb-2">
                Upload Your Design (Optional)
              </label>
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Upload className="mx-auto text-zinc-400 mb-3" size={40} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDesignUpload}
                  className="hidden"
                  id="quick-quote-design-upload"
                  data-testid="quick-quote-design-upload"
                />
                <label htmlFor="quick-quote-design-upload" className="btn-outline cursor-pointer">
                  Choose Design File
                </label>
                {designImage && (
                  <p className="mt-3 text-sm text-green-600 font-semibold">✓ Design uploaded</p>
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  White backgrounds will be automatically removed
                </p>
              </div>
            </div>

            {/* Mockup Preview */}
            {designImage && quoteData.print_type !== 'none' && (
              <div className="mb-6">
                <MockupPreview
                  designImage={designImage}
                  clothingItem={quoteData.clothing_item}
                  printType={quoteData.print_type}
                />
              </div>
            )}

            <button
              onClick={handleCalculateQuote}
              disabled={calculating}
              className="btn-primary w-full"
              data-testid="calculate-quote-btn"
            >
              {calculating ? 'Calculating...' : 'Calculate Quote'}
            </button>

            {quoteResult && (
              <div className="mt-6 p-6 bg-primary/5 rounded-lg border border-primary/20" data-testid="quote-result">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-manrope text-zinc-600 mb-1">Estimated Price</p>
                    <p className="text-3xl font-oswald font-bold text-primary">
                      ₦{quoteResult.estimated_price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-manrope text-zinc-600 mb-1">Production Time</p>
                    <p className="text-3xl font-oswald font-bold text-zinc-900">
                      {quoteResult.estimated_days} Days
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleProceedToOrder}
                  className="btn-secondary w-full mt-4"
                  data-testid="proceed-to-order-btn"
                >
                  Proceed to Order
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24" data-testid="services-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Bulk Orders */}
            <div 
              className="bg-white border border-zinc-100 p-8 rounded-xl hover:border-zinc-200 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/bulk-orders')}
              data-testid="service-bulk"
            >
              <Package className="text-primary mb-4" size={48} />
              <h3 className="font-oswald text-2xl font-semibold mb-3">BULK ORDERS</h3>
              <p className="font-manrope text-zinc-600 leading-relaxed mb-4">
                Large-scale clothing production with custom designs. Perfect for businesses, schools, and events.
              </p>
              <span className="text-primary font-semibold">Learn More →</span>
            </div>

            {/* Print-On-Demand */}
            <div 
              className="bg-white border border-zinc-100 p-8 rounded-xl hover:border-zinc-200 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/pod')}
              data-testid="service-pod"
            >
              <TrendingUp className="text-primary mb-4" size={48} />
              <h3 className="font-oswald text-2xl font-semibold mb-3">PRINT-ON-DEMAND</h3>
              <p className="font-manrope text-zinc-600 leading-relaxed mb-4">
                Upload your design, we print and deliver. Start your clothing brand with zero inventory.
              </p>
              <span className="text-primary font-semibold">Learn More →</span>
            </div>

            {/* Boutique */}
            <div 
              className="bg-white border border-zinc-100 p-8 rounded-xl hover:border-zinc-200 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/boutique')}
              data-testid="service-boutique"
            >
              <Star className="text-primary mb-4" size={48} />
              <h3 className="font-oswald text-2xl font-semibold mb-3">BOUTIQUE STORE</h3>
              <p className="font-manrope text-zinc-600 leading-relaxed mb-4">
                Shop our curated collection of ready-to-wear premium clothing pieces.
              </p>
              <span className="text-primary font-semibold">Shop Now →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Order Tracking Section */}
      <section className="py-24 bg-zinc-50" data-testid="order-tracking-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Package size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="font-oswald text-4xl md:text-5xl font-semibold uppercase mb-4">
              Track Your Order
            </h2>
            <p className="font-manrope text-xl text-zinc-600">
              Enter your order ID to check the status of your order
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <OrderCodeInput
                placeholder="Enter Order ID (e.g., TM-0226-090001)"
                value={trackingOrderId}
                onChange={handleOrderIdChange}
                onKeyPress={(e) => e.key === 'Enter' && handleTrackOrder()}
                className="w-full sm:flex-1 px-4 py-4 text-base md:text-lg border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                data-testid="track-order-input"
              />
              <button
                onClick={handleTrackOrder}
                disabled={trackingLoading}
                className="btn-primary flex items-center justify-center px-8 py-4 whitespace-nowrap text-base md:text-lg w-full sm:w-auto"
                data-testid="track-order-btn"
              >
                {trackingLoading ? 'Tracking...' : 'Track Order'}
              </button>
            </div>

            {trackedOrder && (
              <div className="border-t-2 pt-6">
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-oswald text-2xl font-semibold mb-1">
                        Order {trackedOrder.order_id}
                      </h3>
                      <p className="text-zinc-600">
                        Placed on {new Date(trackedOrder.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(trackedOrder.status)}`}>
                      {STATUS_LABELS[trackedOrder.status] || trackedOrder.status}
                    </span>
                  </div>

                  {/* Order Timeline */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-200"></div>
                    
                    {[
                      { status: 'pending_payment', label: 'Order Placed', time: trackedOrder.created_at },
                      { status: 'payment_submitted', label: 'Payment Submitted', time: trackedOrder.payment_submitted_at },
                      { status: 'payment_verified', label: 'Payment Verified', time: trackedOrder.payment_verified_at },
                      { status: 'in_production', label: 'In Production', time: trackedOrder.production_started_at },
                      { status: 'ready_for_delivery', label: 'Ready for Delivery', time: trackedOrder.ready_at },
                      { status: 'delivered', label: 'Delivered', time: trackedOrder.delivered_at }
                    ].map((step, index) => {
                      const isCompleted = ['pending_payment', 'payment_submitted', 'payment_verified', 'in_production', 'ready_for_delivery', 'delivered']
                        .indexOf(trackedOrder.status) >= index;
                      const isCurrent = trackedOrder.status === step.status;

                      return (
                        <div key={step.status} className="relative mb-6 last:mb-0">
                          <div className={`absolute -left-8 w-4 h-4 rounded-full border-2 ${
                            isCompleted ? 'bg-primary border-primary' : 'bg-white border-zinc-300'
                          }`}></div>
                          <div className={`${isCurrent ? 'font-semibold text-primary' : isCompleted ? 'text-zinc-900' : 'text-zinc-400'}`}>
                            <p className="text-sm">{step.label}</p>
                            {step.time && (
                              <p className="text-xs text-zinc-500">
                                {new Date(step.time).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Details Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t">
                  <div>
                    <p className="text-sm text-zinc-600">Order Type</p>
                    <p className="font-semibold capitalize">{trackedOrder.type}</p>
                  </div>
                  {trackedOrder.quantity && (
                    <div>
                      <p className="text-sm text-zinc-600">Quantity</p>
                      <p className="font-semibold">{trackedOrder.quantity} items</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-zinc-600">Total Amount</p>
                    <p className="font-semibold">₦{Number(trackedOrder.total_price || 0).toLocaleString()}</p>
                  </div>
                </div>

                {trackedOrder.tailor_assigned && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-zinc-600">Assigned to Tailor</p>
                    <p className="font-semibold">{trackedOrder.tailor_assigned}</p>
                    {trackedOrder.production_deadline && (
                      <p className="text-sm text-zinc-600 mt-1">
                        Expected completion: {new Date(trackedOrder.production_deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {trackedOrder.delivery_address && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-zinc-600 mb-1">Delivery Address</p>
                    <p className="text-sm font-semibold">
                      {trackedOrder.delivery_address}
                      {trackedOrder.delivery_city && `, ${trackedOrder.delivery_city}`}
                      {trackedOrder.delivery_state && `, ${trackedOrder.delivery_state}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!trackedOrder && !trackingLoading && (
              <div className="text-center text-zinc-500 py-8">
                <Package size={48} className="mx-auto mb-4 text-zinc-300" />
                <p>Enter your order ID above to track your order</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24" data-testid="testimonials-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-oswald text-4xl md:text-5xl font-semibold uppercase mb-4">
              What Our Clients Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                  <div>
                    <p className="font-manrope font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-zinc-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="font-manrope text-zinc-700 leading-relaxed">
                  "{testimonial.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white" data-testid="cta-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-oswald text-4xl md:text-5xl font-semibold uppercase mb-6">
            Ready to Get Started?
          </h2>
          <p className="font-manrope text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust Temaruco for their clothing needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => navigate('/bulk-orders')}
              className="bg-white text-primary rounded-full px-8 py-4 font-semibold hover:bg-zinc-100 transition-all"
              data-testid="cta-bulk-btn"
            >
              Start Bulk Order
            </button>
            <button 
              onClick={() => navigate('/pod')}
              className="bg-zinc-900 text-white rounded-full px-8 py-4 font-semibold hover:bg-zinc-800 transition-all"
              data-testid="cta-pod-btn"
            >
              Try Print-On-Demand
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
