'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Activity, Users, Wifi, Clock } from 'lucide-react';

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  role: string;
  availability: 'ONLINE' | 'BUSY' | 'BREAK' | 'OFFLINE';
  lastActivity?: string;
}

export default function OnlineUsersWidget() {
  const { language } = useLanguage();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOnlineUsers = async () => {
    try {
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
        throw new Error(data.error?.message || 'Failed to fetch users');
      }

      if (data.success) {
        // Filter only online users
        const online = data.data.filter((user: OnlineUser) => user.availability === 'ONLINE');
        setOnlineUsers(online);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('Fetch online users error:', error);
      setError(error.message || 'Failed to fetch online users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineUsers();
    
    // 🔧 FIX: Reduce aggressive polling - refresh every 2 minutes instead of 30 seconds
    // Only refresh if page is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchOnlineUsers();
      }
    }, 120000); // 2 minutes
    
    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOnlineUsers();
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
      'ADMIN': language === 'fr' ? 'Admin' : 'Admin',
      'TEAM_MANAGER': language === 'fr' ? 'Manager' : 'Manager',
      'COORDINATEUR': language === 'fr' ? 'Coordinateur' : 'Coordinator',
      'AGENT_SUIVI': language === 'fr' ? 'Agent Suivi' : 'Follow-up Agent',
      'AGENT_CALL_CENTER': language === 'fr' ? 'Agent Call' : 'Call Center Agent',
      'QUALITY_AGENT': language === 'fr' ? 'Agent Qualité' : 'Quality Agent'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'ADMIN': 'bg-red-100 text-red-800',
      'TEAM_MANAGER': 'bg-purple-100 text-purple-800',
      'COORDINATEUR': 'bg-blue-100 text-blue-800',
      'AGENT_SUIVI': 'bg-green-100 text-green-800',
      'AGENT_CALL_CENTER': 'bg-orange-100 text-orange-800',
      'QUALITY_AGENT': 'bg-indigo-100 text-indigo-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 animate-pulse text-blue-600" />
            <span className="text-gray-600">
              {language === 'fr' ? 'Chargement...' : 'Loading...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            <Activity className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {language === 'fr' ? 'Utilisateurs En Ligne' : 'Online Users'}
          </h2>
          <p className="text-gray-600">
            {language === 'fr' ? 'Utilisateurs actuellement connectés' : 'Currently connected users'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">
            {onlineUsers.length} {language === 'fr' ? 'en ligne' : 'online'}
          </span>
        </div>
      </div>

      {onlineUsers.length === 0 ? (
        <div className="text-center py-12">
          <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {language === 'fr' ? 'Aucun utilisateur en ligne' : 'No users online'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {language === 'fr' ? 'Les utilisateurs apparaîtront ici quand ils se connectent' : 'Users will appear here when they connect'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {onlineUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{user.name?.[0] || 'U'}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {language === 'fr' ? 'En ligne' : 'Online'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}