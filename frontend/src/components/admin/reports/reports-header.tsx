'use client';

import { useLanguage } from '@/lib/language-context';
import { 
  BarChart3, 
  RefreshCw, 
  Download, 
  Settings,
  Zap,
  ZapOff
} from 'lucide-react';

interface ReportsHeaderProps {
  autoRefresh: boolean;
  onAutoRefreshToggle: (enabled: boolean) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  loading: boolean;
}

export default function ReportsHeader({
  autoRefresh,
  onAutoRefreshToggle,
  onRefresh,
  onExport,
  loading
}: ReportsHeaderProps) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
      <div className="mb-6 lg:mb-0">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-800 bg-clip-text text-transparent mb-2">
              {language === 'fr' ? 'Rapports Avancés' : 'Advanced Reports'}
            </h1>
            <p className="text-lg text-gray-600">
              {language === 'fr' ? 'Analyses détaillées et insights business' : 'Detailed analytics and business insights'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        {/* Auto-refresh Toggle */}
        <div className="flex items-center space-x-3 bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
          <button
            onClick={() => onAutoRefreshToggle(!autoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              autoRefresh
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? (
              <Zap className="w-4 h-4" />
            ) : (
              <ZapOff className="w-4 h-4" />
            )}
            <span>
              {language === 'fr' ? 'Auto-actualisation' : 'Auto-refresh'}
            </span>
          </button>
          {autoRefresh && (
            <span className="text-xs text-emerald-600 font-medium">
              {language === 'fr' ? '5 min' : '5 min'}
            </span>
          )}
        </div>

        {/* Manual Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-medium text-gray-700">
            {language === 'fr' ? 'Actualiser' : 'Refresh'}
          </span>
        </button>

        {/* Export Dropdown */}
        <div className="relative group">
          <button className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
            <Download className="w-5 h-5" />
            <span>{language === 'fr' ? 'Exporter' : 'Export'}</span>
          </button>
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="py-2">
              <button
                onClick={() => onExport('pdf')}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 font-bold text-xs">PDF</span>
                </div>
                <div>
                  <p className="font-medium">{language === 'fr' ? 'Rapport PDF' : 'PDF Report'}</p>
                  <p className="text-xs text-gray-500">{language === 'fr' ? 'Format professionnel' : 'Professional format'}</p>
                </div>
              </button>
              
              <button
                onClick={() => onExport('excel')}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-xs">XLS</span>
                </div>
                <div>
                  <p className="font-medium">{language === 'fr' ? 'Fichier Excel' : 'Excel File'}</p>
                  <p className="text-xs text-gray-500">{language === 'fr' ? 'Avec graphiques' : 'With charts'}</p>
                </div>
              </button>
              
              <button
                onClick={() => onExport('csv')}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-3"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs">CSV</span>
                </div>
                <div>
                  <p className="font-medium">{language === 'fr' ? 'Données CSV' : 'CSV Data'}</p>
                  <p className="text-xs text-gray-500">{language === 'fr' ? 'Données brutes' : 'Raw data'}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}