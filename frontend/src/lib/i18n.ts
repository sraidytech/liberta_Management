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
  },
};

export function getTranslation(language: Language, key: keyof Translations): string {
  return translations[language][key];
}

export function createTranslator(language: Language) {
  return (key: keyof Translations) => getTranslation(language, key);
}