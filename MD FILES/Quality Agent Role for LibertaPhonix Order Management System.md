# 🗺️ COMPLETE IMPLEMENTATION ROADMAP
## Quality Agent Role for LibertaPhonix Order Management System

---

## 📋 REQUIREMENTS SUMMARY

**Confirmed Requirements:**
1. ✅ Dedicated `/quality-agent` dashboard with specialized interface
2. ✅ Full ticket management: Approve, Reject, Escalate, Close, Reopen
3. ✅ Custom workflow stages: Initial Review → Inspection → Decision → Resolution
4. ✅ Quality inspection notes with severity levels and mandatory notes
5. ✅ Quality Agents handle existing QUALITY_CONTROL tickets only (no creation)
6. ✅ Detailed metrics: Basic stats + severity analysis + trends + performance comparison
7. ✅ Extended Ticket model with quality-specific fields + metadata JSON

---

## 🏗️ PHASE 1: DATABASE SCHEMA UPDATES

### Files to Modify:
**`backend/prisma/schema.prisma`**

### Changes Required:

#### 1.1 Add QUALITY_AGENT to UserRole enum (Line ~304)
```prisma
enum UserRole {
  ADMIN
  TEAM_MANAGER
  COORDINATEUR
  AGENT_SUIVI
  AGENT_CALL_CENTER
  QUALITY_AGENT  // NEW
}
```

#### 1.2 Add Quality-Specific Enums (After TicketStatus enum ~580)
```prisma
enum QualityReviewStage {
  INITIAL_REVIEW
  INSPECTION
  DECISION
  RESOLUTION
}

enum QualitySeverity {
  MINOR
  MODERATE
  MAJOR
  CRITICAL
}

enum QualityDecision {
  APPROVED
  REJECTED
  ESCALATED
  PENDING
}
```

#### 1.3 Extend Ticket Model (Line ~504)
Add quality-specific fields:
```prisma
model Ticket {
  // ... existing fields ...
  
  // Quality Control Fields (NEW)
  qualityReviewStage  QualityReviewStage?
  qualitySeverity     QualitySeverity?
  qualityDecision     QualityDecision?
  qualityReviewerId   String?
  qualityReviewer     User? @relation("QualityReviewer", fields: [qualityReviewerId], references: [id])
  qualityReviewedAt   DateTime?
  qualityMetrics      Json?  // Flexible metrics tracking
  qualityNotes        String? @db.Text
  
  @@index([qualityReviewStage])
  @@index([qualitySeverity])
  @@index([qualityDecision])
  @@index([qualityReviewerId])
}
```

#### 1.4 Update User Model Relations (Line ~13)
```prisma
model User {
  // ... existing relations ...
  qualityReviewedTickets Ticket[] @relation("QualityReviewer")
}
```

#### 1.5 Create Migration
```bash
npx prisma migrate dev --name add_quality_agent_role
```

---

## 🔐 PHASE 2: BACKEND AUTHENTICATION & PERMISSIONS

### Files to Modify/Create:

#### 2.1 Update Auth Middleware
**`backend/src/common/middleware/auth.ts`** (Line ~138)

Add Quality Agent middleware:
```typescript
// Quality Agent middleware
export const requireQualityAgent = requireRole([
  UserRole.ADMIN,
  UserRole.TEAM_MANAGER,
  UserRole.QUALITY_AGENT
]);
```

#### 2.2 Update Auth Context Login Routing
**`frontend/src/lib/auth-context.tsx`** (Line ~106-119)

Add Quality Agent routing:
```typescript
if (userData.role === 'QUALITY_AGENT') {
  console.log('🔍 Redirecting to quality agent dashboard');
  router.push('/quality-agent');
}
```

---

## 🎯 PHASE 3: BACKEND QUALITY SERVICE LAYER

### Files to Create:

#### 3.1 Quality Service
**`backend/src/services/quality.service.ts`** (NEW FILE)

**Key Methods:**
- `getQualityTickets()` - Get all QUALITY_CONTROL tickets with filters
- `getQualityTicketById()` - Get single ticket with full details
- `updateQualityReviewStage()` - Update review stage
- `addQualityInspectionNote()` - Add structured quality note
- `approveQualityTicket()` - Approve with mandatory notes
- `rejectQualityTicket()` - Reject with mandatory reason
- `escalateQualityTicket()` - Escalate to Team Manager
- `getQualityStatistics()` - Get detailed metrics
- `getQualityTrends()` - Get quality trends over time
- `getAgentPerformanceComparison()` - Compare quality agents

