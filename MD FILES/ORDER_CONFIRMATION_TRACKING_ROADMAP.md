I've analyzed your test script [`backend/src/scripts/fetch-december-orders-confirmators.ts`](backend/src/scripts/fetch-december-orders-confirmators.ts) and the EcoManager webhook documentation. Here's a comprehensive roadmap for implementing real-time order confirmation tracking:

## 📋 **COMPLETE IMPLEMENTATION ROADMAP**

---

## **🎯 PROJECT OVERVIEW**

**Goal:** Transform the test script into a production real-time confirmation tracking system using EcoManager webhooks.

**Key Features:**
- ✅ Real-time confirmator tracking (ID, name)
- ✅ Confirmation state monitoring
- ✅ Multi-store support (like existing sync system)
- ✅ Separate OrderConfirmation model
- ✅ NO history tracking (resource optimization)
- ✅ December 2025 data seeding
- ✅ Frontend dashboard for analytics

---

## **📊 ARCHITECTURE**

```
EcoManager → Webhooks (HMAC) → Backend API → Database
                                      ↓
                                Frontend Dashboard
```

**Webhook Events:**
- `OrderCreated` - Initial confirmation data
- `OrderConfirmationStatusChanged` - Real-time updates

---

## **🗄️ PHASE 1: DATABASE SCHEMA**

### Tasks:
1. **Create OrderConfirmation Model**
   - Fields: ecoManagerOrderId, orderReference, storeIdentifier
   - Confirmator: confirmatorId, confirmatorName
   - States: confirmationState, orderState
   - Timestamps: confirmedAt, createdAt, updatedAt
   - Optional link to Order model

2. **Create WebhookConfiguration Model**
   - Store webhook registration details per store
   - Fields: storeIdentifier, webhookSecret, ecoManagerWebhookId
   - Track: isActive, lastTriggered, events[]

3. **Update Order Model**
   - Add optional relation to OrderConfirmation

4. **Create Migration**
   ```bash
   npx prisma migrate dev --name add_order_confirmation_tracking
   ```

**Critical:** Use indexes on ecoManagerOrderId, storeIdentifier, confirmatorId for performance

---

## **🔌 PHASE 2: WEBHOOK INFRASTRUCTURE**

### Tasks:
1. **Create Webhook Controller** (`ecomanager-webhook.controller.ts`)
   - Handle GET validation (EcoManager checks URL is reachable)
   - Handle POST events (process webhook data)
   - HMAC SHA256 signature verification (CRITICAL for security)
   - Must respond within 5 seconds (EcoManager requirement)

2. **Update Webhook Routes** (`webhooks.routes.ts`)
   - Add GET `/api/webhooks/ecomanager` (validation)
   - Add POST `/api/webhooks/ecomanager` (events)

3. **Security Implementation**
   - Verify `X-Ecomanager-Signature` header
   - Use timing-safe comparison
   - Validate webhook ID exists in database

**Critical:** Signature verification prevents unauthorized webhook calls

---

## **🔧 PHASE 3: CONFIRMATION SERVICE**

### Tasks:
1. **Create OrderConfirmationService** (`order-confirmation.service.ts`)
   - `handleOrderCreated()` - Create new confirmation record
   - `handleConfirmationChanged()` - Update existing record (NO history)
   - `linkConfirmationToOrder()` - Link when order syncs
   - `getWebhookConfig()` - Fetch webhook configuration

2. **Data Processing Logic**
   - Check for existing records (prevent duplicates)
   - Find linked Order if exists
   - Extract confirmator data from webhook payload
   - Update timestamps

**Critical:** Handle race conditions (webhook may arrive before order sync)

---

## **🏪 PHASE 4: WEBHOOK MANAGEMENT**

### Tasks:
1. **Create WebhookManagerService** (`webhook-manager.service.ts`)
   - `registerAllStoreWebhooks()` - Register for all active stores
   - `registerStoreWebhook()` - Register single store
   - `unregisterStoreWebhook()` - Remove webhook
   - `getWebhookStatus()` - Monitor webhook health

2. **Registration Strategy** (Similar to sync.service.ts)
   - Process stores sequentially
   - Generate unique secret per store (32-byte hex)
   - Register both events (OrderCreated + OrderConfirmationStatusChanged)
   - Store configuration in database

