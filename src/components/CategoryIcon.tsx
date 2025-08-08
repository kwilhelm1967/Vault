import React from 'react';
import { Grid3X3, CreditCard, ShoppingCart, Briefcase, Play, Folder } from 'lucide-react';

interface CategoryIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 16, className = "" }) => {
  switch (name) {
    case 'Grid3X3':
      return <Grid3X3 size={size} className={className} />;
    case 'CreditCard':
      return <CreditCard size={size} className={className} />;
    case 'ShoppingCart':
      return <ShoppingCart size={size} className={className} />;
    case 'Briefcase':
      return <Briefcase size={size} className={className} />;
    case 'Play':
      return <Play size={size} className={className} />;
    default:
      return <Folder size={size} className={className} />;
  }
};