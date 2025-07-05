export type Language = 'en' | 'fr';

export interface Translations {
  // Common
  loading: string;
  error: string;
  success: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  create: string;
  update: string;
  search: string;
  filter: string;
  
  // Navigation
  dashboard: string;
  orders: string;
  agents: string;
  customers: string;
  analytics: string;
  settings: string;
  logout: string;
  
  // Auth
  login: string;
  register: string;
  email: string;
  password: string;
  name: string;
  forgotPassword: string;
  resetPassword: string;
  
  // Home page
  homeTitle: string;
  homeSubtitle: string;
  getStarted: string;
  learnMore: string;
  ecoManagerIntegration: string;
  ecoManagerDescription: string;
  intelligentAssignment: string;
  intelligentAssignmentDescription: string;
  realTimeTracking: string;
  realTimeTrackingDescription: string;
  
  // Orders
  orderManagement: string;
  orderReference: string;
  orderStatus: string;
  orderTotal: string;
  orderDate: string;
  assignedAgent: string;
  customer: string;
  
  // Agents
  agentManagement: string;
  agentName: string;
  agentRole: string;
  agentStatus: string;
  availability: string;
  currentOrders: string;
  
  // Status
  pending: string;
  assigned: string;
  inProgress: string;
  completed: string;
  cancelled: string;
  online: string;
  offline: string;
  busy: string;
  break: string;
  
  // Orders Management
  ordersManagement: string;
  manageAndTrackOrders: string;
  syncNewOrders: string;
  syncing: string;
  fullSync: string;
  totalOrders: string;
  pendingOrders: string;
  deliveredOrders: string;
  totalRevenue: string;
  status: string;
  allStatuses: string;
  confirmed: string;
  shipped: string;
  delivered: string;
  returned: string;
  sortBy: string;
  createdDate: string;
  totalAmount: string;
  itemsPerPage: string;
  order: string;
  agent: string;
  total: string;
  date: string;
  actions: string;
  items: string;
  unassigned: string;
  viewDetails: string;
  noOrdersFound: string;
  searchOrders: string;
  failedToFetchOrders: string;
  successfullySynced: string;
  failedToSyncOrders: string;
  failedStores: string;
  orderStatusUpdatedSuccessfully: string;
  failedToUpdateOrderStatus: string;
  
  // Order Details Modal
  orderDetails: string;
  orderInformation: string;
  customerInformation: string;
  phone: string;
  agentCode: string;
  assignedAt: string;
  orderItems: string;
  product: string;
  quantity: string;
  unitPrice: string;
  updateOrderStatus: string;
  newStatus: string;
  notes: string;
  optional: string;
  addNotesAboutStatusChange: string;
  updating: string;
  updateStatus: string;
  warning: string;
  
  // Shipping Status
  shippingStatus: string;
  trackingNumber: string;
  syncShippingStatus: string;
  testMaystroIntegration: string;
  
  // Agent Dashboard
  agentDashboard: string;
  manageAssignedOrders: string;
  agentAssignedOrders: string;
  agentPendingOrders: string;
  completedToday: string;
  capacity: string;
  myAssignedOrders: string;
  noOrdersAssigned: string;
  ordersWillAppearHere: string;
  refresh: string;
  startProcessing: string;
  confirmOrder: string;
  cancelOrder: string;
  close: string;
  reference: string;
  wilaya: string;
  commune: string;
  qty: string;
  
  // Additional Agent Interface
  editStatus: string;
  allStatus: string;
  
  // Manual Assignment
  assign: string;
  reassign: string;
  assignOrder: string;
  selectAgent: string;
  noAgentsAvailable: string;
  agentOnline: string;
  agentOffline: string;
  agentCapacity: string;
  todaysOrders: string;
  orderAssignedSuccessfully: string;
  failedToAssignOrder: string;
  
  // Agent Assignment Dashboard
  agentAssignmentDashboard: string;
  triggerAssignment: string;
  assigning: string;
  bulkReassignment: string;
  totalAgents: string;
  onlineAgents: string;
  offlineAgents: string;
  unassignedOrders: string;
  assignedOrders: string;
  agentWorkloads: string;
  code: string;
  utilization: string;
  progress: string;
  noAgentsFound: string;
  howAssignmentWorks: string;
  
  // Bulk Reassignment Modal
  bulkOrderReassignment: string;
  orderSelection: string;
  lastNOrdersGlobally: string;
  lastNOrdersFromSpecificAgents: string;
  numberOfOrders: string;
  sourceAgents: string;
  targetAgentsDistribution: string;
  addAgent: string;
  remove: string;
  totalPercentage: string;
  distributionPreviewRoundRobin: string;
  assignmentPattern: string;
  alternating: string;
  repeating: string;
  ordersWillBeDistributedAlternating: string;
  noTargetAgentsAdded: string;
  clickAddAgentToStart: string;
  startBulkReassignment: string;
  processing: string;
  validationError: string;
  orderCountMustBeGreaterThanZero: string;
  pleaseAddAtLeastOneTargetAgent: string;
  targetAgentPercentagesMustSumTo100: string;
  pleaseSelectAtLeastOneSourceAgent: string;
  loadingAgents: string;
  then: string;
  
  // Commission Settings
  commissionSettings: string;
  configureDefaultCommissionValues: string;
  baseCommission: string;
  commissionForReaching1500Orders: string;
  baseCommissionDA: string;
  confirmationRateBonuses: string;
  additionalBonusesBasedOnConfirmationRates: string;
  rate78Bonus: string;
  rate80Bonus: string;
  rate82Bonus: string;
  upsellBonus: string;
  bonusForAchievingUpsellTargets: string;
  upsellBonusDA: string;
  minimumUpsellRate: string;
  packBonuses: string;
  bonusesForPackQuantityAchievements: string;
  pack2BonusDA: string;
  pack4BonusDA: string;
  minRate: string;
  unsavedChanges: string;
  youHaveUnsavedChanges: string;
  clickSaveChangesToApply: string;
  reset: string;
  saveChanges: string;
  saving: string;
  commissionSettingsUpdatedSuccessfully: string;
  failedToUpdateCommissionSettings: string;
  errorFetchingCommissionSettings: string;
  settingsResetToLastSavedValues: string;
  