3. **Create Registration Script** (`register-webhooks.ts`)
   - Run once to register all stores
   - Handle errors gracefully
   - Log registration status

**Critical:** Each store needs unique webhook secret for security

---

## **🌱 PHASE 5: DATA SEEDING**

### Tasks:
1. **Create Seed Script** (`seed-december-confirmations.ts`)
   - Based on existing test script logic
   - Fetch December 2025 orders from all stores
   - Skip ALPH store (as per original)
   - Extract confirmator data
   - Create OrderConfirmation records
   - Link to existing Orders where possible

2. **Execution**
   ```bash
   npx ts-node backend/src/scripts/seed-december-confirmations.ts
   ```

3. **Validation**
   - Check total records created
   - Verify confirmator distribution
   - Ensure no duplicates

**Critical:** Run after webhook registration to have complete data

---

## **🔍 PHASE 6: BACKEND API ENDPOINTS**

### Tasks:
1. **Create Confirmations Controller** (`confirmations.controller.ts`)
   - `GET /api/confirmations/order/:orderId` - Get order confirmation
   - `GET /api/confirmations/confirmator/:confirmatorId` - By confirmator
   - `GET /api/confirmations/stats` - Statistics & analytics
   - `GET /api/confirmations/list` - Paginated list with filters

2. **Create Routes** (`confirmations.routes.ts`)
   - Add authentication middleware
   - Add pagination support
   - Add filtering (store, date range, state)

3. **Query Optimization**
   - Use database indexes
   - Implement pagination
   - Cache statistics if needed

**Critical:** All endpoints require authentication

---

## **🧪 PHASE 7: TESTING & VALIDATION**

### Tasks:
1. **Unit Tests**
   - Test signature verification
   - Test event processing
   - Test data creation/updates

2. **Integration Tests**
   - Test webhook registration
   - Test webhook reception
   - Test data integrity

3. **Manual Testing**
   - Use ngrok for local webhook testing
   - Trigger test events from EcoManager
   - Verify database updates
   - Check response times (<5 seconds)

4. **Performance Testing**
   - Test with high webhook volume
   - Monitor database performance
   - Check memory usage

**Critical:** Webhook must respond within 5 seconds or EcoManager will retry

---

## **🎨 PHASE 8: FRONTEND DASHBOARD**

### Tasks:

#### 8.1 **Confirmator Analytics Page**
**Location:** `frontend/src/app/confirmations/page.tsx`

