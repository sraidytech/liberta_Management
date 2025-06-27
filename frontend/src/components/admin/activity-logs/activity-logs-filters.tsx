'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';

interface ActivityLogFilters {
  userId?: string;
  actionType?: string;
  logLevel?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface FilterOptions {
  actionTypes: string[];
  logLevels: string[];
}

interface ActivityLogsFiltersProps {
  filters: ActivityLogFilters;
  filterOptions: FilterOptions | null;
  onFilterChange: (filters: ActivityLogFilters) => void;
}

export function ActivityLogsFilters({ filters, filterOptions, onFilterChange }: ActivityLogsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ActivityLogFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof ActivityLogFilters, value: string) => {
    const newFilters = {
      ...localFilters,
      [key]: value || undefined,
    };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => value !== undefined && value !== '');

  return (
    <div className="space-y-4">
      {/* Quick Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search logs by description, action, or user..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={applyFilters}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Action Type Filter */}
              <div>
                <Label htmlFor="actionType">Action Type</Label>
                <select
                  id="actionType"
                  value={localFilters.actionType || ''}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {filterOptions?.actionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Log Level Filter */}
              <div>
                <Label htmlFor="logLevel">Log Level</Label>
                <select
                  id="logLevel"
                  value={localFilters.logLevel || ''}
                  onChange={(e) => handleFilterChange('logLevel', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  {filterOptions?.logLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* User ID Filter */}
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="Enter user ID"
                  value={localFilters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                />
              </div>

              {/* Resource Type Filter */}
              <div>
                <Label htmlFor="resourceType">Resource Type</Label>
                <select
                  id="resourceType"
                  value={localFilters.resourceType || ''}
                  onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Resources</option>
                  <option value="ORDER">Order</option>
                  <option value="USER">User</option>
                  <option value="STORE">Store</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="COMMISSION">Commission</option>
                </select>
              </div>

              {/* Resource ID Filter */}
              <div>
                <Label htmlFor="resourceId">Resource ID</Label>
                <Input
                  id="resourceId"
                  placeholder="Enter resource ID"
                  value={localFilters.resourceId || ''}
                  onChange={(e) => handleFilterChange('resourceId', e.target.value)}
                />
              </div>

              {/* Date From Filter */}
              <div>
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="datetime-local"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              {/* Date To Filter */}
              <div>
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="datetime-local"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters}>
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(localFilters).map(([key, value]) => {
            if (!value) return null;
            
            let displayValue = value;
            if (key === 'dateFrom' || key === 'dateTo') {
              displayValue = new Date(value).toLocaleDateString();
            }
            
            return (
              <div
                key={key}
                className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
              >
                <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                <span>{displayValue}</span>
                <button
                  onClick={() => handleFilterChange(key as keyof ActivityLogFilters, '')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}