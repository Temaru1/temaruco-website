import React from 'react';

/**
 * OrderCodeInput - Auto-formatting input for Order IDs and Enquiry Codes
 * Formats: TM-MMYY-DDXXXX or ENQ-MMYY-DDXXXX
 * Where DD = day of month, XXXX = 4-digit counter
 * Auto-capitalizes and adds hyphens
 */
const OrderCodeInput = ({ value, onChange, placeholder, className, ...props }) => {
  const formatOrderCode = (input) => {
    // Remove all non-alphanumeric characters
    let cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Determine prefix (TM or ENQ)
    let formatted = '';
    
    if (cleaned.startsWith('ENQ')) {
      // Format: ENQ-MMYY-XXXXXX
      formatted = 'ENQ';
      cleaned = cleaned.substring(3);
      
      if (cleaned.length > 0) {
        formatted += '-' + cleaned.substring(0, 4); // MMYY
      }
      if (cleaned.length > 4) {
        formatted += '-' + cleaned.substring(4, 10); // XXXXXX
      }
    } else if (cleaned.startsWith('TM')) {
      // Format: TM-MMYY-XXXXXX
      formatted = 'TM';
      cleaned = cleaned.substring(2);
      
      if (cleaned.length > 0) {
        formatted += '-' + cleaned.substring(0, 4); // MMYY
      }
      if (cleaned.length > 4) {
        formatted += '-' + cleaned.substring(4, 10); // XXXXXX
      }
    } else {
      // Start typing - guess format
      if (cleaned.length <= 2) {
        formatted = cleaned;
      } else if (cleaned.length <= 6) {
        formatted = cleaned.substring(0, 2) + '-' + cleaned.substring(2);
      } else {
        formatted = cleaned.substring(0, 2) + '-' + cleaned.substring(2, 6) + '-' + cleaned.substring(6, 12);
      }
    }
    
    return formatted;
  };

  const handleChange = (e) => {
    const formatted = formatOrderCode(e.target.value);
    onChange({
      ...e,
      target: {
        ...e.target,
        value: formatted
      }
    });
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder || "TM-0226-090001 or ENQ-0226-090001"}
      className={className || "w-full px-4 py-2 border border-zinc-300 rounded-lg uppercase"}
      style={{ textTransform: 'uppercase' }}
      maxLength={16} // TM-0225-000001 = 14 chars, ENQ-0225-000001 = 16 chars
      {...props}
    />
  );
};

export default OrderCodeInput;
