import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  indicator?: 'lime' | 'red' | 'neutral';
  tooltip?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  indicator,
  tooltip
}) => {
  return (
    <div
      className="bg-white rounded-3xl border border-subtle-border p-5 flex flex-col justify-between transition-all duration-200 hover:border-ink-muted/50"
      title={tooltip}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-ink-secondary tracking-wide uppercase">{label}</span>
        {icon && (
          <div className="w-8 h-8 rounded-full bg-canvas-light flex items-center justify-center text-ink-primary">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-ink-primary">{value}</span>
          {subValue && <span className="text-xs text-ink-secondary">{subValue}</span>}
        </div>
        {indicator && (
          <div className="flex items-center">
            {indicator === 'lime' && <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />}
            {indicator === 'red' && <span className="w-2 h-2 rounded-full bg-red-500" />}
            {indicator === 'neutral' && <span className="w-2 h-2 rounded-full bg-ink-muted" />}
          </div>
        )}
      </div>
    </div>
  );
};

