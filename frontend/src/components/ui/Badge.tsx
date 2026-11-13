import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'lime' | 'danger' | 'warning' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const variantClasses = {
    default: 'bg-canvas-light text-ink-primary border border-subtle-border',
    lime: 'bg-lime/20 text-ink-primary border border-lime/40 font-medium',
    danger: 'bg-red-50 text-red-600 border border-red-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    outline: 'bg-transparent text-ink-secondary border border-subtle-border'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
};

