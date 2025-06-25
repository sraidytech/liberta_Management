'use client';

import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import PasswordChangeModal from '@/components/admin/password-change-modal';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ShoppingCart,
  Store,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Calculator,
  FileText,
  Key
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const pathname = usePathname();

  const sidebarItems = [
    {
      name: language === 'fr' ? 'Tableau de Bord' : 'Dashboard',
      icon: BarChart3,
      href: '/admin',
      active: pathname === '/admin'
    },
    {
      name: language === 'fr' ? 'Gestion des Utilisateurs' : 'User Management',
      icon: Users,
      href: '/admin/users',
      active: pathname === '/admin/users'
    },
    {
      name: language === 'fr' ? 'Commandes' : 'Orders',
      icon: ShoppingCart,
      href: '/admin/orders',
      active: pathname === '/admin/orders'
    },
    {
      name: language === 'fr' ? 'Magasins' : 'Stores',
      icon: Store,
      href: '/admin/stores',
      active: pathname === '/admin/stores'
    },
    {
      name: language === 'fr' ? 'Attribution des Agents' : 'Agent Assignment',
      icon: UserCheck,
      href: '/admin/assignments',
      active: pathname === '/admin/assignments'
    },
    {
      name: language === 'fr' ? 'Gestion des Commissions' : 'Commission Management',
      icon: Calculator,
      href: '/admin/commissions',
      active: pathname === '/admin/commissions'
    },
    {
      name: language === 'fr' ? 'Rapports Avancés' : 'Advanced Reports',
      icon: FileText,
      href: '/admin/reports',
      active: pathname === '/admin/reports'
    },
    {
      name: language === 'fr' ? 'Paramètres' : 'Settings',
      icon: Settings,
      href: '/admin/settings',
      active: pathname === '/admin/settings'
    }
  ];

  return (
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

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Collapse button for desktop */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  item.active
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-5 h-5'} ${item.active ? 'text-white' : ''}`} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="p-3 border-t border-gray-100">
            <div className={`flex items-center rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 ${
              sidebarCollapsed ? 'justify-center p-2' : 'space-x-3 p-3'
            }`}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">A</span>
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@libertaphoenix.com'}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-blue-500 transition-colors"
                      title={language === 'fr' ? 'Changer mon mot de passe' : 'Change My Password'}
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={logout}
                      className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {sidebarItems.find(item => item.active)?.name || 'Admin Panel'}
                </h1>
                <p className="text-sm text-gray-500">
                  {language === 'fr' ? 'Système de gestion des commandes' : 'Order Management System'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                  className="pl-10 pr-4 py-2 w-64 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-sm transition-all duration-200"
                />
              </div>

              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Notifications */}
              <button className="relative p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-sm"></span>
              </button>

              {/* Profile */}
              <button className="flex items-center space-x-2 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200">
                <User className="w-5 h-5 text-gray-600" />
                <span className="hidden md:block text-sm font-medium text-gray-700">Admin</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && user && (
        <PasswordChangeModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          user={{
            id: user.id,
            name: user.name || '',
            email: user.email,
            role: user.role
          }}
          isOwnPassword={true}
        />
      )}
    </div>
  );
}