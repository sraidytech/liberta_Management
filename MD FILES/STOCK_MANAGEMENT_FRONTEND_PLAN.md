# 📱 Stock Management Frontend - Implementation Plan

## 🎨 ULTRA CLEAN, SIMPLE & MODERN UI/UX Design

### Design Principles
- ✨ **Minimalist**: Clean white backgrounds, subtle shadows, ample spacing
- 🎯 **Focused**: One primary action per screen
- 📊 **Data-First**: Clear metrics and visual hierarchy
- 🌐 **Fully Translatable**: All text uses inline translations (EN/FR)
- 📱 **Responsive**: Mobile-first approach
- ⚡ **Fast**: Optimistic updates, skeleton loaders

---

## 📁 File Structure

```
frontend/src/app/admin/stock/
├── page.tsx                    # Main dashboard
├── products/
│   └── page.tsx               # Product management
├── lots/
│   └── page.tsx               # Lot management
├── movements/
│   └── page.tsx               # Movement history
├── alerts/
│   └── page.tsx               # Stock alerts
└── reports/
    └── page.tsx               # Reports & analytics

frontend/src/components/stock/
├── stock-dashboard.tsx         # Dashboard overview
├── stock-stats-cards.tsx       # Metric cards
├── product-list.tsx            # Product table
├── product-form-modal.tsx      # Add/Edit product
├── lot-list.tsx                # Lot table
├── lot-form-modal.tsx          # Add/Edit lot
├── movement-list.tsx           # Movement history
├── alert-list.tsx              # Alert cards
├── report-filters.tsx          # Report filter form
└── stock-charts.tsx            # Charts & graphs
```

---

## 🎨 UI Components Design

### 1. Stock Dashboard (`/admin/stock`)

**Layout**: Clean grid with 4 metric cards + 2 sections

```
┌─────────────────────────────────────────────────┐
│  📦 Stock Management                    [+ New] │
├─────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 125  │  │ $45K │  │  3   │  │  1   │       │
│  │Items │  │Value │  │ Low  │  │ Out  │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
├─────────────────────────────────────────────────┤
│  Recent Movements          Active Alerts        │
│  ┌─────────────────┐      ┌─────────────────┐  │
│  │ IN  +100 units  │      │ ⚠️ Low Stock    │  │
│  │ OUT  -50 units  │      │ 🔴 Out of Stock │  │
│  └─────────────────┘      └─────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Features**:
- 4 metric cards with icons and trend indicators
- Recent movements timeline (last 10)
- Active alerts with severity badges
- Quick action buttons (Receive Lot, Adjust Stock)

### 2. Product Management (`/admin/stock/products`)

**Layout**: Table with search, filters, and actions

```
┌─────────────────────────────────────────────────┐
│  Products                          [+ Add Product]│
├─────────────────────────────────────────────────┤
│  🔍 Search...    [Category ▼]  [Status ▼]      │
├─────────────────────────────────────────────────┤
│  SKU      │ Name        │ Stock │ Status │ ⚙️  │
│  LPX-001  │ Product A   │  150  │ ✓ OK   │ ... │
│  LPX-002  │ Product B   │   45  │ ⚠️ Low │ ... │
│  LPX-003  │ Product C   │    0  │ 🔴 Out │ ... │
└─────────────────────────────────────────────────┘
```

**Features**:
- Real-time search
- Category and status filters
- Stock level indicators (color-coded)
- Inline actions (Edit, View Details)
- Bulk actions support

### 3. Lot Management (`/admin/stock/lots`)

**Layout**: Card grid with lot details

```
┌─────────────────────────────────────────────────┐
│  Lots                              [+ Receive Lot]│
├─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐            │
│  │ LOT-2024-001 │  │ LOT-2024-002 │            │
│  │ Product A    │  │ Product B    │            │
│  │ 500 units    │  │ 300 units    │            │
│  │ Exp: 30 days │  │ Exp: 15 days │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```

**Features**:
- Card-based layout for visual scanning
- Expiry countdown with color coding
- FEFO indicator (lots sorted by expiry)
- Quick receive lot form

### 4. Movement History (`/admin/stock/movements`)

**Layout**: Timeline view with filters

```
┌─────────────────────────────────────────────────┐
│  Stock Movements                                 │
├─────────────────────────────────────────────────┤
│  [Date Range]  [Type ▼]  [Product ▼]           │
├─────────────────────────────────────────────────┤
│  ● IN    +100 units  │ Product A │ 2h ago      │
│  ● OUT    -50 units  │ Product B │ 5h ago      │
│  ● ADJ    +10 units  │ Product C │ 1d ago      │
└─────────────────────────────────────────────────┘
```

**Features**:
- Timeline visualization
- Movement type badges (color-coded)
- Date range picker
- Export to CSV

### 5. Alerts (`/admin/stock/alerts`)

**Layout**: Alert cards with priority

```
┌─────────────────────────────────────────────────┐
│  Stock Alerts                    [Mark All Read] │
├─────────────────────────────────────────────────┤
│  🔴 CRITICAL                                     │
│  ┌─────────────────────────────────────────┐   │
│  │ Out of Stock - Product A                │   │
│  │ 0 units available                       │   │
│  │ [Resolve]                               │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ⚠️ WARNING                                      │
│  ┌─────────────────────────────────────────┐   │
│  │ Low Stock - Product B                   │   │
│  │ 45 units (threshold: 100)               │   │
│  │ [Resolve]                               │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Features**:
- Severity-based grouping
- One-click resolution
- Auto-refresh every 30s
- Desktop notifications

