import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const [paymentData, setPaymentData] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const checkPaymentStatus = async () => {
      if (attempts >= 10) {
        setStatus('timeout');
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/payments/stripe/status/${sessionId}`);
        setPaymentData(response.data);

        if (response.data.payment_status === 'paid') {
          setStatus('success');
        } else if (response.data.session_status === 'expired') {
          setStatus('expired');
        } else {
          // Continue polling
          setAttempts(prev => prev + 1);
          setTimeout(checkPaymentStatus, 2000);
        }
      } catch (error) {
        console.error('Payment status check error:', error);
        setStatus('error');
      }
    };

    checkPaymentStatus();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8">
          {status === 'checking' && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 animate-spin text-[#635BFF] mx-auto mb-6" />
              <h1 className="text-2xl font-bold mb-2">Verifying Payment</h1>
              <p className="text-zinc-600">Please wait while we confirm your payment...</p>
              <p className="text-sm text-zinc-400 mt-4">Do not close this page</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
              <p className="text-zinc-600 mb-2">Thank you for your payment.</p>
              {paymentData && (
                <p className="text-lg font-semibold mb-6">
                  ${paymentData.amount?.toFixed(2)} {paymentData.currency}
                </p>
              )}
              <p className="text-sm text-zinc-500 mb-6">
                Your order is now being processed. You will receive a confirmation email shortly.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full bg-[#D90429] hover:bg-[#B90322]"
                >
                  Continue Shopping <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/track-order')}
                  className="w-full"
                >
                  Track Your Order
                </Button>
              </div>
            </div>
          )}

          {(status === 'error' || status === 'expired' || status === 'timeout') && (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">
                {status === 'expired' ? 'Payment Expired' : 'Payment Failed'}
              </h1>
              <p className="text-zinc-600 mb-6">
                {status === 'expired' 
                  ? 'Your payment session has expired. Please try again.'
                  : status === 'timeout'
                  ? 'We couldn\'t verify your payment. Please contact support if you were charged.'
                  : 'Something went wrong with your payment. Please try again.'}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate(-1)}
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/contact')}
                  className="w-full"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
