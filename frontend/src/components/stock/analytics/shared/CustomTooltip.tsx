'use client';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

export const CustomTooltip = ({
  active,
  payload,
  label,
  valuePrefix = '',
  valueSuffix = ''
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/50 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full ring-1 ring-white"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 font-medium">{entry.name}:</span>
              <span className="text-gray-900 font-bold">
                {valuePrefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{valueSuffix}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;