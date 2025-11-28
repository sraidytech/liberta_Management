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
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  PieChart,
  Target,
  Settings,
  AlertCircle,
  FileText,
  Megaphone
} from 'lucide-react';

interface MediaBuyerLayoutProps {
  children: React.ReactNode;
}

export default function MediaBuyerLayout({ children }: MediaBuyerLayoutProps) {
  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const pathname = usePathname();

  // Don't render if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Media Buyer sidebar items
  const sidebarItems = [
    {
      name: language === 'fr' ? 'Tableau de Bord' : 'Dashboard',
      icon: BarChart3,
      href: '/admin/media-buying',
      active: pathname === '/admin/media-buying',
    },
    {
      name: language === 'fr' ? 'Entrées' : 'Entries',
      icon: FileText,
      href: '/admin/media-buying/entries',
      active: pathname === '/admin/media-buying/entries',
    },
    {
      name: language === 'fr' ? 'Sources' : 'Sources',
      icon: Megaphone,
      href: '/admin/media-buying/sources',
      active: pathname === '/admin/media-buying/sources',
    },
    {
      name: language === 'fr' ? 'Budgets' : 'Budgets',
      icon: DollarSign,
      href: '/admin/media-buying/budgets',
      active: pathname === '/admin/media-buying/budgets',
    },
    {
      name: language === 'fr' ? 'Conversions' : 'Conversions',
      icon: Target,
      href: '/admin/media-buying/conversions',
      active: pathname === '/admin/media-buying/conversions',
    },
    {
      name: language === 'fr' ? 'Analytique' : 'Analytics',
      icon: PieChart,
      href: '/admin/media-buying/analytics',
      active: pathname === '/admin/media-buying/analytics',
    },
    {
      name: language === 'fr' ? 'Alertes' : 'Alerts',
      icon: AlertCircle,
      href: '/admin/media-buying/alerts',
      active: pathname === '/admin/media-buying/alerts',
    },
    {
      name: language === 'fr' ? 'Paramètres' : 'Settings',
      icon: Settings,
      href: '/admin/media-buying/settings',
      active: pathname === '/admin/media-buying/settings',
    },
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
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {language === 'fr' ? 'Media Buying' : 'Media Buying'}
                  </span>
                </div>
              )}
              
              {sidebarCollapsed && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-4 h-4 text-white" />
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
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      item.active
                        ? 'bg-purple-50 text-purple-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`${sidebarCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="border-t border-gray-100 p-4">
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!sidebarCollapsed && (
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-purple-700">
                        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name || user.email}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                )}
                
                {sidebarCollapsed && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-700">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {!sidebarCollapsed && (
                  <button
                    onClick={logout}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                    title={language === 'fr' ? 'Déconnexion' : 'Logout'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-gray-100 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <LanguageSwitcher />
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <PasswordChangeModal
            isOpen={showPasswordModal}
            user={user}
            onClose={() => setShowPasswordModal(false)}
          />
        )}
      </div>
    </NotificationProvider>
  );
}