# 🎯 MEDIA BUYER MODULE - IMPLEMENTATION ROADMAP

## 📋 PROJECT OVERVIEW

**Module:** Media Buyer Management System  
**New Role:** `MEDIA_BUYER`  
**Access:** ADMIN, TEAM_MANAGER, MEDIA_BUYER  
**Languages:** French / English (inline translations in components)  
**Currency:** USD input → Manual DZD exchange rate conversion

---

## 🗄️ PHASE 1: DATABASE SCHEMA

### 1.1 Update UserRole Enum
Add `MEDIA_BUYER` to the existing UserRole enum in Prisma schema.

### 1.2 New Database Models

| Model | Purpose |
|-------|---------|
| **AdSource** | Configurable ad platforms (Facebook, Google, TikTok, Instagram, Snapchat, Influencer, Other) with name, slug, icon, color, sortOrder |
| **MediaBuyingEntry** | Main data entry - date/date-range, source, spend, leads, currency, exchange rate, optional store/product links, JSON metadata |
| **MediaBuyingBudget** | Monthly budgets per source with alert thresholds |
| **BudgetAlert** | Triggered alerts when spending approaches/exceeds budget |
| **LeadConversion** | Links media entries to orders for conversion tracking |
| **ExchangeRate** | USD→DZD rate history with effective dates |

### 1.3 JSON Metadata Structure (All Optional)
- CTR, CPM, CPA, ROAS
- Impressions, Clicks, Conversions
- Campaign Name, Ad Set Name, Ad Creative ID
- Custom fields as needed

### 1.4 Relations to Add
- User → MediaBuyingEntry, MediaBuyingBudget, ExchangeRate
- Order → LeadConversion
- MediaBuyingEntry → Store (ApiConfiguration), Product

---

## 🔧 PHASE 2: BACKEND STRUCTURE

### 2.1 Module Files
```
backend/src/modules/media-buying/
├── media-buying.controller.ts
├── media-buying.routes.ts
├── media-buying.service.ts      (CRUD operations)
├── analytics.service.ts         (Dashboard & reports)
├── budget.service.ts            (Budget management)
├── conversion.service.ts        (Lead-to-order tracking)
└── types.ts
```

### 2.2 API Endpoints

| Category | Endpoints |
|----------|-----------|
| **Sources** | GET /sources, POST/PUT (ADMIN only) |
| **Entries** | GET, GET/:id, POST, PUT, DELETE (ADMIN only for delete) |
| **Dashboard** | GET /dashboard/stats |
| **Analytics** | GET /analytics/overview, /by-source, /trends, /conversions |
| **Budgets** | GET, POST, PUT, GET /status |
| **Alerts** | GET, PUT /:id/read |
| **Conversions** | POST (link), DELETE (unlink) |
| **Exchange Rates** | GET, POST, GET /latest |
| **Export** | GET /export (CSV/JSON) |

### 2.3 Permission Matrix

| Action | ADMIN | TEAM_MANAGER | MEDIA_BUYER |
|--------|-------|--------------|-------------|
| View all data | ✅ | ✅ | ✅ |
| Create entries | ✅ | ✅ | ✅ |
| Edit entries | ✅ | ✅ | ✅ |
| Delete entries | ✅ | ❌ | ❌ |
| Manage sources | ✅ | ❌ | ❌ |
| Manage budgets | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ |

### 2.4 Register in App
Add route to `backend/src/app.ts`:
```
/api/v1/media-buying → mediaBuyingRoutes
```

---

## 🎨 PHASE 3: FRONTEND STRUCTURE

### 3.1 Page Structure
```
frontend/src/app/admin/media-buying/
├── page.tsx                 (Dashboard)
├── entries/
│   ├── page.tsx            (Entry list with filters)
│   ├── new/page.tsx        (Create entry form)
│   └── [id]/page.tsx       (Edit entry)
├── budgets/page.tsx        (Budget management)
├── analytics/page.tsx      (Advanced analytics)
├── conversions/page.tsx    (Lead-to-order tracking)
└── settings/page.tsx       (Sources & exchange rates)
```

### 3.2 Components
```
frontend/src/components/media-buying/
├── media-buyer-layout.tsx   (Dedicated sidebar layout)
├── dashboard/
│   ├── KPICards.tsx
│   ├── SpendBySourceChart.tsx
│   ├── DailyTrendChart.tsx
│   └── RecentEntries.tsx
├── entries/
│   ├── EntryForm.tsx
│   ├── EntryTable.tsx
│   └── EntryFilters.tsx
├── budgets/
│   ├── BudgetForm.tsx
│   └── BudgetVsActual.tsx
└── shared/
    ├── SourceSelect.tsx
    ├── DateRangePicker.tsx
    └── CurrencyInput.tsx
```

