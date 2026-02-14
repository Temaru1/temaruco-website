import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Minus } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const QuickPriceCalculator = ({ isModal = false, onClose = null }) => {
  const [clothingItems, setClothingItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [printType, setPrintType] = useState('dtf_front');
  const [fabricQuality, setFabricQuality] = useState('standard');
  const [childrenSize, setChildrenSize] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  const printTypes = [
    { value: 'dtf_front', label: 'DTF Print (Front)', price: 500 },
    { value: 'dtf_back', label: 'DTF Print (Back)', price: 500 },
    { value: 'dtf_both', label: 'DTF Print (Front & Back)', price: 900 },
    { value: 'embroidery', label: 'Embroidery', price: 800 },
    { value: 'no_print', label: 'No Print (Plain)', price: 0 }
  ];

  const fabricQualities = [
    { value: 'standard', label: 'Standard', multiplier: 1.0 },
    { value: 'premium', label: 'Premium', multiplier: 1.3 },
    { value: 'luxury', label: 'Luxury', multiplier: 1.6 }
  ];

  useEffect(() => {
    loadClothingItems();
  }, []);

  useEffect(() => {
    if (selectedItem && quantity > 0) {
      calculateEstimate();
    }
  }, [selectedItem, quantity, printType, fabricQuality, childrenSize]);

  const loadClothingItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bulk/clothing-items`);
      setClothingItems(response.data);
      if (response.data.length > 0) {
        setSelectedItem(response.data[0].name);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const calculateEstimate = () => {
    setLoading(true);
    
    const item = clothingItems.find(i => i.name === selectedItem);
    if (!item) return;

    const basePrice = childrenSize && item.children_price 
      ? item.children_price 
      : item.base_price;
    
    const printCost = printTypes.find(p => p.value === printType)?.price || 0;
    const fabricMultiplier = fabricQualities.find(f => f.value === fabricQuality)?.multiplier || 1.0;
    
    const pricePerUnit = (basePrice * fabricMultiplier) + printCost;
    const subtotal = pricePerUnit * quantity;
    
    // Volume discount
    let discount = 0;
    if (quantity >= 500) discount = 0.15;
    else if (quantity >= 200) discount = 0.10;
    else if (quantity >= 100) discount = 0.05;
    
    const discountAmount = subtotal * discount;
    const total = subtotal - discountAmount;

    setEstimate({
      pricePerUnit: pricePerUnit.toFixed(2),
      subtotal: subtotal.toFixed(2),
      discount: discount * 100,
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2)
    });
    
    setLoading(false);
  };

  const adjustQuantity = (change) => {
    const newQty = Math.max(50, quantity + change);
    setQuantity(newQty);
  };

  return (
    <div className={`${isModal ? 'bg-white rounded-xl shadow-2xl p-8' : 'bg-white rounded-xl shadow-lg p-6'}`}>
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="text-primary" size={32} />
        <div>
          <h2 className="font-oswald text-2xl font-bold">Quick Price Calculator</h2>
          <p className="text-sm text-zinc-600">Get instant estimates for bulk orders</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Clothing Item Selection */}
        <div>
          <label className="block font-semibold mb-2">Select Clothing Item</label>
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            data-testid="calculator-item-select"
          >
            {clothingItems.map(item => (
              <option key={item.id} value={item.name}>
                {item.name} - ₦{item.base_price.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block font-semibold mb-2">Quantity (Minimum: 50)</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustQuantity(-10)}
              className="p-2 border border-zinc-300 rounded-lg hover:bg-zinc-100"
              data-testid="quantity-decrease"
            >
              <Minus size={20} />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(50, parseInt(e.target.value) || 50))}
              min="50"
              className="flex-1 px-4 py-3 border border-zinc-300 rounded-lg text-center font-bold text-lg"
              data-testid="quantity-input"
            />
            <button
              onClick={() => adjustQuantity(10)}
              className="p-2 border border-zinc-300 rounded-lg hover:bg-zinc-100"
              data-testid="quantity-increase"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Print Type */}
        <div>
          <label className="block font-semibold mb-2">Print Type</label>
          <select
            value={printType}
            onChange={(e) => setPrintType(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            data-testid="print-type-select"
          >
            {printTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label} {type.price > 0 ? `(+₦${type.price})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Fabric Quality */}
        <div>
          <label className="block font-semibold mb-2">Fabric Quality</label>
          <div className="grid grid-cols-3 gap-3">
            {fabricQualities.map(quality => (
              <button
                key={quality.value}
                onClick={() => setFabricQuality(quality.value)}
                className={`px-4 py-3 border-2 rounded-lg font-semibold transition ${
                  fabricQuality === quality.value
                    ? 'border-primary bg-red-50 text-primary'
                    : 'border-zinc-300 hover:border-zinc-400'
                }`}
                data-testid={`quality-${quality.value}`}
              >
                {quality.label}
              </button>
            ))}
          </div>
        </div>

        {/* Children Size */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <input
            type="checkbox"
            id="children-size"
            checked={childrenSize}
            onChange={(e) => setChildrenSize(e.target.checked)}
            className="w-5 h-5"
            data-testid="children-size-checkbox"
          />
          <label htmlFor="children-size" className="font-semibold cursor-pointer">
            Children's Size (Reduced Price)
          </label>
        </div>

        {/* Estimate Display */}
        {estimate && (
          <div className="mt-6 p-6 bg-zinc-50 rounded-xl space-y-3">
            <h3 className="font-semibold text-lg mb-4">Price Breakdown</h3>
            
            <div className="flex justify-between text-zinc-700">
              <span>Price per unit:</span>
              <span className="font-semibold">₦{estimate.pricePerUnit}</span>
            </div>
            
            <div className="flex justify-between text-zinc-700">
              <span>Subtotal ({quantity} units):</span>
              <span className="font-semibold">₦{parseFloat(estimate.subtotal).toLocaleString()}</span>
            </div>
            
            {estimate.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Volume Discount ({estimate.discount}%):</span>
                <span className="font-semibold">-₦{parseFloat(estimate.discountAmount).toLocaleString()}</span>
              </div>
            )}
            
            <div className="pt-3 border-t-2 border-zinc-300">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xl">Estimated Total:</span>
                <span className="font-bold text-3xl text-primary" data-testid="total-estimate">
                  ₦{parseFloat(estimate.total).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-zinc-600 space-y-1">
              <p>• Prices are estimates and may vary based on design complexity</p>
              <p>• Volume discounts: 5% (100+), 10% (200+), 15% (500+)</p>
              <p>• Final price confirmed after design review</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => window.location.href = '/bulk-orders'}
            className="flex-1 btn-primary"
            data-testid="proceed-to-order"
          >
            Proceed to Order
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="flex-1 btn-outline"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickPriceCalculator;
