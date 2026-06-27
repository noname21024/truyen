import React from 'react';
import { ViconicIcon as BaseViconicIcon } from 'viconic-react-icons';

interface ViconicIconProps {
  name: string;
  size?: string | number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ViconicIcon: React.FC<ViconicIconProps> = ({ 
  name, 
  size, 
  color, 
  className, 
  style 
}) => {
  // If it already has prefix, use it. Otherwise, add prefix and replace underscores with hyphens
  const iconName = name.includes(':') ? name : `m9:${name.replace(/_/g, '-')}`;

  return (
    <BaseViconicIcon
      name={iconName}
      size={size}
      color={color}
      className={className}
      style={style}
    />
  );
};

export default ViconicIcon;
