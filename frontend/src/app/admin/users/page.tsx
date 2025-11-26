'use client';

import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import AdminLayout from '@/components/admin/admin-layout';
import { useToast } from '@/components/ui/toast';
import { Pagination } from '@/components/ui/pagination';
import PasswordChangeModal from '@/components/admin/password-change-modal';
import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Calendar,
  Settings,
  Loader2,
  AlertCircle,
  MoreVertical,
  Eye,
  Lock,
  Unlock,
  Key,
  Package,
  X
} from 'lucide-react';
import ProductAssignment from '@/components/admin/product-assignment';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEAM_MANAGER' | 'COORDINATEUR' | 'AGENT_SUIVI' | 'AGENT_CALL_CENTER' | 'QUALITY_AGENT' | 'STOCK_MANAGEMENT_AGENT';
  isActive: boolean;
  agentCode?: string;
  maxOrders: number;
  currentOrders: number;
  availability: 'ONLINE' | 'BUSY' | 'BREAK' | 'OFFLINE';
  createdAt: string;
}

export default function UserManagement() {
  const { t, language } = useLanguage();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProductAssignmentModal, setShowProductAssignmentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || t('failedToFetchUsers'));
      }

      if (data.success) {
        setUsers(data.data);
      } else {
        throw new Error(data.error?.message || t('failedToFetchUsers'));
      }
    } catch (error: any) {
      console.error('Fetch users error:', error);
      setError(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Delete user function
  const deleteUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete user');
      }

      if (data.success) {
        await fetchUsers(); // Refresh the list
        setShowDeleteModal(false);
        setSelectedUser(null);
        showToast({
          type: 'success',
          title: language === 'fr' ? 'Utilisateur supprimé' : 'User deleted',
          message: language === 'fr' ? 'L\'utilisateur a été supprimé avec succès' : 'User has been deleted successfully'
        });
      } else {
        throw new Error(data.error?.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Delete user error:', error);
      showToast({
        type: 'error',
        title: language === 'fr' ? 'Erreur de suppression' : 'Delete error',
        message: error.message || 'Failed to delete user'
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle user status function
  const toggleUserStatus = async (userId: string, currentStatus: boolean, userRole: string) => {
    // Prevent admin deactivation
    if (userRole === 'ADMIN' && currentStatus) {
      showToast({
        type: 'warning',
        title: language === 'fr' ? 'Action non autorisée' : 'Action not allowed',
        message: language === 'fr' ? 'Les administrateurs ne peuvent pas être désactivés' : 'Administrators cannot be deactivated'
      });
      return;
    }

    try {
      setActionLoading(userId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update user status');
      }

      if (data.success) {
        await fetchUsers(); // Refresh the list
        showToast({
          type: 'success',
          title: language === 'fr' ? 'Statut mis à jour' : 'Status updated',
          message: language === 'fr'
            ? `L'utilisateur a été ${!currentStatus ? 'activé' : 'désactivé'} avec succès`
            : `User has been ${!currentStatus ? 'activated' : 'deactivated'} successfully`
        });
      } else {
        throw new Error(data.error?.message || 'Failed to update user status');
      }
    } catch (error: any) {
      console.error('Toggle user status error:', error);
      showToast({
        type: 'error',
        title: language === 'fr' ? 'Erreur de mise à jour' : 'Update error',
        message: error.message || 'Failed to update user status'
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // 🔧 FIX: Reduce aggressive polling - refresh every 2 minutes instead of 30 seconds
    // Only refresh if page is visible using Page Visibility API
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchUsers();
      }
    }, 120000); // 2 minutes
    
    // Pause polling when page is hidden
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refresh when page becomes visible again
        fetchUsers();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getRoleLabel = (role: string) => {
    const labels = {
      'ADMIN': language === 'fr' ? 'Administrateur' : 'Administrator',
      'TEAM_MANAGER': language === 'fr' ? 'Gestionnaire d\'équipe' : 'Team Manager',
      'COORDINATEUR': language === 'fr' ? 'Coordinateur' : 'Coordinator',
      'AGENT_SUIVI': language === 'fr' ? 'Agent de suivi' : 'Follow-up Agent',
      'AGENT_CALL_CENTER': language === 'fr' ? 'Agent centre d\'appels' : 'Call Center Agent',
      'STOCK_MANAGEMENT_AGENT': language === 'fr' ? 'Agent de gestion de stock' : 'Stock Management Agent',
      'QUALITY_AGENT': language === 'fr' ? 'Agent Qualité' : 'Quality Agent'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getAvailabilityColor = (availability: string) => {
    const colors = {
      'ONLINE': 'bg-green-500',
      'BUSY': 'bg-yellow-500',
      'BREAK': 'bg-orange-500',
      'OFFLINE': 'bg-gray-400'
    };
    return colors[availability as keyof typeof colors] || 'bg-gray-400';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.agentCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">
              {t('loadingUsers')}
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
            {language === 'fr' ? 'Gestion des Utilisateurs' : 'User Management'}
          </h1>
          <p className="text-gray-500 mt-2">
            {language === 'fr' ? 'Créer et gérer les comptes utilisateurs' : 'Create and manage user accounts'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/25 mt-4 sm:mt-0"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">{language === 'fr' ? 'Créer un Utilisateur' : 'Create User'}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {language === 'fr' ? 'Total Utilisateurs' : 'Total Users'}
              </p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{users.length}</p>
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
                {language === 'fr' ? 'Utilisateurs Actifs' : 'Active Users'}
              </p>
              <p className="text-3xl font-bold text-green-900 mt-2">{users.filter(u => u.isActive).length}</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">
                {language === 'fr' ? 'En Ligne' : 'Online'}
              </p>
              <p className="text-3xl font-bold text-emerald-900 mt-2">
                {users.filter(u => u.availability === 'ONLINE').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">
                {language === 'fr' ? 'Gestionnaires' : 'Managers'}
              </p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {users.filter(u => u.role === 'TEAM_MANAGER').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
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
              placeholder={language === 'fr' ? 'Rechercher par nom, email ou code...' : 'Search by name, email or code...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Role filter */}
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
            >
              <option value="all">{language === 'fr' ? 'Tous les rôles' : 'All roles'}</option>
              <option value="ADMIN">{language === 'fr' ? 'Administrateurs' : 'Administrators'}</option>
              <option value="TEAM_MANAGER">{language === 'fr' ? 'Gestionnaires' : 'Managers'}</option>
              <option value="COORDINATEUR">{language === 'fr' ? 'Coordinateurs' : 'Coordinators'}</option>
              <option value="AGENT_SUIVI">{language === 'fr' ? 'Agents de suivi' : 'Follow-up Agents'}</option>
              <option value="AGENT_CALL_CENTER">{language === 'fr' ? 'Agents centre d\'appels' : 'Call Center Agents'}</option>
              <option value="STOCK_MANAGEMENT_AGENT">{language === 'fr' ? 'Agents de gestion de stock' : 'Stock Management Agents'}</option>
              <option value="QUALITY_AGENT">{language === 'fr' ? 'Agents Qualité' : 'Quality Agents'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Utilisateur' : 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Rôle' : 'Role'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Statut' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'fr' ? 'Commandes' : 'Orders'}
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
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">{user.name[0]}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.agentCode && (
                          <div className="text-xs text-blue-600 font-mono">{user.agentCode}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${getAvailabilityColor(user.availability)}`}></span>
                      <span className="text-sm text-gray-900 capitalize">
                        {user.availability.toLowerCase()}
                      </span>
                      {user.isActive ? (
                        <UserCheck className="w-4 h-4 text-green-500 ml-2" />
                      ) : (
                        <UserX className="w-4 h-4 text-red-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.currentOrders}/{user.maxOrders}</div>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full" 
                        style={{ width: `${Math.min((user.currentOrders / user.maxOrders) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={language === 'fr' ? 'Modifier' : 'Edit'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPasswordModal(true);
                        }}
                        className="p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={language === 'fr' ? 'Changer le mot de passe' : 'Change Password'}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowProductAssignmentModal(true);
                        }}
                        className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={language === 'fr' ? 'Assignation de produits' : 'Product Assignment'}
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user.id, user.isActive, user.role)}
                        disabled={actionLoading === user.id}
                        className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                        title={user.isActive ? (language === 'fr' ? 'Désactiver' : 'Deactivate') : (language === 'fr' ? 'Activer' : 'Activate')}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.isActive ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                      {/* Only show delete button for Admin users */}
                      {currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          disabled={user.role === 'ADMIN'}
                          className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          title={language === 'fr' ? 'Supprimer' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            language={language}
          />
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUsers}
          language={language}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal 
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSuccess={fetchUsers}
          language={language}
        />
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {language === 'fr' ? 'Confirmer la suppression' : 'Confirm Deletion'}
                </h3>
                <p className="text-sm text-gray-500">
                  {language === 'fr' ? 'Cette action est irréversible' : 'This action cannot be undone'}
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              {language === 'fr'
                ? `Êtes-vous sûr de vouloir supprimer l'utilisateur "${selectedUser.name}" ?`
                : `Are you sure you want to delete user "${selectedUser.name}"?`
              }
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                disabled={actionLoading === selectedUser.id}
              >
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={() => deleteUser(selectedUser.id)}
                disabled={actionLoading === selectedUser.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {actionLoading === selectedUser.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  language === 'fr' ? 'Supprimer' : 'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && selectedUser && (
        <PasswordChangeModal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          isOwnPassword={false}
        />
      )}

      {/* Product Assignment Modal */}
      {showProductAssignmentModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {language === 'fr' ? 'Assignation de Produits' : 'Product Assignment'} - {selectedUser.name}
              </h2>
              <button
                onClick={() => {
                  setShowProductAssignmentModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ProductAssignment
              userId={selectedUser.id}
              onAssignmentsChange={(assignments) => {
                console.log('Product assignments updated:', assignments);
              }}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Create User Modal Component
function CreateUserModal({ isOpen, onClose, onSuccess, language }: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language: string
}) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT_SUIVI'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create user');
      }

      if (data.success) {
        onSuccess();
        onClose();
        showToast({
          type: 'success',
          title: language === 'fr' ? 'Utilisateur créé' : 'User created',
          message: language === 'fr' ? 'L\'utilisateur a été créé avec succès' : 'User has been created successfully'
        });
      } else {
        throw new Error(data.error?.message || 'Failed to create user');
      }
    } catch (error: any) {
      console.error('Create user error:', error);
      setError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {language === 'fr' ? 'Créer un Utilisateur' : 'Create User'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-md flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'fr' ? 'Nom complet' : 'Full Name'}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'fr' ? 'Adresse email' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'fr' ? 'Mot de passe' : 'Password'}
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'fr' ? 'Rôle' : 'Role'}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="TEAM_MANAGER">{language === 'fr' ? 'Gestionnaire d\'équipe' : 'Team Manager'}</option>
              <option value="COORDINATEUR">{language === 'fr' ? 'Coordinateur' : 'Coordinator'}</option>
              <option value="AGENT_SUIVI">{language === 'fr' ? 'Agent de suivi' : 'Follow-up Agent'}</option>
              <option value="AGENT_CALL_CENTER">{language === 'fr' ? 'Agent centre d\'appels' : 'Call Center Agent'}</option>
              <option value="STOCK_MANAGEMENT_AGENT">{language === 'fr' ? 'Agent de gestion de stock' : 'Stock Management Agent'}</option>
              <option value="QUALITY_AGENT">{language === 'fr' ? 'Agent Qualité' : 'Quality Agent'}</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                language === 'fr' ? 'Créer' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ isOpen, onClose, user, onSuccess, language }: {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
  language: string
}) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    agentCode: user.agentCode || '',
    maxOrders: user.maxOrders,
    isActive: user.isActive
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update user');
      }

      if (data.success) {
        onSuccess();
        onClose();
        showToast({
          type: 'success',
          title: language === 'fr' ? 'Utilisateur mis à jour' : 'User updated',
          message: language === 'fr' ? 'L\'utilisateur a été mis à jour avec succès' : 'User has been updated successfully'
        });
      } else {
        throw new Error(data.error?.message || 'Failed to update user');
      }
    } catch (error: any) {
      console.error('Update user error:', error);
      setError(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {language === 'fr' ? 'Modifier l\'Utilisateur' : 'Edit User'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-md flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'fr' ? 'Nom complet' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'fr' ? 'Code agent' : 'Agent Code'}
              </label>
              <input
                type="text"
                value={formData.agentCode}
                onChange={(e) => setFormData({ ...formData, agentCode: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'fr' ? 'Adresse email' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'fr' ? 'Rôle' : 'Role'}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="TEAM_MANAGER">{language === 'fr' ? 'Gestionnaire d\'équipe' : 'Team Manager'}</option>
                <option value="COORDINATEUR">{language === 'fr' ? 'Coordinateur' : 'Coordinator'}</option>
                <option value="AGENT_SUIVI">{language === 'fr' ? 'Agent de suivi' : 'Follow-up Agent'}</option>
                <option value="AGENT_CALL_CENTER">{language === 'fr' ? 'Agent centre d\'appels' : 'Call Center Agent'}</option>
                <option value="STOCK_MANAGEMENT_AGENT">{language === 'fr' ? 'Agent de gestion de stock' : 'Stock Management Agent'}</option>
                <option value="QUALITY_AGENT">{language === 'fr' ? 'Agent Qualité' : 'Quality Agent'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'fr' ? 'Commandes max' : 'Max Orders'}
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxOrders}
                onChange={(e) => setFormData({ ...formData, maxOrders: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              {language === 'fr' ? 'Compte actif' : 'Active account'}
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                language === 'fr' ? 'Mettre à jour' : 'Update'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}