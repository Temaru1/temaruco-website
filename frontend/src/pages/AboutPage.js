import React from 'react';
import { ArrowLeft, Target, Heart, Award, Users, Factory, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const AboutPage = () => {
  const navigate = useNavigate();

  const values = [
    { icon: Award, title: 'Quality Craftsmanship', description: 'Excellence in every stitch we make' },
    { icon: Factory, title: 'Fast Production', description: 'Reliable timelines you can count on' },
    { icon: Heart, title: 'Fair Pricing', description: 'Competitive rates for all order sizes' },
    { icon: Users, title: 'Customer First', description: '100% satisfaction guarantee' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="About Us"
        description="Learn about Temaruco Clothing Factory - Nigeria's premier clothing manufacturing company."
      />

      {/* Header */}
      <div className="bg-zinc-50 border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-zinc-500 hover:text-zinc-900 mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900" data-testid="about-title">
            About Temaruco
          </h1>
          <p className="text-zinc-600 mt-2">
            Nigeria's trusted clothing manufacturing partner
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold tracking-widest uppercase text-[#D90429]">
                Our Story
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">
                Building Quality Clothing Since Day One
              </h2>
              <p className="text-lg text-zinc-600 leading-relaxed">
                Temaruco Clothing Factory is Nigeria's premier clothing manufacturing company, 
                specializing in bulk orders, print-on-demand services, and boutique collections. 
                We combine traditional craftsmanship with modern techniques to deliver exceptional results.
              </p>
              <p className="text-zinc-600 leading-relaxed">
                With years of experience in the clothing manufacturing industry, Temaruco has 
                become the trusted partner for businesses, schools, hospitals, and entrepreneurs 
                across Nigeria. Our state-of-the-art facility and skilled workforce ensure 
                every order meets the highest standards.
              </p>
            </div>
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-100 shadow-xl">
              <img 
                src="https://images.unsplash.com/photo-1684259499086-93cb3e555803?w=800&q=80" 
                alt="Temaruco factory floor with modern equipment" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-200 shadow-xl">
              <img 
                src="https://images.unsplash.com/photo-1625479142928-c2f2914318f2?w=800&q=80" 
                alt="Close up of sewing machine detail" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-[#D90429]" />
                </div>
                <p className="text-sm font-semibold tracking-widest uppercase text-[#D90429]">
                  Our Mission
                </p>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">
                Inspire, Empower, Accomplish
              </h2>
              <p className="text-lg text-zinc-600 leading-relaxed">
                To inspire, empower, and help businesses and individuals accomplish their goals 
                through high-quality, professionally manufactured clothing. We believe in the 
                power of great apparel to transform brands and businesses.
              </p>
              <p className="text-zinc-600 leading-relaxed">
                Every piece we create is a testament to our commitment to excellence. From 
                school uniforms to corporate wear, from traditional attire to modern fashion, 
                we bring your vision to life with precision and care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest uppercase text-[#D90429] mb-4">
              Our Values
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">
              What Sets Us Apart
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-red-100 transition-colors">
                    <value.icon className="w-7 h-7 text-[#D90429]" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-zinc-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Work Together?
          </h2>
          <p className="text-lg text-zinc-400 mb-10">
            Whether you need bulk orders or custom designs, we're here to bring your vision to life.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={() => navigate('/bulk-orders')}
              className="bg-[#D90429] hover:bg-[#B90322] text-white rounded-full px-8 py-4 text-lg font-semibold"
            >
              Start Your Order
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/contact')}
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-zinc-900 rounded-full px-8 py-4 text-lg"
            >
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
