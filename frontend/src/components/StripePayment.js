import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const StripePayment = ({ 
  orderId, 
  orderType, 
  amountNGN,  // Amount in NGN
  email, 
  customerName,
  onSuccess, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [amountUSD, setAmountUSD] = useState(null);

  // Calculate USD amount on mount
  useEffect(() => {
    const calculateUSD = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/currency/rates`);
        const usdRate = response.data.rates?.USD?.rate || 0.00063;
        setAmountUSD((amountNGN * usdRate).toFixed(2));
      } catch {
        setAmountUSD((amountNGN * 0.00063).toFixed(2));  // Fallback rate
      }
    };
    calculateUSD();
  }, [amountNGN]);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Initialize Stripe checkout session
      const response = await axios.post(`${API_URL}/api/payments/stripe/initialize`, {
        order_id: orderId,
        order_type: orderType,
        amount: amountNGN,
        email: email,
        origin_url: window.location.origin,
        metadata: {
          customer_name: customerName
        }
      });

      if (response.data.status && response.data.data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      toast.error(error.response?.data?.detail || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  return (
    <div className="payment-section mt-6">
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-[#635BFF] hover:bg-[#5851DB] text-white py-4 text-lg flex items-center justify-center gap-2 rounded-lg font-medium transition-colors"
        data-testid="pay-with-stripe-btn"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Redirecting to Stripe...
          </>
        ) : (
          <>
            <CreditCard className="w-6 h-6" />
            Pay ${amountUSD || '...'} USD with Card
          </>
        )}
      </button>

      <p className="text-xs text-zinc-500 text-center mt-3">
        Secure international payment powered by Stripe
      </p>
    </div>
  );
};

// Payment success page component for handling Stripe redirects
export const StripePaymentSuccess = ({ sessionId, onSuccess }) => {
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  const checkPaymentStatus = useCallback(async () => {
    if (!sessionId || attempts >= 10) return;

    try {
      const response = await axios.get(`${API_URL}/api/payments/stripe/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        setStatus('success');
        toast.success('Payment successful!');
        if (onSuccess) onSuccess(response.data);
      } else if (response.data.session_status === 'expired') {
        setStatus('expired');
        toast.error('Payment session expired');
      } else {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      setStatus('error');
    }
  }, [sessionId, attempts, onSuccess]);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-[#635BFF] mb-4" />
        <p className="text-lg font-medium">Verifying your payment...</p>
        <p className="text-sm text-zinc-500 mt-2">Please wait, do not close this page</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-medium text-green-600">Payment Successful!</p>
        <p className="text-sm text-zinc-500 mt-2">Your order is being processed</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p className="text-lg font-medium text-red-600">Payment {status === 'expired' ? 'Expired' : 'Failed'}</p>
      <p className="text-sm text-zinc-500 mt-2">Please try again or contact support</p>
    </div>
  );
};

export default StripePayment;
