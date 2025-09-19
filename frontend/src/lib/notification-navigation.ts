import { Notification } from '@/contexts/NotificationContext';

export interface NavigationResult {
  path: string;
  shouldNavigate: boolean;
}

/**
 * Extended notification interface to support ticket notifications
 */
export interface ExtendedNotification extends Notification {
  ticketId?: string;
  ticket?: {
    id: string;
    reference: string;
    status: string;
    title: string;
  };
}

/**
 * Determines the navigation path based on notification type and user role
 */
export function getNotificationNavigationPath(
  notification: ExtendedNotification,
  userRole?: string
): NavigationResult {
  const { type, orderId, order, ticketId, ticket } = notification;

  // Default result
  const defaultResult: NavigationResult = {
    path: '',
    shouldNavigate: false
  };

  const orderReference = order?.reference || orderId;
  const ticketReference = ticket?.reference || ticketId;

  console.log('🔍 Navigation path calculation:', {
    type,
    orderId,
    order,
    ticketId,
    ticket,
    orderReference,
    ticketReference,
    userRole
  });

  switch (type) {
    case 'ORDER_ASSIGNMENT':
      // Navigate to order details or agent dashboard based on role
      if (!orderId && !order?.id) return defaultResult;
      
      if (userRole === 'ADMIN' || userRole === 'TEAM_MANAGER') {
        return {
          path: `/admin/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'COORDINATEUR') {
        return {
          path: `/coordinateur/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'AGENT_SUIVI' || userRole === 'AGENT_CALL_CENTER') {
        return {
          path: `/agent/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      }
      break;

    case 'ORDER_UPDATE':
      // Navigate to order details based on role
      if (!orderId && !order?.id) return defaultResult;
      
      if (userRole === 'ADMIN' || userRole === 'TEAM_MANAGER') {
        return {
          path: `/admin/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'COORDINATEUR') {
        return {
          path: `/coordinateur/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'AGENT_SUIVI' || userRole === 'AGENT_CALL_CENTER') {
        return {
          path: `/agent/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      }
      break;

    case 'SHIPPING_UPDATE':
      // Navigate to order details for shipping updates
      if (!orderId && !order?.id) return defaultResult;
      
      if (userRole === 'ADMIN' || userRole === 'TEAM_MANAGER') {
        return {
          path: `/admin/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'COORDINATEUR') {
        return {
          path: `/coordinateur/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'AGENT_SUIVI' || userRole === 'AGENT_CALL_CENTER') {
        return {
          path: `/agent/orders?search=${orderReference}`,
          shouldNavigate: true
        };
      }
      break;

    case 'TICKET_CREATED':
    case 'TICKET_UPDATED':
    case 'TICKET_MESSAGE':
    case 'NEW_TICKET_MESSAGE':
    case 'TICKET_STATUS_UPDATED':
      // Navigate to ticket details based on role
      if (!ticketId && !ticket?.id && !orderId && !order?.id) return defaultResult;
      
      if (userRole === 'ADMIN' || userRole === 'TEAM_MANAGER') {
        return {
          path: `/admin/tickets?search=${ticketReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'COORDINATEUR') {
        return {
          path: `/coordinateur/tickets?search=${ticketReference}`,
          shouldNavigate: true
        };
      } else if (userRole === 'AGENT_SUIVI' || userRole === 'AGENT_CALL_CENTER') {
        // For agents, navigate to orders page with the order reference (since tickets are linked to orders)
        const searchRef = orderReference || ticketReference;
        return {
          path: `/agent/orders?search=${searchRef}`,
          shouldNavigate: true
        };
      }
      break;

    case 'SYSTEM_ALERT':
      // Check if this is actually a ticket-related system alert
      if ((orderId || order?.id) && (notification.title?.toLowerCase().includes('ticket') || notification.message?.toLowerCase().includes('ticket'))) {
        console.log('🎫 SYSTEM_ALERT detected as ticket notification, treating as ticket');
        // Treat as ticket notification
        if (userRole === 'ADMIN' || userRole === 'TEAM_MANAGER') {
          return {
            path: `/admin/tickets?search=${orderReference}`,
            shouldNavigate: true
          };
        } else if (userRole === 'COORDINATEUR') {
          return {
            path: `/coordinateur/tickets?search=${orderReference}`,
            shouldNavigate: true
          };
        } else if (userRole === 'AGENT_SUIVI' || userRole === 'AGENT_CALL_CENTER') {
          // For agents, navigate to orders page with the order reference (since tickets are linked to orders)
          return {
            path: `/agent/orders?search=${orderReference}`,
            shouldNavigate: true
          };
        }
      } else {
        // Regular system alert - navigate to appropriate dashboard
        if (userRole === 'ADMIN' || userRole === 'TEAM_MANAGER') {
          return {
            path: '/admin/dashboard',
            shouldNavigate: true
          };
        } else if (userRole === 'COORDINATEUR') {
          return {
            path: '/coordinateur',
            shouldNavigate: true
          };
        } else if (userRole === 'AGENT_SUIVI' || userRole === 'AGENT_CALL_CENTER') {
          return {
            path: '/agent',
            shouldNavigate: true
          };
        }
      }
      break;

    default:
      console.log('⚠️ Unknown notification type, falling back to default:', type);
      return defaultResult;
  }

  console.log('⚠️ No case matched, falling back to default result');
  return defaultResult;
}

/**
 * Handles notification click with navigation and marking as read
 */
export async function handleNotificationClick(
  notification: ExtendedNotification,
  userRole: string | undefined,
  router: any,
  markAsRead: (id: string) => Promise<void>
): Promise<void> {
  // Debug logging
  console.log('🔍 Notification clicked:', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    orderId: notification.orderId,
    order: notification.order,
    ticketId: (notification as any).ticketId,
    ticket: (notification as any).ticket,
    userRole
  });

  // Mark as read if not already read
  if (!notification.isRead) {
    await markAsRead(notification.id);
  }

  // Get navigation path
  const navigationResult = getNotificationNavigationPath(notification, userRole);
  
  console.log('🎯 Navigation result:', navigationResult);

  // Navigate if path is available
  if (navigationResult.shouldNavigate && navigationResult.path) {
    console.log('✅ Navigating to:', navigationResult.path);
    router.push(navigationResult.path);
  } else {
    console.log('❌ No navigation - shouldNavigate:', navigationResult.shouldNavigate, 'path:', navigationResult.path);
  }
}

/**
 * Gets a user-friendly description of where the notification will navigate
 */
export function getNotificationNavigationDescription(
  notification: ExtendedNotification,
  userRole?: string
): string {
  const navigationResult = getNotificationNavigationPath(notification, userRole);
  
  if (!navigationResult.shouldNavigate) {
    return '';
  }

  const { type, order, ticket } = notification;
  const orderReference = order?.reference || 'order';
  const ticketReference = ticket?.reference || 'ticket';

  switch (type) {
    case 'ORDER_ASSIGNMENT':
      return `View assigned order ${orderReference}`;
    case 'ORDER_UPDATE':
      return `View updated order ${orderReference}`;
    case 'SHIPPING_UPDATE':
      return `View shipping details for ${orderReference}`;
    case 'TICKET_CREATED':
      return `View new ticket ${ticketReference}`;
    case 'TICKET_UPDATED':
      return `View updated ticket ${ticketReference}`;
    case 'TICKET_MESSAGE':
    case 'NEW_TICKET_MESSAGE':
      return `View ticket message ${ticketReference}`;
    case 'TICKET_STATUS_UPDATED':
      return `View ticket status ${ticketReference}`;
    case 'SYSTEM_ALERT':
      return 'Go to dashboard';
    default:
      return 'View details';
  }
}