**Statistics to Track:**
- Pending reviews count
- Completed today/week/month
- Approval rate percentage
- Average review time
- Issues by severity breakdown
- Resolution time by category
- Quality trends (daily/weekly/monthly)
- Agent performance metrics

---

## 🛣️ PHASE 4: BACKEND API ENDPOINTS

### Files to Create:

#### 4.1 Quality Controller
**`backend/src/modules/quality/quality.controller.ts`** (NEW FILE)

**Endpoints:**
```typescript
GET    /api/v1/quality/tickets              // List quality tickets
GET    /api/v1/quality/tickets/:id          // Get ticket details
PUT    /api/v1/quality/tickets/:id/stage    // Update review stage
POST   /api/v1/quality/tickets/:id/notes    // Add inspection note
PUT    /api/v1/quality/tickets/:id/approve  // Approve ticket
PUT    /api/v1/quality/tickets/:id/reject   // Reject ticket
PUT    /api/v1/quality/tickets/:id/escalate // Escalate ticket
GET    /api/v1/quality/statistics           // Get statistics
GET    /api/v1/quality/trends               // Get trends
GET    /api/v1/quality/performance          // Agent performance
```

#### 4.2 Quality Routes
**`backend/src/modules/quality/quality.routes.ts`** (NEW FILE)

Apply `requireQualityAgent` middleware to all routes.

#### 4.3 Register Routes
**`backend/src/app.ts`** (Update)

Add quality routes to main router:
```typescript
import qualityRoutes from './modules/quality/quality.routes';
app.use('/api/v1/quality', qualityRoutes);
```

---

## 💻 PHASE 5: FRONTEND TYPE DEFINITIONS

### Files to Modify/Create:

#### 5.1 Update Types
**`frontend/src/types/quality.ts`** (NEW FILE)

```typescript
export type QualityReviewStage = 'INITIAL_REVIEW' | 'INSPECTION' | 'DECISION' | 'RESOLUTION';
export type QualitySeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
export type QualityDecision = 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING';

export interface QualityTicket extends Ticket {
  qualityReviewStage?: QualityReviewStage;
  qualitySeverity?: QualitySeverity;
  qualityDecision?: QualityDecision;
  qualityReviewer?: User;
  qualityReviewedAt?: string;
  qualityMetrics?: QualityMetrics;
  qualityNotes?: string;
}

export interface QualityMetrics {
  reviewDuration?: number;
  issuesFound?: number;
  customerImpact?: string;
  costImpact?: number;
  [key: string]: any;
}

export interface QualityStatistics {
  pendingReviews: number;
  completedToday: number;
  completedWeek: number;
  completedMonth: number;
  approvalRate: number;
  averageReviewTime: number;
  issuesBySeverity: Record<QualitySeverity, number>;
  resolutionTimeByCategory: Record<string, number>;
}
```

---

## 🎨 PHASE 6: FRONTEND QUALITY DASHBOARD

### Files to Create:

#### 6.1 Quality Agent Layout
**`frontend/src/components/quality/quality-layout.tsx`** (NEW FILE)

Similar to AdminLayout but with quality-specific navigation:
- Dashboard
- Quality Tickets
- Statistics
- Reports

#### 6.2 Main Dashboard Page
**`frontend/src/app/quality-agent/page.tsx`** (NEW FILE)

**Components:**
- Statistics cards (pending, completed, approval rate, avg time)
- Issues by severity chart
- Recent quality tickets table
- Quick actions panel

#### 6.3 Quality Tickets List Page
**`frontend/src/app/quality-agent/tickets/page.tsx`** (NEW FILE)

**Features:**
- Filter by stage, severity, decision, date range
- Sort by priority, date, severity
- Pagination
- Quick actions (view, approve, reject)
- Bulk operations support

#### 6.4 Quality Ticket Review Page
**`frontend/src/app/quality-agent/tickets/[id]/page.tsx`** (NEW FILE)

**Sections:**
- Ticket header (order ref, customer, reporter)
- Review stage progress indicator
- Quality inspection form
  - Severity selector
  - Inspection notes textarea
  - Metrics input fields
- Action buttons (Approve, Reject, Escalate, Update Stage)
- Message history
- Quality notes history

#### 6.5 Statistics Page
**`frontend/src/app/quality-agent/statistics/page.tsx`** (NEW FILE)

