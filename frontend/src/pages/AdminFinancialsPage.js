import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Eye, ShoppingCart, Wrench, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminFinancialsPage = () => {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showRefundsSummary, setShowRefundsSummary] = useState(false);
  const [logoBase64, setLogoBase64] = useState(null);
  
  // Get user info to check if super admin
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.is_super_admin || false;
  
  const [expenseForm, setExpenseForm] = useState({
    type: 'running_cost',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: ''
  });

  const expenseTypes = [
    { value: 'running_cost', label: 'Running Cost (Variable)', description: 'Day-to-day operational expenses' },
    { value: 'rent', label: 'Rent', description: 'Monthly office/factory rent' },
    { value: 'salaries', label: 'Salaries', description: 'Staff salaries and wages' },
    { value: 'utilities', label: 'Utilities', description: 'Electricity, water, internet' },
    { value: 'insurance', label: 'Insurance', description: 'Business insurance premiums' },
    { value: 'maintenance', label: 'Maintenance', description: 'Equipment and facility maintenance' },
    { value: 'other', label: 'Other', description: 'Miscellaneous expenses' }
  ];
  const [refundForm, setRefundForm] = useState({
    client_name: '',
    order_id: '',
    amount: '',
    phone_number: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  useEffect(() => {
    loadFinancials();
    loadLogo();
    if (isSuperAdmin) {
      loadRefunds(); // Only load refunds for super admin
    }
  }, [isSuperAdmin]);

  const loadLogo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cms/settings`);
      const logoUrl = response.data.logo_url;
      if (logoUrl) {
        // Convert logo to base64
        const fullUrl = `${API_URL}${logoUrl}`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          setLogoBase64(canvas.toDataURL('image/png'));
        };
        img.src = fullUrl;
      }
    } catch (error) {
      console.error('Failed to load logo:', error);
    }
  };

  const loadFinancials = async () => {
    try {
      const [summaryRes, transactionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/financials/summary`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/financials/transactions`, { withCredentials: true })
      ]);
      setSummary(summaryRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const loadRefunds = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/super-admin/refunds`, { withCredentials: true });
      setRefunds(res.data);
    } catch (error) {
      console.error('Failed to load refunds');
    }
  };

  const addRefund = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/super-admin/refunds`, refundForm, { withCredentials: true });
      toast.success('Refund added successfully');
      setShowRefundModal(false);
      setRefundForm({
        client_name: '',
        order_id: '',
        amount: '',
        phone_number: '',
        email: '',
        date: new Date().toISOString().split('T')[0],
        reason: ''
      });
      loadRefunds();
      loadFinancials(); // Reload to update summary with refunds
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add refund');
    }
  };

  const deleteRefund = async (refundId) => {
    if (!window.confirm('Are you sure you want to delete this refund?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/super-admin/refunds/${refundId}`, { withCredentials: true });
      toast.success('Refund deleted successfully');
      loadRefunds();
      loadFinancials();
    } catch (error) {
      toast.error('Failed to delete refund');
    }
  };


  const exportFinancialReport = () => {
    const doc = new jsPDF();
    const netProfit = (summary?.total_income || 0) - (summary?.total_expenditure || 0);
    
    // Add logo if available
    let startY = 20;
    if (logoBase64) {
      const imgWidth = 50;
      const imgHeight = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const x = (pageWidth - imgWidth) / 2; // Center horizontally
      doc.addImage(logoBase64, 'PNG', x, 10, imgWidth, imgHeight);
      startY = 35;
    }
    
    // Header
    doc.setFontSize(20);
    doc.text('TEMARUCO - Financial Report', 14, startY);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 8);
    
    // Summary
    doc.setFontSize(14);
    doc.text('Financial Summary', 14, startY + 20);
    
    doc.setFontSize(10);
    doc.text(`Total Income: ₦${(summary?.total_income || 0).toLocaleString()}`, 14, startY + 30);
    doc.text(`Total Expenditure: ₦${(summary?.total_expenditure || 0).toLocaleString()}`, 14, startY + 37);
    doc.text(`Net Profit: ₦${netProfit.toLocaleString()}`, 14, startY + 44);
    doc.text(`Profit Margin: ${summary?.total_income > 0 ? ((netProfit / summary.total_income) * 100).toFixed(1) : 0}%`, 14, startY + 51);
    
    // Expenditure Breakdown
    doc.text('Expenditure Breakdown:', 14, startY + 65);
    doc.text(`Procurement: ₦${(summary?.procurement || 0).toLocaleString()}`, 14, startY + 72);
    doc.text(`Running Costs: ₦${(summary?.running_costs || 0).toLocaleString()}`, 14, startY + 79);
    doc.text(`Other Expenses: ₦${(summary?.other_expenses || 0).toLocaleString()}`, 14, startY + 86);
    
    // Transactions Table
    doc.text('Recent Transactions', 14, startY + 100);
    
    const tableData = transactions.slice(0, 20).map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type === 'income' ? 'Income' : t.category || 'Expense',
      t.description,
      `₦${t.amount.toLocaleString()}`
    ]);
    
    doc.autoTable({
      startY: startY + 105,
      head: [['Date', 'Type', 'Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    
    doc.save(`Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Financial report exported!');
  };

  const exportTransactions = () => {
    const doc = new jsPDF();
    
    // Add logo if available
    let startY = 20;
    if (logoBase64) {
      const imgWidth = 50;
      const imgHeight = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const x = (pageWidth - imgWidth) / 2;
      doc.addImage(logoBase64, 'PNG', x, 10, imgWidth, imgHeight);
      startY = 35;
    }
    
    doc.setFontSize(20);
    doc.text('TEMARUCO - All Transactions', 14, startY);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 8);
    
    const tableData = transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type === 'income' ? 'Income' : t.category || 'Expense',
      t.description,
      `₦${t.amount.toLocaleString()}`
    ]);
    
    doc.autoTable({
      startY: startY + 15,
      head: [['Date', 'Type', 'Description', 'Amount']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    
    doc.save(`Transactions_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Transactions exported!');
  };


  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/api/admin/financials/expense`,
        expenseForm,
        { withCredentials: true }
      );
      toast.success('Expense added successfully');
      setShowAddModal(false);
      setExpenseForm({
        type: 'procurement',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      loadFinancials();
    } catch (error) {
      toast.error('Failed to add expense');
    }
  };

  if (loading) return <div className="loading-spinner"></div>;

  const netProfit = (summary?.total_income || 0) - (summary?.total_expenditure || 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-oswald text-4xl font-bold">Financial Management</h1>
        <div className="flex gap-3">
          <button
            onClick={exportFinancialReport}
            className="btn-outline flex items-center gap-2"
          >
            <Download size={18} />
            Export Report
          </button>
          <button
            onClick={exportTransactions}
            className="btn-outline flex items-center gap-2"
          >
            <Download size={18} />
            Export Transactions
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setShowRefundsSummary(true)}
              className="btn-outline flex items-center gap-2 bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <TrendingDown size={18} />
              Refunds Summary
            </button>
          )}
          <button
            onClick={() => setShowSummaryModal(true)}
            className="btn-outline flex items-center gap-2"
          >
            <Eye size={18} />
            View Summary
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="btn-primary flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <Plus size={18} />
              Add Refund
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-zinc-600">Total Income</p>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-green-600">
            ₦{(summary?.total_income || 0).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{summary?.completed_orders || 0} completed orders</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-zinc-600">Total Expenditure</p>
            <TrendingDown className="text-red-600" size={20} />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-red-600">
            ₦{(summary?.total_expenditure || 0).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{summary?.total_expenses || 0} expenses</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-zinc-600">Net Profit</p>
            <DollarSign className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'} size={20} />
          </div>
          <p className={`text-2xl md:text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₦{netProfit.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Income - Expenditure</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs md:text-sm text-zinc-600">Profit Margin</p>
            <DollarSign className="text-blue-600" size={20} />
          </div>
          <p className="text-2xl md:text-3xl font-bold text-blue-600">
            {summary?.total_income > 0 ? ((netProfit / summary.total_income) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-zinc-500 mt-1">Net profit / Income</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="font-bold text-base md:text-lg mb-4">Expenditure Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-600" />
                <span className="text-sm md:text-base">Procurement</span>
              </div>
              <span className="font-semibold text-sm md:text-base">₦{(summary?.procurement || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-orange-600" />
                <span className="text-sm md:text-base">Running Costs</span>
              </div>
              <span className="font-semibold text-sm md:text-base">₦{(summary?.running_costs || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-purple-600" />
                <span className="text-sm md:text-base">Other Expenses</span>
              </div>
              <span className="font-semibold text-sm md:text-base">₦{(summary?.other_expenses || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="font-bold text-base md:text-lg mb-4">Recent Transactions</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.slice(0, 5).map((transaction, index) => (
              <div key={index} className="flex justify-between items-center p-2 border-b">
                <div>
                  <p className="font-semibold text-sm">{transaction.description}</p>
                  <p className="text-xs text-zinc-500">{new Date(transaction.date).toLocaleDateString()}</p>
                </div>
                <span className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.type === 'income' ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Transactions */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-lg">All Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((transaction, index) => (
                <tr key={index} className="hover:bg-zinc-50">
                  <td className="px-6 py-4 text-sm">{new Date(transaction.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type === 'income' ? 'Income' : transaction.category || 'Expense'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{transaction.description}</td>
                  <td className={`px-6 py-4 text-right font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">Add Expense</h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Expense Type *</label>
                <select
                  value={expenseForm.type}
                  onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                >
                  {expenseTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Fixed overheads: Rent, Salaries, Utilities, Insurance, Maintenance
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Description *</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Fabric purchase, Electricity bill"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Amount (₦) *</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Date *</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && summary && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">Financial Summary</h2>
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-green-800">Income</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Completed Orders:</span>
                    <span className="font-semibold">{summary.completed_orders}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Income:</span>
                    <span className="text-green-600">₦{summary.total_income.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4 text-red-800">Expenditure</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Procurement:</span>
                    <span className="font-semibold">₦{summary.procurement.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Running Costs:</span>
                    <span className="font-semibold">₦{summary.running_costs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fixed Overheads:</span>
                    <span className="font-semibold">₦{(summary.fixed_overheads || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-600 pl-4">
                    <span>• Rent, Salaries, Utilities, etc.</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Expenses:</span>
                    <span className="font-semibold">₦{summary.other_expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total Expenditure:</span>
                    <span className="text-red-600">₦{summary.total_expenditure.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className={`border-2 rounded-lg p-6 ${
                netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <h3 className="font-bold text-lg mb-4">Net Result</h3>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-center py-4">
                    <span className={netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                      ₦{netProfit.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-center text-sm">
                    <span className="text-zinc-600">Profit Margin: </span>
                    <span className="font-bold">
                      {summary.total_income > 0 ? ((netProfit / summary.total_income) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="text-center text-xs text-zinc-500">
                    {netProfit >= 0 ? '✅ Profit' : '⚠️ Loss'}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowSummaryModal(false)} className="btn-primary w-full mt-6">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Refund Modal */}
      {showRefundModal && (
        <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Add Refund</h2>
            <form onSubmit={addRefund} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Client Name *</label>
                <input
                  type="text"
                  value={refundForm.client_name}
                  onChange={(e) => setRefundForm({ ...refundForm, client_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Order ID (Optional)</label>
                <input
                  type="text"
                  value={refundForm.order_id}
                  onChange={(e) => setRefundForm({ ...refundForm, order_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="order_xxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Amount (₦) *</label>
                <input
                  type="number"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={refundForm.phone_number}
                  onChange={(e) => setRefundForm({ ...refundForm, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="+234..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  value={refundForm.email}
                  onChange={(e) => setRefundForm({ ...refundForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="client@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Date *</label>
                <input
                  type="date"
                  value={refundForm.date}
                  onChange={(e) => setRefundForm({ ...refundForm, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Reason (Optional)</label>
                <textarea
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Reason for refund..."
                  rows="3"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowRefundModal(false)} className="btn-outline flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 bg-red-600 hover:bg-red-700">
                  Add Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refunds Summary Modal */}
      {showRefundsSummary && (
        <div className="modal-overlay" onClick={() => setShowRefundsSummary(false)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Refunds Summary</h2>
            
            <div className="bg-red-50 p-6 rounded-lg mb-6">
              <div className="text-center">
                <p className="text-sm text-zinc-600 mb-2">Total Refunds</p>
                <p className="text-4xl font-bold text-red-600">
                  ₦{refunds.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-zinc-500 mt-2">{refunds.length} refund(s) recorded</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Order ID</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Contact</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.length > 0 ? (
                    refunds.map((refund) => (
                      <tr key={refund.id} className="border-b hover:bg-zinc-50">
                        <td className="py-3 px-4">{new Date(refund.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-semibold">{refund.client_name}</td>
                        <td className="py-3 px-4">{refund.order_id || '-'}</td>
                        <td className="py-3 px-4 font-bold text-red-600">₦{refund.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm">
                          <div>{refund.phone_number}</div>
                          <div className="text-zinc-500">{refund.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => deleteRefund(refund.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-zinc-500">
                        No refunds recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={() => setShowRefundsSummary(false)} className="btn-primary w-full mt-6">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinancialsPage;