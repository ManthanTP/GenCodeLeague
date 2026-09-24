import React from 'react';

export const formatCurrency = (value: number | string | null | undefined): string => {
  const safeValue = typeof value === 'number' ? value : parseFloat(String(value || 0)) || 0;
  if (safeValue >= 10000000) {
    return `₹${(safeValue / 10000000).toFixed(2)} Cr`;
  }
  if (safeValue >= 100000) {
    return `₹${(safeValue / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safeValue);
};

export const renderMultiLineText = (text: string | null | undefined): React.ReactNode => {
  if (!text) return null;
  return text.split('\n').map((line, index, arr) =>
    React.createElement(
      React.Fragment,
      { key: index },
      line,
      index < arr.length - 1 ? React.createElement('br', null) : null
    )
  );
};
