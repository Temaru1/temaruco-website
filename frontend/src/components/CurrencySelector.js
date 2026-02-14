import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';

const CurrencySelector = ({ className = '' }) => {
  const { currency, allRates, changeCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const currencies = Object.entries(allRates).map(([code, info]) => ({
    code,
    symbol: info.symbol,
    name: info.name
  }));

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
        data-testid="currency-selector"
      >
        <Globe size={16} />
        <span className="font-medium">{currency.symbol} {currency.code}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border z-50 max-h-80 overflow-y-auto">
            <div className="p-2">
              <p className="text-xs text-zinc-500 px-3 py-2 font-medium">Select Currency</p>
              {currencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    changeCurrency(c.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currency.code === c.code 
                      ? 'bg-red-50 text-red-600' 
                      : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                  data-testid={`currency-option-${c.code}`}
                >
                  <span className="w-8 text-lg font-medium">{c.symbol}</span>
                  <div>
                    <p className="font-medium text-sm">{c.code}</p>
                    <p className="text-xs text-zinc-500">{c.name}</p>
                  </div>
                  {currency.code === c.code && (
                    <span className="ml-auto text-red-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CurrencySelector;
