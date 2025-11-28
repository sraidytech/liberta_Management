'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Package,
  BarChart3,
  ArrowRight,
  Shield,
  UserCheck,
  Phone,
  Megaphone
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      // Redirect based on user role
      console.log('🔀 Dashboard redirect for user role:', user.role);
      if (user.role === 'ADMIN') {
        console.log('👑 Redirecting admin to admin panel');
        router.push('/admin');
      } else if (user.role === 'TEAM_MANAGER') {
        console.log('👔 Redirecting team manager to orders');
        router.push('/admin/orders');
      } else if (user.role === 'STOCK_MANAGEMENT_AGENT') {
        console.log('📦 Redirecting stock agent to stock management');
        router.push('/admin/stock');
      } else if (user.role === 'QUALITY_AGENT') {
        console.log('✅ Redirecting quality agent to quality panel');
        router.push('/quality-agent');
      } else if (user.role === 'COORDINATEUR') {
        console.log('🎯 Redirecting coordinateur to coordinateur panel');
        router.push('/coordinateur');
      } else if (user.role === 'MEDIA_BUYER') {
        console.log('📊 Redirecting media buyer to media buying dashboard');
        router.push('/admin/media-buying');
      } else if (user.role === 'AGENT_SUIVI' || user.role === 'AGENT_CALL_CENTER') {
        console.log('👤 Redirecting agent to agent portal');
        router.push('/agent');
      }
    }
  }, [user, isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Fallback dashboard for unknown roles
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to LibertaPhonix
          </h1>
          <p className="text-gray-600">
            Order Management System Dashboard
          </p>
        </div>

        {/* User Info */}
        {user && (
          <Card className="p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user.name?.charAt(0) || user.email.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.name || 'User'}</h2>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-blue-600 font-medium">{user.role}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Role-based Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user?.role === 'ADMIN' && (
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Admin Panel</h3>
                  <p className="text-sm text-gray-600">Manage system and users</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Card>
          )}

          {user?.role === 'TEAM_MANAGER' && (
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/orders')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Orders Management</h3>
                  <p className="text-sm text-gray-600">View and manage all orders</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Card>
          )}

          {(user?.role === 'AGENT_SUIVI' || user?.role === 'AGENT_CALL_CENTER') && (
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/agent')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Agent Portal</h3>
                  <p className="text-sm text-gray-600">Manage your orders</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Card>
          )}

          {user?.role === 'MEDIA_BUYER' && (
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/media-buying')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Megaphone className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Media Buying</h3>
                  <p className="text-sm text-gray-600">Track ad spend and leads</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Analytics</h3>
                <p className="text-sm text-gray-600">View performance metrics</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Orders</h3>
                <p className="text-sm text-gray-600">Track order status</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Phone className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Support</h3>
                <p className="text-sm text-gray-600">Get help and support</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mt-8">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              View Recent Orders
            </Button>
            <Button variant="outline" size="sm">
              Check Notifications
            </Button>
            <Button variant="outline" size="sm">
              Update Profile
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}