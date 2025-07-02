'use client';

import { useState, useEffect } from 'react';
import CoordinateurLayout from '@/components/coordinateur/coordinateur-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
  totalOrders: number;
  assignedAgents: number;
  revenue: number;
}

interface ProductAssignment {
  id: string;
  userId: string;
  productId: string;
  assignedAt: string;
  product: Product;
}

export default function CoordinateurProductsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductAssignments();
  }, []);

  const fetchProductAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/my-assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product assignments');
      }

      const data = await response.json();
      setAssignments(data.data || []);
    } catch (error) {
      console.error('Error fetching product assignments:', error);
      setError('Failed to load your assigned products');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment =>
    assignment.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = assignments.reduce((sum, assignment) => sum + assignment.product.revenue, 0);
  const totalOrders = assignments.reduce((sum, assignment) => sum + assignment.product.totalOrders, 0);
  const activeProducts = assignments.filter(assignment => assignment.product.status === 'ACTIVE').length;

  // Format currency in Algerian Dinar
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount);
  };

  if (loading) {
    return (
      <CoordinateurLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </CoordinateurLayout>
    );
  }

  return (
    <CoordinateurLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('myProducts')}</h1>
            <p className="text-gray-600 mt-1">
              {t('manageAndMonitorProducts')}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('assignedProducts')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeProducts} {t('active')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('acrossAllProducts')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {t('fromAssignedProducts')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('assignedAgents')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignments.reduce((sum, assignment) => sum + assignment.product.assignedAgents, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('totalAgents')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('searchProducts')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center space-x-2 pt-6">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-600">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProductAssignments}
                className="ml-auto"
              >
                {t('retry')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Products Grid */}
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {assignments.length === 0 ? t('noProductsAssigned') : t('noProductsFound')}
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                {assignments.length === 0
                  ? t('contactAdministratorForAssignments')
                  : t('noProductsMatchSearch')
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{assignment.product.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {assignment.product.description}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={assignment.product.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {assignment.product.status === 'ACTIVE' ? t('active') : t('inactive')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('category')}</span>
                      <Badge variant="outline">{assignment.product.category}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('totalOrders')}</span>
                      <span className="font-medium">{assignment.product.totalOrders.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('assignedAgents')}</span>
                      <span className="font-medium">{assignment.product.assignedAgents}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t('revenue')}</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(assignment.product.revenue)}
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{t('assigned')}</span>
                        <span>{new Date(assignment.assignedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CoordinateurLayout>
  );
}