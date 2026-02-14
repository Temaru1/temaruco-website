import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

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
  const [allRates, setAllRates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectCurrency();
    loadRates();
  }, []);

  const detectCurrency = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/currency/detect`);
      const data = response.data;
      setCurrency({
        code: data.currency_code,
        symbol: data.currency_symbol,
        name: data.currency_name,
        rate: data.exchange_rate
      });
      // Store in localStorage for persistence
      localStorage.setItem('userCurrency', JSON.stringify({
        code: data.currency_code,
        symbol: data.currency_symbol,
        name: data.currency_name,
        rate: data.exchange_rate
      }));
    } catch (error) {
      console.error('Failed to detect currency:', error);
      // Try to load from localStorage
      const saved = localStorage.getItem('userCurrency');
      if (saved) {
        setCurrency(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRates = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/currency/rates`);
      setAllRates(response.data.rates);
    } catch (error) {
      console.error('Failed to load currency rates:', error);
    }
  };

  const changeCurrency = (currencyCode) => {
    if (allRates[currencyCode]) {
      const newCurrency = {
        code: currencyCode,
        symbol: allRates[currencyCode].symbol,
        name: allRates[currencyCode].name,
        rate: allRates[currencyCode].rate
      };
      setCurrency(newCurrency);
      localStorage.setItem('userCurrency', JSON.stringify(newCurrency));
    }
  };

  // Convert NGN amount to user's currency
  const convertPrice = (amountNGN) => {
    if (!amountNGN || isNaN(amountNGN)) return 0;
    return Math.round(amountNGN * currency.rate * 100) / 100;
  };

  // Format price with currency symbol
  const formatPrice = (amountNGN, showOriginal = false) => {
    const converted = convertPrice(amountNGN);
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: currency.code === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency.code === 'NGN' ? 0 : 2
    });
    
    if (showOriginal && currency.code !== 'NGN') {
      return `${currency.symbol}${formatted} (₦${amountNGN.toLocaleString()})`;
    }
    return `${currency.symbol}${formatted}`;
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      allRates,
      loading,
      changeCurrency,
      convertPrice,
      formatPrice
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
