'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAgentPerformance } from '@/hooks/useAgentPerformance';
import { useLanguage } from '@/lib/language-context';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Target,
  BarChart3,
  Calendar,
  RefreshCw,
  Award,
  Activity
} from 'lucide-react';

interface AgentPerformanceAnalyticsProps {
  agentId?: string;
}

export default function AgentPerformanceAnalytics({ agentId }: AgentPerformanceAnalyticsProps) {
  const { language } = useLanguage();
  const { data, loading, error, refetch, setPeriod, period } = useAgentPerformance(agentId);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">
              {language === 'fr' ? 'Chargement des performances...' : 'Loading performance data...'}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            {language === 'fr' ? 'Erreur de chargement' : 'Loading Error'}
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Réessayer' : 'Retry'}
          </Button>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          {language === 'fr' ? 'Aucune donnée de performance disponible' : 'No performance data available'}
        </div>
      </Card>
    );
  }

  // Handle insufficient activity case
  if (data.hasInsufficientActivity) {
    const requirements = data.missingRequirements;
    
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="mb-4">
            <Activity className="h-12 w-12 mx-auto text-orange-500 mb-2" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'fr' ? 'Activité Insuffisante' : 'Insufficient Activity'}
            </h3>
          </div>
          
          <div className="max-w-lg mx-auto">
            <p className="text-gray-600 mb-4">
              {language === 'fr'
                ? 'Pour voir vos analyses de performance, vous devez remplir les conditions suivantes:'
                : 'To view your performance analytics, you need to meet the following requirements:'
              }
            </p>
            
            {/* Requirements Status */}
            <div className="space-y-3 mb-6">
              {/* Notes Requirement */}
              <div className={`flex items-center justify-between p-3 rounded-lg border ${
                requirements?.needsNotes ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {requirements?.needsNotes ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <span className={`font-medium ${
                    requirements?.needsNotes ? 'text-red-900' : 'text-green-900'
                  }`}>
                    {language === 'fr' ? 'Au moins 1 note sur les commandes' : 'At least 1 note on orders'}
                  </span>
                </div>
                <span className={`text-sm ${
                  requirements?.needsNotes ? 'text-red-600' : 'text-green-600'
                }`}>
                  {requirements?.currentNotes || 0} {language === 'fr' ? 'notes' : 'notes'}
                </span>
              </div>

              {/* Delivered Orders Requirement */}
              <div className={`flex items-center justify-between p-3 rounded-lg border ${
                requirements?.needsDeliveredOrders ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {requirements?.needsDeliveredOrders ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <span className={`font-medium ${
                    requirements?.needsDeliveredOrders ? 'text-red-900' : 'text-green-900'
                  }`}>
                    {language === 'fr' ? 'Au moins 1 commande livrée' : 'At least 1 delivered order'}
                  </span>
                </div>
                <span className={`text-sm ${
                  requirements?.needsDeliveredOrders ? 'text-red-600' : 'text-green-600'
                }`}>
                  {requirements?.currentDeliveredOrders || 0} {language === 'fr' ? 'livrées' : 'delivered'}
                </span>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-left">
                  <h4 className="font-medium text-blue-900 mb-2">
                    {language === 'fr' ? 'Comment remplir les conditions:' : 'How to meet the requirements:'}
                  </h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    {requirements?.needsNotes && (
                      <div>
                        <strong>{language === 'fr' ? 'Pour ajouter des notes:' : 'To add notes:'}</strong>
                        <ol className="ml-4 mt-1 space-y-1">
                          <li>1. {language === 'fr' ? 'Allez à vos commandes assignées' : 'Go to your assigned orders'}</li>
                          <li>2. {language === 'fr' ? 'Cliquez sur une commande' : 'Click on an order'}</li>
                          <li>3. {language === 'fr' ? 'Ajoutez une note sur votre travail' : 'Add a note about your work'}</li>
                        </ol>
                      </div>
                    )}
                    {requirements?.needsDeliveredOrders && (
                      <div>
                        <strong>{language === 'fr' ? 'Pour livrer des commandes:' : 'To deliver orders:'}</strong>
                        <ol className="ml-4 mt-1 space-y-1">
                          <li>1. {language === 'fr' ? 'Traitez vos commandes assignées' : 'Process your assigned orders'}</li>
                          <li>2. {language === 'fr' ? 'Confirmez les commandes' : 'Confirm the orders'}</li>
                          <li>3. {language === 'fr' ? 'Attendez la livraison' : 'Wait for delivery'}</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <Button onClick={refetch} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Vérifier à nouveau' : 'Check Again'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Type guard to ensure we have complete performance data
  if (!data.completionRate || !data.averageProcessingTime || !data.orderCounts || !data.successRate || !data.productivity || !data.period) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          {language === 'fr' ? 'Données de performance incomplètes' : 'Incomplete performance data'}
        </div>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProcessingTimeColor = (comparison: string) => {
    switch (comparison) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      default:
        return 'text-orange-600';
    }
  };

  const getProcessingTimeText = (comparison: string) => {
    const texts = {
      excellent: { en: 'Excellent', fr: 'Excellent' },
      good: { en: 'Good', fr: 'Bon' },
      needs_improvement: { en: 'Needs Improvement', fr: 'À améliorer' }
    };
    return texts[comparison as keyof typeof texts]?.[language] || comparison;
  };

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {language === 'fr' ? 'Mes Performances' : 'My Performance'}
          </h2>
          <p className="text-sm text-gray-600">
            {language === 'fr' ? 'Analyse détaillée de vos performances' : 'Detailed analysis of your performance'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">{language === 'fr' ? '7 jours' : '7 days'}</option>
            <option value="30d">{language === 'fr' ? '30 jours' : '30 days'}</option>
            <option value="90d">{language === 'fr' ? '90 jours' : '90 days'}</option>
          </select>
          
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Performance Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">
                  {language === 'fr' ? 'Taux de Completion' : 'Completion Rate'}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.completionRate.current}%
                </div>
              </div>
            </div>
            <div className={`flex items-center space-x-1 ${getTrendColor(data.completionRate.trend)}`}>
              {getTrendIcon(data.completionRate.trend)}
              <span className="text-xs font-medium">
                {data.completionRate.previous}%
              </span>
            </div>
          </div>
        </Card>

        {/* Average Processing Time */}
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">
                {language === 'fr' ? 'Temps Moyen' : 'Avg Processing Time'}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.averageProcessingTime.hours}h
              </div>
              <div className={`text-xs font-medium ${getProcessingTimeColor(data.averageProcessingTime.comparison)}`}>
                {getProcessingTimeText(data.averageProcessingTime.comparison)}
              </div>
            </div>
          </div>
        </Card>

        {/* Orders Processed */}
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">
                {language === 'fr' ? 'Commandes Traitées' : 'Orders Processed'}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.orderCounts.total}
              </div>
              <div className="text-xs text-gray-500">
                {data.productivity.ordersPerDay} {language === 'fr' ? 'par jour' : 'per day'}
              </div>
            </div>
          </div>
        </Card>

        {/* Success Rate */}
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">
                {language === 'fr' ? 'Taux de Succès' : 'Success Rate'}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.successRate.percentage}%
              </div>
              <div className="text-xs text-gray-500">
                {data.successRate.delivered + data.successRate.confirmed} {language === 'fr' ? 'réussies' : 'successful'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-gray-600" />
            {language === 'fr' ? 'Répartition des Commandes' : 'Order Breakdown'}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {language === 'fr' ? 'Livrées' : 'Delivered'}
                </span>
              </div>
              <div className="text-sm font-medium">
                {data.orderCounts.completed} ({data.completionRate.current}%)
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {language === 'fr' ? 'Confirmées' : 'Confirmed'}
                </span>
              </div>
              <div className="text-sm font-medium">
                {data.orderCounts.confirmed}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {language === 'fr' ? 'Annulées' : 'Cancelled'}
                </span>
              </div>
              <div className="text-sm font-medium">
                {data.orderCounts.cancelled} ({data.successRate.cancellationRate}%)
              </div>
            </div>
          </div>
        </Card>

        {/* Productivity Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-gray-600" />
            {language === 'fr' ? 'Métriques de Productivité' : 'Productivity Metrics'}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {language === 'fr' ? 'Commandes par jour' : 'Orders per day'}
              </span>
              <span className="text-sm font-medium">
                {data.productivity.ordersPerDay}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {language === 'fr' ? 'Taux d\'utilisation' : 'Utilization rate'}
              </span>
              <span className="text-sm font-medium">
                {data.productivity.utilizationRate}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {language === 'fr' ? 'Capacité actuelle' : 'Current capacity'}
              </span>
              <span className="text-sm font-medium">
                {data.agent.currentOrders}/{data.agent.maxOrders}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(data.productivity.utilizationRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Period Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-gray-600" />
          {language === 'fr' ? 'Résumé de la Période' : 'Period Summary'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600 mb-1">
              {language === 'fr' ? 'Période analysée' : 'Period analyzed'}
            </div>
            <div className="font-medium">
              {data.period.days} {language === 'fr' ? 'jours' : 'days'}
            </div>
          </div>
          
          <div>
            <div className="text-gray-600 mb-1">
              {language === 'fr' ? 'Total des commandes' : 'Total orders'}
            </div>
            <div className="font-medium">
              {data.orderCounts.total}
            </div>
          </div>
          
          <div>
            <div className="text-gray-600 mb-1">
              {language === 'fr' ? 'Performance globale' : 'Overall performance'}
            </div>
            <div className="font-medium flex items-center">
              {data.successRate.percentage >= 80 ? (
                <>
                  <Award className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600">
                    {language === 'fr' ? 'Excellente' : 'Excellent'}
                  </span>
                </>
              ) : data.successRate.percentage >= 60 ? (
                <>
                  <Target className="h-4 w-4 text-blue-600 mr-1" />
                  <span className="text-blue-600">
                    {language === 'fr' ? 'Bonne' : 'Good'}
                  </span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 text-orange-600 mr-1" />
                  <span className="text-orange-600">
                    {language === 'fr' ? 'À améliorer' : 'Needs improvement'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}