### 6. Reports (`/admin/stock/reports`)

**Layout**: Report selector with filters

```
┌─────────────────────────────────────────────────┐
│  Stock Reports                                   │
├─────────────────────────────────────────────────┤
│  Report Type: [Stock Level ▼]                   │
│  Date Range:  [Last 30 Days ▼]                  │
│  Warehouse:   [All ▼]                           │
│  [Generate Report]  [Export CSV]                │
├─────────────────────────────────────────────────┤
│  📊 Report Results                               │
│  ┌─────────────────────────────────────────┐   │
│  │ [Chart/Table View]                      │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Features**:
- 6 report types
- Interactive charts
- Table view with sorting
- CSV export
- Print-friendly format

---

## 🎨 Color Scheme

```css
/* Primary Colors */
--primary: #3B82F6      /* Blue - Actions */
--success: #10B981      /* Green - Success/In Stock */
--warning: #F59E0B      /* Amber - Low Stock */
--danger: #EF4444       /* Red - Out of Stock/Critical */
--info: #6366F1         /* Indigo - Info */

/* Neutral Colors */
--background: #FFFFFF   /* White */
--surface: #F9FAFB      /* Light Gray */
--border: #E5E7EB       /* Border Gray */
--text: #111827         /* Dark Gray */
--text-muted: #6B7280   /* Medium Gray */

/* Status Colors */
--in-stock: #10B981
--low-stock: #F59E0B
--out-of-stock: #EF4444
--expiring-soon: #F97316
```

---

## 🌐 Translation Pattern

All components use inline translations:

```typescript
const t = {
  en: {
    stockManagement: 'Stock Management',
    totalProducts: 'Total Products',
    addProduct: 'Add Product',
    // ... more translations
  },
  fr: {
    stockManagement: 'Gestion de Stock',
    totalProducts: 'Total Produits',
    addProduct: 'Ajouter Produit',
    // ... more translations
  }
};

