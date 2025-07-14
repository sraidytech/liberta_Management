export interface WilayaDeliverySettings {
  id: string;
  wilayaName: string;
  maxDeliveryDays: number;
  isActive: boolean;
}

export interface OrderDelayInfo {
  orderId: string;
  wilaya: string;
  orderDate: Date;
  maxDeliveryDays: number;
  daysSinceOrder: number;
  delayDays: number;
  isDelayed: boolean;
  delayLevel: 'none' | 'warning' | 'critical';
  isDelivered: boolean;
}

/**
 * Check if an order is delivered based on shipping status
 */
export function isOrderDelivered(shippingStatus?: string): boolean {
  if (!shippingStatus) return false;
  
  const deliveredStatuses = ['LIVRÉ', 'DELIVERED'];
  return deliveredStatuses.includes(shippingStatus.toUpperCase());
}

/**
 * Calculate delay information for a single order
 */
export function calculateOrderDelay(
  orderId: string,
  wilaya: string,
  orderDate: string | Date,
  shippingStatus?: string,
  wilayaSettings: WilayaDeliverySettings[] = []
): OrderDelayInfo {
  // Handle null/undefined orderDate
  let orderDateObj: Date;
  if (!orderDate) {
    orderDateObj = new Date(); // Use current date as fallback
  } else {
    orderDateObj = typeof orderDate === 'string' ? new Date(orderDate) : orderDate;
    // Check if date is invalid
    if (isNaN(orderDateObj.getTime())) {
      orderDateObj = new Date(); // Use current date as fallback
    }
  }
  
  const wilayaSetting = wilayaSettings.find(setting => setting.wilayaName === wilaya);
  const maxDeliveryDays = wilayaSetting?.maxDeliveryDays || 2; // Default 2 days

  const now = new Date();
  const daysSinceOrder = Math.floor((now.getTime() - orderDateObj.getTime()) / (1000 * 60 * 60 * 24));
  const delayDays = Math.max(0, daysSinceOrder - maxDeliveryDays);
  const isDelivered = isOrderDelivered(shippingStatus);

  let delayLevel: 'none' | 'warning' | 'critical' = 'none';
  let isDelayed = false;

  // Only calculate delay if not delivered
  if (!isDelivered) {
    if (delayDays >= 2) {
      delayLevel = 'critical';
      isDelayed = true;
    } else if (delayDays >= 1) {
      delayLevel = 'warning';
      isDelayed = true;
    }
  }

  return {
    orderId,
    wilaya,
    orderDate: orderDateObj,
    maxDeliveryDays,
    daysSinceOrder,
    delayDays,
    isDelayed,
    delayLevel,
    isDelivered
  };
}

/**
 * Get CSS classes for delay color coding (table rows)
 */
export function getDelayRowClasses(delayInfo: OrderDelayInfo): string {
  if (delayInfo.isDelivered || !delayInfo.isDelayed) {
    return '';
  }

  switch (delayInfo.delayLevel) {
    case 'warning':
      return 'bg-orange-50 border-l-4 border-orange-400 hover:bg-orange-100';
    case 'critical':
      return 'bg-red-50 border-l-4 border-red-500 hover:bg-red-100';
    default:
      return '';
  }
}

/**
 * Get CSS classes for delay color coding (cards)
 */
export function getDelayCardClasses(delayInfo: OrderDelayInfo): string {
  if (delayInfo.isDelivered || !delayInfo.isDelayed) {
    return '';
  }

  switch (delayInfo.delayLevel) {
    case 'warning':
      return 'border-orange-400 bg-orange-50';
    case 'critical':
      return 'border-red-500 bg-red-50';
    default:
      return '';
  }
}

/**
 * Get delay badge component props
 */
export function getDelayBadgeProps(delayInfo: OrderDelayInfo): {
  show: boolean;
  text: string;
  className: string;
} {
  if (delayInfo.isDelivered || !delayInfo.isDelayed) {
    return { show: false, text: '', className: '' };
  }

  const delayText = delayInfo.delayDays === 1 
    ? '+1 day delay' 
    : `+${delayInfo.delayDays} days delay`;

  switch (delayInfo.delayLevel) {
    case 'warning':
      return {
        show: true,
        text: delayText,
        className: 'bg-orange-100 text-orange-800 border border-orange-200'
      };
    case 'critical':
      return {
        show: true,
        text: delayText,
        className: 'bg-red-100 text-red-800 border border-red-200'
      };
    default:
      return { show: false, text: '', className: '' };
  }
}

/**
 * Calculate delay statistics for a list of orders
 */
export function calculateDelayStatistics(
  orders: Array<{
    id: string;
    orderDate: string;
    shippingStatus?: string;
    customer: { wilaya: string };
  }>,
  wilayaSettings: WilayaDeliverySettings[] = []
): {
  totalOrders: number;
  totalDelayed: number;
  warningLevel: number;
  criticalLevel: number;
  delayedByWilaya: Array<{ wilaya: string; count: number; avgDelay: number }>;
} {
  const delayInfos = orders.map(order => 
    calculateOrderDelay(
      order.id,
      order.customer.wilaya,
      order.orderDate,
      order.shippingStatus,
      wilayaSettings
    )
  );

  const delayedOrders = delayInfos.filter(delay => delay.isDelayed);
  const warningLevel = delayedOrders.filter(delay => delay.delayLevel === 'warning').length;
  const criticalLevel = delayedOrders.filter(delay => delay.delayLevel === 'critical').length;

  // Group by wilaya
  const wilayaDelayMap = new Map<string, { count: number; totalDelay: number }>();
  
  delayedOrders.forEach(delay => {
    const existing = wilayaDelayMap.get(delay.wilaya) || { count: 0, totalDelay: 0 };
    wilayaDelayMap.set(delay.wilaya, {
      count: existing.count + 1,
      totalDelay: existing.totalDelay + delay.delayDays
    });
  });

  const delayedByWilaya = Array.from(wilayaDelayMap.entries()).map(([wilaya, data]) => ({
    wilaya,
    count: data.count,
    avgDelay: Math.round(data.totalDelay / data.count * 10) / 10
  }));

  return {
    totalOrders: orders.length,
    totalDelayed: delayedOrders.length,
    warningLevel,
    criticalLevel,
    delayedByWilaya
  };
}

/**
 * Format delay information for display
 */
export function formatDelayInfo(delayInfo: OrderDelayInfo): string {
  if (delayInfo.isDelivered) {
    return 'Delivered';
  }

  if (!delayInfo.isDelayed) {
    const remainingDays = delayInfo.maxDeliveryDays - delayInfo.daysSinceOrder;
    if (remainingDays > 0) {
      return `${remainingDays} day${remainingDays !== 1 ? 's' : ''} remaining`;
    }
    return 'On time';
  }

  return `${delayInfo.delayDays} day${delayInfo.delayDays !== 1 ? 's' : ''} delayed`;
}

/**
 * Get delay icon based on delay level
 */
export function getDelayIcon(delayInfo: OrderDelayInfo): string {
  if (delayInfo.isDelivered) {
    return '✅';
  }

  switch (delayInfo.delayLevel) {
    case 'warning':
      return '⚠️';
    case 'critical':
      return '🚨';
    default:
      return '⏰';
  }
}