**Visualizations:**
- Overview cards
- Issues by severity pie chart
- Resolution time by category bar chart
- Quality trends line chart (daily/weekly/monthly)
- Agent performance comparison table

---

## 🧩 PHASE 7: REUSABLE COMPONENTS

### Files to Create:

#### 7.1 Quality Ticket Card
**`frontend/src/components/quality/quality-ticket-card.tsx`**

Display ticket summary with quality-specific badges.

#### 7.2 Quality Review Form
**`frontend/src/components/quality/quality-review-form.tsx`**

Form for adding inspection notes and updating review stage.

#### 7.3 Quality Statistics Cards
**`frontend/src/components/quality/quality-stats-cards.tsx`**

Reusable stat cards for dashboard.

#### 7.4 Quality Severity Badge
**`frontend/src/components/quality/quality-severity-badge.tsx`**

Color-coded severity indicator.

#### 7.5 Quality Stage Progress
**`frontend/src/components/quality/quality-stage-progress.tsx`**

Visual progress indicator for review stages.

#### 7.6 Quality Charts
**`frontend/src/components/quality/quality-charts.tsx`**

Charts for statistics visualization.

---

## 🌐 PHASE 8: INTERNATIONALIZATION

### Files to Modify:

#### 8.1 Add Translations
**`frontend/src/lib/i18n.ts`**

**English Translations:**
```typescript
// Quality Agent
qualityAgent: 'Quality Agent',
qualityDashboard: 'Quality Dashboard',
qualityTickets: 'Quality Tickets',
qualityReview: 'Quality Review',
qualityStatistics: 'Quality Statistics',
qualityInspection: 'Quality Inspection',

// Review Stages
initialReview: 'Initial Review',
inspection: 'Inspection',
decision: 'Decision',
resolution: 'Resolution',

// Severity Levels
minorSeverity: 'Minor',
moderateSeverity: 'Moderate',
majorSeverity: 'Major',
criticalSeverity: 'Critical',

// Quality Actions
approveQuality: 'Approve',
rejectQuality: 'Reject',
escalateQuality: 'Escalate',
addInspectionNote: 'Add Inspection Note',
updateReviewStage: 'Update Review Stage',

// Quality Metrics
pendingReviews: 'Pending Reviews',
completedToday: 'Completed Today',
approvalRate: 'Approval Rate',
averageReviewTime: 'Average Review Time',
issuesBySeverity: 'Issues by Severity',
resolutionTimeByCategory: 'Resolution Time by Category',
qualityTrends: 'Quality Trends',
agentPerformance: 'Agent Performance',

// Quality Messages
qualityApprovedSuccessfully: 'Quality approved successfully',
qualityRejectedSuccessfully: 'Quality rejected successfully',
qualityEscalatedSuccessfully: 'Escalated to Team Manager',
inspectionNoteAdded: 'Inspection note added',
reviewStageUpdated: 'Review stage updated',
mandatoryNotesRequired: 'Notes are mandatory for this action',
```

**French Translations:**
```typescript
// Agent Qualité
qualityAgent: 'Agent Qualité',
qualityDashboard: 'Tableau de Bord Qualité',
qualityTickets: 'Tickets Qualité',
qualityReview: 'Révision Qualité',
qualityStatistics: 'Statistiques Qualité',
qualityInspection: 'Inspection Qualité',

// Étapes de Révision
initialReview: 'Révision Initiale',
inspection: 'Inspection',
decision: 'Décision',
resolution: 'Résolution',

// Niveaux de Gravité
minorSeverity: 'Mineur',
moderateSeverity: 'Modéré',
majorSeverity: 'Majeur',
criticalSeverity: 'Critique',

// Actions Qualité
approveQuality: 'Approuver',
rejectQuality: 'Rejeter',
escalateQuality: 'Escalader',
addInspectionNote: 'Ajouter Note d\'Inspection',
updateReviewStage: 'Mettre à Jour l\'Étape',

// Métriques Qualité
pendingReviews: 'Révisions en Attente',
completedToday: 'Complétées Aujourd\'hui',
approvalRate: 'Taux d\'Approbation',
averageReviewTime: 'Temps Moyen de Révision',
issuesBySeverity: 'Problèmes par Gravité',
resolutionTimeByCategory: 'Temps de Résolution par Catégorie',
qualityTrends: 'Tendances Qualité',
agentPerformance: 'Performance des Agents',

// Messages Qualité
qualityApprovedSuccessfully: 'Qualité approuvée avec succès',
qualityRejectedSuccessfully: 'Qualité rejetée avec succès',
qualityEscalatedSuccessfully: 'Escaladé au Responsable d\'Équipe',
inspectionNoteAdded: 'Note d\'inspection ajoutée',
reviewStageUpdated: 'Étape de révision mise à jour',
mandatoryNotesRequired: 'Les notes sont obligatoires pour cette action',
```

