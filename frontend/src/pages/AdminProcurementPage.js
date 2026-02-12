import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Edit2, Trash2, Package, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const AdminProcurementPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    unit_price: '',
    total_cost: '',
    supplier: '',
    date_purchased: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadItems();
    loadLogo();
  }, []);

  useEffect(() => {
    // Calculate total cost when quantity or unit price changes
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unit_price) || 0;
    setFormData(prev => ({
      ...prev,
      total_cost: (qty * price).toFixed(2)
    }));
  }, [formData.quantity, formData.unit_price]);

  const loadItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/procurement`, { withCredentials: true });
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load procurement items');
    } finally {
      setLoading(false);
    }
  };

  const loadLogo = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cms/settings`);
      const logoUrl = response.data.logo_url;
      if (logoUrl) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(
          `${API_URL}/api/admin/procurement/${editingItem.id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Item updated successfully');
      } else {
        await axios.post(
          `${API_URL}/api/admin/procurement`,
          formData,
          { withCredentials: true }
        );
        toast.success('Item added successfully');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save item');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      total_cost: item.total_cost.toString(),
      supplier: item.supplier || '',
      date_purchased: item.date_purchased,
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/procurement/${itemId}`, { withCredentials: true });
      toast.success('Item deleted successfully');
      loadItems();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      quantity: '',
      unit_price: '',
      total_cost: '',
      supplier: '',
      date_purchased: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingItem(null);
    setShowModal(true);
  };

  const totalSpent = items.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);


  const exportToCSV = () => {
    try {
      // Create CSV header
      const headers = ['Date', 'Item Name', 'Supplier', 'Quantity', 'Unit Price (₦)', 'Total Cost (₦)'];
      
      // Create CSV rows
      const rows = items.map(item => [
        new Date(item.date_purchased).toLocaleDateString(),
        item.item_name,
        item.supplier || '-',
        item.quantity,
        parseFloat(item.unit_price).toFixed(2),
        parseFloat(item.total_cost).toFixed(2)
      ]);
      
      // Add total row
      rows.push(['', '', '', '', 'TOTAL:', totalSpent.toFixed(2)]);
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Procurement_List_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Procurement list exported to CSV!');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV. Please try again.');
    }
  };

  const exportProcurementPDF = () => {
    try {
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
      doc.text('TEMARUCO - Procurement List', 14, startY);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, startY + 8);
      
      doc.setFontSize(12);
      doc.text(`Total Items: ${items.length}`, 14, startY + 18);
      doc.text(`Total Spent: ₦${totalSpent.toLocaleString()}`, 14, startY + 25);
      
      const tableData = items.map(item => [
        new Date(item.date_purchased).toLocaleDateString(),
        item.item_name,
        item.supplier || '-',
        item.quantity,
        `₦${parseFloat(item.unit_price).toLocaleString()}`,
        `₦${parseFloat(item.total_cost).toLocaleString()}`
      ]);
      
      // Use autoTable if available, otherwise create simple table
      if (doc.autoTable) {
        doc.autoTable({
          startY: startY + 35,
          head: [['Date', 'Item Name', 'Supplier', 'Qty', 'Unit Price', 'Total Cost']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8 },
          foot: [[' ', '', '', '', 'TOTAL:', `₦${totalSpent.toLocaleString()}`]],
          footStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' }
        });
      } else {
        // Fallback: Simple table without autoTable
        let yPos = startY + 40;
        doc.setFontSize(8);
        
        // Headers
        doc.text('Date', 14, yPos);
        doc.text('Item Name', 40, yPos);
        doc.text('Supplier', 100, yPos);
        doc.text('Qty', 140, yPos);
        doc.text('Unit Price', 160, yPos);
        doc.text('Total', 185, yPos);
        yPos += 6;
        
        // Data rows
        tableData.forEach(row => {
          doc.text(row[0], 14, yPos);
          doc.text(row[1].substring(0, 20), 40, yPos);
          doc.text(row[2], 100, yPos);
          doc.text(String(row[3]), 140, yPos);
          doc.text(row[4], 160, yPos);
          doc.text(row[5], 185, yPos);
          yPos += 6;
        });
        
        // Total
        yPos += 4;
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL:', 160, yPos);
        doc.text(`₦${totalSpent.toLocaleString()}`, 185, yPos);
      }
      
      doc.save(`Procurement_List_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Procurement list exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };


  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-oswald text-4xl font-bold">Procurement</h1>
          <p className="text-zinc-600 mt-2">Track all items and materials purchased</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="btn-outline flex items-center gap-2"
            data-testid="export-csv-btn"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            onClick={exportProcurementPDF}
            className="btn-outline flex items-center gap-2"
            data-testid="export-pdf-btn"
          >
            <Download size={20} />
            Export PDF
          </button>
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2"
            data-testid="add-item-btn"
          >
            <Plus size={20} />
            Add Purchase
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 mb-1">Total Procurement Spent</p>
            <p className="text-4xl font-bold">₦{totalSpent.toLocaleString()}</p>
            <p className="text-blue-100 mt-2">{items.length} items purchased</p>
          </div>
          <ShoppingCart size={64} className="opacity-30" />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-600 mb-4">No procurement items yet</p>
          <button onClick={openAddModal} className="btn-primary">
            Add Your First Purchase
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Supplier</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Total Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 text-sm">{new Date(item.date_purchased).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{item.item_name}</p>
                        {item.notes && <p className="text-xs text-zinc-500">{item.notes}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">{item.supplier || '-'}</td>
                    <td className="px-6 py-4 text-right font-semibold">{item.quantity}</td>
                    <td className="px-6 py-4 text-right">₦{parseFloat(item.unit_price).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                      ₦{parseFloat(item.total_cost).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:underline"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:underline"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-zinc-50 font-bold">
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-right">TOTAL SPENT:</td>
                  <td className="px-6 py-4 text-right text-lg text-blue-600">
                    ₦{totalSpent.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-oswald text-2xl font-bold mb-6">
              {editingItem ? 'Edit Procurement Item' : 'Add Procurement Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-2">Item Name *</label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Cotton Fabric, Thread, Buttons"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Unit Price (₦) *</label>
                  <input
                    type="number"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Total Cost (₦)</label>
                  <input
                    type="number"
                    value={formData.total_cost}
                    className="w-full px-4 py-2 border rounded-lg bg-zinc-50"
                    readOnly
                  />
                  <p className="text-xs text-zinc-500 mt-1">Auto-calculated</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Date Purchased *</label>
                  <input
                    type="date"
                    value={formData.date_purchased}
                    onChange={(e) => setFormData({ ...formData, date_purchased: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows="2"
                    placeholder="Additional details..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProcurementPage;