  // Notifications
  notifications: string;
  notification: string;
  unread: string;
  markAsRead: string;
  markAllAsRead: string;
  markAllRead: string;
  noNotifications: string;
  noNotificationsYet: string;
  viewAllNotifications: string;
  newOrderAssigned: string;
  orderStatusUpdated: string;
  shippingUpdate: string;
  systemAlert: string;
  orderAssignment: string;
  orderUpdate: string;
  disconnectedFromServer: string;
  connectedToServer: string;
  notificationSettings: string;
  enableNotifications: string;
  disableNotifications: string;
  testNotification: string;
  sendTestNotification: string;
  notificationSent: string;
  failedToSendNotification: string;
  loadingNotifications: string;
  refreshNotifications: string;
  notificationHistory: string;
  clearNotifications: string;
  notificationPreferences: string;
  emailNotifications: string;
  pushNotifications: string;
  inAppNotifications: string;
  notificationTypes: string;
  orderNotifications: string;
  systemNotifications: string;
  deliveryNotifications: string;
  agentNotifications: string;
  andMoreNotifications: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  justNow: string;
  yesterday: string;
  today: string;
  thisWeek: string;
  lastWeek: string;
  thisMonth: string;
  lastMonth: string;
  
  // Coordinateur Interface
  myProducts: string;
  manageAndMonitorProducts: string;
  assignedProducts: string;
  assignedAgents: string;
  fromAssignedProducts: string;
  acrossAllProducts: string;
  searchProducts: string;
  failedToLoadAssignedProducts: string;
  noProductsAssigned: string;
  contactAdministratorForAssignments: string;
  noProductsFound: string;
  noProductsMatchSearch: string;
  category: string;
  price: string;
  revenue: string;
  active: string;
  inactive: string;
  myOrders: string;
  manageOrdersForAssignedProducts: string;
  agentAssignment: string;
  manageAgentsForProducts: string;
  orderDetailsModal: string;
  viewOrderDetails: string;
  retry: string;
  
  // Ticket System
  tickets: string;
  ticket: string;
  reportProblem: string;
  reportAProblem: string;
  createTicket: string;
  ticketTitle: string;
  ticketCategory: string;
  ticketPriority: string;
  ticketDescription: string;
  ticketStatus: string;
  ticketMessages: string;
  addMessage: string;
  sendMessage: string;
  assignTicket: string;
  assignTo: string;
  autoAssign: string;
  coordinator: string;
  teamLeader: string;
  ticketAssignedTo: string;
  ticketReportedBy: string;
  ticketCreatedAt: string;
  ticketUpdatedAt: string;
  ticketResolvedAt: string;
  ticketClosedAt: string;
  
  // Ticket Categories
  customerIssue: string;
  productIssue: string;
  deliveryIssue: string;
  systemIssue: string;
  paymentIssue: string;
  otherIssue: string;
  
  // Ticket Priorities
  lowPriority: string;
  mediumPriority: string;
  highPriority: string;
  urgentPriority: string;
  
  // Ticket Statuses
  openTicket: string;
  inProgressTicket: string;
  waitingResponse: string;
  resolvedTicket: string;
  closedTicket: string;
  
  // Ticket Actions
  viewTicket: string;
  viewTickets: string;
  updateTicketStatus: string;
  closeTicket: string;
  reopenTicket: string;
  resolveTicket: string;
  markInProgress: string;
  waitingForResponse: string;
  
  // Ticket Messages
  noTicketsFound: string;
  noMessagesYet: string;
  typeYourMessage: string;
  ticketCreatedSuccessfully: string;
  ticketUpdatedSuccessfully: string;
  messageAddedSuccessfully: string;
  failedToCreateTicket: string;
  failedToUpdateTicket: string;
  failedToAddMessage: string;
  
  // Ticket Dashboard
  myTickets: string;
  assignedTickets: string;
  openTickets: string;
  resolvedTickets: string;
  ticketStats: string;
  activeTickets: string;
  
  // Agent Orders Filters
  hideDeliveredOrders: string;
  noteTypes: string;
  withNotesOnly: string;
  lastNote: string;
  selectNoteTypes: string;
  allNoteTypes: string;
  clearSelection: string;
  selectShippingStatus: string;
  allShippingStatuses: string;
  selectStatuses: string;
  
  // Additional shipping status values
  inTransit: string;
  outForDelivery: string;
  failedDelivery: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    update: 'Update',
    search: 'Search',
    filter: 'Filter',
    
    // Navigation
    dashboard: 'Dashboard',
    orders: 'Orders',
    agents: 'Agents',
    customers: 'Customers',
    analytics: 'Analytics',
    settings: 'Settings',
    logout: 'Logout',
    
    // Auth
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
    
    // Home page
    homeTitle: 'Order Management System',
    homeSubtitle: 'Intelligent order processing and agent assignment platform designed for order fulfillment companies.',
    getStarted: 'Get started',
    learnMore: 'Learn more',
    ecoManagerIntegration: 'EcoManager Integration',
    ecoManagerDescription: 'Seamless integration with EcoManager stores for automatic order import and processing.',
    intelligentAssignment: 'Intelligent Assignment',
    intelligentAssignmentDescription: 'Smart round-robin algorithm for fair order distribution among available agents.',
    realTimeTracking: 'Real-time Tracking',
    realTimeTrackingDescription: 'Live order tracking with Maystro delivery integration and instant notifications.',
    
