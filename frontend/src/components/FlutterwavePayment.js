import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CreditCard, Loader2, Check, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const FLUTTERWAVE_PUBLIC_KEY = process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY;

const FlutterwavePayment = ({ 
  orderId, 
  orderType, 
  amount,  // Amount in NGN
  email, 
  customerName,
  phone,
  currency = 'NGN',
  onSuccess, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(amount);
  const [displayCurrency, setDisplayCurrency] = useState(currency);

  // Calculate USD amount if needed
  useEffect(() => {
    const calculateAmount = async () => {
      if (currency === 'USD') {
        try {
          const response = await axios.get(`${API_URL}/api/currency/rates`);
          const usdRate = response.data.rates?.USD?.rate || 0.00063;
          setDisplayAmount((amount * usdRate).toFixed(2));
          setDisplayCurrency('USD');
        } catch {
          setDisplayAmount((amount * 0.00063).toFixed(2));
          setDisplayCurrency('USD');
        }
      } else {
        setDisplayAmount(amount);
        setDisplayCurrency('NGN');
      }
    };
    calculateAmount();
  }, [amount, currency]);

  // Verify payment function
  const verifyPayment = useCallback(async (transactionId, txRef) => {
    try {
      const response = await axios.post(`${API_URL}/api/payments/flutterwave/verify`, {
        transaction_id: transactionId,
        tx_ref: txRef,
        order_id: orderId
      });

      if (response.data.status && response.data.data?.status === 'successful') {
        toast.success('Payment successful!');
        
        // Send status update email (fire and forget)
        axios.post(`${API_URL}/api/orders/${orderId}/send-status-email`)
          .catch((emailError) => {
            console.error('Failed to send email:', emailError);
          });
        
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        toast.error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error(error.response?.data?.detail || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  }, [orderId, onSuccess]);

  const handlePayment = async () => {
    if (!window.FlutterwaveCheckout) {
      toast.error('Payment service not loaded. Please refresh the page.');
      return;
    }

    if (!FLUTTERWAVE_PUBLIC_KEY) {
      toast.error('Payment configuration error. Please contact support.');
      return;
    }

    setLoading(true);

    try {
      // Initialize payment on backend to get reference
      const initResponse = await axios.post(`${API_URL}/api/payments/flutterwave/initialize`, {
        email: email,
        amount: amount,
        currency: displayCurrency,
        order_id: orderId,
        order_type: orderType,
        customer_name: customerName,
        phone: phone || '',
        metadata: {
          customer_name: customerName,
          order_type: orderType
        }
      });

      const paymentData = initResponse.data.data;

      // Open Flutterwave modal
      window.FlutterwaveCheckout({
        public_key: FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: paymentData.tx_ref,
        amount: displayCurrency === 'USD' ? parseFloat(displayAmount) : amount,
        currency: displayCurrency,
        payment_options: 'card,mobilemoney,ussd,banktransfer',
        customer: {
          email: email,
          phone_number: phone || '',
          name: customerName
        },
        customizations: {
          title: 'Temaruco Payment',
          description: `Payment for order ${orderId}`,
          logo: `${window.location.origin}/logo.png`
        },
        callback: function(response) {
          // Verify payment on success
          if (response.status === 'completed' || response.status === 'successful') {
            verifyPayment(response.transaction_id, response.tx_ref);
          } else {
            toast.error('Payment was not completed');
            setLoading(false);
          }
        },
        onclose: function() {
          if (!loading) {
            toast.info('Payment cancelled');
            if (onClose) onClose();
          }
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error.response?.data?.detail || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  const formattedAmount = displayCurrency === 'NGN' 
    ? `₦${Number(displayAmount).toLocaleString()}` 
    : `$${displayAmount}`;

  return (
    <div className="payment-section mt-6">
      <button
        onClick={handlePayment}
        disabled={loading || !FLUTTERWAVE_PUBLIC_KEY}
        className="w-full bg-[#F5A623] hover:bg-[#E09612] text-white py-4 text-lg flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="pay-with-flutterwave-btn"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-6 h-6" />
            Pay {formattedAmount} with Flutterwave
          </>
        )}
      </button>

      {!FLUTTERWAVE_PUBLIC_KEY && (
        <p className="text-sm text-red-600 mt-2 text-center">
          Payment configuration error. Please contact support.
        </p>
      )}

      <p className="text-xs text-zinc-500 text-center mt-3">
        Secure payment powered by Flutterwave • Cards, Bank Transfer, USSD, Mobile Money
      </p>
    </div>
  );
};

// Payment success component for handling redirects
export const FlutterwavePaymentSuccess = ({ txRef, transactionId, onSuccess }) => {
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  const checkPaymentStatus = useCallback(async () => {
    if (!txRef || attempts >= 10) return;

    try {
      const response = await axios.get(`${API_URL}/api/payments/flutterwave/status/${txRef}`);
      
      if (response.data.status && response.data.data?.status === 'successful') {
        setStatus('success');
        toast.success('Payment successful!');
        if (onSuccess) onSuccess(response.data);
      } else if (response.data.data?.status === 'failed') {
        setStatus('failed');
        toast.error('Payment failed');
      } else {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      setStatus('error');
    }
  }, [txRef, attempts, onSuccess]);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-[#F5A623] mb-4" />
        <p className="text-lg font-medium">Verifying your payment...</p>
        <p className="text-sm text-zinc-500 mt-2">Please wait, do not close this page</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-medium text-green-600">Payment Successful!</p>
        <p className="text-sm text-zinc-500 mt-2">Your order is being processed</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <X className="w-8 h-8 text-red-600" />
      </div>
      <p className="text-lg font-medium text-red-600">Payment {status === 'failed' ? 'Failed' : 'Error'}</p>
      <p className="text-sm text-zinc-500 mt-2">Please try again or contact support</p>
    </div>
  );
};

export default FlutterwavePayment;
