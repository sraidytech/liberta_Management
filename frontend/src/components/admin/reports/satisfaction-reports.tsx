'use client';

import { useLanguage } from '@/lib/language-context';
import { Card } from '@/components/ui/card';
import {
  Star,
  TrendingUp,
  Users,
  Package,
  MapPin,
  AlertCircle,
  Award,
  Store
} from 'lucide-react';

interface SatisfactionReportsProps {
  data: any;
  loading: boolean;
  filters: any;
}

export default function SatisfactionReports({ data, loading, filters }: SatisfactionReportsProps) {
  const { language } = useLanguage();

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        satisfactionOverview: 'Satisfaction Overview',
        totalSurveys: 'Total Surveys',
        averageRating: 'Average Rating',
        responseRate: 'Response Rate',
        lowRatings: 'Low Ratings Alert',
        categoryRatings: 'Category Ratings',
        deliverySpeed: 'Delivery Speed',
        productQuality: 'Product Quality',
        agentService: 'Agent Service',
        packaging: 'Packaging',
        agentPerformance: 'Agent Performance Rankings',
        storePerformance: 'Store Performance',
        wilayaAnalysis: 'Geographic Analysis (Wilaya)',
        agent: 'Agent',
        store: 'Store',
        wilaya: 'Wilaya',
        rating: 'Rating',
        surveys: 'Surveys',
        rank: 'Rank',
        noData: 'No data available for the selected period',
        stars: 'stars',
        highRatings: 'High Ratings',
        lowRatingsCount: 'Low Ratings'
      },
      fr: {
        satisfactionOverview: 'Aperçu de la Satisfaction',
        totalSurveys: 'Total des Enquêtes',
        averageRating: 'Note Moyenne',
        responseRate: 'Taux de Réponse',
        lowRatings: 'Alerte Notes Basses',
        categoryRatings: 'Notes par Catégorie',
        deliverySpeed: 'Vitesse de Livraison',
        productQuality: 'Qualité du Produit',
        agentService: 'Service Agent',
        packaging: 'Emballage',
        agentPerformance: 'Classement des Agents',
        storePerformance: 'Performance des Magasins',
        wilayaAnalysis: 'Analyse Géographique (Wilaya)',
        agent: 'Agent',
        store: 'Magasin',
        wilaya: 'Wilaya',
        rating: 'Note',
        surveys: 'Enquêtes',
        rank: 'Rang',
        noData: 'Aucune donnée disponible pour la période sélectionnée',
        stars: 'étoiles',
        highRatings: 'Notes Élevées',
        lowRatingsCount: 'Notes Basses'
      }
    };
    return translations[language][key] || key;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || !data.overview) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{t('noData')}</p>
      </div>
    );
  }

  const { overview, agentPerformance, storePerformance, wilayaSatisfaction } = data;

  // Prepare category ratings data
  const categoryData = [
    { name: t('deliverySpeed'), rating: overview.averageByCategory?.deliverySpeed || 0, color: 'bg-blue-500' },
    { name: t('productQuality'), rating: overview.averageByCategory?.productQuality || 0, color: 'bg-green-500' },
    { name: t('agentService'), rating: overview.averageByCategory?.agentService || 0, color: 'bg-purple-500' },
    { name: t('packaging'), rating: overview.averageByCategory?.packaging || 0, color: 'bg-orange-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('totalSurveys')}</span>
            <Star className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{overview.totalSurveys}</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('averageRating')}</span>
            <Award className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {overview.averageOverallRating?.toFixed(1) || '0.0'}
            <span className="text-lg text-gray-500 ml-1">/ 5.0</span>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('responseRate')}</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{overview.surveyResponseRate}%</div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{t('lowRatings')}</span>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {(overview.ratingDistribution?.['1'] || 0) + (overview.ratingDistribution?.['2'] || 0)}
          </div>
        </Card>
      </div>

      {/* Category Ratings - Modern Progress Bars */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <Package className="w-5 h-5 mr-2 text-gray-700" />
          {t('categoryRatings')}
        </h3>
        <div className="space-y-4">
          {categoryData.map((category) => (
            <div key={category.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{category.name}</span>
                <span className="text-sm font-bold text-gray-900">{category.rating.toFixed(1)} / 5.0</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${category.color} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${(category.rating / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Agent Performance Table */}
      {agentPerformance && agentPerformance.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-700" />
            {t('agentPerformance')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('rank')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('agent')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('surveys')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('rating')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('highRatings')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('lowRatingsCount')}</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.slice(0, 10).map((agent: any, index: number) => (
                  <tr key={agent.agentId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{agent.agentName}</div>
                      <div className="text-sm text-gray-500">{agent.agentCode}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-gray-900">{agent.totalSurveys}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold" style={{
                        backgroundColor: agent.averageRating >= 4 ? '#dcfce7' : agent.averageRating >= 3 ? '#fef3c7' : '#fee2e2',
                        color: agent.averageRating >= 4 ? '#166534' : agent.averageRating >= 3 ? '#92400e' : '#991b1b'
                      }}>
                        {agent.averageRating.toFixed(1)} ⭐
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-green-600 font-semibold">{agent.highRatingsCount}</td>
                    <td className="px-4 py-4 text-center text-red-600 font-semibold">{agent.lowRatingsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Store Performance Table */}
      {storePerformance && storePerformance.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Store className="w-5 h-5 mr-2 text-gray-700" />
            {t('storePerformance')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('store')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('surveys')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('rating')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('highRatings')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('lowRatingsCount')}</th>
                </tr>
              </thead>
              <tbody>
                {storePerformance.slice(0, 10).map((store: any) => (
                  <tr key={store.storeIdentifier} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-medium text-gray-900">{store.storeIdentifier}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-900">{store.totalSurveys}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold" style={{
                        backgroundColor: store.averageRating >= 4 ? '#dcfce7' : store.averageRating >= 3 ? '#fef3c7' : '#fee2e2',
                        color: store.averageRating >= 4 ? '#166534' : store.averageRating >= 3 ? '#92400e' : '#991b1b'
                      }}>
                        {store.averageRating.toFixed(1)} ⭐
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-green-600 font-semibold">{store.highRatingsCount}</td>
                    <td className="px-4 py-4 text-center text-red-600 font-semibold">{store.lowRatingsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Wilaya Analysis Table */}
      {wilayaSatisfaction && wilayaSatisfaction.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-gray-700" />
            {t('wilayaAnalysis')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('wilaya')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('surveys')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('rating')}</th>
                </tr>
              </thead>
              <tbody>
                {wilayaSatisfaction.slice(0, 10).map((wilayaData: any) => (
                  <tr key={wilayaData.wilaya || 'unknown'} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-medium text-gray-900">{wilayaData.wilaya || 'N/A'}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-900">{wilayaData.totalSurveys}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold" style={{
                        backgroundColor: wilayaData.averageRating >= 4 ? '#dcfce7' : wilayaData.averageRating >= 3 ? '#fef3c7' : '#fee2e2',
                        color: wilayaData.averageRating >= 4 ? '#166534' : wilayaData.averageRating >= 3 ? '#92400e' : '#991b1b'
                      }}>
                        {wilayaData.averageRating.toFixed(1)} ⭐
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}