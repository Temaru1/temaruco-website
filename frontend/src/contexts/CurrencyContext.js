import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState({
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    rate: 1
  });
  const [loading, setLoading] = useState(true);
  const [countryCode, setCountryCode] = useState('NG');

  // Currency data for common countries
  const CURRENCIES = {
    'NG': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rate: 1 },
    'US': { code: 'USD', symbol: '$', name: 'US Dollar', rate: 0.00063 },
    'GB': { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.00050 },
    'EU': { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.00058 },
    'CA': { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 0.00085 },
    'AU': { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 0.00096 },
    'GH': { code: 'GHS', symbol: '₵', name: 'Ghana Cedi', rate: 0.0078 },
    'KE': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rate: 0.082 },
    'ZA': { code: 'ZAR', symbol: 'R', name: 'South African Rand', rate: 0.012 },
    'IN': { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 0.053 },
    'AE': { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 0.0023 },
    'DEFAULT': { code: 'USD', symbol: '$', name: 'US Dollar', rate: 0.00063 }
  };

  const detectLocation = useCallback(async () => {
    setLoading(true);
    try {
      // Try backend detection first (uses CF headers)
      const backendResponse = await axios.get(`${API_URL}/api/currency/detect`, {
        timeout: 5000
      });
      
      if (backendResponse.data?.currency_code) {
        const code = backendResponse.data.country_code || 'US';
        setCountryCode(code);
        setCurrency({
          code: backendResponse.data.currency_code,
          symbol: backendResponse.data.currency_symbol,
          name: backendResponse.data.currency_name,
          rate: backendResponse.data.exchange_rate
        });
        setLoading(false);
        return;
      }
    } catch (e) {
      console.log('Backend currency detection failed, trying IP service...');
    }

    try {
      // Fallback to free IP geolocation service
      const ipResponse = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
      const country = ipResponse.data?.country_code || 'US';
      setCountryCode(country);
      
      // Map country to currency
      const currencyData = CURRENCIES[country] || CURRENCIES['DEFAULT'];
      setCurrency(currencyData);
    } catch (e) {
      console.log('IP detection failed, using default currency');
      setCurrency(CURRENCIES['DEFAULT']);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  // Format price based on detected currency
  const formatPrice = useCallback((priceNGN) => {
    if (loading || !priceNGN) return `${currency.symbol}...`;
    
    // If Nigerian, show NGN price directly
    if (currency.code === 'NGN') {
      return `₦${priceNGN.toLocaleString()}`;
    }
    
    // Convert from NGN to local currency
    const convertedPrice = priceNGN * currency.rate;
    
    // Format based on currency
    if (currency.code === 'USD' || currency.code === 'CAD' || currency.code === 'AUD') {
      return `${currency.symbol}${convertedPrice.toFixed(2)}`;
    }
    
    return `${currency.symbol}${convertedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }, [currency, loading]);

  // Get both prices (for display purposes)
  const getPrices = useCallback((priceNGN) => {
    const converted = priceNGN * currency.rate;
    return {
      ngn: `₦${priceNGN.toLocaleString()}`,
      local: currency.code === 'NGN' 
        ? null 
        : `${currency.symbol}${converted.toFixed(2)}`,
      localValue: converted
    };
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatPrice, 
      getPrices,
      loading,
      countryCode,
      isNigeria: countryCode === 'NG'
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
