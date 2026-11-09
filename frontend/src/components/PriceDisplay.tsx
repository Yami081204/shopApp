import React from 'react';

interface PriceDisplayProps {
  price: number;
  className?: string;
  showCurrency?: boolean;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ 
  price, 
  className = '', 
  showCurrency = true 
}) => {
  const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: showCurrency ? 'currency' : 'decimal',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <span className={className}>
      {formatVND(price)}
    </span>
  );
};

export default PriceDisplay; 