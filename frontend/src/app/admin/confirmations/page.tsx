'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  confirmationsService,
  ConfirmatorPerformance,
  PerformanceResponse,
  PaginatedConfirmations,
  OrderConfirmation
} from '@/services/confirmations';
import {
  Trophy,
  TrendingUp,
  Users,
  Target,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Clock,
  Store,
  Package
} from 'lucide-react';

export default function ConfirmationsPage() {
  const [performance, setPerformance] = useState<PerformanceResponse | null>(null);
  const [orders, setOrders] = useState<PaginatedConfirmations | null>(null);
  const [stores, setStores] = useState<Array<{ identifier: string; count: number }>>([]);
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('performance');

  useEffect(() => {
    loadStores();
    loadPerformance();

    // Auto-refresh every 3 minutes (180 seconds)
    const interval = setInterval(() => {
      loadPerformance(true);
    }, 180000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadPerformance();
  }, [selectedStore]);

  useEffect(() => {
    loadOrders();
  }, [currentPage, searchTerm, selectedStore]);

  const loadStores = async () => {
    try {
      const storesData = await confirmationsService.getStores();
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const loadPerformance = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: any = {
        aggregated: true // Always use aggregated view
      };

      if (selectedStore && selectedStore !== 'ALL') {
        params.storeIdentifier = selectedStore;
      }

      const data = await confirmationsService.getConfirmatorPerformance(params);
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
      const params: any = {
        page: currentPage,
        limit: 50,
        search: searchTerm || undefined,
      };

      if (selectedStore && selectedStore !== 'ALL') {
        params.storeIdentifier = selectedStore;
      }

      const data = await confirmationsService.getConfirmationsList(params);
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-600 bg-emerald-50/50 border-emerald-100';
    if (rate >= 60) return 'text-blue-600 bg-blue-50/50 border-blue-100';
    if (rate >= 40) return 'text-amber-600 bg-amber-50/50 border-amber-100';
    return 'text-rose-600 bg-rose-50/50 border-rose-100';
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return { label: 'Excellent', color: 'bg-emerald-500 shadow-emerald-200' };
    if (rate >= 60) return { label: 'Good', color: 'bg-blue-500 shadow-blue-200' };
    if (rate >= 40) return { label: 'Average', color: 'bg-amber-500 shadow-amber-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-500 shadow-rose-200' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
          <div className="relative bg-white/40 backdrop-blur-xl p-8 rounded-2xl border border-white/50 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const topPerformer = performance?.data[0];
  const averageRate = parseFloat(performance?.summary.averageRate || '0');
  const totalOrders = performance?.data.reduce((sum, p) => sum + p.totalOrders, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-8 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
            Performance
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Real-time confirmation analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Store Filter */}
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[180px] bg-white/40 backdrop-blur-md border-white/50 shadow-sm">
              <Store className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.identifier} value={store.identifier}>
                  {store.identifier} ({store.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-md p-1.5 rounded-full border border-white/50 shadow-sm transition-all hover:bg-white/60">
            <span className="text-xs text-slate-500 px-3 font-medium">
              Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadPerformance(true)}
              disabled={refreshing}
              className="rounded-full hover:bg-white/50 w-9 h-9 p-0"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Confirmators',
            value: performance?.summary.totalConfirmators || 0,
            sub: 'Active members',
            icon: Users,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50/50'
          },
          {
            title: 'Average Rate',
            value: `${averageRate.toFixed(1)}%`,
            sub: 'Global performance',
            icon: Target,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50/50'
          },
          {
            title: 'Top Performer',
            value: `${topPerformer?.confirmationRate.toFixed(1)}%`,
            sub: topPerformer?.confirmatorName || 'N/A',
            icon: Trophy,
            color: 'text-amber-600',
            bg: 'bg-amber-50/50'
          },
          {
            title: 'Total Orders',
            value: totalOrders,
            sub: 'Processed to date',
            icon: TrendingUp,
            color: 'text-blue-600',
            bg: 'bg-blue-50/50'
          }
        ].map((stat, i) => (
          <div
            key={i}
            className="animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
          >
            <Card className="border border-white/60 bg-white/40 backdrop-blur-xl shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  {i === 1 && (
                    <div className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-100/50 px-2 py-1 rounded-full">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      +2.4%
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
                  <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100/50">
                  <p className="text-xs text-slate-400 font-medium">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs
        defaultValue="performance"
        className="space-y-6"
        onValueChange={setActiveTab}
      >
        <TabsList className="bg-white/30 backdrop-blur-md p-1 rounded-full border border-white/40 shadow-sm inline-flex">
          <TabsTrigger
            value="performance"
            className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-300"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-300"
          >
            Orders History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {performance?.data.map((confirmator, index) => {
              const badge = getPerformanceBadge(confirmator.confirmationRate);
              const isTopThree = index < 3;
              const storesList = confirmator.stores?.join(', ') || confirmator.storeIdentifier;

              return (
                <div
                  key={`${confirmator.confirmatorId}-${confirmator.confirmatorName}`}
                  className={`relative group overflow-hidden rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 p-6 transition-all duration-300 hover:bg-white/60 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 ${isTopThree ? 'ring-1 ring-offset-0 ring-amber-400/30' : ''
                    }`}
                >
                  {/* Rank Number */}
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="text-8xl font-black text-slate-900 leading-none">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Top 3 Accents */}
                  {index === 0 && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300" />}
                  {index === 1 && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300" />}
                  {index === 2 && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300" />}

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`h-10 w-10 flex items-center justify-center rounded-2xl text-white font-bold shadow-lg ${index === 0 ? 'bg-amber-400 shadow-amber-200' :
                          index === 1 ? 'bg-slate-400 shadow-slate-200' :
                            index === 2 ? 'bg-orange-400 shadow-orange-200' :
                              'bg-slate-200 text-slate-500'
                          }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 leading-tight">{confirmator.confirmatorName}</h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {confirmator.storeIdentifier === 'ALL' ? (
                              confirmator.stores?.map((store, idx) => (
                                <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {store}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {confirmator.storeIdentifier}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-white/50 border border-white/60">
                          <p className="text-xs text-slate-500 font-medium mb-1">Total</p>
                          <p className="text-lg font-bold text-blue-600">{confirmator.totalOrders}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/50 border border-white/60">
                          <p className="text-xs text-slate-500 font-medium mb-1">Confirmed</p>
                          <p className="text-lg font-bold text-emerald-600">{confirmator.totalConfirmed}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/50 border border-white/60">
                          <p className="text-xs text-slate-500 font-medium mb-1">Pending</p>
                          <p className="text-lg font-bold text-amber-600">
                            {confirmator.totalOrders - confirmator.totalConfirmed}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600">Performance</span>
                        <span className={`text-2xl font-black ${confirmator.confirmationRate >= 80 ? 'text-emerald-500' :
                          confirmator.confirmationRate >= 60 ? 'text-blue-500' :
                            confirmator.confirmationRate >= 40 ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                          {confirmator.confirmationRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full shadow-sm transition-all duration-1000 ease-out ${badge.color.split(' ')[0]}`}
                          style={{ width: `${Math.min(confirmator.confirmationRate, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-end mt-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {(!performance?.data || performance.data.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 bg-white/30 backdrop-blur-md rounded-3xl border border-dashed border-slate-300">
              <Users className="h-16 w-16 text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No performance data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="border border-white/60 bg-white/40 backdrop-blur-xl shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 border-b border-slate-100/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 bg-white/50 border-transparent focus:bg-white focus:border-blue-200 transition-all duration-300 shadow-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white/50 hover:bg-white">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100/50 bg-slate-50/30">
                          <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Store</th>
                          <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Info</th>
                          <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmator</th>
                          <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                        {orders?.data.map((order) => (
                          <tr key={order.id} className="hover:bg-white/40 transition-colors group">
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                                {order.storeIdentifier}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-sm">{order.orderReference}</span>
                                <span className="text-xs text-slate-400 font-mono mt-0.5">#{order.ecoManagerOrderId}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {order.confirmatorName ? (
                                <div className="flex items-center space-x-2 text-sm text-slate-700 font-medium">
                                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </div>
                                  <span>{order.confirmatorName}</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 text-sm text-slate-400">
                                  <XCircle className="h-4 w-4" />
                                  <span>Unassigned</span>
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1.5 align-start">
                                <span className={`inline-flex self-start items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${order.confirmationState
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                  {order.confirmationState || 'pending'}
                                </span>
                                <span className="inline-flex self-start items-center px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100/50">
                                  {order.orderState || 'Unknown'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center text-xs text-slate-500">
                                <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                                {new Date(order.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {orders && orders.pagination.pages > 1 && (
                    <div className="flex items-center justify-between p-6 border-t border-slate-100/50 bg-slate-50/20">
                      <div className="text-sm text-slate-500 font-medium">
                        Showing <span className="text-slate-900">{((currentPage - 1) * orders.pagination.limit) + 1}</span> to{' '}
                        <span className="text-slate-900">{Math.min(currentPage * orders.pagination.limit, orders.pagination.total)}</span> of{' '}
                        <span className="text-slate-900">{orders.pagination.total}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-9 w-9 p-0 rounded-xl border-slate-200 hover:bg-white hover:text-blue-600 disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-600 px-2">
                          Page {currentPage} / {orders.pagination.pages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(orders.pagination.pages, p + 1))}
                          disabled={currentPage === orders.pagination.pages}
                          className="h-9 w-9 p-0 rounded-xl border-slate-200 hover:bg-white hover:text-blue-600 disabled:opacity-30"
                        >
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
