'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { AnalyticsFilters as FiltersType, Warehouse } from './types';
import { translations } from './constants';

interface AnalyticsFiltersProps {
  filters: FiltersType;
  setFilters: (filters: FiltersType) => void;
  warehouses: Warehouse[];
  language: 'en' | 'fr';
  onReset: () => void;
}

export const AnalyticsFilters = ({
  filters,
  setFilters,
  warehouses,
  language,
  onReset,
}: AnalyticsFiltersProps) => {
  const labels = translations[language];

  const handleDateSelect = (date: Date | undefined, type: 'start' | 'end') => {
    if (!date) return;
    setFilters({
      ...filters,
      [type === 'start' ? 'startDate' : 'endDate']: date.toISOString().split('T')[0],
    });
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-sm space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900 font-semibold">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3>{labels.filters}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full px-3"
        >
          <X className="w-4 h-4 mr-1" />
          {labels.reset}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Start Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 ml-1">{labels.startDate}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal border-gray-200/60 bg-white/50 hover:bg-white/80 rounded-xl h-11 ${!filters.startDate && 'text-muted-foreground'
                  }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                {filters.startDate ? (
                  format(new Date(filters.startDate), 'PPP', {
                    locale: language === 'fr' ? fr : enUS,
                  })
                ) : (
                  <span>{labels.pickDate}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl border-gray-100 shadow-xl" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate ? new Date(filters.startDate) : undefined}
                onSelect={(date) => handleDateSelect(date, 'start')}
                initialFocus
                className="rounded-xl"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 ml-1">{labels.endDate}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal border-gray-200/60 bg-white/50 hover:bg-white/80 rounded-xl h-11 ${!filters.endDate && 'text-muted-foreground'
                  }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                {filters.endDate ? (
                  format(new Date(filters.endDate), 'PPP', {
                    locale: language === 'fr' ? fr : enUS,
                  })
                ) : (
                  <span>{labels.pickDate}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl border-gray-100 shadow-xl" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate ? new Date(filters.endDate) : undefined}
                onSelect={(date) => handleDateSelect(date, 'end')}
                initialFocus
                className="rounded-xl"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Warehouse */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 ml-1">{labels.warehouse}</label>
          <Select
            value={filters.warehouseId || 'all'}
            onValueChange={(value) =>
              setFilters({ ...filters, warehouseId: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger className="w-full border-gray-200/60 bg-white/50 hover:bg-white/80 rounded-xl h-11">
              <SelectValue placeholder={labels.allWarehouses} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-100 shadow-xl">
              <SelectItem value="all">{labels.allWarehouses}</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFilters;