import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Package, Paintbrush, Shirt, ShoppingBag, Scissors, Gift } from 'lucide-react';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: Package,
      title: 'Bulk Orders',
      description: 'Custom uniforms for schools, corporates & events. Minimum 50 pieces.',
      link: '/bulk-orders',
      color: 'bg-red-50 text-red-600'
    },
    {
      icon: Paintbrush,
      title: 'Print-On-Demand',
      description: 'Upload your design, we print it on premium clothing.',
      link: '/pod',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      icon: Scissors,
      title: 'Custom Orders',
      description: 'Bespoke tailoring for unique requirements.',
      link: '/custom-order',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      icon: Shirt,
      title: 'Fabrics',
      description: 'Premium quality fabrics for your projects.',
      link: '/fabrics',
      color: 'bg-green-50 text-green-600'
    },
    {
      icon: Gift,
      title: 'Souvenirs',
      description: 'Branded promotional items & corporate gifts.',
      link: '/souvenirs',
      color: 'bg-orange-50 text-orange-600'
    },
    {
      icon: ShoppingBag,
      title: 'Boutique',
      description: 'Ready-to-wear fashion collection.',
      link: '/boutique',
      color: 'bg-pink-50 text-pink-600'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="Premium Clothing Manufacturing"
        description="Nigeria's leading clothing factory for bulk orders, print-on-demand, corporate uniforms, and custom fashion."
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold tracking-widest uppercase text-[#D90429] mb-4">
                  Premium Clothing Manufacturing
                </p>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 leading-[1.1]">
                  Quality Clothing,
                  <br />
                  <span className="text-[#D90429]">Made for You</span>
                </h1>
              </div>
              
              <p className="text-lg text-zinc-600 max-w-lg leading-relaxed">
                From bulk orders for schools and corporates to custom print-on-demand services. 
                Nigeria's trusted clothing factory delivering excellence since day one.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => navigate('/bulk-orders')}
                  className="bg-[#D90429] hover:bg-[#B90322] text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  data-testid="hero-cta-bulk"
                >
                  Start Bulk Order
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/track')}
                  className="rounded-full px-8 py-6 text-lg font-medium border-2 hover:bg-zinc-50"
                  data-testid="hero-cta-track"
                >
                  Track Order
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-zinc-900">500+</p>
                  <p className="text-sm text-zinc-500">Orders Delivered</p>
                </div>
                <div className="w-px h-12 bg-zinc-200"></div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-zinc-900">50+</p>
                  <p className="text-sm text-zinc-500">Happy Clients</p>
                </div>
                <div className="w-px h-12 bg-zinc-200"></div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-zinc-900">5★</p>
                  <p className="text-sm text-zinc-500">Rating</p>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-zinc-100 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1590670796065-5c2469672e18?w=800&q=80"
                  alt="Fashion model in elegant African attire"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 border border-zinc-100">
                <p className="text-sm text-zinc-500 mb-1">Starting from</p>
                <p className="text-3xl font-bold text-[#D90429]">₦1,500</p>
                <p className="text-sm text-zinc-600">per piece</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 md:py-32 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold tracking-widest uppercase text-[#D90429] mb-4">
              What We Offer
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900">
              Our Services
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Link
                key={index}
                to={service.link}
                className="group bg-white p-8 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                data-testid={`service-card-${index}`}
              >
                <div className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 mb-2 group-hover:text-[#D90429] transition-colors">
                  {service.title}
                </h3>
                <p className="text-zinc-600 leading-relaxed">
                  {service.description}
                </p>
                <div className="mt-4 flex items-center text-[#D90429] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-[#D90429] rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D90429] rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto">
                Whether you need 50 or 5,000 pieces, we've got you covered. 
                Get a free quote today and see why businesses trust Temaruco.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  onClick={() => navigate('/bulk-orders')}
                  className="bg-[#D90429] hover:bg-[#B90322] text-white rounded-full px-10 py-6 text-lg font-semibold"
                >
                  Get Free Quote
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/contact')}
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-zinc-900 rounded-full px-10 py-6 text-lg font-medium"
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Design Lab Preview */}
      <section className="py-20 md:py-32 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-200">
                <img
                  src="https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800&q=80"
                  alt="Designer working on fashion sketches"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <p className="text-sm font-semibold tracking-widest uppercase text-[#D90429]">
                Design Lab
              </p>
              <h2 className="text-4xl md:text-5xl font-bold text-zinc-900">
                Need Custom Designs?
              </h2>
              <p className="text-lg text-zinc-600 leading-relaxed">
                Our professional design team can create logos, brand identities, 
                and custom graphics for your clothing line. From concept to production.
              </p>
              <Button 
                onClick={() => navigate('/design-lab')}
                className="bg-[#D90429] hover:bg-[#B90322] text-white rounded-full px-8 py-4 font-semibold"
              >
                Explore Design Lab
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
