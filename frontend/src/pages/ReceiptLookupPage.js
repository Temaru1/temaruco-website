import React, { useState } from 'react';
import { Search, Download, CheckCircle, XCircle, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { getReceipt } from '../utils/api';
import { LOGO_BLACK } from '../utils/logoConstants';

const ReceiptLookupPage = () => {
  const [receiptCode, setReceiptCode] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const formatReceiptCode = (input) => {
    // Remove all non-alphanumeric characters
    let cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Format: INV-MMYY-DDXXXX
    let formatted = '';
    
    if (cleaned.startsWith('INV')) {
      formatted = 'INV';
      cleaned = cleaned.substring(3);
      
      if (cleaned.length > 0) {
        formatted += '-' + cleaned.substring(0, 4); // MMYY
      }
      if (cleaned.length > 4) {
        formatted += '-' + cleaned.substring(4, 10); // DDXXXX
      }
    } else {
      // Start typing - guess format
      if (cleaned.length <= 3) {
        formatted = cleaned;
      } else if (cleaned.length <= 7) {
        formatted = cleaned.substring(0, 3) + '-' + cleaned.substring(3);
      } else {
        formatted = cleaned.substring(0, 3) + '-' + cleaned.substring(3, 7) + '-' + cleaned.substring(7, 13);
      }
    }
    
    return formatted;
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!receiptCode.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setReceiptData(null);

    try {
      const response = await getReceipt(receiptCode.trim());
      setReceiptData(response.data);
      toast.success('Receipt found!');
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
        toast.error('Receipt not found');
      } else {
        toast.error('Failed to lookup receipt');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptPDF = () => {
    if (!receiptData) return;

    const printWindow = window.open('', '_blank');
    const logoUrl = LOGO_BLACK;
    const receipt = receiptData;
    const orderDetails = receipt.order_details || {};

    // Format order items based on order type
    let itemsHTML = '';
    
    if (receipt.order_type === 'bulk') {
      const sizeBreakdown = orderDetails.size_breakdown || {};
      const sizes = Object.entries(sizeBreakdown)
        .filter(([_, qty]) => qty > 0)
        .map(([size, qty]) => `${size}: ${qty}`)
        .join(', ');
      
      // Add color breakdown
      const colorQuantities = orderDetails.color_quantities || {};
      const colors = Object.entries(colorQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([color, qty]) => `${color}: ${qty}`)
        .join(', ');
      
      itemsHTML = `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${orderDetails.clothing_item || 'Item'}</strong><br>
            <span style="font-size: 12px; color: #666;">
              Fabric: ${orderDetails.fabric_quality || 'Standard'} | 
              Print: ${orderDetails.print_type || 'None'}<br>
              ${colors ? `Colors: ${colors}<br>` : ''}
              Sizes: ${sizes || 'Standard sizes'}
            </span>
          </td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            ${orderDetails.quantity || 0}
          </td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
            ₦${(receipt.amount_paid || 0).toLocaleString()}
          </td>
        </tr>
      `;
    } else if (receipt.order_type === 'boutique' && orderDetails.cart_items) {
      itemsHTML = orderDetails.cart_items.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.name || 'Product'}</strong><br>
            <span style="font-size: 12px; color: #666;">
              Size: ${item.size || 'N/A'} | Color: ${item.color || 'N/A'}
            </span>
          </td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            ${item.quantity || 1}
          </td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
            ₦${((item.price || 0) * (item.quantity || 1)).toLocaleString()}
          </td>
        </tr>
      `).join('');
    } else if (receipt.order_type === 'pod') {
      // Support both new format (flattened) and old format (nested pod_details)
      const podDetails = orderDetails.pod_details || orderDetails;
      const fabricQuality = orderDetails.fabric_quality || podDetails.fabric_quality || 'Standard';
      const printSize = orderDetails.print_size || podDetails.print_size || 'Small';
      const quantity = orderDetails.quantity || podDetails.quantity || 1;
      
      // Add color breakdown for POD
      const colorQuantities = orderDetails.color_quantities || {};
      const colors = Object.entries(colorQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([color, qty]) => `${color}: ${qty}`)
        .join(', ');
      
      itemsHTML = `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${orderDetails.clothing_item || 'Print-on-Demand T-Shirt'}</strong><br>
            <span style="font-size: 12px; color: #666;">
              Fabric Quality: ${fabricQuality}<br>
              Print Size: ${printSize}<br>
              ${colors ? `Colors: ${colors}<br>` : ''}
              Quantity: ${quantity}
            </span>
          </td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            ${quantity}
          </td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">
            ₦${(receipt.amount_paid || 0).toLocaleString()}
          </td>
        </tr>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RECEIPT - ${receipt.receipt_number}</title>
        <style>
          @page { margin: 2cm; }
          body { 
            font-family: 'Arial', sans-serif; 
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .logo-container {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo-container img {
            max-height: 80px;
            max-width: 300px;
            object-fit: contain;
          }
          .header { 
            border-bottom: 3px solid #D90429; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
            text-align: center;
          }
          .receipt-title {
            font-size: 36px;
            font-weight: bold;
            color: #D90429;
            margin: 20px 0;
            text-align: center;
          }
          .receipt-number {
            font-size: 18px;
            color: #666;
            text-align: center;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 30px; 
            margin: 30px 0;
          }
          .info-section h3 { 
            font-size: 14px; 
            color: #666; 
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .info-section p { 
            margin: 5px 0; 
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          th {
            background: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            border-bottom: 2px solid #D90429;
          }
          .payment-box {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
            border: 2px solid #D90429;
          }
          .amount {
            text-align: center;
            font-size: 48px;
            font-weight: bold;
            color: #D90429;
            margin: 20px 0;
          }
          .payment-details {
            text-align: center;
            font-size: 16px;
            color: #666;
          }
          .footer { 
            margin-top: 60px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .stamp {
            margin-top: 40px;
            padding: 20px;
            border: 2px solid #22c55e;
            background: #f0fdf4;
            text-align: center;
            border-radius: 12px;
          }
          .stamp-text {
            font-size: 24px;
            font-weight: bold;
            color: #22c55e;
          }
          .no-print {
            display: block;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="logo-container">
          <img src="${logoUrl}" alt="Temaruco Logo" />
        </div>
        
        <div class="header">
          <div style="font-size: 14px; color: #666;">Inspire • Empower • Accomplish</div>
        </div>
        
        <div class="receipt-title">OFFICIAL RECEIPT</div>
        <div class="receipt-number">Receipt No: ${receipt.receipt_number}</div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Receipt Details</h3>
            <p><strong>Date:</strong> ${new Date(receipt.created_at).toLocaleDateString()}</p>
            <p><strong>Order ID:</strong> ${receipt.order_number || receipt.order_id}</p>
            <p><strong>Order Type:</strong> ${receipt.order_type?.toUpperCase() || 'BULK'}</p>
            <p><strong>Payment Method:</strong> ${receipt.payment_method || 'Bank Transfer'}</p>
          </div>
          
          <div class="info-section">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${receipt.customer_name}</p>
            <p><strong>Email:</strong> ${receipt.customer_email}</p>
            <p><strong>Phone:</strong> ${receipt.customer_phone}</p>
          </div>
        </div>
        
        <h3 style="margin: 30px 0 10px 0; color: #666; text-transform: uppercase; font-size: 14px;">Order Details</h3>
        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        ${orderDetails.notes ? `
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Order Notes:</strong><br>
            ${orderDetails.notes}
          </div>
        ` : ''}
        
        <div class="payment-box">
          <div class="payment-details">Total Amount Paid</div>
          <div class="amount">₦${(receipt.amount_paid || 0).toLocaleString()}</div>
          <div class="payment-details">Payment Received and Confirmed</div>
        </div>
        
        <div class="stamp">
          <div class="stamp-text">✓ PAID IN FULL</div>
          <div style="font-size: 12px; color: #666; margin-top: 10px;">
            This receipt confirms full payment for Order ${receipt.order_number || receipt.order_id}
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Temaruco Clothing Factory</strong></p>
          <p>Lagos, Nigeria | +234 912 542 3902 | temarucoltd@gmail.com</p>
          <p style="margin-top: 20px; font-size: 10px;">
            This is an official receipt issued by Temaruco Clothing Factory.<br>
            For inquiries, please contact us with your receipt number.
          </p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 40px;">
          <button onclick="window.print()" style="
            background: #D90429; 
            color: white; 
            padding: 12px 30px; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            cursor: pointer;
            margin-right: 10px;
          ">Print Receipt</button>
          <button onclick="window.close()" style="
            background: #666; 
            color: white; 
            padding: 12px 30px; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            cursor: pointer;
          ">Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <Receipt size={64} className="mx-auto mb-4 text-[#D90429]" />
          <h1 className="font-oswald text-5xl font-bold mb-4">Receipt Lookup</h1>
          <p className="text-zinc-600">Enter your receipt number to view and download your receipt</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Receipt Number
              </label>
              <input
                type="text"
                value={receiptCode}
                onChange={(e) => setReceiptCode(formatReceiptCode(e.target.value))}
                placeholder="INV-0226-090001"
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg uppercase"
                style={{ textTransform: 'uppercase' }}
                maxLength={17}
                data-testid="receipt-code-input"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Format: INV-MMYY-DDXXXX (e.g., INV-0226-090001)
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              data-testid="lookup-receipt-btn"
            >
              <Search size={20} />
              {loading ? 'Looking up...' : 'Lookup Receipt'}
            </button>
          </form>
        </div>

        {notFound && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle size={48} className="mx-auto mb-3 text-red-600" />
            <h3 className="font-bold text-lg mb-2">Receipt Not Found</h3>
            <p className="text-zinc-600">No receipt found with number: {receiptCode}</p>
            <p className="text-sm text-zinc-500 mt-2">
              Please check the receipt number and try again. Receipt numbers are in the format INV-MMYY-DDXXXX.
            </p>
          </div>
        )}

        {receiptData && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle size={32} className="text-green-600" />
                <div>
                  <h2 className="font-oswald text-2xl font-bold">Receipt Found</h2>
                  <p className="text-zinc-600">{receiptData.receipt_number}</p>
                </div>
              </div>
              <button
                onClick={generateReceiptPDF}
                className="btn-primary flex items-center gap-2"
                data-testid="download-receipt-pdf-btn"
              >
                <Download size={20} />
                Download PDF
              </button>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-sm text-zinc-500 uppercase mb-2">Receipt Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Date:</strong> {new Date(receiptData.created_at).toLocaleDateString()}</p>
                    <p><strong>Order ID:</strong> {receiptData.order_number || receiptData.order_id}</p>
                    <p><strong>Order Type:</strong> {receiptData.order_type?.toUpperCase() || 'BULK'}</p>
                    <p><strong>Payment Method:</strong> {receiptData.payment_method || 'Bank Transfer'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm text-zinc-500 uppercase mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {receiptData.customer_name}</p>
                    <p><strong>Email:</strong> {receiptData.customer_email}</p>
                    <p><strong>Phone:</strong> {receiptData.customer_phone}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mt-6">
                <p className="text-sm text-zinc-600 mb-2">Total Amount Paid</p>
                <p className="text-4xl font-bold text-green-600">
                  ₦{(receiptData.amount_paid || 0).toLocaleString()}
                </p>
                <div className="mt-4 inline-block bg-green-600 text-white px-6 py-2 rounded-full font-semibold">
                  ✓ PAID IN FULL
                </div>
              </div>

              {/* Order Details Section */}
              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold text-lg mb-4">Order Details</h3>
                
                {receiptData.order_type === 'bulk' && receiptData.order_details && (
                  <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-zinc-500">Item</p>
                        <p className="font-semibold">{receiptData.order_details.clothing_item || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Quantity</p>
                        <p className="font-semibold">{receiptData.order_details.quantity || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Fabric Quality</p>
                        <p className="font-semibold">{receiptData.order_details.fabric_quality || 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Print Type</p>
                        <p className="font-semibold">{receiptData.order_details.print_type || 'None'}</p>
                      </div>
                    </div>
                    {receiptData.order_details.size_breakdown && Object.keys(receiptData.order_details.size_breakdown).length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-zinc-500 mb-2">Size Breakdown</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(receiptData.order_details.size_breakdown)
                            .filter(([_, qty]) => qty > 0)
                            .map(([size, qty]) => (
                              <span key={size} className="bg-white px-3 py-1 rounded-full text-sm border">
                                {size}: {qty}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {receiptData.order_type === 'pod' && receiptData.order_details && (
                  <div className="bg-zinc-50 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-zinc-500">Product</p>
                        <p className="font-semibold">Print-on-Demand T-Shirt</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Quantity</p>
                        <p className="font-semibold">
                          {receiptData.order_details.quantity || 
                           receiptData.order_details.pod_details?.quantity || 1}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Shirt Quality</p>
                        <p className="font-semibold">
                          {receiptData.order_details.shirt_quality || 
                           receiptData.order_details.pod_details?.shirt_quality || 'Standard'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Print Size</p>
                        <p className="font-semibold">
                          {receiptData.order_details.print_size || 
                           receiptData.order_details.pod_details?.print_size || 'A4'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {receiptData.order_type === 'boutique' && receiptData.order_details?.cart_items && (
                  <div className="space-y-3">
                    {receiptData.order_details.cart_items.map((item, idx) => (
                      <div key={idx} className="bg-zinc-50 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{item.name || 'Product'}</p>
                          <p className="text-sm text-zinc-600">
                            Size: {item.size || 'N/A'} | Color: {item.color || 'N/A'} | Qty: {item.quantity || 1}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {receiptData.order_details?.notes && (
                <div className="bg-zinc-50 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-sm mb-2">Order Notes</h3>
                  <p className="text-sm text-zinc-700">{receiptData.order_details.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptLookupPage;
