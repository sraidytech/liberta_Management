'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import {
  Calendar,
  Filter,
  Store,
  Users,
  MapPin,
  DollarSign,
  X,
  ChevronDown
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  agentCode: string;
}

interface ReportFilters {
  dateRange: string;
  startDate: string;
  endDate: string;
  storeId: string;
  agentId: string;
  status: string;
  wilaya: string;
  minRevenue: string;
  maxRevenue: string;
}

interface ReportsFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

export default function ReportsFilters({ filters, onFiltersChange }: ReportsFiltersProps) {
  const { language } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [localCustomDates, setLocalCustomDates] = useState({
    startDate: filters.startDate,
    endDate: filters.endDate
  });

  // Fetch agents list - ONLY AGENT_SUIVI (follow-up agents)
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoadingAgents(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/v1/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            // Filter to only include AGENT_SUIVI (follow-up agents)
            const followUpAgents = result.data
              .filter((user: any) => user.role === 'AGENT_SUIVI')
              .map((user: any) => ({
                id: user.id,
                name: user.name,
                agentCode: user.agentCode || user.id
              }));
            setAgents(followUpAgents);
          }
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

  const dateRangeOptions = [
    { value: 'today', label: language === 'fr' ? 'Aujourd\'hui' : 'Today' },
    { value: 'yesterday', label: language === 'fr' ? 'Hier' : 'Yesterday' },
    { value: 'last7days', label: language === 'fr' ? '7 derniers jours' : 'Last 7 days' },
    { value: 'last30days', label: language === 'fr' ? '30 derniers jours' : 'Last 30 days' },
    { value: 'last90days', label: language === 'fr' ? '90 derniers jours' : 'Last 90 days' },
    { value: 'thisMonth', label: language === 'fr' ? 'Ce mois' : 'This month' },
    { value: 'lastMonth', label: language === 'fr' ? 'Mois dernier' : 'Last month' },
    { value: 'thisYear', label: language === 'fr' ? 'Cette année' : 'This year' },
    { value: 'custom', label: language === 'fr' ? 'Personnalisé' : 'Custom' }
  ];

  const statusOptions = [
    { value: '', label: language === 'fr' ? 'Tous les statuts' : 'All statuses' },
    { value: 'PENDING', label: language === 'fr' ? 'En attente' : 'Pending' },
    { value: 'CONFIRMED', label: language === 'fr' ? 'Confirmé' : 'Confirmed' },
    { value: 'SHIPPED', label: language === 'fr' ? 'Expédié' : 'Shipped' },
    { value: 'DELIVERED', label: language === 'fr' ? 'Livré' : 'Delivered' },
    { value: 'CANCELLED', label: language === 'fr' ? 'Annulé' : 'Cancelled' }
  ];

  const wilayaOptions = [
    { value: '', label: language === 'fr' ? 'Toutes les wilayas' : 'All wilayas' },
    { value: 'Alger', label: 'Alger' },
    { value: 'Oran', label: 'Oran' },
    { value: 'Constantine', label: 'Constantine' },
    { value: 'Annaba', label: 'Annaba' },
    { value: 'Blida', label: 'Blida' },
    { value: 'Batna', label: 'Batna' },
    { value: 'Djelfa', label: 'Djelfa' },
    { value: 'Sétif', label: 'Sétif' },
    { value: 'Sidi Bel Abbès', label: 'Sidi Bel Abbès' },
    { value: 'Biskra', label: 'Biskra' }
  ];

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const handleCustomDateChange = useCallback((key: 'startDate' | 'endDate', value: string) => {
    const newLocalDates = { ...localCustomDates, [key]: value };
    setLocalCustomDates(newLocalDates);
    
    // Only trigger filter change if both dates are filled
    if (newLocalDates.startDate && newLocalDates.endDate) {
      const newFilters = {
        ...filters,
        startDate: newLocalDates.startDate,
        endDate: newLocalDates.endDate
      };
      onFiltersChange(newFilters);
    }
  }, [localCustomDates, filters, onFiltersChange]);

  const clearFilters = () => {
    setLocalCustomDates({ startDate: '', endDate: '' });
    onFiltersChange({
      dateRange: 'last30days',
      startDate: '',
      endDate: '',
      storeId: '',
      agentId: '',
      status: '',
      wilaya: '',
      minRevenue: '',
      maxRevenue: ''
    });
  };

  const hasActiveFilters = filters.storeId || filters.agentId || filters.status || 
                          filters.wilaya || filters.minRevenue || filters.maxRevenue;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {language === 'fr' ? 'Filtres' : 'Filters'}
              </h3>
              <p className="text-sm text-gray-600">
                {language === 'fr' ? 'Personnalisez vos rapports' : 'Customize your reports'}
              </p>
            </div>
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span>{language === 'fr' ? 'Effacer' : 'Clear'}</span>
            </button>
          )}
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Date Range */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <Calendar className="w-4 h-4" />
              <span>{language === 'fr' ? 'Période' : 'Date Range'}</span>
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => {
                const newValue = e.target.value;
                handleFilterChange('dateRange', newValue);
                // Reset local custom dates when switching away from custom
                if (newValue !== 'custom') {
                  setLocalCustomDates({ startDate: '', endDate: '' });
                } else {
                  // Initialize with current filter values when switching to custom
                  setLocalCustomDates({
                    startDate: filters.startDate,
                    endDate: filters.endDate
                  });
                }
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Store Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <Store className="w-4 h-4" />
              <span>{language === 'fr' ? 'Magasin' : 'Store'}</span>
            </label>
            <select
              value={filters.storeId}
              onChange={(e) => handleFilterChange('storeId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">{language === 'fr' ? 'Tous les magasins' : 'All stores'}</option>
              <option value="NATU">NATU</option>
              <option value="PURNA">PURNA</option>
              <option value="DILST">DILST</option>
              <option value="MGSTR">MGSTR</option>
              <option value="JWLR">JWLR</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>{language === 'fr' ? 'Statut' : 'Status'}</span>
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {filters.dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {language === 'fr' ? 'Date de début' : 'Start Date'}
              </label>
              <input
                type="date"
                value={localCustomDates.startDate}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {language === 'fr' ? 'Date de fin' : 'End Date'}
              </label>
              <input
                type="date"
                value={localCustomDates.endDate}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        )}

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors mb-4"
        >
          <span>{language === 'fr' ? 'Filtres avancés' : 'Advanced filters'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {/* Agent Filter - Dropdown */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                <Users className="w-4 h-4" />
                <span>{language === 'fr' ? 'Agent' : 'Agent'}</span>
              </label>
              <select
                value={filters.agentId}
                onChange={(e) => handleFilterChange('agentId', e.target.value)}
                disabled={loadingAgents}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingAgents
                    ? (language === 'fr' ? 'Chargement...' : 'Loading...')
                    : (language === 'fr' ? 'Tous les agents' : 'All agents')
                  }
                </option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.agentCode} - {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Wilaya Filter */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{language === 'fr' ? 'Wilaya' : 'Wilaya'}</span>
              </label>
              <select
                value={filters.wilaya}
                onChange={(e) => handleFilterChange('wilaya', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {wilayaOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Revenue Range */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
                <DollarSign className="w-4 h-4" />
                <span>{language === 'fr' ? 'Montant (DA)' : 'Amount (DA)'}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder={language === 'fr' ? 'Min' : 'Min'}
                  value={filters.minRevenue}
                  onChange={(e) => handleFilterChange('minRevenue', e.target.value)}
                  className="px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
                <input
                  type="number"
                  placeholder={language === 'fr' ? 'Max' : 'Max'}
                  value={filters.maxRevenue}
                  onChange={(e) => handleFilterChange('maxRevenue', e.target.value)}
                  className="px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              {language === 'fr' ? 'Filtres actifs:' : 'Active filters:'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {filters.storeId && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {language === 'fr' ? 'Magasin:' : 'Store:'} {filters.storeId}
                </span>
              )}
              {filters.agentId && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {language === 'fr' ? 'Agent:' : 'Agent:'} {agents.find(a => a.id === filters.agentId)?.name || filters.agentId}
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {language === 'fr' ? 'Statut:' : 'Status:'} {filters.status}
                </span>
              )}
              {filters.wilaya && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {language === 'fr' ? 'Wilaya:' : 'Wilaya:'} {filters.wilaya}
                </span>
              )}
              {(filters.minRevenue || filters.maxRevenue) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {language === 'fr' ? 'Montant:' : 'Amount:'} {filters.minRevenue || '0'} - {filters.maxRevenue || '∞'} DA
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}