    // Orders
    orderManagement: 'Order Management',
    orderReference: 'Reference',
    orderStatus: 'Status',
    orderTotal: 'Total',
    orderDate: 'Date',
    assignedAgent: 'Assigned Agent',
    customer: 'Customer',
    
    // Agents
    agentManagement: 'Agent Management',
    agentName: 'Name',
    agentRole: 'Role',
    agentStatus: 'Status',
    availability: 'Availability',
    currentOrders: 'Current Orders',
    
    // Status
    pending: 'Pending',
    assigned: 'Assigned',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    online: 'Online',
    offline: 'Offline',
    busy: 'Busy',
    break: 'Break',
    
    // Orders Management
    ordersManagement: 'Orders Management',
    manageAndTrackOrders: 'Manage and track all orders from EcoManager',
    syncNewOrders: 'Sync New Orders',
    syncing: 'Syncing...',
    fullSync: 'Full Sync',
    totalOrders: 'Total Orders',
    pendingOrders: 'Pending Orders',
    deliveredOrders: 'Delivered Orders',
    totalRevenue: 'Total Revenue',
    status: 'Status',
    allStatuses: 'All Statuses',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    returned: 'Returned',
    sortBy: 'Sort By',
    createdDate: 'Created Date',
    totalAmount: 'Total Amount',
    itemsPerPage: 'Items per page',
    order: 'Order',
    agent: 'Agent',
    total: 'Total',
    date: 'Date',
    actions: 'Actions',
    items: 'items',
    unassigned: 'Unassigned',
    viewDetails: 'View Details',
    noOrdersFound: 'No orders found',
    searchOrders: 'Search orders...',
    failedToFetchOrders: 'Failed to fetch orders',
    successfullySynced: 'Successfully synced',
    failedToSyncOrders: 'Failed to sync orders',
    failedStores: 'Failed stores',
    orderStatusUpdatedSuccessfully: 'Order status updated successfully',
    failedToUpdateOrderStatus: 'Failed to update order status',
    
    // Order Details Modal
    orderDetails: 'Order Details',
    orderInformation: 'Order Information',
    customerInformation: 'Customer Information',
    phone: 'Phone',
    agentCode: 'Agent Code',
    assignedAt: 'Assigned At',
    orderItems: 'Order Items',
    product: 'Product',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    updateOrderStatus: 'Update Order Status',
    newStatus: 'New Status',
    notes: 'Notes',
    optional: 'optional',
    addNotesAboutStatusChange: 'Add notes about status change...',
    updating: 'Updating...',
    updateStatus: 'Update Status',
    warning: 'Warning',
    
    // Shipping Status
    shippingStatus: 'Shipping Status',
    trackingNumber: 'Tracking Number',
    syncShippingStatus: 'Sync Shipping Status',
    testMaystroIntegration: 'Test Maystro Integration',
    
    // Agent Dashboard
    agentDashboard: 'Agent Dashboard',
    manageAssignedOrders: 'Manage your assigned orders',
    agentAssignedOrders: 'Assigned Orders',
    agentPendingOrders: 'Pending Orders',
    completedToday: 'Completed Today',
    capacity: 'Capacity',
    myAssignedOrders: 'My Assigned Orders',
    noOrdersAssigned: 'No orders assigned yet',
    ordersWillAppearHere: 'Orders will appear here when assigned to you',
    refresh: 'Refresh',
    startProcessing: 'Start Processing',
    confirmOrder: 'Confirm Order',
    cancelOrder: 'Cancel Order',
    close: 'Close',
    reference: 'Reference',
    wilaya: 'Wilaya',
    commune: 'Commune',
    qty: 'Qty',
    
    // Additional Agent Interface
    editStatus: 'Edit Status',
    allStatus: 'All Status',
    
    // Manual Assignment
    assign: 'Assign',
    reassign: 'Reassign',
    assignOrder: 'Assign Order',
    selectAgent: 'Select an agent to assign this order',
    noAgentsAvailable: 'No agents available',
    agentOnline: 'Online',
    agentOffline: 'Offline',
    agentCapacity: 'capacity',
    todaysOrders: 'Today',
    orderAssignedSuccessfully: 'Order assigned successfully',
    failedToAssignOrder: 'Failed to assign order',
    
    // Agent Assignment Dashboard
    agentAssignmentDashboard: 'Agent Assignment Dashboard',
    triggerAssignment: 'Trigger Assignment',
    assigning: 'Assigning...',
    bulkReassignment: 'Bulk Reassignment',
    totalAgents: 'Total Agents',
    onlineAgents: 'Online Agents',
    offlineAgents: 'Offline Agents',
    unassignedOrders: 'Unassigned Orders',
    assignedOrders: 'Assigned Orders',
    agentWorkloads: 'Agent Workloads',
    code: 'Code',
    utilization: 'Utilization',
    progress: 'Progress',
    noAgentsFound: 'No agents found',
    howAssignmentWorks: 'How Assignment Works',
    
    // Bulk Reassignment Modal
    bulkOrderReassignment: 'Bulk Order Reassignment',
    orderSelection: 'Order Selection',
    lastNOrdersGlobally: 'Last N orders globally (by creation date)',
    lastNOrdersFromSpecificAgents: 'Last N orders from specific agents',
    numberOfOrders: 'Number of orders',
    sourceAgents: 'Source Agents',
    targetAgentsDistribution: 'Target Agents & Distribution',
    addAgent: 'Add Agent',
    remove: 'Remove',
    totalPercentage: 'Total Percentage',
    distributionPreviewRoundRobin: 'Distribution Preview (Round-Robin)',
    assignmentPattern: 'Assignment Pattern',
    alternating: 'Alternating',
    repeating: 'repeating',
    ordersWillBeDistributedAlternating: 'Orders will be distributed in this alternating pattern, not in blocks',
    noTargetAgentsAdded: 'No target agents added. Click "Add Agent" to start.',
    clickAddAgentToStart: 'Click "Add Agent" to start.',
    startBulkReassignment: 'Start Bulk Reassignment',
    processing: 'Processing...',
    validationError: 'Validation Error',
    orderCountMustBeGreaterThanZero: 'Order count must be greater than 0',
    pleaseAddAtLeastOneTargetAgent: 'Please add at least one target agent',
    targetAgentPercentagesMustSumTo100: 'Target agent percentages must sum to 100%',
    pleaseSelectAtLeastOneSourceAgent: 'Please select at least one source agent',
    loadingAgents: 'Loading agents...',
    then: 'then',
    
