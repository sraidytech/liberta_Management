'use client';

import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import { 
  Users, 
  ShoppingCart, 
  Store, 
  BarChart3, 
  Plus,
  Filter,
  Download,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const { t, language } = useLanguage();

  const stats = [
    {
      title: language === 'fr' ? 'Commandes Totales' : 'Total Orders',
      value: '2,847',
      change: '+12.5%',
      icon: ShoppingCart,
      color: 'bg-blue-500'
    },
    {
      title: language === 'fr' ? 'Agents Actifs' : 'Active Agents',
      value: '24',
      change: '+3.2%',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: language === 'fr' ? 'Magasins' : 'Stores',
      value: '5',
      change: '0%',
      icon: Store,
      color: 'bg-purple-500'
    },
    {
      title: language === 'fr' ? 'Taux de Réussite' : 'Success Rate',
      value: '94.2%',
      change: '+2.1%',
      icon: BarChart3,
      color: 'bg-orange-500'
    }
  ];

  return (
    <AdminLayout>
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-600 font-medium flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {stat.change}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent orders */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {language === 'fr' ? 'Commandes Récentes' : 'Recent Orders'}
            </h2>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-200">
              <Plus className="w-4 h-4" />
              <span>{language === 'fr' ? 'Nouvelle' : 'New'}</span>
            </button>
          </div>
          <div className="space-y-4">
            {[
              { id: 1001, store: 'NATU', amount: '2,450 DA', status: 'confirmed', time: '2 min' },
              { id: 1002, store: 'PURNA', amount: '1,890 DA', status: 'pending', time: '5 min' },
              { id: 1003, store: 'DILST', amount: '3,200 DA', status: 'confirmed', time: '8 min' }
            ].map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">#ORD-{order.id}</p>
                    <p className="text-sm text-gray-600">{order.store} Store</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{order.amount}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      order.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === 'confirmed' 
                        ? (language === 'fr' ? 'Confirmé' : 'Confirmed')
                        : (language === 'fr' ? 'En attente' : 'Pending')
                      }
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {order.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active agents */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {language === 'fr' ? 'Agents Actifs' : 'Active Agents'}
            </h2>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all duration-200">
              <Users className="w-4 h-4" />
              <span>{language === 'fr' ? 'Gérer' : 'Manage'}</span>
            </button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Ahmed Benali', orders: 12, status: 'online', role: 'AGENT_SUIVI' },
              { name: 'Fatima Zahra', orders: 8, status: 'busy', role: 'AGENT_CALL_CENTER' },
              { name: 'Mohamed Alami', orders: 15, status: 'online', role: 'TEAM_MANAGER' }
            ].map((agent, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-xl hover:bg-white/70 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{agent.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{agent.name}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-600">{agent.orders} {language === 'fr' ? 'commandes' : 'orders'}</p>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {agent.role.replace('AGENT_', '').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    agent.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></span>
                  <span className="text-sm text-gray-500 capitalize">{agent.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Store status */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {language === 'fr' ? 'État des Magasins' : 'Store Status'}
          </h2>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-200">
            <Store className="w-4 h-4" />
            <span>{language === 'fr' ? 'Configurer' : 'Configure'}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: 'NATU', status: 'active', orders: 45, sync: true },
            { name: 'PURNA', status: 'active', orders: 32, sync: true },
            { name: 'DILST', status: 'paused', orders: 0, sync: false },
            { name: 'MGSTR', status: 'active', orders: 28, sync: true },
            { name: 'JWLR', status: 'active', orders: 19, sync: true }
          ].map((store) => (
            <div key={store.name} className="p-4 bg-white/50 rounded-xl border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{store.name}</h3>
                <div className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${
                    store.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  {store.sync && <CheckCircle className="w-3 h-3 text-green-500" />}
                </div>
              </div>
              <p className="text-sm text-gray-600">{store.orders} {language === 'fr' ? 'commandes' : 'orders'}</p>
              <p className="text-xs text-gray-500 capitalize">{store.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4">
        <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-200">
          <Users className="w-5 h-5" />
          <span>{language === 'fr' ? 'Créer un Utilisateur' : 'Create User'}</span>
        </button>
        <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all duration-200">
          <Download className="w-5 h-5" />
          <span>{language === 'fr' ? 'Exporter les Données' : 'Export Data'}</span>
        </button>
        <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-200">
          <Filter className="w-5 h-5" />
          <span>{language === 'fr' ? 'Filtres Avancés' : 'Advanced Filters'}</span>
        </button>
      </div>
    </AdminLayout>
  );
}