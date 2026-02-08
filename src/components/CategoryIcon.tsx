import React from "react";
import {
  Grid3X3,
  CircleDollarSign,
  ShoppingCart,
  Briefcase,
  Ticket,
  Mail,
  ChartNoAxesCombined,
  Folder,
  FilePenLine,
  Users2,
  ClipboardList,
} from "lucide-react";

interface CategoryIconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  size = 16,
  className = "",
  strokeWidth = 1.5,
  style,
}) => {
  const props = { size, className, strokeWidth, style };
  
  switch (name) {
    case "Grid3X3":
      return <Grid3X3 {...props} />;
    case "CircleDollarSign":
      return <CircleDollarSign {...props} />;
    case "ShoppingCart":
      return <ShoppingCart {...props} />;
    case "Ticket":
      return <Ticket {...props} />;
    case "Mail":
      return <Mail {...props} />;
    case "Briefcase":
      return <Briefcase {...props} />;
    case "TrendingUp":
      return <ChartNoAxesCombined {...props} />;
    case "FileText":
      return <FilePenLine {...props} />;
    case "FileEdit":
      return <FilePenLine {...props} />;
    case "Users":
      return <Users2 {...props} />;
    case "Users2":
      return <Users2 {...props} />;
    case "Folder":
      return <Folder {...props} />;
    case "Clipboard":
      return <ClipboardList {...props} />;
    case "ClipboardList":
      return <ClipboardList {...props} />;
    default:
      return <Folder {...props} />;
  }
};
