'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  confirmationsService, 
  ConfirmatorPerformance, 
  PerformanceResponse,
  PaginatedConfirmations,
  OrderConfirmation
} from '@/services/confirmations';
import { Trophy, TrendingUp, Users, Target, RefreshCw, Search, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ConfirmationsPage() {
  const [performance, setPerformance] = useState<PerformanceResponse | null>(null);
  const [orders, setOrders] = useState<PaginatedConfirmations | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPerformance();
    
    // Auto-refresh every 3 minutes (180 seconds)
    const interval = setInterval(() => {
      loadPerformance(true);
    }, 180000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [currentPage, searchTerm]);

  const loadPerformance = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await confirmationsService.getConfirmatorPerformance();
      setPerformance(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load performance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const data = await confirmationsService.getConfirmationsList({
        page: currentPage,
        limit: 50,
        search: searchTerm || undefined,
      });
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (rate >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (rate >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return { label: 'Excellent', color: 'bg-green-500' };
    if (rate >= 60) return { label: 'Good', color: 'bg-blue-500' };
    if (rate >= 40) return { label: 'Average', color: 'bg-yellow-500' };
    return { label: 'Needs Improvement', color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const topPerformer = performance?.data[0];
  const averageRate = parseFloat(performance?.summary.averageRate || '0');
  const totalOrders = performance?.data.reduce((sum, p) => sum + p.totalOrders, 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Confirmator Performance</h1>
          <p className="text-muted-foreground">
            Real-time confirmation rates and statistics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPerformance(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Confirmators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.summary.totalConfirmators || 0}</div>
            <p className="text-xs text-muted-foreground">Active confirmators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Overall confirmation rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPerformer?.confirmationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground truncate">
              {topPerformer?.confirmatorName || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All confirmators</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Confirmator Leaderboard
              </CardTitle>
              <CardDescription>
                Ranked by confirmation rate - Updated in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performance?.data.map((confirmator, index) => {
                  const badge = getPerformanceBadge(confirmator.confirmationRate);
                  const isTopThree = index < 3;
                  
                  return (
                    <div
                      key={`${confirmator.confirmatorId}-${confirmator.storeIdentifier}`}
                      className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        getPerformanceColor(confirmator.confirmationRate)
                      } ${isTopThree ? 'ring-2 ring-offset-2 ring-yellow-400' : ''}`}
                    >
                      {/* Rank Badge */}
                      <div className="absolute -top-3 -left-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white shadow-lg ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-600' :
                          'bg-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                      </div>

                      <div className="flex items-center justify-between ml-6">
                        {/* Confirmator Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold">{confirmator.confirmatorName}</h3>
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                              {confirmator.storeIdentifier}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-white text-xs font-medium ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          
                          {/* Stats Row */}
                          <div className="flex items-center space-x-6 mt-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Orders:</span>
                              <span className="ml-2 font-semibold">{confirmator.totalOrders}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Confirmed:</span>
                              <span className="ml-2 font-semibold text-green-600">{confirmator.totalConfirmed}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pending:</span>
                              <span className="ml-2 font-semibold text-orange-600">
                                {confirmator.totalOrders - confirmator.totalConfirmed}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Confirmation Rate */}
                        <div className="text-right">
                          <div className="text-4xl font-bold">
                            {confirmator.confirmationRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Confirmation Rate</div>
                          
                          {/* Progress Bar */}
                          <div className="mt-2 w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                confirmator.confirmationRate >= 80 ? 'bg-green-500' :
                                confirmator.confirmationRate >= 60 ? 'bg-blue-500' :
                                confirmator.confirmationRate >= 40 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(confirmator.confirmationRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(!performance?.data || performance.data.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No confirmator data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Orders</CardTitle>
                  <CardDescription>Complete list of tracked confirmations</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by reference..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Store</th>
                          <th className="text-left p-3 font-medium">Order ID</th>
                          <th className="text-left p-3 font-medium">Reference</th>
                          <th className="text-left p-3 font-medium">Confirmator</th>
                          <th className="text-left p-3 font-medium">Confirmation State</th>
                          <th className="text-left p-3 font-medium">Order State</th>
                          <th className="text-left p-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders?.data.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-accent transition-colors">
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                                {order.storeIdentifier}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-sm">{order.ecoManagerOrderId}</td>
                            <td className="p-3 font-medium">{order.orderReference}</td>
                            <td className="p-3">
                              {order.confirmatorName ? (
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span>{order.confirmatorName}</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-muted-foreground">N/A</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                order.confirmationState
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {order.confirmationState || '-'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium">
                                {order.orderState || 'Unknown'}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {orders && orders.pagination.pages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * orders.pagination.limit) + 1} to{' '}
                        {Math.min(currentPage * orders.pagination.limit, orders.pagination.total)} of{' '}
                        {orders.pagination.total} orders
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="text-sm">
                          Page {currentPage} of {orders.pagination.pages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(orders.pagination.pages, p + 1))}
                          disabled={currentPage === orders.pagination.pages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}