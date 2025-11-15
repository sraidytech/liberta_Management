'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  MessageSquare,
  User,
  Calendar,
  Eye,
  Clock
} from 'lucide-react';

interface CriticalTicket {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  order: {
    reference: string;
    customer: {
      fullName: string;
      telephone: string;
    };
  };
  reporter: {
    name: string;
    role: string;
  };
  _count?: {
    messages: number;
  };
}

interface CriticalTicketsSectionProps {
  tickets: CriticalTicket[];
  loading: boolean;
  onViewTicket: (ticket: CriticalTicket) => void;
  formatDate: (date: string) => string;
  t: (key: any) => string;
}

export function CriticalTicketsSection({
  tickets,
  loading,
  onViewTicket,
  formatDate,
  t
}: CriticalTicketsSectionProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'EXCHANGE': return 'bg-red-100 text-red-800 border-red-300';
      case 'REFUND': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'QUALITY_CONTROL': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    return <AlertCircle className="h-5 w-5" />;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'EXCHANGE': return '🔄 EXCHANGE';
      case 'REFUND': return '💰 REFUND';
      case 'QUALITY_CONTROL': return '⚠️ QUALITY CONTROL';
      default: return category;
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600 animate-pulse" />
          <h2 className="text-xl font-bold text-red-900">
            🚨 CRITICAL TICKETS - REQUIRES IMMEDIATE ATTENTION
          </h2>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-600">{t('loading')}</div>
        </div>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-bold text-green-900">
            ✅ CRITICAL TICKETS
          </h2>
        </div>
        <div className="text-center py-8">
          <div className="text-green-700 font-medium">
            No critical tickets at the moment. All clear! 🎉
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-600 animate-pulse" />
          <h2 className="text-xl font-bold text-red-900">
            🚨 CRITICAL TICKETS - REQUIRES IMMEDIATE ATTENTION
          </h2>
        </div>
        <Badge className="bg-red-600 text-white text-lg px-4 py-2">
          {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
        </Badge>
      </div>

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className={`p-5 border-2 ${getCategoryColor(ticket.category)} hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getCategoryIcon(ticket.category)}
                  <Badge className={`${getCategoryColor(ticket.category)} text-sm font-bold px-3 py-1`}>
                    {getCategoryLabel(ticket.category)}
                  </Badge>
                  <Badge className="bg-red-600 text-white text-xs px-2 py-1">
                    CRITICAL
                  </Badge>
                  {ticket.priority === 'URGENT' && (
                    <Badge className="bg-purple-600 text-white text-xs px-2 py-1 animate-pulse">
                      URGENT
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-lg mb-3 text-gray-900">{ticket.title}</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Order: {ticket.order.reference}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="h-4 w-4 text-green-600" />
                    <span>{ticket.order.customer.fullName}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="h-4 w-4 text-purple-600" />
                    <span>Reporter: {ticket.reporter.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="font-medium">{ticket.status.replace('_', ' ')}</span>
                  </div>
                  {ticket._count && (
                    <div className="flex items-center space-x-2 text-gray-700">
                      <MessageSquare className="h-4 w-4 text-indigo-600" />
                      <span>{ticket._count.messages} messages</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ml-4">
                <Button
                  onClick={() => onViewTicket(ticket)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View & Handle
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}