### 3.3 API Service
Create `frontend/src/services/media-buying.service.ts` with methods for all endpoints.

---

## 📊 PHASE 4: DASHBOARD KPIs

### 4.1 Summary Cards
- Total Spend (Today / Week / Month)
- Total Leads (Today / Week / Month)
- Average CPL (Cost Per Lead)
- Best Performing Source

### 4.2 Charts
- **Spend by Source** - Pie/Donut chart
- **Daily Trend** - Line chart (spend + leads over time)
- **Conversion Funnel** - Leads → Orders

### 4.3 Filters
- Date range picker (Today, Week, Month, Custom)
- Source filter
- Store filter
- Product filter

---

## 💰 PHASE 5: BUDGET MANAGEMENT

### 5.1 Features
- Set monthly budgets per source or global
- Alert threshold (default 80%)
- Visual progress bars (Budget vs Actual)
- Automatic alerts when threshold reached

### 5.2 Budget Status View
- Current month spending per source
- Percentage used
- Remaining budget
- Projected end-of-month spend

---

## 🔄 PHASE 6: CONVERSION TRACKING

### 6.1 Workflow
1. Media buyer creates entry with leads count
2. Orders come in through normal flow
3. Link orders to media entries manually
4. System calculates conversion rate

### 6.2 Metrics
- Conversion Rate (Orders / Leads)
- Revenue per Lead
- ROAS (if order values tracked)

---

## 💱 PHASE 7: CURRENCY HANDLING

### 7.1 Workflow
1. User enters spend in USD
2. User sets/selects exchange rate (USD→DZD)
3. System calculates DZD equivalent
4. All reports can show both currencies

### 7.2 Exchange Rate Management
- Manual entry of rates
- Effective date tracking
- History for accurate historical reporting

---

## 🧭 PHASE 8: NAVIGATION

### 8.1 Admin Layout Update
Add to sidebar in `admin-layout.tsx`:
- Icon: TrendingUp or Megaphone
- Label: "Media Buying"
- Path: /admin/media-buying
- Roles: ADMIN, TEAM_MANAGER, MEDIA_BUYER

### 8.2 Dedicated Layout
Create `MediaBuyerLayout` (similar to StockAgentLayout) for MEDIA_BUYER role users with focused navigation:
- Dashboard
- Entries
- Budgets
- Analytics
- Settings

---

## 🌐 PHASE 9: TRANSLATIONS

Use **inline translations** in each component (same pattern as Stock Management):

```typescript
const t = {
  en: {
    title: 'Media Buying',
    totalSpend: 'Total Spend',
    // ...
  },
  fr: {
    title: 'Achat Média',
    totalSpend: 'Dépenses Totales',
    // ...
  },
};
```

---

## 📋 IMPLEMENTATION ORDER

### Step 1: Database (Day 1)
1. Add MEDIA_BUYER to UserRole enum
2. Create all new models
3. Run migration
4. Seed default ad sources

### Step 2: Backend Core (Day 2-3)
1. Create types.ts
2. Create media-buying.service.ts (CRUD)
3. Create media-buying.controller.ts
4. Create media-buying.routes.ts
5. Register in app.ts
6. Test with Postman

### Step 3: Backend Analytics (Day 4)
1. Create analytics.service.ts
2. Create budget.service.ts
3. Create conversion.service.ts
4. Add dashboard stats endpoint
5. Add analytics endpoints

### Step 4: Frontend Service (Day 5)
1. Create media-buying.service.ts
2. Test API calls

### Step 5: Frontend Pages (Day 6-8)
1. Dashboard page with KPIs
2. Entry list page with filters
3. Entry form (create/edit)
4. Budget management page
5. Analytics page
6. Settings page (sources, exchange rates)

### Step 6: Layout & Navigation (Day 9)
1. Create MediaBuyerLayout
2. Update AdminLayout sidebar
3. Add role-based routing

### Step 7: Testing & Polish (Day 10)
1. Test all CRUD operations
2. Test analytics calculations
3. Test budget alerts
4. Test conversion tracking
5. Verify translations
6. UI polish

---

## ✅ VALIDATION CHECKLIST

- [ ] MEDIA_BUYER role works correctly
- [ ] All CRUD operations functional
- [ ] Dashboard shows accurate KPIs
- [ ] Date filters work correctly
- [ ] Budget alerts trigger properly
- [ ] Currency conversion accurate
- [ ] Lead-to-order linking works
- [ ] Export generates correct data
- [ ] French/English translations complete
- [ ] UI matches admin design system
- [ ] Mobile responsive
- [ ] Error handling complete
