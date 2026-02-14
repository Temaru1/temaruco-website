import React from 'react';

/**
 * OrderCodeInput - Auto-formatting input for Order IDs and Enquiry Codes
 * Supports formats: TM-, ENQ-, FAB-, POD-, BULK-, SOU-, BOU-, DES-
 * Auto-capitalizes input
 */
const OrderCodeInput = ({ value, onChange, placeholder, className, ...props }) => {
  const PREFIXES = ['ENQ', 'FAB', 'POD', 'BULK', 'SOU', 'BOU', 'DES', 'TM'];
  
  const formatOrderCode = (input) => {
    // Convert to uppercase and trim
    let cleaned = input.toUpperCase().trim();
    
    // Check for known prefixes - if found, don't reformat, just return cleaned
    for (const prefix of PREFIXES) {
      if (cleaned.startsWith(prefix + '-') || cleaned.startsWith(prefix)) {
        // Already has correct format or close to it, return as-is with proper hyphens
        return cleaned;
      }
    }
    
    // For unknown formats, just return uppercased value
    return cleaned;
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
      placeholder={placeholder || "FAB-260214-XXXXXX, POD-..., TM-..., or ENQ-..."}
      className={className || "w-full px-4 py-2 border border-zinc-300 rounded-lg uppercase"}
      style={{ textTransform: 'uppercase' }}
      maxLength={24}
      {...props}
    />
  );
};

export default OrderCodeInput;
