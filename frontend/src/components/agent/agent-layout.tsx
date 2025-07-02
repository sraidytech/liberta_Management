'use client';

import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
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
  Phone,
  Clock
} from 'lucide-react';

interface AgentLayoutProps {
  children: React.ReactNode;
}

export default function AgentLayout({ children }: AgentLayoutProps) {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const sidebarItems = [
    {
      name: language === 'fr' ? 'Tableau de Bord' : 'Dashboard',
      icon: BarChart3,
      href: '/agent',
      active: pathname === '/agent'
    },
    {
      name: language === 'fr' ? 'Mes Commandes' : 'My Orders',
      icon: Package,
      href: '/agent/orders',
      active: pathname === '/agent/orders'
    },
    {
      name: language === 'fr' ? 'Notifications' : 'Notifications',
      icon: Bell,
      href: '/agent/notifications',
      active: pathname === '/agent/notifications'
    },
    {
      name: language === 'fr' ? 'Appels' : 'Calls',
      icon: Phone,
      href: '/agent/calls',
      active: pathname === '/agent/calls'
    },
    {
      name: language === 'fr' ? 'Historique' : 'History',
      icon: Clock,
      href: '/agent/history',
      active: pathname === '/agent/history'
    },
    {
      name: language === 'fr' ? 'Paramètres' : 'Settings',
      icon: Settings,
      href: '/agent/settings',
      active: pathname === '/agent/settings'
    }
  ];

  return (
    <NotificationProvider userId={user?.id} userRole={user?.role}>
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
                <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Agent Portal
                </span>
              </div>
            )}
            
            {sidebarCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">A</span>
              </div>
            )}

            {/* Collapse button - only show on desktop */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Expand button when collapsed */}
          {sidebarCollapsed && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full flex justify-center p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 pb-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    item.active
                      ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`h-5 w-5 ${item.active ? 'text-green-600' : ''}`} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className={`p-4 border-t border-gray-100 ${sidebarCollapsed ? 'px-2' : ''}`}>
            {!sidebarCollapsed ? (
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Agent Suivi
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    Online
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 h-16 flex items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={language === 'fr' ? 'Rechercher une commande...' : 'Search orders...'}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <NotificationBell language={language} />

            {/* Language switcher */}
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
      </div>
    </NotificationProvider>
  );
}