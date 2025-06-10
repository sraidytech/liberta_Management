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
  },
};

export function getTranslation(language: Language, key: keyof Translations): string {
  return translations[language][key];
}

export function createTranslator(language: Language) {
  return (key: keyof Translations) => getTranslation(language, key);
}