'use client';

import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import CoordinateurLayout from '@/components/coordinateur/coordinateur-layout';
import { useToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import {
  UserCheck,
  Users,
  Package,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  agentCode: string;
  isActive: boolean;
  isOnline: boolean;
  todaysOrders: number;
  maxOrders: number;
  utilizationRate: number;
}

interface AssignmentStats {
  totalAgents: number;
  onlineAgents: number;
  busyAgents: number;
  availableAgents: number;
}

export default function CoordinateurAssignments() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AssignmentStats>({
    totalAgents: 0,
    onlineAgents: 0,
    busyAgents: 0,
    availableAgents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch agents for manual assignment (filtered by coordinateur's products)
  const fetchAgents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Get agents available for manual assignment
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/assignments/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch agents');
      }

      if (data.success) {
        setAgents(data.data);
        
        // Calculate stats
        const totalAgents = data.data.length;
        const onlineAgents = data.data.filter((a: Agent) => a.isOnline).length;
        const busyAgents = data.data.filter((a: Agent) => a.utilizationRate >= 80).length;
        const availableAgents = data.data.filter((a: Agent) => a.utilizationRate < 80 && a.isActive).length;
        
        setStats({
          totalAgents,
          onlineAgents,
          busyAgents,
          availableAgents
        });
      }
    } catch (error: any) {
      console.error('Fetch agents error:', error);
      setError(error.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agentCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'online' && agent.isOnline) ||
      (statusFilter === 'offline' && !agent.isOnline) ||
      (statusFilter === 'available' && agent.utilizationRate < 80) ||
      (statusFilter === 'busy' && agent.utilizationRate >= 80);
    
    return matchesSearch && matchesStatus;
  });

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 70) return 'text-orange-600 bg-orange-100';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <CoordinateurLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">
              {language === 'fr' ? 'Chargement des agents...' : 'Loading agents...'}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'fr' ? 'Attribution des Agents' : 'Agent Assignment'}
          </h1>
          <p className="text-gray-500 mt-2">
            {language === 'fr' ? 'Gérer les agents pour vos produits assignés' : 'Manage agents for your assigned products'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {language === 'fr' ? 'Total Agents' : 'Total Agents'}
              </p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalAgents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">
                {language === 'fr' ? 'En Ligne' : 'Online'}
              </p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.onlineAgents}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">
                {language === 'fr' ? 'Occupés' : 'Busy'}
              </p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.busyAgents}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {language === 'fr' ? 'Disponibles' : 'Available'}
              </p>
              <p className="text-3xl font-bold text-emerald-900 mt-2">{stats.availableAgents}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'fr' ? 'Rechercher par nom ou code...' : 'Search by name or code...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
            >
              <option value="all">{language === 'fr' ? 'Tous les statuts' : 'All statuses'}</option>
              <option value="online">{language === 'fr' ? 'En ligne' : 'Online'}</option>
              <option value="offline">{language === 'fr' ? 'Hors ligne' : 'Offline'}</option>
              <option value="available">{language === 'fr' ? 'Disponibles' : 'Available'}</option>
              <option value="busy">{language === 'fr' ? 'Occupés' : 'Busy'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">
              {language === 'fr' ? 'Aucun agent trouvé' : 'No agents found'}
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              {/* Agent Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {agent.name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500">{agent.agentCode}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${agent.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className="text-sm text-gray-600">
                    {agent.isOnline ? (language === 'fr' ? 'En ligne' : 'Online') : (language === 'fr' ? 'Hors ligne' : 'Offline')}
                  </span>
                </div>
              </div>

              {/* Agent Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {language === 'fr' ? 'Commandes aujourd\'hui' : 'Today\'s orders'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {agent.todaysOrders}/{agent.maxOrders}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((agent.todaysOrders / agent.maxOrders) * 100, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {language === 'fr' ? 'Taux d\'utilisation' : 'Utilization rate'}
                  </span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${getUtilizationColor(agent.utilizationRate)}`}>
                    {agent.utilizationRate}%
                  </span>
                </div>
              </div>

              {/* Agent Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    agent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {agent.isActive ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Inactif' : 'Inactive')}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200 shadow-sm hover:shadow-md">
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all duration-200 shadow-sm hover:shadow-md">
                      <Package className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assignment Summary */}
      <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {language === 'fr' ? 'Résumé des Assignations' : 'Assignment Summary'}
          </h3>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalAgents}</p>
            <p className="text-sm text-gray-600">
              {language === 'fr' ? 'Agents Totaux' : 'Total Agents'}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.onlineAgents}</p>
            <p className="text-sm text-gray-600">
              {language === 'fr' ? 'En Ligne' : 'Online'}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.availableAgents}</p>
            <p className="text-sm text-gray-600">
              {language === 'fr' ? 'Disponibles' : 'Available'}
            </p>
          </div>
        </div>
      </div>
    </CoordinateurLayout>
  );
}