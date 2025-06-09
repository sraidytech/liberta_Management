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
  },
};

export function getTranslation(language: Language, key: keyof Translations): string {
  return translations[language][key];
}

export function createTranslator(language: Language) {
  return (key: keyof Translations) => getTranslation(language, key);
}