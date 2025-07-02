'use client';

import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import CoordinateurLayout from '@/components/coordinateur/coordinateur-layout';
import { useToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import {
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  UserCheck
} from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  myProducts: number;
  myAgents: number;
  todayOrders: number;
}

export default function CoordinateurDashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    myProducts: 0,
    myAgents: 0,
    todayOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch coordinateur-specific dashboard stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Get user's assigned products
      const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/user/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const productsData = await productsResponse.json();
      const assignedProducts = productsData.success ? productsData.data : [];

      // Get orders statistics (filtered by assigned products)
      const ordersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const ordersData = await ordersResponse.json();
      
      if (ordersData.success) {
        const orders = ordersData.data.orders;
        const today = new Date().toDateString();
        
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: any) => o.status === 'PENDING' || o.status === 'ASSIGNED').length,
          completedOrders: orders.filter((o: any) => o.status === 'COMPLETED' || o.status === 'DELIVERED').length,
          myProducts: assignedProducts.length,
          myAgents: 0, // Will be calculated based on agents assigned to same products
          todayOrders: orders.filter((o: any) => new Date(o.createdAt).toDateString() === today).length
        });
      }
    } catch (error: any) {
      console.error('Fetch stats error:', error);
      setError(error.message || 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return (
      <CoordinateurLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">
              {language === 'fr' ? 'Chargement du tableau de bord...' : 'Loading dashboard...'}
            </span>
          </div>
        </div>
      </CoordinateurLayout>
    );
  }

  if (error) {
    return (
      <CoordinateurLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        </div>
      </CoordinateurLayout>
    );
  }

  return (
    <CoordinateurLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {language === 'fr' ? 'Tableau de Bord Coordinateur' : 'Coordinator Dashboard'}
        </h1>
        <p className="text-gray-500 mt-2">
          {language === 'fr' 
            ? 'Vue d\'ensemble de vos produits et commandes assignés' 
            : 'Overview of your assigned products and orders'
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Orders */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {language === 'fr' ? 'Mes Commandes' : 'My Orders'}
              </p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {language === 'fr' ? 'En Attente' : 'Pending'}
              </p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{stats.pendingOrders}</p>
            </div>
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">
                {language === 'fr' ? 'Terminées' : 'Completed'}
              </p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.completedOrders}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* My Products */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">
                {language === 'fr' ? 'Mes Produits' : 'My Products'}
              </p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats.myProducts}</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-700">
                {language === 'fr' ? 'Aujourd\'hui' : 'Today'}
              </p>
              <p className="text-3xl font-bold text-indigo-900 mt-2">{stats.todayOrders}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* My Agents */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 border border-teal-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">
                {language === 'fr' ? 'Mes Agents' : 'My Agents'}
              </p>
              <p className="text-3xl font-bold text-teal-900 mt-2">{stats.myAgents}</p>
            </div>
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
            </h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <button className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {language === 'fr' ? 'Voir Mes Commandes' : 'View My Orders'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {language === 'fr' ? 'Gérer les commandes assignées' : 'Manage assigned orders'}
                  </p>
                </div>
              </div>
            </button>
            
            <button className="w-full text-left p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {language === 'fr' ? 'Mes Produits' : 'My Products'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {language === 'fr' ? 'Voir les produits assignés' : 'View assigned products'}
                  </p>
                </div>
              </div>
            </button>
            
            <button className="w-full text-left p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
              <div className="flex items-center space-x-3">
                <UserCheck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {language === 'fr' ? 'Attribution d\'Agents' : 'Agent Assignment'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {language === 'fr' ? 'Gérer les agents' : 'Manage agents'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'fr' ? 'Aperçu des Performances' : 'Performance Overview'}
            </h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {language === 'fr' ? 'Taux de Completion' : 'Completion Rate'}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ 
                  width: `${stats.totalOrders > 0 ? (stats.completedOrders / stats.totalOrders) * 100 : 0}%` 
                }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {language === 'fr' ? 'Commandes en Attente' : 'Pending Orders'}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {stats.pendingOrders}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full" 
                style={{ 
                  width: `${stats.totalOrders > 0 ? (stats.pendingOrders / stats.totalOrders) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </CoordinateurLayout>
  );
}