**Features:**
- Overview cards (total confirmations, active confirmators, today's stats)
- Confirmator leaderboard (orders per confirmator)
- Confirmation state distribution (pie chart)
- Store-wise breakdown
- Date range filters

**Components to Create:**
- `ConfirmationStats.tsx` - Statistics cards
- `ConfirmatorLeaderboard.tsx` - Top confirmators table
- `ConfirmationChart.tsx` - Visual charts
- `ConfirmationFilters.tsx` - Date/store filters

#### 8.2 **Confirmator Detail Page**
**Location:** `frontend/src/app/confirmations/confirmator/[id]/page.tsx`

**Features:**
- Confirmator profile (name, ID, total orders)
- Orders list (paginated)
- Performance metrics (confirmation rate, avg time)
- Activity timeline
- Export to CSV

**Components:**
- `ConfirmatorProfile.tsx`
- `ConfirmatorOrders.tsx`
- `ConfirmatorMetrics.tsx`

#### 8.3 **Order Confirmation View**
**Location:** Add to existing order detail page

**Features:**
- Show confirmator info in order details
- Display confirmation state badge
- Show confirmation timestamp
- Link to confirmator profile

**Updates:**
- Modify `OrderDetails.tsx` to include confirmation data
- Add confirmation badge component

#### 8.4 **Webhook Status Page** (Admin Only)
**Location:** `frontend/src/app/admin/webhooks/page.tsx`

**Features:**
- List all registered webhooks
- Show webhook status (active/inactive)
- Last triggered timestamp
- Register/unregister webhooks
- Test webhook endpoint

**Components:**
- `WebhookList.tsx`
- `WebhookStatus.tsx`
- `WebhookActions.tsx`

#### 8.5 **API Integration**
**Location:** `frontend/src/lib/api/confirmations.ts`

**API Functions:**
```typescript
- getConfirmationStats(filters)
- getConfirmatorList(pagination)
- getConfirmatorDetails(id)
- getOrderConfirmation(orderId)
- getWebhookStatus()
```

#### 8.6 **UI Components**
- Confirmation state badges (Confirmed, Cancelled, Pending)
- Confirmator avatar/icon
- Statistics cards with icons
- Charts (using recharts or similar)
- Data tables with sorting/filtering

**Critical:** Use existing UI patterns from the app for consistency

---

## **📝 COMPLETE TASK CHECKLIST**

### **Backend Tasks:**
- [ ] 1.1 Create OrderConfirmation model in schema.prisma
- [ ] 1.2 Create WebhookConfiguration model in schema.prisma
- [ ] 1.3 Update Order model with confirmation relation
- [ ] 1.4 Run database migration
- [ ] 2.1 Create ecomanager-webhook.controller.ts
- [ ] 2.2 Implement HMAC signature verification
- [ ] 2.3 Update webhooks.routes.ts
- [ ] 3.1 Create order-confirmation.service.ts
- [ ] 3.2 Implement event handlers
- [ ] 4.1 Create webhook-manager.service.ts
- [ ] 4.2 Create register-webhooks.ts script
- [ ] 4.3 Register webhooks for all stores
- [ ] 5.1 Create seed-december-confirmations.ts
- [ ] 5.2 Run seed script
- [ ] 5.3 Validate seeded data
- [ ] 6.1 Create confirmations.controller.ts
- [ ] 6.2 Create confirmations.routes.ts
- [ ] 6.3 Add to main app.ts
- [ ] 7.1 Test webhook registration
- [ ] 7.2 Test webhook reception
- [ ] 7.3 Test API endpoints
- [ ] 7.4 Performance testing

### **Frontend Tasks:**
- [ ] 8.1 Create confirmations page layout
- [ ] 8.2 Create ConfirmationStats component
- [ ] 8.3 Create ConfirmatorLeaderboard component
- [ ] 8.4 Create ConfirmationChart component
- [ ] 8.5 Create ConfirmationFilters component
- [ ] 8.6 Create confirmator detail page
- [ ] 8.7 Create ConfirmatorProfile component
- [ ] 8.8 Create ConfirmatorOrders component
- [ ] 8.9 Update OrderDetails with confirmation info
- [ ] 8.10 Create webhook status page (admin)
- [ ] 8.11 Create API integration functions
- [ ] 8.12 Add navigation menu items
- [ ] 8.13 Test all frontend features
- [ ] 8.14 Responsive design testing

### **Deployment Tasks:**
- [ ] 9.1 Deploy database migration
- [ ] 9.2 Deploy backend code
- [ ] 9.3 Register webhooks in production
- [ ] 9.4 Run seed script in production
- [ ] 9.5 Deploy frontend code
- [ ] 9.6 Monitor webhook activity
- [ ] 9.7 Verify data accuracy

---

## **⚠️ CRITICAL CONSIDERATIONS**

1. **Security:** HMAC signature verification is MANDATORY
2. **Performance:** Webhook must respond <5 seconds
3. **Race Conditions:** Webhook may arrive before order sync
4. **No History:** Only current state to save resources
5. **Multi-Store:** Each store needs unique webhook secret
6. **Retry Policy:** EcoManager retries up to 6 times over 24 hours
7. **Validation:** GET request for webhook URL validation

---

## **📊 SUCCESS METRICS**

- ✅ All active stores have registered webhooks
- ✅ December 2025 data successfully seeded
- ✅ Webhooks processing in <2 seconds
- ✅ 100% signature verification success
- ✅ Frontend dashboard showing real-time data
- ✅ Zero webhook failures in production

---

## **🚀 ESTIMATED TIMELINE**

- **Backend (Phases 1-7):** 2-3 days
- **Frontend (Phase 8):** 2-3 days
- **Testing & Deployment:** 1 day
- **Total:** 5-7 days

---

**The roadmap is complete and ready for implementation!** Each phase builds on the previous one, ensuring a systematic and reliable deployment.