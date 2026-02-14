import React from 'react';
import QuickPriceCalculator from '../components/QuickPriceCalculator';

const PriceCalculatorPage = () => {
  return (
    <div className="min-h-screen py-16 px-4 bg-zinc-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-oswald text-5xl font-bold mb-4">
            Price Calculator
          </h1>
          <p className="text-lg text-zinc-600">
            Get instant price estimates for your bulk clothing orders
          </p>
        </div>

        <QuickPriceCalculator />

        {/* Additional Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-2">Volume Discounts</h3>
            <ul className="text-sm text-zinc-600 space-y-1">
              <li>• 100-199 units: 5% off</li>
              <li>• 200-499 units: 10% off</li>
              <li>• 500+ units: 15% off</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-2">Print Options</h3>
            <ul className="text-sm text-zinc-600 space-y-1">
              <li>• DTF Printing</li>
              <li>• Embroidery</li>
              <li>• Screen Printing</li>
              <li>• Plain (No Print)</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-2">Fabric Quality</h3>
            <ul className="text-sm text-zinc-600 space-y-1">
              <li>• Standard Quality</li>
              <li>• Premium Quality</li>
              <li>• Luxury Quality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceCalculatorPage;
