'use client';

import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import PasswordChangeModal from '@/components/admin/password-change-modal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  BarChart3,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Package,
  Key
} from 'lucide-react';

interface CoordinateurLayoutProps {
  children: React.ReactNode;
}

export default function CoordinateurLayout({ children }: CoordinateurLayoutProps) {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const pathname = usePathname();

  // Don't render if no user or not a coordinateur
  if (!user || user.role !== 'COORDINATEUR') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sidebarItems = [
    {
      name: language === 'fr' ? 'Tableau de Bord' : 'Dashboard',
      icon: BarChart3,
      href: '/coordinateur',
      active: pathname === '/coordinateur'
    },
    {
      name: language === 'fr' ? 'Mes Commandes' : 'My Orders',
      icon: ShoppingCart,
      href: '/coordinateur/orders',
      active: pathname === '/coordinateur/orders'
    },
    {
      name: language === 'fr' ? 'Mes Produits' : 'My Products',
      icon: Package,
      href: '/coordinateur/products',
      active: pathname === '/coordinateur/products'
    },
    {
      name: language === 'fr' ? 'Attribution des Agents' : 'Agent Assignment',
      icon: UserCheck,
      href: '/coordinateur/assignments',
      active: pathname === '/coordinateur/assignments'
    },
    {
      name: language === 'fr' ? 'Notifications' : 'Notifications',
      icon: Bell,
      href: '/coordinateur/notifications',
      active: pathname === '/coordinateur/notifications'
    }
  ];

  return (
    <NotificationProvider userId={user.id} userRole={user.role}>
      <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex h-full flex-col bg-white border-r border-gray-100 shadow-sm">
          {/* Logo */}
          <div className={`flex h-16 items-center ${sidebarCollapsed ? 'justify-center px-4' : 'justify-between px-6'}`}>
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Libertaphonix
                </span>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">L</span>
              </div>
            )}
            
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200 hidden lg:flex"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Collapse button for collapsed state */}
          {sidebarCollapsed && (
            <div className="px-4 mb-4 hidden lg:block">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 pb-4 space-y-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  item.active
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} ${
                  item.active ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                }`} />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className={`p-4 border-t border-gray-100 ${sidebarCollapsed ? 'px-2' : ''}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!sidebarCollapsed && (
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white font-medium text-sm">{user.name?.[0] || 'C'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {language === 'fr' ? 'Coordinateur' : 'Coordinator'}
                    </p>
                  </div>
                </div>
              )}
              
              {sidebarCollapsed && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-medium text-sm">{user.name?.[0] || 'C'}</span>
                </div>
              )}

              {!sidebarCollapsed && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                    title={language === 'fr' ? 'Changer le mot de passe' : 'Change Password'}
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={logout}
                    className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                    title={language === 'fr' ? 'Se déconnecter' : 'Logout'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200 hidden lg:flex"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <LanguageSwitcher />
              
              {/* Mobile user menu */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          user={user}
          isOwnPassword={true}
        />
      )}
    </div>
    </NotificationProvider>
  );
}