// Usage
<h1>{t[language].stockManagement}</h1>
```

---

## 📊 Key Features Per Page

### Dashboard
- ✅ 4 metric cards (Products, Value, Low Stock, Out of Stock)
- ✅ Recent movements timeline (last 10)
- ✅ Active alerts widget
- ✅ Quick actions (Receive Lot, Adjust Stock)
- ✅ Auto-refresh every 60s

### Products
- ✅ Search by SKU/name
- ✅ Filter by category, status
- ✅ Sort by name, stock, value
- ✅ Add/Edit/Delete products
- ✅ View stock levels
- ✅ Set thresholds

### Lots
- ✅ Card-based layout
- ✅ FEFO sorting (expiry date)
- ✅ Receive new lot form
- ✅ Edit lot details
- ✅ View movement history per lot
- ✅ Expiry countdown

### Movements
- ✅ Timeline view
- ✅ Filter by type, date, product
- ✅ Movement details modal
- ✅ Export to CSV
- ✅ Pagination

### Alerts
- ✅ Severity-based grouping
- ✅ One-click resolution
- ✅ Alert details
- ✅ Auto-refresh
- ✅ Desktop notifications

### Reports
- ✅ 6 report types
- ✅ Date range picker
- ✅ Interactive charts
- ✅ Table view
- ✅ CSV export
- ✅ Print view

---

## 🔄 Data Flow

```
Component → API Service → Backend API → Database
    ↓
  State Update
    ↓
  UI Re-render
```

### API Service Pattern

```typescript
// frontend/src/services/stock.service.ts
export const stockService = {
  // Products
  getProducts: (filters) => api.get('/stock/products', { params: filters }),
  createProduct: (data) => api.post('/stock/products', data),
  
  // Lots
  getLots: (filters) => api.get('/stock/lots', { params: filters }),
  createLot: (data) => api.post('/stock/lots', data),
  
  // Movements
  getMovements: (filters) => api.get('/stock/movements', { params: filters }),
  
  // Alerts
  getAlerts: () => api.get('/stock/alerts'),
  resolveAlert: (id) => api.put(`/stock/alerts/${id}/resolve`),
  
  // Reports
  getReport: (type, filters) => api.get(`/stock/reports/${type}`, { params: filters }),
  exportReport: (type, filters) => api.post('/stock/reports/export', { type, ...filters }),
  
  // Dashboard
  getDashboardStats: () => api.get('/stock/dashboard/stats'),
};
```

---

## 🚀 Implementation Priority

### Phase 1: Core Pages (2-3 hours)
1. ✅ Stock Dashboard
2. ✅ Product Management
3. ✅ Lot Management

### Phase 2: Features (2-3 hours)
4. ✅ Movement History
5. ✅ Alerts
6. ✅ Reports

### Phase 3: Polish (1-2 hours)
7. ✅ Loading states
8. ✅ Error handling
9. ✅ Responsive design
10. ✅ Animations

---

## 📝 Component Examples

### Metric Card Component

```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: 'blue' | 'green' | 'amber' | 'red';
}

const MetricCard = ({ title, value, icon, trend, color }: MetricCardProps) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {trend && (
          <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </p>
        )}
      </div>
      <div className={`p-4 rounded-full bg-${color}-50`}>
        {icon}
      </div>
    </div>
  </div>
);
```

### Alert Card Component

```typescript
interface AlertCardProps {
  alert: {
    id: string;
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    currentQuantity: number;
    threshold: number;
  };
  onResolve: (id: string) => void;
}

const AlertCard = ({ alert, onResolve }: AlertCardProps) => {
  const severityColors = {
    INFO: 'bg-blue-50 border-blue-200 text-blue-800',
    WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
    CRITICAL: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{alert.message}</h4>
          <p className="text-sm mt-1">
            {alert.currentQuantity} units (threshold: {alert.threshold})
          </p>
        </div>
        <button
          onClick={() => onResolve(alert.id)}
          className="px-3 py-1 text-sm bg-white rounded hover:bg-gray-50"
        >
          Resolve
        </button>
      </div>
    </div>
  );
};
```

---

## 🎯 Success Criteria

- ✅ All pages load in < 1 second
- ✅ All text is translatable (EN/FR)
- ✅ Mobile responsive (320px+)
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Clean, modern design
- ✅ Intuitive navigation
- ✅ Real-time updates
- ✅ Error handling
- ✅ Loading states

---

## 📦 Next Steps

1. Create API service layer
2. Build dashboard page
3. Implement product management
4. Add lot management
5. Create movement history
6. Build alerts system
7. Implement reports
8. Add navigation links
9. Test all features
10. Deploy to production

**Estimated Total Time**: 6-8 hours for complete frontend

---

*This plan provides a complete blueprint for implementing the stock management frontend with an ultra-clean, modern UI/UX design.*