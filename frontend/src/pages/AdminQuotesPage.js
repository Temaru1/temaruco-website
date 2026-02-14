/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Plus, FileText, FileCheck, Receipt, Trash2, Edit, Download, Search, X, Eye, Mail, Send } from 'lucide-react';
import { createManualQuote, getManualQuotes, getReceipts, getCMSSettings, deleteManualQuote, lookupOrderByCode, sendQuoteEmail } from '../utils/api';
import { toast } from 'sonner';
import OrderCodeInput from '../components/OrderCodeInput';
import { LOGO_BLACK } from '../utils/logoConstants';

const AdminQuotesPage = () => {
  const [quotes, setQuotes] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [taxType, setTaxType] = useState('percentage'); // 'percentage' or 'fixed'
  const [lookupCode, setLookupCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' or 'lookup'
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const [formData, setFormData] = useState({
    quote_type: 'quote',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax: 0,
    taxPercentage: 7.5, // Default VAT in Nigeria
    discount: 0,
    total: 0,
    notes: '',
    status: 'pending'
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load quotes and receipts based on filter
      if (filterType === 'receipt') {
        // Load receipts
        const [receiptsRes, settingsRes] = await Promise.all([
          getReceipts(),
          getCMSSettings()
        ]);
        setReceipts(receiptsRes.data);
        setQuotes([]); // Clear quotes when showing receipts
        setSettings(settingsRes.data);
      } else {
        // Load quotes
        const [quotesRes, settingsRes] = await Promise.all([
          getManualQuotes(filterType),
          getCMSSettings()
        ]);
        setQuotes(quotesRes.data);
        setReceipts([]); // Clear receipts when showing quotes
        setSettings(settingsRes.data);
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const handleLookupCode = async () => {
    if (!lookupCode.trim()) {
      toast.error('Please enter an order or enquiry code');
      return;
    }

    setLookupLoading(true);
    try {
      const response = await lookupOrderByCode(lookupCode.trim());
      const { type, data } = response.data;

      if (type === 'enquiry') {
        // Auto-fill from custom order request
        setFormData({
          ...formData,
          client_name: data.user_name,
          client_email: data.user_email,
          client_phone: data.user_phone,
          items: [{
            description: `Custom Order: ${data.item_description}\nSpecifications: ${data.specifications || 'N/A'}`,
            quantity: data.quantity,
            unit_price: 0, // Admin needs to set price
            total: 0
          }],
          notes: `Custom order request ENQ code: ${data.enquiry_code}\nTarget Price: ${data.target_price ? '₦' + data.target_price : 'Not specified'}\nDeadline: ${data.deadline || 'Not specified'}\nCustomer Notes: ${data.notes || 'None'}`
        });
        toast.success('Enquiry details loaded! Please set pricing.');
      } else if (type === 'order') {
        // Auto-fill from existing order
        const items = [];
        
        if (data.type === 'bulk') {
          items.push({
            description: `Bulk Order: ${data.clothing_item} (${data.print_type}, ${data.fabric_quality})`,
            quantity: data.quantity,
            unit_price: data.total_price / data.quantity,
            total: data.total_price
          });
        } else if (data.type === 'pod') {
          items.push({
            description: `POD T-Shirts (${data.shirt_quality}, Print: ${data.print_size})`,
            quantity: data.quantity,
            unit_price: data.price_per_item,
            total: data.total_price
          });
        } else if (data.type === 'boutique') {
          data.cart_items.forEach(item => {
            items.push({
              description: item.name,
              quantity: item.quantity,
              unit_price: item.price,
              total: item.price * item.quantity
            });
          });
        }

        setFormData({
          ...formData,
          client_name: data.user_name,
          client_email: data.user_email,
          client_phone: data.user_phone || '',
          client_address: data.delivery_address || '',
          items: items.length > 0 ? items : [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
          notes: `Order ID: ${data.order_id || data.id}\nOrder Type: ${data.type}`
        });
        
        calculateTotals(items);
        toast.success('Order details loaded successfully!');
      }

      setLookupCode('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code not found');
    } finally {
      setLookupLoading(false);
    }
  };


  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.taxPercentage, formData.discount);
  };

  const calculateTotals = (items, taxPercentage, discount) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = taxType === 'percentage' 
      ? (subtotal * (taxPercentage || 0)) / 100
      : formData.tax;
    const total = subtotal + taxAmount - (discount || 0);
    setFormData(prev => ({ ...prev, subtotal, tax: taxAmount, total }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createManualQuote(formData);
      toast.success(`${formData.quote_type} created successfully!`);
      setShowCreateModal(false);
      loadData();
      resetForm();
    } catch (error) {
      toast.error('Failed to create ' + formData.quote_type);
    }
  };

  const resetForm = () => {
    setFormData({
      quote_type: 'quote',
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
      subtotal: 0,
      tax: 0,
      taxPercentage: 7.5,
      discount: 0,
      total: 0,
      notes: ''
    });
    setTaxType('percentage');
  };

  const handleDelete = async (quoteId) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    
    try {
      await deleteManualQuote(quoteId);
      toast.success('Deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleSendEmail = async (quote) => {
    if (!quote.client_email) {
      toast.error('Client email is required to send quote');
      return;
    }
    
    if (!window.confirm(`Send ${quote.quote_type || 'quote'} to ${quote.client_email}?`)) return;
    
    setSendingEmail(quote.id);
    try {
      const response = await sendQuoteEmail(quote.id);
      toast.success(response.data.message || 'Email sent successfully!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSendingEmail(null);
    }
  };

  const handleViewQuote = (quote) => {
    setSelectedQuote(quote);
    setShowViewModal(true);
  };

  const handleMarkAsPaid = async (quoteId) => {
    if (!window.confirm('Mark this quote as paid and create an order?')) return;
    
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/admin/quotes/${quoteId}/mark-paid`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to mark as paid');
      }
      
      const data = await response.json();
      toast.success(`Quote marked as paid! Order ${data.order_id} created`);
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to mark as paid');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }
    
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/admin/quotes/search?search_term=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setQuotes(data.quotes);
      setReceipts(data.receipts);
      toast.success(`Found ${data.total} results`);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'paid': 'bg-green-100 text-green-800 border-green-300',
      'draft': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColors[status] || statusColors.draft}`}>
        {status?.toUpperCase() || 'PENDING'}
      </span>
    );
  };

  const generatePrintableQuote = (quote) => {
    // Open a new window with printable quote - title includes client name
    const clientFirstName = quote.client_name.split(' ')[0];
    const printWindow = window.open('', '_blank');
    
    // Use embedded logo constant for PDF generation
    const logoUrl = LOGO_BLACK;
    const companyName = 'Temaruco Clothing Factory';
    const tagline = 'Inspire • Empower • Accomplish';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${quote.quote_type.toUpperCase()} for ${clientFirstName} - ${quote.quote_number}</title>
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
          }
          .company-name { 
            font-size: 32px; 
            font-weight: bold; 
            color: #D90429;
            margin-bottom: 5px;
          }
          .doc-title { 
            font-size: 24px; 
            font-weight: bold; 
            text-transform: uppercase;
            margin: 20px 0;
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
          th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd;
          }
          th { 
            background-color: #f4f4f5; 
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
          }
          .totals { 
            margin-top: 30px; 
            text-align: right;
          }
          .totals table { 
            margin-left: auto; 
            width: 300px;
          }
          .totals td { 
            border: none; 
            padding: 8px;
          }
          .total-row { 
            font-size: 18px; 
            font-weight: bold; 
            border-top: 2px solid #D90429 !important;
          }
          .notes { 
            margin-top: 40px; 
            padding: 20px; 
            background: #f4f4f5; 
            border-radius: 8px;
          }
          .notes h3 { 
            margin-top: 0; 
            font-size: 14px;
            text-transform: uppercase;
          }
          .footer { 
            margin-top: 60px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- Logo at top center -->
        <div class="logo-container">
          ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" />` : `
            <div style="font-size: 32px; font-weight: bold; color: #D90429; font-family: 'Oswald', sans-serif;">
              ${companyName.toUpperCase()}
            </div>
            <div style="font-size: 12px; color: #666; letter-spacing: 2px;">CLOTHING FACTORY</div>
          `}
        </div>
        
        <div class="header">
          <div style="font-size: 14px; color: #666; text-align: center;">${tagline}</div>
        </div>
        
        <div class="doc-title">${quote.quote_type.toUpperCase()}</div>
        <div style="font-size: 14px; color: #666; margin-bottom: 30px;">
          ${quote.quote_number} | Date: ${new Date(quote.created_at).toLocaleDateString()}
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Bill To:</h3>
            <p><strong>${quote.client_name}</strong></p>
            <p>${quote.client_email}</p>
            ${quote.client_phone ? `<p>${quote.client_phone}</p>` : ''}
            ${quote.client_address ? `<p>${quote.client_address}</p>` : ''}
          </div>
          
          <div class="info-section">
            <h3>From:</h3>
            <p><strong>Temaruco Clothing Factory</strong></p>
            <p>temarucoltd@gmail.com</p>
            <p>+234 912 542 3902</p>
            <p>Lagos, Nigeria</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(item => `
              <tr>
                <td>${item.description || ''}</td>
                <td style="text-align: center;">${item.quantity || 0}</td>
                <td style="text-align: right;">₦${(item.unit_price || 0).toLocaleString()}</td>
                <td style="text-align: right;">₦${(item.total || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;"><strong>₦${(quote.subtotal || 0).toLocaleString()}</strong></td>
            </tr>
            ${(quote.tax || 0) > 0 ? `
              <tr>
                <td>Tax:</td>
                <td style="text-align: right;">₦${(quote.tax || 0).toLocaleString()}</td>
              </tr>
            ` : ''}
            ${(quote.discount || 0) > 0 ? `
              <tr>
                <td>Discount:</td>
                <td style="text-align: right;">-₦${(quote.discount || 0).toLocaleString()}</td>
              </tr>
            ` : ''}
            <tr class="total-row">
              <td><strong>TOTAL:</strong></td>
              <td style="text-align: right;"><strong>₦${(quote.total || 0).toLocaleString()}</strong></td>
            </tr>
          </table>
        </div>
        
        <!-- Payment Terms & Bank Details (Always Shown) -->
        <div class="notes">
          <h3>Payment Terms:</h3>
          <p>
            • <strong>100% payment required</strong> to commence production<br>
            • Payment methods: Bank transfer, Cash<br>
            • Production time: 14-21 working days from payment confirmation<br>
            • This quote is valid for 30 days from the date of issue
          </p>
        </div>
        
        <div class="notes" style="margin-top: 20px; background: #f8f9fa; padding: 15px; border-left: 4px solid #D90429;">
          <h3 style="margin-bottom: 10px;">Bank / Payment Details:</h3>
          <p style="line-height: 1.8;">
            <strong>Account Name:</strong> Temaruco Clothing Factory<br>
            <strong>Bank:</strong> ${settings?.bank_name || 'Contact us for bank details'}<br>
            <strong>Account Number:</strong> ${settings?.account_number || 'Contact us'}<br>
            <strong>Contact Email:</strong> ${settings?.email || 'temarucoltd@gmail.com'}<br>
            <strong>Contact Phone:</strong> ${settings?.phone || '+234 XXX XXX XXXX'}
          </p>
          <p style="margin-top: 10px; font-size: 13px; color: #666;">
            <em>Please use your Order/Quote ID as payment reference and send proof of payment to our email.</em>
          </p>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Temaruco Clothing Factory | Lagos, Nigeria | temarucoltd@gmail.com</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="
            background: #D90429; 
            color: white; 
            padding: 12px 30px; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            cursor: pointer;
            margin-right: 10px;
          ">Print / Save as PDF</button>
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

  const generateReceipt = (receipt) => {
    // Generate receipt PDF with full order details
    const printWindow = window.open('', '_blank');
    const logoUrl = LOGO_BLACK;
    
    // Extract order details
    const orderDetails = receipt.order_details || {};
    const pricingBreakdown = receipt.pricing_breakdown || {};
    
    // Format order items based on order type
    let itemsHTML = '';
    
    if (receipt.order_type === 'bulk') {
      const sizeBreakdown = orderDetails.size_breakdown || {};
      const sizes = Object.entries(sizeBreakdown)
        .filter(([_, qty]) => qty > 0)
        .map(([size, qty]) => `${size}: ${qty}`)
        .join(', ');
      
      itemsHTML = `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${orderDetails.clothing_item || 'Item'}</strong><br>
            <span style="font-size: 12px; color: #666;">
              Fabric: ${orderDetails.fabric_quality || 'Standard'} | 
              Print: ${orderDetails.print_type || 'None'}<br>
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
    } else if (receipt.order_type === 'pod' && orderDetails.pod_details) {
      const pod = orderDetails.pod_details;
      itemsHTML = `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>Print-on-Demand T-Shirt</strong><br>
            <span style="font-size: 12px; color: #666;">
              Quality: ${pod.shirt_quality || 'Standard'}<br>
              Print Size: ${pod.print_size || 'A4'}<br>
              Design: ${pod.has_design ? 'Custom design uploaded' : 'No design'}
            </span>
          </td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">
            ${orderDetails.quantity || 1}
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
          }
          .receipt-number {
            font-size: 18px;
            color: #666;
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

  const getTypeIcon = (type) => {
    switch(type) {
      case 'quote': return <FileText size={20} className="text-blue-600" />;
      case 'invoice': return <FileCheck size={20} className="text-green-600" />;
      case 'receipt': return <Receipt size={20} className="text-purple-600" />;
      default: return <FileText size={20} />;
    }
  };

  if (loading) {
    return <div className="loading-spinner"></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold" data-testid="quotes-title">
          Quotes & Invoices
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
          data-testid="create-quote-btn"
        >
          <Plus size={20} />
          Create Quote/Invoice
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-zinc-300 rounded-lg"
          data-testid="filter-type"
        >
          <option value="">All Types</option>
          <option value="quote">Quotes</option>
          <option value="invoice">Invoices</option>
          <option value="receipt">Receipts</option>
        </select>
        
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID or number..."
            className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg"
            data-testid="search-input"
          />
          <button
            onClick={handleSearch}
            className="btn-primary flex items-center gap-2"
            data-testid="search-btn"
          >
            <Search size={18} />
            Search
          </button>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                loadData();
              }}
              className="btn-outline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" data-testid="quotes-table">
              {/* Show receipts when filter is 'receipt' */}
              {filterType === 'receipt' && receipts.map(receipt => (
                <tr key={receipt.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Receipt size={20} className="text-purple-600" />
                      <span>Receipt</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{receipt.receipt_number}</td>
                  <td className="px-6 py-4">{receipt.customer_name}</td>
                  <td className="px-6 py-4 font-semibold">₦{(receipt.amount_paid || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">{getStatusBadge('paid')}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(receipt.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => generateReceipt(receipt)}
                        className="text-blue-600 hover:underline"
                        title="View/Download Receipt"
                        data-testid={`download-receipt-${receipt.id}`}
                      >
                        <Download size={18} />

                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Show quotes when filter is not 'receipt' */}
              {filterType !== 'receipt' && quotes.map(quote => (
                <tr key={quote.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(quote.quote_type)}
                      <span className="capitalize">{quote.quote_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{quote.quote_number}</td>
                  <td className="px-6 py-4">{quote.client_name}</td>
                  <td className="px-6 py-4 font-semibold">₦{quote.total.toLocaleString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(quote.status || 'pending')}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewQuote(quote)}
                        className="text-green-600 hover:underline"
                        title="View Details"
                        data-testid={`view-${quote.id}`}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleSendEmail(quote)}
                        disabled={sendingEmail === quote.id}
                        className={`flex items-center gap-1 ${sendingEmail === quote.id ? 'text-gray-400' : 'text-blue-600 hover:underline'}`}
                        title={quote.email_sent ? "Resend Email" : "Send Email"}
                        data-testid={`send-email-${quote.id}`}
                      >
                        <Send size={16} />
                        {sendingEmail === quote.id ? 'Sending...' : (quote.email_sent ? 'Resend' : 'Email')}
                      </button>
                      {quote.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkAsPaid(quote.id)}
                          className="text-purple-600 hover:underline font-semibold"
                          title="Mark as Paid & Create Order"
                          data-testid={`paid-${quote.id}`}
                        >
                          Paid
                        </button>
                      )}
                      <button
                        onClick={() => generatePrintableQuote(quote)}
                        className="text-blue-600 hover:underline"
                        title="Download PDF"
                        data-testid={`download-${quote.id}`}
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(quote.id)}
                        className="text-red-600 hover:underline"
                        title="Delete"
                        data-testid={`delete-${quote.id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Quote Modal */}
      {showViewModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Quote Details - {selectedQuote.quote_number}</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-zinc-500 hover:text-zinc-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Client Name</p>
                  <p className="font-semibold">{selectedQuote.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Email</p>
                  <p className="font-semibold">{selectedQuote.client_email}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Phone</p>
                  <p className="font-semibold">{selectedQuote.client_phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Status</p>
                  {getStatusBadge(selectedQuote.status || 'pending')}
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-3">Items</h3>
                <table className="w-full border">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">Description</th>
                      <th className="px-4 py-2 text-center text-sm">Qty</th>
                      <th className="px-4 py-2 text-right text-sm">Unit Price</th>
                      <th className="px-4 py-2 text-right text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuote.items?.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">₦{item.unit_price?.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">₦{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-zinc-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₦{selectedQuote.subtotal?.toLocaleString()}</span>
                </div>
                {selectedQuote.tax > 0 && (
                  <div className="flex justify-between mb-2">
                    <span>Tax:</span>
                    <span>₦{selectedQuote.tax?.toLocaleString()}</span>
                  </div>
                )}
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between mb-2">
                    <span>Discount:</span>
                    <span>-₦{selectedQuote.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold mt-3 pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-primary">₦{selectedQuote.total?.toLocaleString()}</span>
                </div>
              </div>
              
              {selectedQuote.notes && (
                <div>
                  <p className="text-sm text-zinc-500 mb-2">Notes</p>
                  <p className="whitespace-pre-wrap bg-zinc-50 p-3 rounded">{selectedQuote.notes}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                {selectedQuote.status !== 'paid' && (
                  <button
                    onClick={() => {
                      handleMarkAsPaid(selectedQuote.id);
                      setShowViewModal(false);
                    }}
                    className="btn-primary flex-1"
                  >
                    Mark as Paid & Create Order
                  </button>
                )}
                <button
                  onClick={() => generatePrintableQuote(selectedQuote)}
                  className="btn-outline flex-1"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content max-w-4xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="create-quote-modal"
          >
            <h2 className="font-oswald text-2xl font-bold mb-6">Create Quote/Invoice/Receipt</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Entry Mode Selection */}
              <div className="bg-zinc-50 p-4 rounded-lg">
                <label className="block font-manrope font-semibold text-sm mb-3">Entry Method</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="entryMode"
                      value="manual"
                      checked={entryMode === 'manual'}
                      onChange={(e) => setEntryMode(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Manual Entry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="entryMode"
                      value="lookup"
                      checked={entryMode === 'lookup'}
                      onChange={(e) => setEntryMode(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Lookup Order/Enquiry Code</span>
                  </label>
                </div>
              </div>

              {/* Code Lookup Section */}
              {entryMode === 'lookup' && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <label className="block font-manrope font-semibold text-sm mb-2">
                    Enter Order ID or Enquiry Code
                  </label>
                  <div className="flex gap-2">
                    <OrderCodeInput
                      value={lookupCode}
                      onChange={(e) => setLookupCode(e.target.value)}
                      placeholder="TM-0225-000001 or ENQ-0225-000001"
                      className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg"
                      data-testid="lookup-code-input"
                    />
                    <button
                      type="button"
                      onClick={handleLookupCode}
                      disabled={lookupLoading}
                      className="btn-primary flex items-center gap-2"
                      data-testid="lookup-code-btn"
                    >
                      <Search size={18} />
                      {lookupLoading ? 'Loading...' : 'Lookup'}
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Enter an Order ID (TM-MMYY-XXXXXX) or Enquiry Code (ENQ-MMYY-XXXXXX) to auto-fill customer details
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Type</label>
                  <select
                    value={formData.quote_type}
                    onChange={(e) => setFormData({...formData, quote_type: e.target.value})}
                    className="w-full"
                    data-testid="quote-type-select"
                  >
                    <option value="quote">Quote</option>
                    <option value="invoice">Invoice</option>
                    <option value="receipt">Receipt</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    className="w-full"
                    data-testid="client-name"
                  />
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Client Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.client_email}
                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                    className="w-full"
                    data-testid="client-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Client Phone</label>
                  <input
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                    className="w-full"
                    data-testid="client-phone"
                  />
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Client Address</label>
                  <input
                    type="text"
                    value={formData.client_address}
                    onChange={(e) => setFormData({...formData, client_address: e.target.value})}
                    className="w-full"
                    data-testid="client-address"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="font-manrope font-semibold">Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-primary hover:underline"
                    data-testid="add-item-btn"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-semibold text-zinc-600 uppercase">
                  <div className="col-span-4">Description / Outfit Specification</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-3">Unit Price (₦)</div>
                  <div className="col-span-2">Total (₦)</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <textarea
                            placeholder="Item description & outfit specifications (measurements, fabric, branding, etc.)"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full min-h-[80px] px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                            required
                            data-testid={`item-desc-${index}`}
                            rows="3"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            data-testid={`item-qty-${index}`}
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-zinc-500 font-semibold">₦</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                              className="w-full pl-8 pr-3 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-lg font-semibold"
                              required
                              data-testid={`item-price-${index}`}
                            />
                          </div>
                          <p className="text-xs text-zinc-600 mt-1 font-medium">
                            Preview: ₦{(item.unit_price || 0).toLocaleString('en-NG', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={`₦${(item.total || 0).toLocaleString('en-NG', {minimumFractionDigits: 2})}`}
                            className="w-full px-3 py-2 bg-zinc-100 border border-zinc-300 rounded-lg font-semibold text-zinc-700"
                            readOnly
                            data-testid={`item-total-${index}`}
                          />
                        </div>
                        <div className="col-span-1 flex items-start pt-2">
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700 p-1"
                              data-testid={`remove-item-${index}`}
                              title="Remove item"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">
                    Tax ({taxType === 'percentage' ? '%' : '₦'})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={taxType === 'percentage' ? formData.taxPercentage : formData.tax}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (taxType === 'percentage') {
                          const taxAmount = (formData.subtotal * value) / 100;
                          const total = formData.subtotal + taxAmount - formData.discount;
                          setFormData({...formData, taxPercentage: value, tax: taxAmount, total});
                        } else {
                          const total = formData.subtotal + value - formData.discount;
                          setFormData({...formData, tax: value, total});
                        }
                      }}
                      className="w-full"
                      data-testid="tax-input"
                    />
                    <button
                      type="button"
                      onClick={() => setTaxType(taxType === 'percentage' ? 'fixed' : 'percentage')}
                      className="px-3 py-2 border rounded-lg hover:bg-zinc-50 text-sm"
                      title={`Switch to ${taxType === 'percentage' ? 'fixed amount' : 'percentage'}`}
                    >
                      {taxType === 'percentage' ? '%' : '₦'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {taxType === 'percentage' 
                      ? `₦${formData.tax.toFixed(2)} (${formData.taxPercentage}% of subtotal)`
                      : 'Fixed tax amount'}
                  </p>
                </div>
                <div>
                  <label className="block font-manrope font-semibold text-sm mb-2">Discount (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0;
                      const total = formData.subtotal + formData.tax - discount;
                      setFormData({...formData, discount, total});
                    }}
                    className="w-full"
                    data-testid="discount-input"
                  />
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₦{formData.subtotal.toLocaleString()}</span>
                  </div>
                  {formData.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>₦{formData.tax.toLocaleString()}</span>
                    </div>
                  )}
                  {formData.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-₦{formData.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-primary">₦{formData.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-manrope font-semibold text-sm mb-2">Notes</label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full"
                  placeholder="Additional notes or terms..."
                  data-testid="notes-textarea"
                ></textarea>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline flex-1"
                  data-testid="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  data-testid="submit-quote-btn"
                >
                  Create {formData.quote_type}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuotesPage;
