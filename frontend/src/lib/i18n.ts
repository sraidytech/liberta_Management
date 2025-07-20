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
  
  // Agent Notes Analytics
  notesActivityAnalysis: string;
  agentNotesPerformance: string;
  notesFrequencyPatterns: string;
  peakActivityHours: string;
  noteQualityIndicators: string;
  timeBetweenNotes: string;
  timeToFirstNote: string;
  responseTimeAnalysis: string;
  activityConsistency: string;
  productivityRanking: string;
  totalNotes: string;
  notesPerDay: string;
  notesPerOrder: string;
  averageNoteLength: string;
  averageTimeBetweenNotes: string;
  averageTimeToFirstNote: string;
  peakActivityHour: string;
  noteQualityScore: string;
  activeDaysWithNotes: string;
  hourlyDistribution: string;
  dailyTrend: string;
  responseTimeMetrics: string;
  fastestResponse: string;
  slowestResponse: string;
  averageResponse: string;
  globalPeakHour: string;
  activeAgentsWithNotes: string;
  averageNotesPerAgent: string;
  averageQualityScore: string;
  topNotesPerformers: string;
  notesActivitySummary: string;
  hoursLabel: string;
  minutesLabel: string;
  charactersLabel: string;
  consistencyScore: string;
  qualityScore: string;
  productivityRank: string;
  noNotesActivity: string;
  noNotesFound: string;
  agentHasNoNotes: string;
  periodDays: string;
  
  // Missing translations for placeholders and common UI elements
  enterEcoManagerToken: string;
  briefDescription: string;
  nameOrPhone: string;
  agentNamePlaceholder: string;
  searchByReference: string;
  yourEmail: string;
  networkError: string;
  connectionTestFailed: string;
  pickupRequested: string;
  pickedUp: string;
  allShippingStatus: string;
  allAgents: string;
  allRoles: string;
  administrators: string;
  managers: string;
  coordinators: string;
  followUpAgents: string;
  followUpAgent: string;
  allStores: string;
  allResources: string;
  orderResource: string;
  userResource: string;
  storeResource: string;
  assignmentResource: string;
  commissionResource: string;
  enterResourceId: string;
  enterUserId: string;
  searchAgents: string;
  searchByNameOrCode: string;
  loadingSystemInfo: string;
  loadingSchedulerStatus: string;
  loadingApiConfig: string;
  loadingNoteTypes: string;
  loadingWilayaSettings: string;
  loadingStores: string;
  savingChanges: string;
  testingConnection: string;
  startingScheduler: string;
  stoppingScheduler: string;
  syncingEcoManager: string;
  syncingShippingStatus: string;
  creatingStore: string;
  updatingStore: string;
  failedToFetchAgents: string;
  failedToFetchUsers: string;
  failedToFetchStores: string;
  failedToSaveStore: string;
  failedToDeleteStore: string;
  failedToToggleStoreStatus: string;
  failedToTestConnection: string;
  noAuthToken: string;
  invalidEmailOrPassword: string;
  currentPasswordRequired: string;
  newPasswordRequired: string;
  passwordTooShort: string;
  passwordsDoNotMatch: string;
  passwordChangeError: string;
  networkErrorTryAgain: string;
  passwordChanged: string;
  changeMyPassword: string;
  changePassword: string;
  forUser: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  egNatuStore: string;
  egNatu: string;
  ecoManagerApiUrl: string;
  enterApiToken: string;
  testConnection: string;
  testing: string;
  createStore: string;
  editStore: string;
  addNewStore: string;
  updateStore: string;
  never: string;
  lastSync: string;
  toggle: string;
  deleteStore: string;
  confirmDelete: string;
  areYouSure: string;
  thisActionCannotBeUndone: string;
  yes: string;
  no: string;
  agentPortal: string;
  manageYourOrders: string;
  allPriorities: string;
  allCategories: string;
  searchByTitle: string;
  sendingMessage: string;
  addingMessage: string;
  updatingTicketStatus: string;
  creatingTicket: string;
  loadingTickets: string;
  ticketCreatedFor: string;
  min: string;
  max: string;
  agentCodeOrName: string;
  customDateRange: string;
  startDate: string;
  endDate: string;
  advancedFilters: string;
  clearFilters: string;
  dateRange: string;
  store: string;
  revenueRange: string;
  loadingReports: string;
  loadingError: string;
  retryLoading: string;
  salesReports: string;
  agentPerformance: string;
  geographicAnalytics: string;
  customerAnalytics: string;
  totalSales: string;
  averageOrderValue: string;
  activeWilayas: string;
  deliveredOrdersOnly: string;
  perOrder: string;
  regionsCovered: string;
  orderAnalysisByWilaya: string;
  yearPerformance: string;
  revenueByStore: string;
  salesDistribution: string;
  revenueByStatus: string;
  performanceByStatus: string;
  topProducts: string;
  bestSellers: string;
  monthlyComparison: string;
  activeCustomers: string;
  newCustomers: string;
  returningCustomers: string;
  retentionRate: string;
  inPeriod: string;
  customerRetentionMetrics: string;
  noDataAvailable: string;
  selectedPeriod: string;
  dailyEvolution: string;
  stores: string;
  successRate: string;
  successful: string;
  errors: string;
  connectionIssue: string;
  lastError: string;
  failed: string;
  requestCount: string;
  successCount: string;
  errorCount: string;
  lastTestResults: string;
  isRunning: string;
  lastRun: string;
  nextRun: string;
  startScheduler: string;
  stopScheduler: string;
  syncEcoManagerNow: string;
  syncShippingStatusNow: string;
  schedulerStatus: string;
  backgroundJobs: string;
  ecoManagerSync: string;
  shippingStatusSync: string;
  manualSync: string;
  lastSyncResults: string;
  syncedOrders: string;
  updatedOrders: string;
  syncErrors: string;
  nextSyncTimes: string;
  systemInformation: string;
  nodeEnvironment: string;
  production: string;
  development: string;
  uptime: string;
  memoryUsage: string;
  cpuUsage: string;
  databaseStatus: string;
  redisStatus: string;
  connected: string;
  disconnected: string;
  apiVersion: string;
  buildVersion: string;
  lastDeployment: string;
  serverHealth: string;
  healthy: string;
  unhealthy: string;
  noteTypeName: string;
  enterNoteTypeName: string;
  noteTypeCreated: string;
  noteTypeUpdated: string;
  noteTypeDeleted: string;
  failedToCreateNoteType: string;
  failedToUpdateNoteType: string;
  failedToDeleteNoteType: string;
  failedToToggleNoteType: string;
  noteTypeRequired: string;
  wilayaSettings: string;
  initializeSettings: string;
  saveAllSettings: string;
  wilayaSettingsInitialized: string;
  failedToInitializeSettings: string;
  failedToSaveSettings: string;
  settingsSaved: string;
  wilayaAlreadyExists: string;
  addWilaya: string;
  deliveryTime: string;
  days: string;
  isActive: string;
  removeWilaya: string;
  onlineUsers: string;
  usersOnline: string;
  role: string;
  lastSeen: string;
  admin: string;
  agentSuivi: string;
  callCenterAgent: string;
  loadingUsers: string;
  failedToLoadUsers: string;
  searchByTitleOrderRef: string;
  describeTheProblem: string;
  assigneeSelection: string;
  autoAssignTicket: string;
  manualAssignTicket: string;
  selectAssignee: string;
  ticketStatusUpdated: string;
  failedToUpdateTicketStatus: string;
  messageAdded: string;
  loadingProducts: string;
  failedToLoadProducts: string;
  contactAdminForAssignments: string;
  adjustSearchTerms: string;
  busyAgents: string;
  availableAgents: string;
  available: string;
  utilizationRate: string;
  assignmentSummary: string;
  coordinatorDashboard: string;
  overviewOfAssignedProducts: string;
  myAgents: string;
  quickActions: string;
  viewMyOrders: string;
  viewAssignedProducts: string;
  manageAgents: string;
  performanceOverview: string;
  completionRate: string;
  myNotifications: string;
  manageYourNotifications: string;
  noAuthTokenFound: string;
  failedToFetchDashboardStats: string;
  
  // Product Filtering for Bulk Reassignment
  productFiltering: string;
  enableProductFiltering: string;
  disableProductFiltering: string;
  filterByProducts: string;
  searchByProductTitle: string;
  searchBySku: string;
  selectedProducts: string;
  addProduct: string;
  removeProduct: string;
  productMatchingLogic: string;
  ordersContainingAllProducts: string;
  ordersContainingAnyProducts: string;
  allSelectedProducts: string;
  anySelectedProducts: string;
  noProductsSelected: string;
  enterProductTitle: string;
  enterSku: string;
  productTitle: string;
  sku: string;
  ordersWithProducts: string;
  failedToFetchProducts: string;
  availableProducts: string;
  enabled: string;
  logic: string;
  
  // Missing translations found in agent/orders
  showingOrdersFiltered: string;
  pageOf: string;
  hideDelivered: string;
  noShippingStatusesFound: string;
  tryAdjustingSearchOrFilters: string;
  ordersWillAppearWhenAssigned: string;
  lastNoteDetails: string;
  noDetailsProvided: string;
  
  // Missing translations for admin/settings
  schedulerSettings: string;
  maystroApiSettings: string;
  systemSettings: string;
  wilayaDeliveryTimes: string;
  activeJobs: string;
  activeConnections: string;
  noteTypesManagement: string;
  manageNoteTypesDescription: string;
  addNoteType: string;
  addNote: string;
  addNoteOnly: string;
  addNoteWithoutStatusChange: string;
  selectNoteType: string;
  customNote: string;
  additionalNotes: string;
  totalNoteTypes: string;
  areYouSureDeleteNoteType: string;
  configureMaxDeliveryDays: string;
  configuredWilayas: string;
  uniqueWilayasInOrders: string;
  averageDeliveryDays: string;
  deliveryTimeSettings: string;
  wilayasConfigured: string;
  noWilayaSettings: string;
  initializeFromExistingOrders: string;
  wilayaName: string;
  maxDeliveryDays: string;
  missingWilayas: string;
  wilayasExistInOrdersButNotConfigured: string;
  
  // Missing translations for admin/tickets
  manageTicketsFromAgents: string;
  searchByTitleOrderRefCustomer: string;
  statusAndPriority: string;
  priority: string;
  
  // Additional system and UI translations
  systemConfiguration: string;
  updateSystemSettings: string;
  systemMonitoringActive: string;
  automatedBackupsDaily: string;
  securityUpdatesAutomatic: string;
  contactSystemAdmin: string;
  uptimeFormatted: string;
  primary: string;
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
    
    // Agent Notes Analytics
    notesActivityAnalysis: 'Notes Activity Analysis',
    agentNotesPerformance: 'Agent Notes Performance',
    notesFrequencyPatterns: 'Notes Frequency Patterns',
    peakActivityHours: 'Peak Activity Hours',
    noteQualityIndicators: 'Note Quality Indicators',
    timeBetweenNotes: 'Time Between Notes',
    timeToFirstNote: 'Time to First Note',
    responseTimeAnalysis: 'Response Time Analysis',
    activityConsistency: 'Activity Consistency',
    productivityRanking: 'Productivity Ranking',
    totalNotes: 'Total Notes',
    notesPerDay: 'Notes per Day',
    notesPerOrder: 'Notes per Order',
    averageNoteLength: 'Average Note Length',
    averageTimeBetweenNotes: 'Average Time Between Notes',
    averageTimeToFirstNote: 'Average Time to First Note',
    peakActivityHour: 'Peak Activity Hour',
    noteQualityScore: 'Note Quality Score',
    activeDaysWithNotes: 'Active Days with Notes',
    hourlyDistribution: 'Hourly Distribution',
    dailyTrend: 'Daily Trend',
    responseTimeMetrics: 'Response Time Metrics',
    fastestResponse: 'Fastest Response',
    slowestResponse: 'Slowest Response',
    averageResponse: 'Average Response',
    globalPeakHour: 'Global Peak Hour',
    activeAgentsWithNotes: 'Active Agents with Notes',
    averageNotesPerAgent: 'Average Notes per Agent',
    averageQualityScore: 'Average Quality Score',
    topNotesPerformers: 'Top Notes Performers',
    notesActivitySummary: 'Notes Activity Summary',
    hoursLabel: 'hours',
    minutesLabel: 'minutes',
    charactersLabel: 'characters',
    consistencyScore: 'Consistency Score',
    qualityScore: 'Quality Score',
    productivityRank: 'Productivity Rank',
    noNotesActivity: 'No Notes Activity',
    noNotesFound: 'No notes found',
    agentHasNoNotes: 'Agent has no notes',
    periodDays: 'Period Days',
    
    // Missing translations for placeholders and common UI elements
    enterEcoManagerToken: 'Enter your EcoManager API token',
    briefDescription: 'Brief description of the problem',
    nameOrPhone: 'Name or phone',
    agentNamePlaceholder: 'Agent name',
    searchByReference: 'Search by reference, customer name, or phone...',
    yourEmail: 'votre@email.com',
    networkError: 'Network error',
    connectionTestFailed: 'Connection test failed',
    pickupRequested: 'Pickup Requested',
    pickedUp: 'Picked Up',
    allShippingStatus: 'All Shipping Status',
    allAgents: 'All Agents',
    allRoles: 'All roles',
    administrators: 'Administrators',
    managers: 'Managers',
    coordinators: 'Coordinators',
    followUpAgents: 'Follow-up Agents',
    followUpAgent: 'Follow-up Agent',
    allStores: 'All stores',
    allResources: 'All Resources',
    orderResource: 'Order',
    userResource: 'User',
    storeResource: 'Store',
    assignmentResource: 'Assignment',
    commissionResource: 'Commission',
    enterResourceId: 'Enter resource ID',
    enterUserId: 'Enter user ID',
    searchAgents: 'Search agents...',
    searchByNameOrCode: 'Search by name or code...',
    loadingSystemInfo: 'Loading system information...',
    loadingSchedulerStatus: 'Loading scheduler status...',
    loadingApiConfig: 'Loading API configuration...',
    loadingNoteTypes: 'Loading note types...',
    loadingWilayaSettings: 'Loading wilaya settings...',
    loadingStores: 'Loading stores...',
    savingChanges: 'Saving...',
    testingConnection: 'Testing...',
    startingScheduler: 'Starting...',
    stoppingScheduler: 'Stopping...',
    syncingEcoManager: 'Syncing...',
    syncingShippingStatus: 'Syncing...',
    creatingStore: 'Saving...',
    updatingStore: 'Saving...',
    failedToFetchAgents: 'Failed to fetch agents',
    failedToFetchUsers: 'Failed to fetch users',
    failedToFetchStores: 'Failed to fetch stores',
    failedToSaveStore: 'Failed to save store',
    failedToDeleteStore: 'Failed to delete store',
    failedToToggleStoreStatus: 'Failed to toggle store status',
    failedToTestConnection: 'Failed to test connection',
    noAuthToken: 'No authentication token found',
    invalidEmailOrPassword: 'Invalid email or password',
    currentPasswordRequired: 'Current password is required',
    newPasswordRequired: 'New password is required',
    passwordTooShort: 'Password must be at least 6 characters long',
    passwordsDoNotMatch: 'Passwords do not match',
    passwordChangeError: 'Error changing password',
    networkErrorTryAgain: 'Network error. Please try again.',
    passwordChanged: 'Password changed successfully',
    changeMyPassword: 'Change My Password',
    changePassword: 'Change Password',
    forUser: 'For',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    egNatuStore: 'e.g., NATU Store',
    egNatu: 'e.g., NATU',
    ecoManagerApiUrl: 'https://natureldz.ecomanager.dz/api/shop/v2',
    enterApiToken: 'Enter your EcoManager API token',
    testConnection: 'Test Connection',
    testing: 'Testing...',
    createStore: 'Create Store',
    editStore: 'Edit Store',
    addNewStore: 'Add New Store',
    updateStore: 'Update Store',
    never: 'Never',
    lastSync: 'Last Sync',
    toggle: 'Toggle',
    deleteStore: 'Delete',
    confirmDelete: 'Confirm Delete',
    areYouSure: 'Are you sure?',
    thisActionCannotBeUndone: 'This action cannot be undone',
    yes: 'Yes',
    no: 'No',
    agentPortal: 'Agent Portal',
    manageYourOrders: 'Manage your orders',
    allPriorities: 'All Priorities',
    allCategories: 'All Categories',
    searchByTitle: 'Search by title, order reference, or customer...',
    sendingMessage: 'Sending...',
    addingMessage: 'Adding...',
    updatingTicketStatus: 'Updating...',
    creatingTicket: 'Creating...',
    loadingTickets: 'Loading...',
    ticketCreatedFor: 'Ticket created for order',
    min: 'Min',
    max: 'Max',
    agentCodeOrName: 'Agent code or name',
    customDateRange: 'Custom',
    startDate: 'Start Date',
    endDate: 'End Date',
    advancedFilters: 'Advanced filters',
    clearFilters: 'Clear',
    dateRange: 'Date Range',
    store: 'Store',
    revenueRange: 'Revenue Range',
    loadingReports: 'Loading Reports',
    loadingError: 'Loading Error',
    retryLoading: 'Retry',
    salesReports: 'Sales Reports',
    agentPerformance: 'Agent Performance',
    geographicAnalytics: 'Geographic Analytics',
    customerAnalytics: 'Customer Analytics',
    totalSales: 'Total Sales',
    averageOrderValue: 'Average Order Value',
    activeWilayas: 'Active Wilayas',
    deliveredOrdersOnly: 'Delivered orders only',
    perOrder: 'Per order',
    regionsCovered: 'Regions covered',
    orderAnalysisByWilaya: 'Order analysis by wilaya and commune',
    yearPerformance: 'Year performance',
    revenueByStore: 'Revenue by Store',
    salesDistribution: 'Sales distribution',
    revenueByStatus: 'Revenue by Status',
    performanceByStatus: 'Performance by status',
    topProducts: 'Top Products',
    bestSellers: 'Best sellers',
    monthlyComparison: 'Monthly Comparison',
    activeCustomers: 'Active Customers',
    newCustomers: 'New Customers',
    returningCustomers: 'Returning Customers',
    retentionRate: 'Retention Rate',
    inPeriod: 'In period',
    customerRetentionMetrics: 'Customer retention and behavior metrics',
    noDataAvailable: 'No data available',
    selectedPeriod: 'Selected period',
    dailyEvolution: 'Daily evolution',
    stores: 'Stores',
    successRate: 'Success Rate',
    successful: 'Successful',
    errors: 'Errors',
    connectionIssue: 'Connection Issue',
    lastError: 'Last Error',
    failed: 'Failed',
    requestCount: 'Request Count',
    successCount: 'Success Count',
    errorCount: 'Error Count',
    lastTestResults: 'Last Test Results',
    isRunning: 'Running',
    lastRun: 'Last Run',
    nextRun: 'Next Run',
    startScheduler: 'Start Scheduler',
    stopScheduler: 'Stop Scheduler',
    syncEcoManagerNow: 'Sync EcoManager Now',
    syncShippingStatusNow: 'Sync Shipping Status Now',
    schedulerStatus: 'Scheduler Status',
    backgroundJobs: 'Background Jobs & Scheduler',
    ecoManagerSync: 'EcoManager Sync',
    shippingStatusSync: 'Shipping Status Sync',
    manualSync: 'Manual Sync',
    lastSyncResults: 'Last Sync Results',
    syncedOrders: 'Synced Orders',
    updatedOrders: 'Updated Orders',
    syncErrors: 'Sync Errors',
    nextSyncTimes: 'Next Sync Times',
    systemInformation: 'System Information',
    nodeEnvironment: 'Node Environment',
    production: 'PROD',
    development: 'DEV',
    uptime: 'Uptime',
    memoryUsage: 'Memory Usage',
    cpuUsage: 'CPU Usage',
    databaseStatus: 'Database Status',
    redisStatus: 'Redis Status',
    connected: 'Connected',
    disconnected: 'Disconnected',
    apiVersion: 'API Version',
    buildVersion: 'Build Version',
    lastDeployment: 'Last Deployment',
    serverHealth: 'Server Health',
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    noteTypeName: 'Note Type Name',
    enterNoteTypeName: 'Enter note type name...',
    noteTypeCreated: 'Note type created successfully',
    noteTypeUpdated: 'Note type updated successfully',
    noteTypeDeleted: 'Note type deleted successfully',
    failedToCreateNoteType: 'Failed to create note type',
    failedToUpdateNoteType: 'Failed to update note type',
    failedToDeleteNoteType: 'Failed to delete note type',
    failedToToggleNoteType: 'Failed to toggle note type status',
    noteTypeRequired: 'Note type name is required',
    wilayaSettings: 'Wilaya Delivery Times',
    initializeSettings: 'Initialize Settings',
    saveAllSettings: 'Save All Settings',
    wilayaSettingsInitialized: 'Wilaya settings initialized successfully',
    failedToInitializeSettings: 'Failed to initialize wilaya settings',
    failedToSaveSettings: 'Failed to save settings',
    settingsSaved: 'Settings saved successfully',
    wilayaAlreadyExists: 'This wilaya already exists in settings',
    addWilaya: 'Add Wilaya',
    deliveryTime: 'Delivery Time',
    days: 'days',
    isActive: 'Active',
    removeWilaya: 'Remove',
    onlineUsers: 'Online Users',
    usersOnline: 'users online',
    role: 'Role',
    lastSeen: 'Last seen',
    admin: 'Admin',
    agentSuivi: 'Agent Suivi',
    callCenterAgent: 'Call Center Agent',
    loadingUsers: 'Loading...',
    failedToLoadUsers: 'Failed to load online users',
    searchByTitleOrderRef: 'Search by title, order reference, or customer...',
    describeTheProblem: 'Describe the problem in detail...',
    assigneeSelection: 'Assignee Selection',
    autoAssignTicket: 'Auto-assign',
    manualAssignTicket: 'Manual assignment',
    selectAssignee: 'Select assignee',
    ticketStatusUpdated: 'Ticket updated successfully',
    failedToUpdateTicketStatus: 'Failed to update ticket',
    messageAdded: 'Message added successfully',
    loadingProducts: 'Loading...',
    failedToLoadProducts: 'Failed to load your assigned products',
    contactAdminForAssignments: 'You have not been assigned to any products yet. Contact your administrator to get product assignments.',
    adjustSearchTerms: 'Try adjusting your search terms.',
    busyAgents: 'Busy',
    availableAgents: 'Available',
    available: 'Available',
    utilizationRate: 'Utilization rate',
    assignmentSummary: 'Assignment Summary',
    coordinatorDashboard: 'Coordinator Dashboard',
    overviewOfAssignedProducts: 'Overview of your assigned products and orders',
    myAgents: 'My Agents',
    quickActions: 'Quick Actions',
    viewMyOrders: 'View My Orders',
    viewAssignedProducts: 'View assigned products',
    manageAgents: 'Manage agents',
    performanceOverview: 'Performance Overview',
    completionRate: 'Completion Rate',
    myNotifications: 'My Notifications',
    manageYourNotifications: 'Manage your notifications',
    noAuthTokenFound: 'No authentication token found',
    failedToFetchDashboardStats: 'Failed to fetch dashboard stats',
    
    // Product Filtering for Bulk Reassignment
    productFiltering: 'Product Filtering',
    enableProductFiltering: 'Enable Product Filtering',
    disableProductFiltering: 'Disable Product Filtering',
    filterByProducts: 'Filter by Products',
    searchByProductTitle: 'Search by product title...',
    searchBySku: 'Search by SKU...',
    selectedProducts: 'Selected Products',
    addProduct: 'Add Product',
    removeProduct: 'Remove Product',
    productMatchingLogic: 'Product Matching Logic',
    ordersContainingAllProducts: 'Orders containing ALL selected products',
    ordersContainingAnyProducts: 'Orders containing ANY selected products',
    allSelectedProducts: 'ALL selected products',
    anySelectedProducts: 'ANY selected products',
    noProductsSelected: 'No products selected',
    enterProductTitle: 'Enter product title...',
    enterSku: 'Enter SKU...',
    productTitle: 'Product Title',
    sku: 'SKU',
    ordersWithProducts: 'orders with these products',
    failedToFetchProducts: 'Failed to fetch products',
    availableProducts: 'Available Products',
    enabled: 'Enabled',
    logic: 'Logic',
    
    // Missing translations found in agent/orders
    showingOrdersFiltered: 'Showing {count} orders (filtered by product assignments)',
    pageOf: 'Page {current} of {total}',
    hideDelivered: 'Hide Delivered',
    noShippingStatusesFound: 'No shipping statuses found',
    tryAdjustingSearchOrFilters: 'Try adjusting your search or filters to find more orders',
    ordersWillAppearWhenAssigned: 'Orders will appear here when assigned to you',
    lastNoteDetails: 'Last Note Details',
    noDetailsProvided: 'No details provided',
    
    // Missing translations for admin/settings
    schedulerSettings: 'Scheduler Settings',
    maystroApiSettings: 'Maystro API Settings',
    systemSettings: 'System Settings',
    wilayaDeliveryTimes: 'Wilaya Delivery Times',
    activeJobs: 'Active Jobs',
    activeConnections: 'Active Connections',
    noteTypesManagement: 'Note Types Management',
    manageNoteTypesDescription: 'Manage the note types that agents can select when updating orders',
    addNoteType: 'Add Note Type',
    addNote: 'Add Note',
    addNoteOnly: 'Add Note Only',
    addNoteWithoutStatusChange: 'Add note without changing status',
    selectNoteType: 'Select note type...',
    customNote: 'Custom Note',
    additionalNotes: 'Additional Notes',
    totalNoteTypes: 'Total Note Types',
    areYouSureDeleteNoteType: 'Are you sure you want to delete the note type "{name}"? This action cannot be undone.',
    configureMaxDeliveryDays: 'Configure maximum delivery days for each wilaya. Orders exceeding these limits will be highlighted.',
    configuredWilayas: 'Configured Wilayas',
    uniqueWilayasInOrders: 'Unique Wilayas in Orders',
    averageDeliveryDays: 'Average Delivery Days',
    deliveryTimeSettings: 'Delivery Time Settings',
    wilayasConfigured: 'wilayas configured',
    noWilayaSettings: 'No Wilaya Settings',
    initializeFromExistingOrders: 'Initialize settings from existing orders or add wilayas manually.',
    wilayaName: 'Wilaya Name',
    maxDeliveryDays: 'Max Delivery Days',
    missingWilayas: 'Missing Wilayas',
    wilayasExistInOrdersButNotConfigured: 'These wilayas exist in your orders but don\'t have delivery settings configured:',
    
    // Missing translations for admin/tickets
    manageTicketsFromAgents: 'Manage support tickets from agents',
    searchByTitleOrderRefCustomer: 'Search by title, order reference, or customer...',
    statusAndPriority: 'Status & Priority',
    priority: 'Priority',
    
    // Additional system and UI translations
    systemConfiguration: 'System Configuration',
    updateSystemSettings: 'Update system settings',
    systemMonitoringActive: 'System monitoring is active 24/7',
    automatedBackupsDaily: 'Automated backups are performed daily',
    securityUpdatesAutomatic: 'Security updates are applied automatically',
    contactSystemAdmin: 'For technical support, contact your system administrator',
    uptimeFormatted: '{days} days, {hours} hours, {minutes} minutes',
    primary: 'Primary',
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
    
    // Agent Notes Analytics
    notesActivityAnalysis: 'Analyse d\'Activité des Notes',
    agentNotesPerformance: 'Performance des Notes d\'Agent',
    notesFrequencyPatterns: 'Modèles de Fréquence des Notes',
    peakActivityHours: 'Heures de Pointe d\'Activité',
    noteQualityIndicators: 'Indicateurs de Qualité des Notes',
    timeBetweenNotes: 'Temps Entre les Notes',
    timeToFirstNote: 'Temps Jusqu\'à la Première Note',
    responseTimeAnalysis: 'Analyse du Temps de Réponse',
    activityConsistency: 'Cohérence d\'Activité',
    productivityRanking: 'Classement de Productivité',
    totalNotes: 'Total des Notes',
    notesPerDay: 'Notes par Jour',
    notesPerOrder: 'Notes par Commande',
    averageNoteLength: 'Longueur Moyenne des Notes',
    averageTimeBetweenNotes: 'Temps Moyen Entre les Notes',
    averageTimeToFirstNote: 'Temps Moyen Jusqu\'à la Première Note',
    peakActivityHour: 'Heure de Pointe d\'Activité',
    noteQualityScore: 'Score de Qualité des Notes',
    activeDaysWithNotes: 'Jours Actifs avec Notes',
    hourlyDistribution: 'Distribution Horaire',
    dailyTrend: 'Tendance Quotidienne',
    responseTimeMetrics: 'Métriques de Temps de Réponse',
    fastestResponse: 'Réponse la Plus Rapide',
    slowestResponse: 'Réponse la Plus Lente',
    averageResponse: 'Réponse Moyenne',
    globalPeakHour: 'Heure de Pointe Globale',
    activeAgentsWithNotes: 'Agents Actifs avec Notes',
    averageNotesPerAgent: 'Moyenne de Notes par Agent',
    averageQualityScore: 'Score de Qualité Moyen',
    topNotesPerformers: 'Meilleurs Performeurs de Notes',
    notesActivitySummary: 'Résumé d\'Activité des Notes',
    hoursLabel: 'heures',
    minutesLabel: 'minutes',
    charactersLabel: 'caractères',
    consistencyScore: 'Score de Cohérence',
    qualityScore: 'Score de Qualité',
    productivityRank: 'Rang de Productivité',
    noNotesActivity: 'Aucune Activité de Notes',
    noNotesFound: 'Aucune note trouvée',
    agentHasNoNotes: 'L\'agent n\'a aucune note',
    periodDays: 'Jours de Période',
    
    // Missing translations for placeholders and common UI elements
    enterEcoManagerToken: 'Entrez votre token API EcoManager',
    briefDescription: 'Brève description du problème',
    nameOrPhone: 'Nom ou téléphone',
    agentNamePlaceholder: 'Nom de l\'agent',
    searchByReference: 'Rechercher par référence, nom du client ou téléphone...',
    yourEmail: 'votre@email.com',
    networkError: 'Erreur réseau',
    connectionTestFailed: 'Test de connexion échoué',
    pickupRequested: 'Ramassage Demandé',
    pickedUp: 'Ramassé',
    allShippingStatus: 'Tous les Statuts de Livraison',
    allAgents: 'Tous les Agents',
    allRoles: 'Tous les rôles',
    administrators: 'Administrateurs',
    managers: 'Gestionnaires',
    coordinators: 'Coordinateurs',
    followUpAgents: 'Agents de suivi',
    followUpAgent: 'Agent de suivi',
    allStores: 'Tous les magasins',
    allResources: 'Toutes les Ressources',
    orderResource: 'Commande',
    userResource: 'Utilisateur',
    storeResource: 'Magasin',
    assignmentResource: 'Attribution',
    commissionResource: 'Commission',
    enterResourceId: 'Entrez l\'ID de ressource',
    enterUserId: 'Entrez l\'ID utilisateur',
    searchAgents: 'Rechercher agents...',
    searchByNameOrCode: 'Rechercher par nom ou code...',
    loadingSystemInfo: 'Chargement des informations système...',
    loadingSchedulerStatus: 'Chargement du statut du planificateur...',
    loadingApiConfig: 'Chargement de la configuration API...',
    loadingNoteTypes: 'Chargement des types de notes...',
    loadingWilayaSettings: 'Chargement des paramètres de wilaya...',
    loadingStores: 'Chargement des magasins...',
    savingChanges: 'Sauvegarde...',
    testingConnection: 'Test en cours...',
    startingScheduler: 'Démarrage...',
    stoppingScheduler: 'Arrêt...',
    syncingEcoManager: 'Synchronisation...',
    syncingShippingStatus: 'Synchronisation...',
    creatingStore: 'Sauvegarde...',
    updatingStore: 'Sauvegarde...',
    failedToFetchAgents: 'Échec de récupération des agents',
    failedToFetchUsers: 'Échec de récupération des utilisateurs',
    failedToFetchStores: 'Échec de récupération des magasins',
    failedToSaveStore: 'Échec de sauvegarde du magasin',
    failedToDeleteStore: 'Échec de suppression du magasin',
    failedToToggleStoreStatus: 'Échec de basculement du statut du magasin',
    failedToTestConnection: 'Échec du test de connexion',
    noAuthToken: 'Aucun token d\'authentification trouvé',
    invalidEmailOrPassword: 'Email ou mot de passe invalide',
    currentPasswordRequired: 'Le mot de passe actuel est requis',
    newPasswordRequired: 'Le nouveau mot de passe est requis',
    passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
    passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
    passwordChangeError: 'Erreur lors du changement de mot de passe',
    networkErrorTryAgain: 'Erreur réseau. Veuillez réessayer.',
    passwordChanged: 'Mot de passe changé avec succès',
    changeMyPassword: 'Changer Mon Mot de Passe',
    changePassword: 'Changer le Mot de Passe',
    forUser: 'Pour',
    currentPassword: 'Mot de Passe Actuel',
    newPassword: 'Nouveau Mot de Passe',
    confirmPassword: 'Confirmer le Mot de Passe',
    egNatuStore: 'ex: Magasin NATU',
    egNatu: 'ex: NATU',
    ecoManagerApiUrl: 'https://natureldz.ecomanager.dz/api/shop/v2',
    enterApiToken: 'Entrez votre token API EcoManager',
    testConnection: 'Tester la Connexion',
    testing: 'Test en cours...',
    createStore: 'Créer le Magasin',
    editStore: 'Modifier le Magasin',
    addNewStore: 'Ajouter un Nouveau Magasin',
    updateStore: 'Mettre à Jour le Magasin',
    never: 'Jamais',
    lastSync: 'Dernière Sync',
    toggle: 'Basculer',
    deleteStore: 'Supprimer',
    confirmDelete: 'Confirmer la Suppression',
    areYouSure: 'Êtes-vous sûr ?',
    thisActionCannotBeUndone: 'Cette action ne peut pas être annulée',
    yes: 'Oui',
    no: 'Non',
    agentPortal: 'Portail Agent',
    manageYourOrders: 'Gérez vos commandes',
    allPriorities: 'Toutes les Priorités',
    allCategories: 'Toutes les Catégories',
    searchByTitle: 'Rechercher par titre, référence de commande ou client...',
    sendingMessage: 'Envoi...',
    addingMessage: 'Ajout...',
    updatingTicketStatus: 'Mise à jour...',
    creatingTicket: 'Création...',
    loadingTickets: 'Chargement...',
    ticketCreatedFor: 'Ticket créé pour la commande',
    min: 'Min',
    max: 'Max',
    agentCodeOrName: 'Code agent ou nom',
    customDateRange: 'Personnalisé',
    startDate: 'Date de Début',
    endDate: 'Date de Fin',
    advancedFilters: 'Filtres avancés',
    clearFilters: 'Effacer',
    dateRange: 'Plage de Dates',
    store: 'Magasin',
    revenueRange: 'Plage de Revenus',
    loadingReports: 'Chargement des Rapports',
    loadingError: 'Erreur de Chargement',
    retryLoading: 'Réessayer',
    salesReports: 'Rapports de Ventes',
    agentPerformance: 'Performance des Agents',
    geographicAnalytics: 'Analyses Géographiques',
    customerAnalytics: 'Analyses Clients',
    totalSales: 'Ventes Totales',
    averageOrderValue: 'Valeur Moyenne de Commande',
    activeWilayas: 'Wilayas Actives',
    deliveredOrdersOnly: 'Commandes livrées uniquement',
    perOrder: 'Par commande',
    regionsCovered: 'Régions couvertes',
    orderAnalysisByWilaya: 'Analyse des commandes par wilaya et commune',
    yearPerformance: 'Performance annuelle',
    revenueByStore: 'Revenus par Magasin',
    salesDistribution: 'Distribution des ventes',
    revenueByStatus: 'Revenus par Statut',
    performanceByStatus: 'Performance par statut',
    topProducts: 'Meilleurs Produits',
    bestSellers: 'Meilleures ventes',
    monthlyComparison: 'Comparaison Mensuelle',
    activeCustomers: 'Clients Actifs',
    newCustomers: 'Nouveaux Clients',
    returningCustomers: 'Clients Récurrents',
    retentionRate: 'Taux de Rétention',
    inPeriod: 'Dans la période',
    customerRetentionMetrics: 'Métriques de rétention et comportement client',
    noDataAvailable: 'Aucune donnée disponible',
    selectedPeriod: 'Période sélectionnée',
    dailyEvolution: 'Évolution quotidienne',
    stores: 'Magasins',
    successRate: 'Taux de Succès',
    successful: 'Réussi',
    errors: 'Erreurs',
    connectionIssue: 'Problème de Connexion',
    lastError: 'Dernière Erreur',
    failed: 'Échoué',
    requestCount: 'Nombre de Requêtes',
    successCount: 'Nombre de Succès',
    errorCount: 'Nombre d\'Erreurs',
    lastTestResults: 'Derniers Résultats de Test',
    isRunning: 'En cours',
    lastRun: 'Dernière Exécution',
    nextRun: 'Prochaine Exécution',
    startScheduler: 'Démarrer le Planificateur',
    stopScheduler: 'Arrêter le Planificateur',
    syncEcoManagerNow: 'Synchroniser EcoManager Maintenant',
    syncShippingStatusNow: 'Synchroniser le Statut de Livraison Maintenant',
    schedulerStatus: 'Statut du Planificateur',
    backgroundJobs: 'Tâches en Arrière-plan et Planificateur',
    ecoManagerSync: 'Synchronisation EcoManager',
    shippingStatusSync: 'Synchronisation Statut de Livraison',
    manualSync: 'Synchronisation Manuelle',
    lastSyncResults: 'Derniers Résultats de Sync',
    syncedOrders: 'Commandes Synchronisées',
    updatedOrders: 'Commandes Mises à Jour',
    syncErrors: 'Erreurs de Sync',
    nextSyncTimes: 'Prochaines Heures de Sync',
    systemInformation: 'Informations Système',
    nodeEnvironment: 'Environnement Node',
    production: 'PROD',
    development: 'DEV',
    uptime: 'Temps de Fonctionnement',
    memoryUsage: 'Utilisation Mémoire',
    cpuUsage: 'Utilisation CPU',
    databaseStatus: 'Statut Base de Données',
    redisStatus: 'Statut Redis',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    apiVersion: 'Version API',
    buildVersion: 'Version Build',
    lastDeployment: 'Dernier Déploiement',
    serverHealth: 'Santé du Serveur',
    healthy: 'Sain',
    unhealthy: 'Malsain',
    noteTypeName: 'Nom du Type de Note',
    enterNoteTypeName: 'Entrez le nom du type de note...',
    noteTypeCreated: 'Type de note créé avec succès',
    noteTypeUpdated: 'Type de note mis à jour avec succès',
    noteTypeDeleted: 'Type de note supprimé avec succès',
    failedToCreateNoteType: 'Échec de création du type de note',
    failedToUpdateNoteType: 'Échec de mise à jour du type de note',
    failedToDeleteNoteType: 'Échec de suppression du type de note',
    failedToToggleNoteType: 'Échec de basculement du statut du type de note',
    noteTypeRequired: 'Le nom du type de note est requis',
    wilayaSettings: 'Temps de Livraison par Wilaya',
    initializeSettings: 'Initialiser les Paramètres',
    saveAllSettings: 'Sauvegarder Tous les Paramètres',
    wilayaSettingsInitialized: 'Paramètres de wilaya initialisés avec succès',
    failedToInitializeSettings: 'Échec d\'initialisation des paramètres de wilaya',
    failedToSaveSettings: 'Échec de sauvegarde des paramètres',
    settingsSaved: 'Paramètres sauvegardés avec succès',
    wilayaAlreadyExists: 'Cette wilaya existe déjà dans les paramètres',
    addWilaya: 'Ajouter Wilaya',
    deliveryTime: 'Temps de Livraison',
    days: 'jours',
    isActive: 'Actif',
    removeWilaya: 'Supprimer',
    onlineUsers: 'Utilisateurs En Ligne',
    usersOnline: 'utilisateurs en ligne',
    role: 'Rôle',
    lastSeen: 'Vu pour la dernière fois',
    admin: 'Admin',
    agentSuivi: 'Agent Suivi',
    callCenterAgent: 'Agent Call Center',
    loadingUsers: 'Chargement...',
    failedToLoadUsers: 'Échec de chargement des utilisateurs en ligne',
    searchByTitleOrderRef: 'Rechercher par titre, référence de commande ou client...',
    describeTheProblem: 'Décrivez le problème en détail...',
    assigneeSelection: 'Sélection du Destinataire',
    autoAssignTicket: 'Attribution automatique',
    manualAssignTicket: 'Attribution manuelle',
    selectAssignee: 'Sélectionner le destinataire',
    ticketStatusUpdated: 'Ticket mis à jour avec succès',
    failedToUpdateTicketStatus: 'Échec de mise à jour du ticket',
    messageAdded: 'Message ajouté avec succès',
    loadingProducts: 'Chargement...',
    failedToLoadProducts: 'Échec de chargement de vos produits assignés',
    contactAdminForAssignments: 'Vous n\'avez été assigné à aucun produit pour le moment. Contactez votre administrateur pour obtenir des assignations de produits.',
    adjustSearchTerms: 'Essayez d\'ajuster vos termes de recherche.',
    busyAgents: 'Occupés',
    availableAgents: 'Disponibles',
    available: 'Disponible',
    utilizationRate: 'Taux d\'utilisation',
    assignmentSummary: 'Résumé des Attributions',
    coordinatorDashboard: 'Tableau de Bord Coordinateur',
    overviewOfAssignedProducts: 'Vue d\'ensemble de vos produits et commandes assignés',
    myAgents: 'Mes Agents',
    quickActions: 'Actions Rapides',
    viewMyOrders: 'Voir Mes Commandes',
    viewAssignedProducts: 'Voir les produits assignés',
    manageAgents: 'Gérer les agents',
    performanceOverview: 'Aperçu des Performances',
    completionRate: 'Taux de Completion',
    myNotifications: 'Mes Notifications',
    manageYourNotifications: 'Gérez vos notifications',
    noAuthTokenFound: 'Aucun token d\'authentification trouvé',
    failedToFetchDashboardStats: 'Échec de récupération des statistiques du tableau de bord',
    
    // Product Filtering for Bulk Reassignment
    productFiltering: 'Filtrage par Produits',
    enableProductFiltering: 'Activer le Filtrage par Produits',
    disableProductFiltering: 'Désactiver le Filtrage par Produits',
    filterByProducts: 'Filtrer par Produits',
    searchByProductTitle: 'Rechercher par titre de produit...',
    searchBySku: 'Rechercher par SKU...',
    selectedProducts: 'Produits Sélectionnés',
    addProduct: 'Ajouter Produit',
    removeProduct: 'Supprimer Produit',
    productMatchingLogic: 'Logique de Correspondance des Produits',
    ordersContainingAllProducts: 'Commandes contenant TOUS les produits sélectionnés',
    ordersContainingAnyProducts: 'Commandes contenant N\'IMPORTE QUEL produit sélectionné',
    allSelectedProducts: 'TOUS les produits sélectionnés',
    anySelectedProducts: 'N\'IMPORTE QUEL produit sélectionné',
    noProductsSelected: 'Aucun produit sélectionné',
    enterProductTitle: 'Entrez le titre du produit...',
    enterSku: 'Entrez le SKU...',
    productTitle: 'Titre du Produit',
    sku: 'SKU',
    ordersWithProducts: 'commandes avec ces produits',
    failedToFetchProducts: 'Échec de récupération des produits',
    availableProducts: 'Produits Disponibles',
    enabled: 'Activé',
    logic: 'Logique',
    
    // Missing translations found in agent/orders
    showingOrdersFiltered: 'Affichage de {count} commandes (filtrées par assignations de produits)',
    pageOf: 'Page {current} sur {total}',
    hideDelivered: 'Masquer Livrées',
    noShippingStatusesFound: 'Aucun statut de livraison trouvé',
    tryAdjustingSearchOrFilters: 'Essayez d\'ajuster votre recherche ou vos filtres pour trouver plus de commandes',
    ordersWillAppearWhenAssigned: 'Les commandes apparaîtront ici quand elles vous seront assignées',
    lastNoteDetails: 'Détails de la Dernière Note',
    noDetailsProvided: 'Aucun détail fourni',
    
    // Missing translations for admin/settings
    schedulerSettings: 'Paramètres du Planificateur',
    maystroApiSettings: 'Paramètres API Maystro',
    systemSettings: 'Paramètres Système',
    wilayaDeliveryTimes: 'Temps de Livraison par Wilaya',
    activeJobs: 'Tâches Actives',
    activeConnections: 'Connexions Actives',
    noteTypesManagement: 'Gestion des Types de Notes',
    manageNoteTypesDescription: 'Gérer les types de notes que les agents peuvent sélectionner lors de la mise à jour des commandes',
    addNoteType: 'Ajouter Type de Note',
    addNote: 'Ajouter Note',
    addNoteOnly: 'Ajouter Note Seulement',
    addNoteWithoutStatusChange: 'Ajouter une note sans changer le statut',
    selectNoteType: 'Sélectionner un type de note...',
    customNote: 'Note Personnalisée',
    additionalNotes: 'Notes Supplémentaires',
    totalNoteTypes: 'Total Types de Notes',
    areYouSureDeleteNoteType: 'Êtes-vous sûr de vouloir supprimer le type de note "{name}" ? Cette action ne peut pas être annulée.',
    configureMaxDeliveryDays: 'Configurer les jours de livraison maximum pour chaque wilaya. Les commandes dépassant ces limites seront mises en évidence.',
    configuredWilayas: 'Wilayas Configurées',
    uniqueWilayasInOrders: 'Wilayas Uniques dans les Commandes',
    averageDeliveryDays: 'Jours de Livraison Moyens',
    deliveryTimeSettings: 'Paramètres de Temps de Livraison',
    wilayasConfigured: 'wilayas configurées',
    noWilayaSettings: 'Aucun Paramètre de Wilaya',
    initializeFromExistingOrders: 'Initialiser les paramètres à partir des commandes existantes ou ajouter des wilayas manuellement.',
    wilayaName: 'Nom de la Wilaya',
    maxDeliveryDays: 'Jours de Livraison Max',
    missingWilayas: 'Wilayas Manquantes',
    wilayasExistInOrdersButNotConfigured: 'Ces wilayas existent dans vos commandes mais n\'ont pas de paramètres de livraison configurés :',
    
    // Missing translations for admin/tickets
    manageTicketsFromAgents: 'Gérer les tickets de support des agents',
    searchByTitleOrderRefCustomer: 'Rechercher par titre, référence de commande ou client...',
    statusAndPriority: 'Statut et Priorité',
    priority: 'Priorité',
    
    // Additional system and UI translations
    systemConfiguration: 'Configuration Système',
    updateSystemSettings: 'Mettre à jour les paramètres système',
    systemMonitoringActive: 'La surveillance du système est active 24h/24 et 7j/7',
    automatedBackupsDaily: 'Les sauvegardes automatisées sont effectuées quotidiennement',
    securityUpdatesAutomatic: 'Les mises à jour de sécurité sont appliquées automatiquement',
    contactSystemAdmin: 'Pour le support technique, contactez votre administrateur système',
    uptimeFormatted: '{days} jours, {hours} heures, {minutes} minutes',
    primary: 'Principal',
  },
};

export function getTranslation(language: Language, key: keyof Translations): string {
  return translations[language][key];
}

export function createTranslator(language: Language) {
  return (key: keyof Translations) => getTranslation(language, key);
}