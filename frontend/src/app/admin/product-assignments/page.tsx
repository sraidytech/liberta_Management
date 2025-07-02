'use client';

import { useLanguage } from '@/lib/language-context';
import AdminLayout from '@/components/admin/admin-layout';
import { useToast } from '@/components/ui/toast';
import { useState, useEffect } from 'react';
import {
  Package,
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  BarChart3,
  UserCheck,
  X
} from 'lucide-react';

interface ProductAssignment {
  id: string;
  userId: string;
  productName: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
    agentCode?: string;
    isActive: boolean;
  };
}

interface AssignmentStats {
  totalAssignments: number;
  activeAssignments: number;
  uniqueProducts: number;
  assignedUsers: number;
}

export default function ProductAssignmentManagement() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [stats, setStats] = useState<AssignmentStats>({
    totalAssignments: 0,
    activeAssignments: 0,
    uniqueProducts: 0,
    assignedUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch assignments
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const [assignmentsResponse, statsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/assignments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      const assignmentsData = await assignmentsResponse.json();
      const statsData = await statsResponse.json();

      if (!assignmentsResponse.ok) {
        throw new Error(assignmentsData.error?.message || 'Failed to fetch assignments');
      }

      if (!statsResponse.ok) {
        throw new Error(statsData.error?.message || 'Failed to fetch stats');
      }

      if (assignmentsData.success) {
        setAssignments(assignmentsData.data);
      }

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error: any) {
      console.error('Fetch assignments error:', error);
      setError(error.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  // Remove assignment
  const removeAssignment = async (userId: string, productName: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/${userId}/${encodeURIComponent(productName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to remove assignment');
      }

      if (data.success) {
        await fetchAssignments(); // Refresh the list
        showToast({
          type: 'success',
          title: language === 'fr' ? 'Assignation supprimée' : 'Assignment removed',
          message: language === 'fr' ? 'L\'assignation a été supprimée avec succès' : 'Assignment has been removed successfully'
        });
      }
    } catch (error: any) {
      console.error('Remove assignment error:', error);
      showToast({
        type: 'error',
        title: language === 'fr' ? 'Erreur de suppression' : 'Remove error',
        message: error.message || 'Failed to remove assignment'
      });
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.user.agentCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = userFilter === 'all' || assignment.user.role === userFilter;
    const matchesProduct = productFilter === 'all' || assignment.productName === productFilter;
    
    return matchesSearch && matchesUser && matchesProduct;
  });

  // Get unique products for filter
  const uniqueProducts = Array.from(new Set(assignments.map(a => a.productName))).sort();

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">
              {language === 'fr' ? 'Chargement des assignations...' : 'Loading assignments...'}
            </span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'fr' ? 'Gestion des Assignations de Produits' : 'Product Assignment Management'}
          </h1>
          <p className="text-gray-500 mt-2">
            {language === 'fr' ? 'Gérer les assignations de produits aux utilisateurs' : 'Manage product assignments to users'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {language === 'fr' ? 'Total Assignations' : 'Total Assignments'}
              </p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalAssignments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">
                {language === 'fr' ? 'Assignations Actives' : 'Active Assignments'}
              </p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.activeAssignments}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">
                {language === 'fr' ? 'Produits Uniques' : 'Unique Products'}
              </p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats.uniqueProducts}</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {language === 'fr' ? 'Utilisateurs Assignés' : 'Assigned Users'}
              </p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{stats.assignedUsers}</p>
            </div>
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'fr' ? 'Rechercher par utilisateur ou produit...' : 'Search by user or product...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-500" />
            
            {/* User Role Filter */}
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
            >
              <option value="all">{language === 'fr' ? 'Tous les rôles' : 'All roles'}</option>
              <option value="TEAM_MANAGER">{language === 'fr' ? 'Gestionnaires' : 'Managers'}</option>
              <option value="COORDINATEUR">{language === 'fr' ? 'Coordinateurs' : 'Coordinators'}</option>
              <option value="AGENT_SUIVI">{language === 'fr' ? 'Agents de suivi' : 'Follow-up Agents'}</option>
              <option value="AGENT_CALL_CENTER">{language === 'fr' ? 'Agents centre d\'appels' : 'Call Center Agents'}</option>
            </select>

            {/* Product Filter */}
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
            >
              <option value="all">{language === 'fr' ? 'Tous les produits' : 'All products'}</option>
              {uniqueProducts.map(product => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Utilisateur' : 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Produit' : 'Product'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Statut' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Créé le' : 'Created'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Actions' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Package className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {language === 'fr' ? 'Aucune assignation trouvée' : 'No assignments found'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {assignment.user.name[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {assignment.user.role.replace('_', ' ')}
                          </div>
                          {assignment.user.agentCode && (
                            <div className="text-xs text-blue-600 font-mono">
                              {assignment.user.agentCode}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.productName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {assignment.isActive 
                          ? (language === 'fr' ? 'Actif' : 'Active')
                          : (language === 'fr' ? 'Inactif' : 'Inactive')
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(assignment.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => removeAssignment(assignment.userId, assignment.productName)}
                        className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={language === 'fr' ? 'Supprimer l\'assignation' : 'Remove assignment'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}