---

## 🔄 PHASE 9: PERMISSION INHERITANCE

### Implementation Details:

#### 9.1 Admin Access
- Full access to all quality features
- Can view all quality tickets
- Can override quality decisions
- Access to system-wide quality analytics

#### 9.2 Team Manager Access
- All Quality Agent permissions
- Can handle escalated tickets
- Can reassign quality tickets
- Can view team quality statistics
- Can manage quality agents

#### 9.3 Quality Agent Access
- View QUALITY_CONTROL tickets only
- Update review stages
- Add inspection notes
- Approve/Reject/Escalate tickets
- View personal statistics

---

## 📝 COMPLETE FILE LIST

### Backend Files to Create:
1. `backend/src/services/quality.service.ts`
2. `backend/src/modules/quality/quality.controller.ts`
3. `backend/src/modules/quality/quality.routes.ts`
4. `backend/prisma/migrations/XXXXXX_add_quality_agent_role/migration.sql`

### Backend Files to Modify:
1. `backend/prisma/schema.prisma` (Add role, enums, fields)
2. `backend/src/common/middleware/auth.ts` (Add requireQualityAgent)
3. `backend/src/app.ts` (Register quality routes)
4. `backend/src/services/ticket.service.ts` (Update for quality fields)

### Frontend Files to Create:
1. `frontend/src/types/quality.ts`
2. `frontend/src/components/quality/quality-layout.tsx`
3. `frontend/src/components/quality/quality-ticket-card.tsx`
4. `frontend/src/components/quality/quality-review-form.tsx`
5. `frontend/src/components/quality/quality-stats-cards.tsx`
6. `frontend/src/components/quality/quality-severity-badge.tsx`
7. `frontend/src/components/quality/quality-stage-progress.tsx`
8. `frontend/src/components/quality/quality-charts.tsx`
9. `frontend/src/app/quality-agent/page.tsx`
10. `frontend/src/app/quality-agent/layout.tsx`
11. `frontend/src/app/quality-agent/tickets/page.tsx`
12. `frontend/src/app/quality-agent/tickets/[id]/page.tsx`
13. `frontend/src/app/quality-agent/statistics/page.tsx`

### Frontend Files to Modify:
1. `frontend/src/lib/auth-context.tsx` (Add quality agent routing)
2. `frontend/src/lib/i18n.ts` (Add translations)

---

## ✅ TESTING CHECKLIST

### Backend Testing:
- [ ] Quality Agent can login and get JWT token
- [ ] Quality endpoints return only QUALITY_CONTROL tickets
- [ ] Approve/Reject actions require mandatory notes
- [ ] Escalation creates notification for Team Manager
- [ ] Statistics calculations are accurate
- [ ] Admin/Team Manager can access all quality features
- [ ] Regular agents cannot access quality endpoints

### Frontend Testing:
- [ ] Quality Agent redirects to `/quality-agent` on login
- [ ] Dashboard displays correct statistics
- [ ] Tickets list shows only QUALITY_CONTROL category
- [ ] Review form validates required fields
- [ ] Stage progression works correctly
- [ ] Charts render with real data
- [ ] Translations work in both languages
- [ ] Mobile responsive design

---

## 🎯 SUCCESS CRITERIA

1. ✅ QUALITY_AGENT role added to database
2. ✅ Quality agents can only see QUALITY_CONTROL tickets
3. ✅ Full workflow: Initial Review → Inspection → Decision → Resolution
4. ✅ Approve/Reject with mandatory notes
5. ✅ Escalation to Team Manager with notifications
6. ✅ Detailed statistics dashboard
7. ✅ Admin and Team Manager inherit all permissions
8. ✅ Full French/English translation support
9. ✅ Mobile-responsive UI
10. ✅ Type-safe implementation throughout

---

**This roadmap provides a complete, step-by-step implementation plan. Ready to proceed with implementation when you confirm!**