    // Commission Settings
    commissionSettings: 'Commission Settings',
    configureDefaultCommissionValues: 'Configure default commission values and thresholds',
    baseCommission: 'Base Commission',
    commissionForReaching1500Orders: 'Commission for reaching 1500+ orders',
    baseCommissionDA: 'Base Commission (DA)',
    confirmationRateBonuses: 'Confirmation Rate Bonuses',
    additionalBonusesBasedOnConfirmationRates: 'Additional bonuses based on confirmation rates',
    rate78Bonus: '78%+ Rate Bonus (DA)',
    rate80Bonus: '80%+ Rate Bonus (DA)',
    rate82Bonus: '82%+ Rate Bonus (DA)',
    upsellBonus: 'Upsell Bonus',
    bonusForAchievingUpsellTargets: 'Bonus for achieving upsell targets',
    upsellBonusDA: 'Upsell Bonus (DA)',
    minimumUpsellRate: 'Minimum Upsell Rate (%)',
    packBonuses: 'Pack Bonuses',
    bonusesForPackQuantityAchievements: 'Bonuses for pack quantity achievements',
    pack2BonusDA: 'Pack 2 Bonus (DA)',
    pack4BonusDA: 'Pack 4 Bonus (DA)',
    minRate: 'Min Rate (%)',
    unsavedChanges: 'Unsaved Changes',
    youHaveUnsavedChanges: 'You have unsaved changes. Click "Save Changes" to apply them.',
    clickSaveChangesToApply: 'Click "Save Changes" to apply them.',
    reset: 'Reset',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    commissionSettingsUpdatedSuccessfully: 'Commission settings updated successfully!',
    failedToUpdateCommissionSettings: 'Failed to update commission settings',
    errorFetchingCommissionSettings: 'Error fetching commission settings',
    settingsResetToLastSavedValues: 'Settings reset to last saved values',
    
    // Notifications
    notifications: 'Notifications',
    notification: 'Notification',
    unread: 'unread',
    markAsRead: 'Mark as read',
    markAllAsRead: 'Mark all as read',
    markAllRead: 'Mark all read',
    noNotifications: 'No notifications',
    noNotificationsYet: 'No notifications yet',
    viewAllNotifications: 'View all notifications',
    newOrderAssigned: 'New Order Assigned',
    orderStatusUpdated: 'Order Status Updated',
    shippingUpdate: 'Shipping Update',
    systemAlert: 'System Alert',
    orderAssignment: 'Order Assignment',
    orderUpdate: 'Order Update',
    disconnectedFromServer: 'Disconnected from notification server',
    connectedToServer: 'Connected to notification server',
    notificationSettings: 'Notification Settings',
    enableNotifications: 'Enable Notifications',
    disableNotifications: 'Disable Notifications',
    testNotification: 'Test Notification',
    sendTestNotification: 'Send Test Notification',
    notificationSent: 'Notification sent successfully',
    failedToSendNotification: 'Failed to send notification',
    loadingNotifications: 'Loading notifications...',
    refreshNotifications: 'Refresh Notifications',
    notificationHistory: 'Notification History',
    clearNotifications: 'Clear Notifications',
    notificationPreferences: 'Notification Preferences',
    emailNotifications: 'Email Notifications',
    pushNotifications: 'Push Notifications',
    inAppNotifications: 'In-App Notifications',
    notificationTypes: 'Notification Types',
    orderNotifications: 'Order Notifications',
    systemNotifications: 'System Notifications',
    deliveryNotifications: 'Delivery Notifications',
    agentNotifications: 'Agent Notifications',
    andMoreNotifications: 'and {count} more notifications...',
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    justNow: 'just now',
    yesterday: 'yesterday',
    today: 'today',
    thisWeek: 'this week',
    lastWeek: 'last week',
    thisMonth: 'this month',
    lastMonth: 'last month',
    
    // Coordinateur Interface
    myProducts: 'My Products',
    manageAndMonitorProducts: 'Manage and monitor your assigned products',
    assignedProducts: 'Assigned Products',
    assignedAgents: 'Assigned Agents',
    fromAssignedProducts: 'From assigned products',
    acrossAllProducts: 'Across all products',
    searchProducts: 'Search products...',
    failedToLoadAssignedProducts: 'Failed to load your assigned products',
    noProductsAssigned: 'No Products Assigned',
    contactAdministratorForAssignments: 'You have not been assigned to any products yet. Contact your administrator to get product assignments.',
    noProductsFound: 'No Products Found',
    noProductsMatchSearch: 'No products match your search criteria. Try adjusting your search terms.',
    category: 'Category',
    price: 'Price',
    revenue: 'Revenue',
    active: 'Active',
    inactive: 'Inactive',
    myOrders: 'My Orders',
    manageOrdersForAssignedProducts: 'Manage orders for your assigned products',
    agentAssignment: 'Agent Assignment',
    manageAgentsForProducts: 'Manage agents for your assigned products',
    orderDetailsModal: 'Order Details',
    viewOrderDetails: 'View Order Details',
    retry: 'Retry',
    
