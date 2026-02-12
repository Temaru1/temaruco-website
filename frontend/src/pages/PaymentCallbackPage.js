import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { verifyPayment } from '../utils/api';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    const reference = searchParams.get('reference');
    
    if (!reference) {
      setStatus('error');
      return;
    }

    verifyPaymentStatus(reference);
  }, [searchParams]);

  const verifyPaymentStatus = async (reference) => {
    try {
      const response = await verifyPayment(reference);
      
      if (response.data.status && response.data.data.status === 'success') {
        setStatus('success');
        setOrderData(response.data.data);
        localStorage.removeItem('cart');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="font-manrope text-zinc-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-zinc-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {status === 'success' ? (
            <>
              <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
              <h1 className="font-oswald text-3xl font-bold text-green-600 mb-4" data-testid="payment-success">
                Payment Successful!
              </h1>
              <p className="font-manrope text-zinc-600 mb-6">
                Your order has been confirmed and will be processed shortly.
              </p>
              {orderData && (
                <div className="bg-zinc-50 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-zinc-600 mb-1">Transaction Reference</p>
                  <p className="font-mono text-xs">{orderData.reference}</p>
                  <p className="text-sm text-zinc-600 mt-3 mb-1">Amount Paid</p>
                  <p className="text-2xl font-oswald font-bold text-primary">
                    ₦{(orderData.amount / 100).toLocaleString()}
                  </p>
                </div>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary w-full"
                data-testid="go-to-dashboard-btn"
              >
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <XCircle className="mx-auto text-red-600 mb-4" size={64} />
              <h1 className="font-oswald text-3xl font-bold text-red-600 mb-4" data-testid="payment-failed">
                Payment Failed
              </h1>
              <p className="font-manrope text-zinc-600 mb-6">
                We couldn't verify your payment. Please try again or contact support.
              </p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary w-full"
                data-testid="return-home-btn"
              >
                Return to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
