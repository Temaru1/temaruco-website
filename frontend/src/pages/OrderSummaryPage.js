import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { CheckCircle2, Upload, Copy, Phone, AlertCircle, Package, Truck, Clock, CreditCard, Building } from 'lucide-react';
import api from '../utils/api';
import PaystackPayment from '../components/PaystackPayment';

const OrderSummaryPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paystack'); // 'paystack' or 'bank'

  useEffect(() => {
    fetchOrderAndBankDetails();
  }, [orderId]);

  const fetchOrderAndBankDetails = async () => {
    try {
      setLoading(true);
      const [orderRes, bankRes] = await Promise.all([
        api.get(`/orders/${orderId}`),
        api.get('/bank-details')
      ]);
      
      setOrder(orderRes.data);
      setBankDetails(bankRes.data);
      setPaymentReference(orderRes.data.order_id || orderRes.data.id);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrderId = () => {
    const idToCopy = order?.order_id || order?.id;
    navigator.clipboard.writeText(idToCopy);
    toast.success('Order ID copied to clipboard!');
  };

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(bankDetails.account_number);
    toast.success('Account number copied to clipboard!');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setPaymentProofFile(file);
    }
  };

  const handleUploadPaymentProof = async () => {
    if (!paymentProofFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('proof_file', paymentProofFile);
      formData.append('payment_reference', paymentReference);
      formData.append('notes', paymentNotes);

      await api.post(`/orders/${orderId}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Payment proof uploaded successfully! We will verify and confirm your payment soon.');
      
      // Refresh order data
      await fetchOrderAndBankDetails();
      
      // Clear form
      setPaymentProofFile(null);
      setPaymentNotes('');
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload payment proof');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_payment: { label: 'Pending Payment', color: 'bg-yellow-500' },
      payment_submitted: { label: 'Payment Submitted', color: 'bg-blue-500' },
      payment_verified: { label: 'Payment Verified', color: 'bg-green-500' },
      in_production: { label: 'In Production', color: 'bg-purple-500' },
      ready_for_delivery: { label: 'Ready for Delivery', color: 'bg-indigo-500' },
      completed: { label: 'Completed', color: 'bg-gray-500' },
      delivered: { label: 'Delivered', color: 'bg-green-600' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>The order you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8" data-testid="order-summary-header">
          <div className="flex justify-center mb-4">
            <img 
              src="https://via.placeholder.com/120x40?text=TEMARUCO" 
              alt="Temaruco Logo" 
              className="h-10"
            />
          </div>
          <h1 className="font-oswald text-4xl font-bold mb-2">Order Confirmation</h1>
          {order.status === 'pending_payment' ? (
            <p className="text-zinc-600">Your order will be processed when payment is received.</p>
          ) : (
            <p className="text-zinc-600">Thank you for your order!</p>
          )}
        </div>

        {/* Order Status Alert */}
        {order.status === 'payment_submitted' && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Your payment proof has been submitted. We're verifying your payment and will notify you once confirmed.
            </AlertDescription>
          </Alert>
        )}

        {order.status === 'payment_verified' && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              Payment verified! Your order is in the production queue.
            </AlertDescription>
          </Alert>
        )}

        {/* Order ID Card */}
        <Card className="mb-6" data-testid="order-id-card">
          <CardHeader className="bg-primary text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Order ID</CardTitle>
                <p className="text-3xl font-bold font-mono mt-2">
                  {order.order_id || order.id}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyOrderId}
                data-testid="copy-order-id-btn"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600">Order Status:</span>
              {getStatusBadge(order.status)}
            </div>
            <Alert className="mt-4 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900 font-semibold">
                Use this Order ID as your payment reference!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="mb-6" data-testid="order-details-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-600">Customer Name</p>
                <p className="font-semibold">{order.user_name}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Email</p>
                <p className="font-semibold">{order.user_email}</p>
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            {order.type === 'bulk' && (
              <div>
                <p className="text-sm text-zinc-600 mb-2">Items Ordered</p>
                <div className="bg-zinc-50 p-4 rounded-lg">
                  <p className="font-semibold text-lg">{order.clothing_item}</p>
                  <p className="text-sm text-zinc-600">Quantity: {order.quantity}</p>
                  <p className="text-sm text-zinc-600">Print Type: {order.print_type}</p>
                  <p className="text-sm text-zinc-600">Fabric Quality: {order.fabric_quality}</p>
                  
                  {/* Color Breakdown */}
                  {order.color_quantities && Object.keys(order.color_quantities).length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-zinc-600">Color Breakdown:</p>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {Object.entries(order.color_quantities).map(([color, qty]) => (
                          <span key={color} className="text-sm bg-white px-2 py-1 rounded border">
                            {color}: {qty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Size Breakdown */}
                  <div className="mt-2">
                    <p className="text-sm text-zinc-600">Size Breakdown:</p>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {Object.entries(order.size_breakdown || {}).map(([size, qty]) => (
                        <span key={size} className="text-sm bg-white px-2 py-1 rounded">
                          {size}: {qty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {order.type === 'pod' && (
              <div>
                <p className="text-sm text-zinc-600 mb-2">POD Order</p>
                <div className="bg-zinc-50 p-4 rounded-lg">
                  <p className="font-semibold">Custom Print on Demand T-Shirts</p>
                  <p className="text-sm text-zinc-600">Quantity: {order.quantity}</p>
                  <p className="text-sm text-zinc-600">Shirt Quality: {order.shirt_quality}</p>
                  <p className="text-sm text-zinc-600">Print Size: {order.print_size}</p>
                  <div className="mt-2">
                    <p className="text-sm text-zinc-600">Size Breakdown:</p>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {Object.entries(order.size_breakdown || {}).map(([size, qty]) => (
                        <span key={size} className="text-sm bg-white px-2 py-1 rounded">
                          {size}: {qty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Details */}
            {(order.delivery_address || order.recipient_name) && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-zinc-600 mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Delivery Information
                  </p>
                  <div className="bg-zinc-50 p-4 rounded-lg space-y-2">
                    {order.recipient_name && (
                      <p><span className="text-sm text-zinc-600">Recipient:</span> {order.recipient_name}</p>
                    )}
                    {order.delivery_phone && (
                      <p><span className="text-sm text-zinc-600">Phone:</span> {order.delivery_phone}</p>
                    )}
                    {order.delivery_address && (
                      <p><span className="text-sm text-zinc-600">Address:</span> {order.delivery_address}</p>
                    )}
                    {order.delivery_city && order.delivery_state && (
                      <p><span className="text-sm text-zinc-600">Location:</span> {order.delivery_city}, {order.delivery_state}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Total Cost */}
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-primary">
                  ₦{order.total_price?.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Options Section */}
        {order.status === 'pending_payment' && (
          <Card className="mb-6" data-testid="payment-options-card">
            <CardHeader>
              <CardTitle>Choose Payment Method</CardTitle>
              <CardDescription>Select your preferred payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Button
                  variant={paymentMethod === 'paystack' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('paystack')}
                  className="flex-1 py-6"
                  data-testid="paystack-method-btn"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay Online (Paystack)
                </Button>
                <Button
                  variant={paymentMethod === 'bank' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('bank')}
                  className="flex-1 py-6"
                  data-testid="bank-method-btn"
                >
                  <Building className="w-5 h-5 mr-2" />
                  Bank Transfer
                </Button>
              </div>
              
              {/* Paystack Payment Option */}
              {paymentMethod === 'paystack' && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      Pay instantly with your card, bank account, or USSD. Secure payment powered by Paystack.
                    </AlertDescription>
                  </Alert>
                  <PaystackPayment
                    orderId={order.order_id || order.id}
                    orderType={order.type || 'bulk'}
                    amount={order.total_price}
                    email={order.user_email}
                    customerName={order.user_name}
                    onSuccess={(data) => {
                      toast.success('Payment successful! Your order is being processed.');
                      fetchOrderAndBankDetails(); // Refresh order status
                    }}
                    onClose={() => {
                      toast.info('Payment cancelled. You can try again or use bank transfer.');
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bank Transfer Details */}
        {bankDetails && order.status === 'pending_payment' && paymentMethod === 'bank' && (
          <Card className="mb-6" data-testid="bank-details-card">
            <CardHeader className="bg-zinc-900 text-white">
              <CardTitle>Bank Transfer Details</CardTitle>
              <CardDescription className="text-zinc-300">
                Please make payment to the account below
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-zinc-50 p-6 rounded-lg space-y-4">
                <div>
                  <p className="text-sm text-zinc-600">Bank Name</p>
                  <p className="text-xl font-bold">{bankDetails.bank_name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600">Account Name</p>
                  <p className="text-xl font-bold">{bankDetails.account_name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-600">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold font-mono">{bankDetails.account_number}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAccountNumber}
                      data-testid="copy-account-number-btn"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Important:</strong> Use your Order ID <strong>{order.order_id || order.id}</strong> as the payment reference/narration.
                </AlertDescription>
              </Alert>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Payment Instructions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-zinc-600">
                  {bankDetails.instructions?.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Payment Proof */}
        {order.status === 'pending_payment' && paymentMethod === 'bank' && (
          <Card className="mb-6" data-testid="payment-proof-upload-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Payment Proof
              </CardTitle>
              <CardDescription>
                Upload your bank transfer receipt or send to WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg"
                  placeholder="Enter payment reference"
                  data-testid="payment-reference-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload Receipt/Screenshot
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg"
                  data-testid="payment-proof-file-input"
                />
                {paymentProofFile && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {paymentProofFile.name} selected
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg"
                  placeholder="Any additional information..."
                  data-testid="payment-notes-input"
                />
              </div>

              <Button
                onClick={handleUploadPaymentProof}
                disabled={uploading || !paymentProofFile}
                className="w-full"
                data-testid="upload-payment-proof-btn"
              >
                {uploading ? 'Uploading...' : 'Upload Payment Proof'}
              </Button>

              <div className="text-center">
                <Separator className="my-4" />
                <p className="text-sm text-zinc-600 mb-2">Or send proof to WhatsApp:</p>
                <a
                  href={`https://wa.me/${bankDetails?.whatsapp}?text=Hello, I've made payment for Order ID: ${order.order_id || order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
                  data-testid="whatsapp-link"
                >
                  <Phone className="w-4 h-4" />
                  {bankDetails?.whatsapp}
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Actions */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            data-testid="back-home-btn"
          >
            Back to Homepage
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryPage;