    // Ticket System
    tickets: 'Tickets',
    ticket: 'Ticket',
    reportProblem: 'Report Problem',
    reportAProblem: 'Report a Problem',
    createTicket: 'Create Ticket',
    ticketTitle: 'Ticket Title',
    ticketCategory: 'Category',
    ticketPriority: 'Priority',
    ticketDescription: 'Description',
    ticketStatus: 'Status',
    ticketMessages: 'Messages',
    addMessage: 'Add Message',
    sendMessage: 'Send Message',
    assignTicket: 'Assign Ticket',
    assignTo: 'Assign To',
    autoAssign: 'Auto-assign',
    coordinator: 'Coordinator',
    teamLeader: 'Team Leader',
    ticketAssignedTo: 'Assigned To',
    ticketReportedBy: 'Reported By',
    ticketCreatedAt: 'Created At',
    ticketUpdatedAt: 'Updated At',
    ticketResolvedAt: 'Resolved At',
    ticketClosedAt: 'Closed At',
    
    // Ticket Categories
    customerIssue: 'Customer Issue',
    productIssue: 'Product Issue',
    deliveryIssue: 'Delivery Issue',
    systemIssue: 'System Issue',
    paymentIssue: 'Payment Issue',
    otherIssue: 'Other',
    
    // Ticket Priorities
    lowPriority: 'Low',
    mediumPriority: 'Medium',
    highPriority: 'High',
    urgentPriority: 'Urgent',
    
    // Ticket Statuses
    openTicket: 'Open',
    inProgressTicket: 'In Progress',
    waitingResponse: 'Waiting Response',
    resolvedTicket: 'Resolved',
    closedTicket: 'Closed',
    
    // Ticket Actions
    viewTicket: 'View Ticket',
    viewTickets: 'View Tickets',
    updateTicketStatus: 'Update Status',
    closeTicket: 'Close Ticket',
    reopenTicket: 'Reopen Ticket',
    resolveTicket: 'Resolve Ticket',
    markInProgress: 'Mark In Progress',
    waitingForResponse: 'Waiting for Response',
    
    // Ticket Messages
    noTicketsFound: 'No tickets found',
    noMessagesYet: 'No messages yet',
    typeYourMessage: 'Type your message...',
    ticketCreatedSuccessfully: 'Ticket created successfully',
    ticketUpdatedSuccessfully: 'Ticket updated successfully',
    messageAddedSuccessfully: 'Message added successfully',
    failedToCreateTicket: 'Failed to create ticket',
    failedToUpdateTicket: 'Failed to update ticket',
    failedToAddMessage: 'Failed to add message',
    
    // Ticket Dashboard
    myTickets: 'My Tickets',
    assignedTickets: 'Assigned Tickets',
    openTickets: 'Open Tickets',
    resolvedTickets: 'Resolved Tickets',
    ticketStats: 'Ticket Statistics',
    activeTickets: 'Active Tickets',
    
    // Agent Orders Filters
    hideDeliveredOrders: 'Hide Delivered Orders',
    noteTypes: 'Note Types',
    withNotesOnly: 'With Notes Only',
    lastNote: 'Last Note',
    selectNoteTypes: 'Select Note Types',
    allNoteTypes: 'All Note Types',
    clearSelection: 'Clear Selection',
    selectShippingStatus: 'Select Shipping Status',
    allShippingStatuses: 'All Shipping Statuses',
    selectStatuses: 'Select Statuses',
    
