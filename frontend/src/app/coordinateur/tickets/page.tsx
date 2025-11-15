'use client';

import CoordinateurLayout from '@/components/coordinateur/coordinateur-layout';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { createTranslator } from '@/lib/i18n';
import { useToast } from '@/components/ui/toast';
import { CriticalTicketsSection } from '@/components/tickets/critical-tickets-section';
import {
  MessageSquare,
  User,
  Calendar,
  Search,
  Filter,
  Eye,
  Send,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  order: {
    reference: string;
    customer: {
      fullName: string;
      telephone: string;
    };
  };
  reporter: {
    id: string;
    name: string;
    role: string;
    agentCode?: string;
  };
  assignee?: {
    id: string;
    name: string;
    role: string;
  };
  messages: Array<{
    id: string;
    message: string;
    isInternal: boolean;
    createdAt: string;
    sender: {
      id: string;
      name: string;
      role: string;
    };
  }>;
}

function CoordinateurTicketsPageContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = createTranslator(language);
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [criticalTickets, setCriticalTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCritical, setLoadingCritical] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch critical tickets
  const fetchCriticalTickets = async () => {
    if (!user?.id) {
      setLoadingCritical(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets/critical?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCriticalTickets(data.data?.tickets || []);
      } else {
        console.error('❌ Failed to fetch critical tickets:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching critical tickets:', error);
    } finally {
      setLoadingCritical(false);
    }
  };

  const fetchTickets = async (page: number = currentPage) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });

      // Add search term as orderReference if provided (for filtering by order reference)
      if (searchTerm.trim()) params.append('orderReference', searchTerm.trim());
      
      // Add filters if they're not 'ALL'
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data.data?.tickets || []);
        
        // Update pagination state
        if (data.data?.pagination) {
          setCurrentPage(data.data.pagination.page);
          setTotalPages(data.data.pagination.pages);
          setTotalTickets(data.data.pagination.total);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch tickets:', response.status, errorText);
        showToast({
          type: 'error',
          title: 'Failed to fetch tickets',
          message: 'Please try again later.'
        });
      }
    } catch (error) {
      console.error('💥 Error fetching tickets:', error);
      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          isInternal: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the selected ticket with the new message
        const updatedTicket = {
          ...selectedTicket,
          messages: [...(selectedTicket.messages || []), data.data.message]
        };
        setSelectedTicket(updatedTicket);
        
        // Update the tickets list
        setTickets(prev => prev.map(ticket => 
          ticket.id === selectedTicket.id ? updatedTicket : ticket
        ));
        
        setNewMessage('');
        showToast({
          type: 'success',
          title: t('messageAddedSuccessfully')
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to add message:', response.status, errorText);
        showToast({
          type: 'error',
          title: t('failedToAddMessage')
        });
      }
    } catch (error) {
      console.error('💥 Error adding message:', error);
      showToast({
        type: 'error',
        title: t('failedToAddMessage')
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update the selected ticket
        const updatedTicket = { ...selectedTicket, status, updatedAt: new Date().toISOString() };
        setSelectedTicket(updatedTicket);
        
        // Update the tickets list
        setTickets(prev => prev.map(ticket => 
          ticket.id === selectedTicket.id ? updatedTicket : ticket
        ));
        
        showToast({
          type: 'success',
          title: t('ticketUpdatedSuccessfully')
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update ticket status:', response.status, errorText);
        showToast({
          type: 'error',
          title: t('failedToUpdateTicket')
        });
      }
    } catch (error) {
      console.error('💥 Error updating ticket status:', error);
      showToast({
        type: 'error',
        title: t('failedToUpdateTicket')
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle URL search parameters
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.id) {
      fetchTickets(1); // Reset to page 1 when filters change
      fetchCriticalTickets(); // Also fetch critical tickets
    }
  }, [user?.id, statusFilter, priorityFilter, categoryFilter, itemsPerPage]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user?.id) {
        fetchTickets(1); // Reset to page 1 when search changes
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fetch critical tickets on mount
  useEffect(() => {
    if (user?.id) {
      fetchCriticalTickets();
    }
  }, [user?.id]);

  // Since we're doing server-side filtering, we don't need client-side filtering
  const filteredTickets = tickets;

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTickets(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'WAITING_RESPONSE': return 'bg-orange-100 text-orange-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'CUSTOMER_ISSUE': return t('customerIssue');
      case 'PRODUCT_ISSUE': return t('productIssue');
      case 'DELIVERY_ISSUE': return t('deliveryIssue');
      case 'SYSTEM_ISSUE': return t('systemIssue');
      case 'PAYMENT_ISSUE': return t('paymentIssue');
      case 'OTHER': return t('otherIssue');
      default: return category;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <CoordinateurLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">{t('loading')}</div>
        </div>
      </CoordinateurLayout>
    );
  }

  return (
    <CoordinateurLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t('tickets')}</h1>
            <p className="text-gray-600">Manage support tickets from your agents</p>
          </div>
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalTickets)} of {totalTickets} {t('tickets')}
          </div>
        </div>

        {/* Critical Tickets Section */}
        <CriticalTicketsSection
          tickets={criticalTickets}
          loading={loadingCritical}
          onViewTicket={async (ticket) => {
            try {
              const token = localStorage.getItem('token');
              const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
              
              const response = await fetch(`${apiBaseUrl}/api/v1/tickets/${ticket.id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                setSelectedTicket(data.data.ticket);
                setShowTicketModal(true);
              }
            } catch (error) {
              console.error('Error fetching ticket:', error);
            }
          }}
          formatDate={formatDate}
          t={t}
        />

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, order reference, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Filters and Items Per Page */}
            <div className="flex flex-wrap gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">{t('openTicket')}</option>
                <option value="IN_PROGRESS">{t('inProgressTicket')}</option>
                <option value="WAITING_RESPONSE">{t('waitingResponse')}</option>
                <option value="RESOLVED">{t('resolvedTicket')}</option>
                <option value="CLOSED">{t('closedTicket')}</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">{t('lowPriority')}</option>
                <option value="MEDIUM">{t('mediumPriority')}</option>
                <option value="HIGH">{t('highPriority')}</option>
                <option value="URGENT">{t('urgentPriority')}</option>
              </select>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Categories</option>
                <option value="EXCHANGE">🔄 Exchange</option>
                <option value="REFUND">💰 Refund</option>
                <option value="QUALITY_CONTROL">⚠️ Quality Control</option>
                <option value="CUSTOMER_ISSUE">{t('customerIssue')}</option>
                <option value="PRODUCT_ISSUE">{t('productIssue')}</option>
                <option value="DELIVERY_ISSUE">{t('deliveryIssue')}</option>
                <option value="SYSTEM_ISSUE">{t('systemIssue')}</option>
                <option value="PAYMENT_ISSUE">{t('paymentIssue')}</option>
                <option value="OTHER">{t('otherIssue')}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredTickets.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">{t('noTicketsFound')}</p>
            </Card>
          ) : (
            filteredTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="font-semibold text-lg">{ticket.title}</h3>
                      <Badge className={`${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={`${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MessageSquare className="h-4 w-4" />
                        <span>Order: {ticket.order.reference}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{ticket.order.customer.fullName}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span>Reporter: {ticket.reporter.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MessageCircle className="h-4 w-4" />
                        <span>{ticket.messages?.length || 0} messages</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {getCategoryLabel(ticket.category)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                          
                          const response = await fetch(`${apiBaseUrl}/api/v1/tickets/${ticket.id}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            setSelectedTicket(data.data.ticket);
                            setShowTicketModal(true);
                          } else {
                            console.error('❌ Failed to fetch ticket details:', response.status);
                            // Fallback to using the ticket from the list
                            setSelectedTicket(ticket);
                            setShowTicketModal(true);
                          }
                        } catch (error) {
                          console.error('💥 Error fetching ticket details:', error);
                          // Fallback to using the ticket from the list
                          setSelectedTicket(ticket);
                          setShowTicketModal(true);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{t('viewTicket')}</span>
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Updated: {formatDate(ticket.updatedAt)}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-sm text-gray-600">
                Total: {totalTickets} tickets
              </div>
            </div>
          </Card>
        )}

        {/* Ticket Detail Modal - Same as admin but with coordinateur styling */}
        {showTicketModal && selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold">{selectedTicket.title}</h2>
                  <p className="text-sm text-gray-600">Order: {selectedTicket.order.reference}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTicketModal(false);
                    setSelectedTicket(null);
                    setNewMessage('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex h-[70vh]">
                {/* Left side - Ticket info and actions */}
                <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
                  <div className="space-y-4">
                    {/* Status and Priority */}
                    <div>
                      <h3 className="font-medium mb-2">Status & Priority</h3>
                      <div className="space-y-2">
                        <Badge className={`${getStatusColor(selectedTicket.status)} w-full justify-center`}>
                          {selectedTicket.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={`${getPriorityColor(selectedTicket.priority)} w-full justify-center`}>
                          {selectedTicket.priority} Priority
                        </Badge>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <h3 className="font-medium mb-2">Quick Actions</h3>
                      <div className="space-y-2">
                        {selectedTicket.status === 'OPEN' && (
                          <Button
                            onClick={() => updateTicketStatus('IN_PROGRESS')}
                            disabled={updatingStatus}
                            className="w-full"
                            size="sm"
                          >
                            {t('markInProgress')}
                          </Button>
                        )}
                        {(selectedTicket.status === 'OPEN' || selectedTicket.status === 'IN_PROGRESS') && (
                          <Button
                            onClick={() => updateTicketStatus('RESOLVED')}
                            disabled={updatingStatus}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            {t('resolveTicket')}
                          </Button>
                        )}
                        {selectedTicket.status === 'RESOLVED' && (
                          <Button
                            onClick={() => updateTicketStatus('CLOSED')}
                            disabled={updatingStatus}
                            className="w-full bg-gray-600 hover:bg-gray-700"
                            size="sm"
                          >
                            {t('closeTicket')}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Ticket Details */}
                    <div>
                      <h3 className="font-medium mb-2">Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Category:</strong> {getCategoryLabel(selectedTicket.category)}</div>
                        <div><strong>Reporter:</strong> {selectedTicket.reporter.name}</div>
                        <div><strong>Customer:</strong> {selectedTicket.order.customer.fullName}</div>
                        <div><strong>Phone:</strong> {selectedTicket.order.customer.telephone}</div>
                        <div><strong>Created:</strong> {formatDate(selectedTicket.createdAt)}</div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side - Messages */}
                <div className="flex-1 flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    <h3 className="font-medium mb-4">Messages ({selectedTicket.messages?.length || 0})</h3>
                    <div className="space-y-4">
                      {selectedTicket.messages?.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">{t('noMessagesYet')}</p>
                      ) : (
                        selectedTicket.messages?.map((message) => (
                          <div key={message.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{message.sender.name}</span>
                                <span className="text-xs text-gray-500">({message.sender.role})</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{message.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="p-6 border-t bg-gray-50">
                    <div className="flex space-x-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('typeYourMessage')}
                        rows={3}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <Button
                        onClick={addMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CoordinateurLayout>
  );
}

export default function CoordinateurTicketsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>}>
      <CoordinateurTicketsPageContent />
    </Suspense>
  );
}