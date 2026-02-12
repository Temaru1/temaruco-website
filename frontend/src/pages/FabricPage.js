import React from 'react';
import { Sparkles, Bell } from 'lucide-react';

const FabricPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-br from-zinc-50 to-zinc-100">
      <div className="max-w-4xl w-full">
        <div className="text-center">
          {/* Animated Icon */}
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary to-pink-500 mb-8 animate-pulse">
            <Sparkles className="w-16 h-16 text-white" />
          </div>

          {/* Main Content */}
          <h1 className="font-oswald text-6xl md:text-8xl font-bold uppercase mb-6 text-zinc-900">
            Coming Soon
          </h1>
          
          <p className="font-manrope text-2xl md:text-3xl text-zinc-600 mb-4">
            Premium Fabric Store
          </p>
          
          <p className="font-manrope text-lg text-zinc-600 mb-8 max-w-2xl mx-auto">
            We're preparing an exclusive collection of high-quality fabrics for you. 
            From premium cotton to luxury silk, find everything you need for your next creation.
          </p>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🧵</span>
              </div>
              <h3 className="font-oswald text-lg font-semibold mb-2">Premium Quality</h3>
              <p className="text-sm text-zinc-600">Sourced from the finest mills</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🌈</span>
              </div>
              <h3 className="font-oswald text-lg font-semibold mb-2">Wide Selection</h3>
              <p className="text-sm text-zinc-600">Hundreds of colors & patterns</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="font-oswald text-lg font-semibold mb-2">Fast Delivery</h3>
              <p className="text-sm text-zinc-600">Direct to your doorstep</p>
            </div>
          </div>

          {/* Notify Me Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Bell className="text-primary" size={24} />
              <h3 className="font-oswald text-xl font-semibold">Get Notified</h3>
            </div>
            <p className="text-zinc-600 text-sm mb-6">
              Be the first to know when we launch!
            </p>
            <form className="space-y-3" onSubmit={(e) => {
              e.preventDefault();
              alert('Thank you! We will notify you when the fabric store launches.');
            }}>
              <input
                type="email"
                placeholder="Enter your email"
                required
                className="w-full h-12 px-4 rounded-lg border-2 border-zinc-200 focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="btn-primary w-full"
              >
                Notify Me
              </button>
            </form>
          </div>

          {/* Back Home Link */}
          <div className="mt-12">
            <a 
              href="/" 
              className="inline-flex items-center text-primary hover:underline font-manrope font-semibold"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FabricPage;