    // Additional shipping status values
    inTransit: 'In Transit',
    outForDelivery: 'Out for Delivery',
    failedDelivery: 'Failed Delivery',
  },
  fr: {
    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    create: 'Créer',
    update: 'Mettre à jour',
    search: 'Rechercher',
    filter: 'Filtrer',
    
    // Navigation
    dashboard: 'Tableau de bord',
    orders: 'Commandes',
    agents: 'Agents',
    customers: 'Clients',
    analytics: 'Analyses',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    
    // Auth
    login: 'Connexion',
    register: 'Inscription',
    email: 'Email',
    password: 'Mot de passe',
    name: 'Nom',
    forgotPassword: 'Mot de passe oublié',
    resetPassword: 'Réinitialiser le mot de passe',
    
    // Home page
    homeTitle: 'Système de Gestion des Commandes',
    homeSubtitle: 'Plateforme intelligente de traitement des commandes et d\'affectation d\'agents conçue pour les entreprises de traitement de commandes.',
    getStarted: 'Commencer',
    learnMore: 'En savoir plus',
    ecoManagerIntegration: 'Intégration EcoManager',
    ecoManagerDescription: 'Intégration transparente avec les boutiques EcoManager pour l\'importation et le traitement automatiques des commandes.',
    intelligentAssignment: 'Affectation Intelligente',
    intelligentAssignmentDescription: 'Algorithme round-robin intelligent pour une distribution équitable des commandes parmi les agents disponibles.',
    realTimeTracking: 'Suivi en Temps Réel',
    realTimeTrackingDescription: 'Suivi des commandes en direct avec intégration de livraison Maystro et notifications instantanées.',
    
    // Orders
    orderManagement: 'Gestion des Commandes',
    orderReference: 'Référence',
    orderStatus: 'Statut',
    orderTotal: 'Total',
    orderDate: 'Date',
    assignedAgent: 'Agent Assigné',
    customer: 'Client',
    
    // Agents
    agentManagement: 'Gestion des Agents',
    agentName: 'Nom',
    agentRole: 'Rôle',
    agentStatus: 'Statut',
    availability: 'Disponibilité',
    currentOrders: 'Commandes Actuelles',
    
    // Status
    pending: 'En attente',
    assigned: 'Assigné',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    online: 'En ligne',
    offline: 'Hors ligne',
    busy: 'Occupé',
    break: 'Pause',
    
    // Orders Management
    ordersManagement: 'Gestion des Commandes',
    manageAndTrackOrders: 'Gérer et suivre toutes les commandes d\'EcoManager',
    syncNewOrders: 'Synchroniser Nouvelles Commandes',
    syncing: 'Synchronisation...',
    fullSync: 'Synchronisation Complète',
    totalOrders: 'Total Commandes',
    pendingOrders: 'Commandes en Attente',
    deliveredOrders: 'Commandes Livrées',
    totalRevenue: 'Chiffre d\'Affaires Total',
    status: 'Statut',
    allStatuses: 'Tous les Statuts',
    confirmed: 'Confirmé',
    shipped: 'Expédié',
    delivered: 'Livré',
    returned: 'Retourné',
    sortBy: 'Trier par',
    createdDate: 'Date de Création',
    totalAmount: 'Montant Total',
    itemsPerPage: 'Éléments par page',
    order: 'Commande',
    agent: 'Agent',
    total: 'Total',
    date: 'Date',
    actions: 'Actions',
    items: 'articles',
    unassigned: 'Non assigné',
    viewDetails: 'Voir Détails',
    noOrdersFound: 'Aucune commande trouvée',
    searchOrders: 'Rechercher commandes...',
    failedToFetchOrders: 'Échec de récupération des commandes',
    successfullySynced: 'Synchronisé avec succès',
    failedToSyncOrders: 'Échec de synchronisation des commandes',
    failedStores: 'Magasins échoués',
    orderStatusUpdatedSuccessfully: 'Statut de commande mis à jour avec succès',
    failedToUpdateOrderStatus: 'Échec de mise à jour du statut de commande',
    
    // Order Details Modal
    orderDetails: 'Détails de la Commande',
    orderInformation: 'Informations de la Commande',
    customerInformation: 'Informations Client',
    phone: 'Téléphone',
    agentCode: 'Code Agent',
    assignedAt: 'Assigné le',
    orderItems: 'Articles de la Commande',
    product: 'Produit',
    quantity: 'Quantité',
    unitPrice: 'Prix Unitaire',
    updateOrderStatus: 'Mettre à Jour le Statut',
    newStatus: 'Nouveau Statut',
    notes: 'Notes',
    optional: 'optionnel',
    addNotesAboutStatusChange: 'Ajouter des notes sur le changement de statut...',
    updating: 'Mise à jour...',
    updateStatus: 'Mettre à Jour',
    warning: 'Attention',
    
    // Shipping Status
    shippingStatus: 'Statut de Livraison',
    trackingNumber: 'Numéro de Suivi',
    syncShippingStatus: 'Synchroniser Statut de Livraison',
    testMaystroIntegration: 'Tester Intégration Maystro',
    
    // Agent Dashboard
    agentDashboard: 'Tableau de Bord Agent',
    manageAssignedOrders: 'Gérez vos commandes assignées',
    agentAssignedOrders: 'Commandes Assignées',
    agentPendingOrders: 'Commandes En Attente',
    completedToday: 'Terminées Aujourd\'hui',
    capacity: 'Capacité',
    myAssignedOrders: 'Mes Commandes Assignées',
    noOrdersAssigned: 'Aucune commande assignée pour le moment',
    ordersWillAppearHere: 'Les commandes apparaîtront ici quand elles vous seront assignées',
    refresh: 'Actualiser',
    startProcessing: 'Commencer le Traitement',
    confirmOrder: 'Confirmer la Commande',
    cancelOrder: 'Annuler la Commande',
    close: 'Fermer',
    reference: 'Référence',
    wilaya: 'Wilaya',
    commune: 'Commune',
    qty: 'Qté',
    
    // Additional Agent Interface
    editStatus: 'Modifier Statut',
    allStatus: 'Tous Statuts',
    
    // Manual Assignment
    assign: 'Assigner',
    reassign: 'Réassigner',
    assignOrder: 'Assigner Commande',
    selectAgent: 'Sélectionner un agent pour assigner cette commande',
    noAgentsAvailable: 'Aucun agent disponible',
    agentOnline: 'En ligne',
    agentOffline: 'Hors ligne',
    agentCapacity: 'capacité',
    todaysOrders: 'Aujourd\'hui',
    orderAssignedSuccessfully: 'Commande assignée avec succès',
    failedToAssignOrder: 'Échec de l\'assignation de la commande',
    
    // Agent Assignment Dashboard
    agentAssignmentDashboard: 'Tableau de Bord d\'Affectation des Agents',
    triggerAssignment: 'Déclencher l\'Affectation',
    assigning: 'Affectation en cours...',
    bulkReassignment: 'Réaffectation en Masse',
    totalAgents: 'Total Agents',
    onlineAgents: 'Agents En Ligne',
    offlineAgents: 'Agents Hors Ligne',
    unassignedOrders: 'Commandes Non Assignées',
    assignedOrders: 'Commandes Assignées',
    agentWorkloads: 'Charges de Travail des Agents',
    code: 'Code',
    utilization: 'Utilisation',
    progress: 'Progrès',
    noAgentsFound: 'Aucun agent trouvé',
    howAssignmentWorks: 'Comment Fonctionne l\'Affectation',
    
    // Bulk Reassignment Modal
    bulkOrderReassignment: 'Réaffectation en Masse des Commandes',
    orderSelection: 'Sélection des Commandes',
    lastNOrdersGlobally: 'Dernières N commandes globalement (par date de création)',
    lastNOrdersFromSpecificAgents: 'Dernières N commandes d\'agents spécifiques',
    numberOfOrders: 'Nombre de commandes',
    sourceAgents: 'Agents Sources',
    targetAgentsDistribution: 'Agents Cibles et Distribution',
    addAgent: 'Ajouter Agent',
    remove: 'Supprimer',
    totalPercentage: 'Pourcentage Total',
    distributionPreviewRoundRobin: 'Aperçu de Distribution (Round-Robin)',
    assignmentPattern: 'Modèle d\'Affectation',
    alternating: 'Alternance',
    repeating: 'répétition',
    ordersWillBeDistributedAlternating: 'Les commandes seront distribuées selon ce modèle d\'alternance, pas en blocs',
    noTargetAgentsAdded: 'Aucun agent cible ajouté. Cliquez sur "Ajouter Agent" pour commencer.',
    clickAddAgentToStart: 'Cliquez sur "Ajouter Agent" pour commencer.',
    startBulkReassignment: 'Démarrer la Réaffectation en Masse',
    processing: 'Traitement en cours...',
    validationError: 'Erreur de Validation',
    orderCountMustBeGreaterThanZero: 'Le nombre de commandes doit être supérieur à 0',
    pleaseAddAtLeastOneTargetAgent: 'Veuillez ajouter au moins un agent cible',
    targetAgentPercentagesMustSumTo100: 'Les pourcentages des agents cibles doivent totaliser 100%',
    pleaseSelectAtLeastOneSourceAgent: 'Veuillez sélectionner au moins un agent source',
    loadingAgents: 'Chargement des agents...',
    then: 'puis',
    
    // Commission Settings
    commissionSettings: 'Paramètres de Commission',
    configureDefaultCommissionValues: 'Configurer les valeurs de commission par défaut et les seuils',
    baseCommission: 'Commission de Base',
    commissionForReaching1500Orders: 'Commission pour atteindre 1500+ commandes',
    baseCommissionDA: 'Commission de Base (DA)',
    confirmationRateBonuses: 'Bonus de Taux de Confirmation',
    additionalBonusesBasedOnConfirmationRates: 'Bonus supplémentaires basés sur les taux de confirmation',
    rate78Bonus: 'Bonus Taux 78%+ (DA)',
    rate80Bonus: 'Bonus Taux 80%+ (DA)',
    rate82Bonus: 'Bonus Taux 82%+ (DA)',
    upsellBonus: 'Bonus Upsell',
    bonusForAchievingUpsellTargets: 'Bonus pour atteindre les objectifs d\'upsell',
    upsellBonusDA: 'Bonus Upsell (DA)',
    minimumUpsellRate: 'Taux Upsell Minimum (%)',
    packBonuses: 'Bonus Pack',
    bonusesForPackQuantityAchievements: 'Bonus pour les réalisations de quantité de pack',
    pack2BonusDA: 'Bonus Pack 2 (DA)',
    pack4BonusDA: 'Bonus Pack 4 (DA)',
    minRate: 'Taux Min (%)',
    unsavedChanges: 'Modifications Non Sauvegardées',
    youHaveUnsavedChanges: 'Vous avez des modifications non sauvegardées. Cliquez sur "Sauvegarder" pour les appliquer.',
    clickSaveChangesToApply: 'Cliquez sur "Sauvegarder" pour les appliquer.',
    reset: 'Réinitialiser',
    saveChanges: 'Sauvegarder',
    saving: 'Sauvegarde...',
    commissionSettingsUpdatedSuccessfully: 'Paramètres de commission mis à jour avec succès !',
    failedToUpdateCommissionSettings: 'Échec de la mise à jour des paramètres de commission',
    errorFetchingCommissionSettings: 'Erreur lors de la récupération des paramètres de commission',
    settingsResetToLastSavedValues: 'Paramètres réinitialisés aux dernières valeurs sauvegardées',
    
    // Notifications
    notifications: 'Notifications',
    notification: 'Notification',
    unread: 'non lues',
    markAsRead: 'Marquer comme lu',
    markAllAsRead: 'Marquer tout comme lu',
    markAllRead: 'Tout marquer comme lu',
    noNotifications: 'Aucune notification',
    noNotificationsYet: 'Aucune notification pour le moment',
    viewAllNotifications: 'Voir toutes les notifications',
    newOrderAssigned: 'Nouvelle Commande Assignée',
    orderStatusUpdated: 'Statut de Commande Mis à Jour',
    shippingUpdate: 'Mise à Jour de Livraison',
    systemAlert: 'Alerte Système',
    orderAssignment: 'Assignation de Commande',
    orderUpdate: 'Mise à Jour de Commande',
    disconnectedFromServer: 'Déconnecté du serveur de notifications',
    connectedToServer: 'Connecté au serveur de notifications',
    notificationSettings: 'Paramètres de Notification',
    enableNotifications: 'Activer les Notifications',
    disableNotifications: 'Désactiver les Notifications',
    testNotification: 'Notification de Test',
    sendTestNotification: 'Envoyer une Notification de Test',
    notificationSent: 'Notification envoyée avec succès',
    failedToSendNotification: 'Échec de l\'envoi de la notification',
    loadingNotifications: 'Chargement des notifications...',
    refreshNotifications: 'Actualiser les Notifications',
    notificationHistory: 'Historique des Notifications',
    clearNotifications: 'Effacer les Notifications',
    notificationPreferences: 'Préférences de Notification',
    emailNotifications: 'Notifications Email',
    pushNotifications: 'Notifications Push',
    inAppNotifications: 'Notifications In-App',
    notificationTypes: 'Types de Notification',
    orderNotifications: 'Notifications de Commande',
    systemNotifications: 'Notifications Système',
    deliveryNotifications: 'Notifications de Livraison',
    agentNotifications: 'Notifications Agent',
    andMoreNotifications: 'et {count} notifications de plus...',
    minutesAgo: 'il y a quelques minutes',
    hoursAgo: 'il y a quelques heures',
    daysAgo: 'il y a quelques jours',
    justNow: 'à l\'instant',
    yesterday: 'hier',
    today: 'aujourd\'hui',
    thisWeek: 'cette semaine',
    lastWeek: 'la semaine dernière',
    thisMonth: 'ce mois-ci',
    lastMonth: 'le mois dernier',
    
    // Coordinateur Interface
    myProducts: 'Mes Produits',
    manageAndMonitorProducts: 'Gérer et surveiller vos produits assignés',
    assignedProducts: 'Produits Assignés',
    assignedAgents: 'Agents Assignés',
    fromAssignedProducts: 'Des produits assignés',
    acrossAllProducts: 'À travers tous les produits',
    searchProducts: 'Rechercher produits...',
    failedToLoadAssignedProducts: 'Échec du chargement de vos produits assignés',
    noProductsAssigned: 'Aucun Produit Assigné',
    contactAdministratorForAssignments: 'Vous n\'avez été assigné à aucun produit pour le moment. Contactez votre administrateur pour obtenir des assignations de produits.',
    noProductsFound: 'Aucun Produit Trouvé',
    noProductsMatchSearch: 'Aucun produit ne correspond à vos critères de recherche. Essayez d\'ajuster vos termes de recherche.',
    category: 'Catégorie',
    price: 'Prix',
    revenue: 'Chiffre d\'Affaires',
    active: 'Actif',
    inactive: 'Inactif',
    myOrders: 'Mes Commandes',
    manageOrdersForAssignedProducts: 'Gérer les commandes de vos produits assignés',
    agentAssignment: 'Attribution des Agents',
    manageAgentsForProducts: 'Gérer les agents pour vos produits assignés',
    orderDetailsModal: 'Détails de la Commande',
    viewOrderDetails: 'Voir les Détails de la Commande',
    retry: 'Réessayer',
    
    // Ticket System
    tickets: 'Tickets',
    ticket: 'Ticket',
    reportProblem: 'Signaler un Problème',
    reportAProblem: 'Signaler un Problème',
    createTicket: 'Créer un Ticket',
    ticketTitle: 'Titre du Ticket',
    ticketCategory: 'Catégorie',
    ticketPriority: 'Priorité',
    ticketDescription: 'Description',
    ticketStatus: 'Statut',
    ticketMessages: 'Messages',
    addMessage: 'Ajouter un Message',
    sendMessage: 'Envoyer le Message',
    assignTicket: 'Assigner le Ticket',
    assignTo: 'Assigner à',
    autoAssign: 'Attribution automatique',
    coordinator: 'Coordinateur',
    teamLeader: 'Chef d\'équipe',
    ticketAssignedTo: 'Assigné à',
    ticketReportedBy: 'Signalé par',
    ticketCreatedAt: 'Créé le',
    ticketUpdatedAt: 'Mis à jour le',
    ticketResolvedAt: 'Résolu le',
    ticketClosedAt: 'Fermé le',
    
    // Ticket Categories
    customerIssue: 'Problème Client',
    productIssue: 'Problème Produit',
    deliveryIssue: 'Problème de Livraison',
    systemIssue: 'Problème Système',
    paymentIssue: 'Problème de Paiement',
    otherIssue: 'Autre',
    
    // Ticket Priorities
    lowPriority: 'Faible',
    mediumPriority: 'Moyenne',
    highPriority: 'Élevée',
    urgentPriority: 'Urgente',
    
    // Ticket Statuses
    openTicket: 'Ouvert',
    inProgressTicket: 'En Cours',
    waitingResponse: 'En Attente de Réponse',
    resolvedTicket: 'Résolu',
    closedTicket: 'Fermé',
    
    // Ticket Actions
    viewTicket: 'Voir le Ticket',
    viewTickets: 'Voir les Tickets',
    updateTicketStatus: 'Mettre à Jour le Statut',
    closeTicket: 'Fermer le Ticket',
    reopenTicket: 'Rouvrir le Ticket',
    resolveTicket: 'Résoudre le Ticket',
    markInProgress: 'Marquer En Cours',
    waitingForResponse: 'En Attente de Réponse',
    
    // Ticket Messages
    noTicketsFound: 'Aucun ticket trouvé',
    noMessagesYet: 'Aucun message pour le moment',
    typeYourMessage: 'Tapez votre message...',
    ticketCreatedSuccessfully: 'Ticket créé avec succès',
    ticketUpdatedSuccessfully: 'Ticket mis à jour avec succès',
    messageAddedSuccessfully: 'Message ajouté avec succès',
    failedToCreateTicket: 'Échec de la création du ticket',
    failedToUpdateTicket: 'Échec de la mise à jour du ticket',
    failedToAddMessage: 'Échec de l\'ajout du message',
    
    // Ticket Dashboard
    myTickets: 'Mes Tickets',
    assignedTickets: 'Tickets Assignés',
    openTickets: 'Tickets Ouverts',
    resolvedTickets: 'Tickets Résolus',
    ticketStats: 'Statistiques des Tickets',
    activeTickets: 'Tickets Actifs',
    
    // Agent Orders Filters
    hideDeliveredOrders: 'Masquer les Commandes Livrées',
    noteTypes: 'Types de Notes',
    withNotesOnly: 'Avec Notes Seulement',
    lastNote: 'Dernière Note',
    selectNoteTypes: 'Sélectionner les Types de Notes',
    allNoteTypes: 'Tous les Types de Notes',
    clearSelection: 'Effacer la Sélection',
    selectShippingStatus: 'Sélectionner le Statut de Livraison',
    allShippingStatuses: 'Tous les Statuts de Livraison',
    selectStatuses: 'Sélectionner les Statuts',
    
    // Additional shipping status values
    inTransit: 'En Transit',
    outForDelivery: 'En Cours de Livraison',
    failedDelivery: 'Échec de Livraison',
  },
};

export function getTranslation(language: Language, key: keyof Translations): string {
  return translations[language][key];
}

export function createTranslator(language: Language) {
  return (key: keyof Translations) => getTranslation(language, key);
}