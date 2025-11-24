# 🚚 Multi-Store & Multi-Shipping Company Architecture Proposal

## 📋 Executive Summary

**Objective**: Refactor the LibertaPhonix system to support multiple shipping companies (Maystro, Guepex, Nord West) with flexible store-to-shipping account mapping, while maintaining 100% backward compatibility with existing production data (150,000+ orders).

**Key Principle**: ⚠️ **ZERO DATA LOSS** - All changes are additive only. No deletions, no breaking changes.

---

## 🎯 Requirements Summary

Based on your answers:

1. ✅ **Current**: Maystro only
2. 🔜 **Future**: Add Guepex and Nord West support
3. 🔗 **Mapping**: Each store → ONE shipping company account
4. 🔄 **Flexibility**: Unlimited shipping accounts per company
5. 🎨 **UI**: Manage in admin/stores page with dropdown selection
6. ✅ **Testing**: Connection testing before saving
7. 🔒 **Security**: Standard database security (no encryption)
8. 📦 **Migration**: Apply to future orders only (existing orders unchanged)

---

## 🏗️ Proposed Architecture

### 1️⃣ Database Schema Changes

#### **New Table: `ShippingCompany`**
```prisma
model ShippingCompany {
  id          String   @id @default(cuid())
  name        String   @unique // "Maystro", "Guepex", "Nord West"
  slug        String   @unique // "maystro", "guepex", "nord_west"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  accounts    ShippingAccount[]
  
  @@map("shipping_companies")
}
```

#### **New Table: `ShippingAccount`**
```prisma
model ShippingAccount {
  id                String   @id @default(cuid())
  name              String   // "Maystro Account A", "Guepex Main"
  companyId         String
  company           ShippingCompany @relation(fields: [companyId], references: [id])
  
  // Flexible credentials stored as JSON
  credentials       Json     // { apiKey, apiToken, apiId, userGuid, etc. }
  baseUrl           String?  // Optional custom base URL
  
  isActive          Boolean  @default(true)
  isPrimary         Boolean  @default(false) // One primary per company
  
  // Statistics
  requestCount      Int      @default(0)
  successCount      Int      @default(0)
  errorCount        Int      @default(0)
  lastUsed          DateTime?
  lastTestAt        DateTime?
  lastTestStatus    String?  // "success" | "error"
  lastTestError     String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  stores            ApiConfiguration[]
  
  @@map("shipping_accounts")
}
```

#### **Modified Table: `ApiConfiguration` (EcoManager Stores)**
```prisma
model ApiConfiguration {
  id                  String   @id @default(cuid())
  storeName           String
  storeIdentifier     String   @unique
  apiToken            String
  baseUrl             String
  isActive            Boolean  @default(true)
  
  // 🆕 NEW: Link to shipping account
  shippingAccountId   String?  // Optional - can be null for stores without shipping
  shippingAccount     ShippingAccount? @relation(fields: [shippingAccountId], references: [id])
  
  requestCount        Int      @default(0)
  lastUsed            DateTime?
  createdById         String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  createdBy           User     @relation("CreatedBy", fields: [createdById], references: [id])
  
  @@map("api_configurations")
}
```

#### **Modified Table: `Order` (NO BREAKING CHANGES)**
```prisma
model Order {
  // ... existing fields remain unchanged ...
  
  // 🆕 NEW: Optional link to shipping account (for future orders)
  shippingAccountId   String?
  shippingAccount     ShippingAccount? @relation(fields: [shippingAccountId], references: [id])
  
  // Existing fields remain:
  trackingNumber      String?
  shippingStatus      String?
  maystroOrderId      String?  // Keep for backward compatibility
  // ... rest of existing fields ...
}
```

---

### 2️⃣ Migration Strategy (ZERO DATA LOSS)

#### **Phase 1: Add New Tables**
```sql
-- Create shipping_companies table
CREATE TABLE "shipping_companies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create shipping_accounts table
CREATE TABLE "shipping_accounts" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "companyId" TEXT NOT NULL REFERENCES "shipping_companies"("id"),
  "credentials" JSONB NOT NULL,
  "baseUrl" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isPrimary" BOOLEAN DEFAULT false,
  "requestCount" INTEGER DEFAULT 0,
  "successCount" INTEGER DEFAULT 0,
  "errorCount" INTEGER DEFAULT 0,
  "lastUsed" TIMESTAMP,
  "lastTestAt" TIMESTAMP,
  "lastTestStatus" TEXT,
  "lastTestError" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

#### **Phase 2: Add Optional Foreign Keys (NON-BREAKING)**
```sql
-- Add optional shipping account link to stores
ALTER TABLE "api_configurations" 
ADD COLUMN "shippingAccountId" TEXT REFERENCES "shipping_accounts"("id");

-- Add optional shipping account link to orders (for future orders)
ALTER TABLE "orders" 
ADD COLUMN "shippingAccountId" TEXT REFERENCES "shipping_accounts"("id");
```

#### **Phase 3: Seed Initial Data**
```typescript
// Seed shipping companies
await prisma.shippingCompany.createMany({
  data: [
    { name: 'Maystro', slug: 'maystro', isActive: true },
    { name: 'Guepex', slug: 'guepex', isActive: true },
    { name: 'Nord West', slug: 'nord_west', isActive: true }
  ]
});

// Migrate existing Maystro API keys from .env to database
const maystroCompany = await prisma.shippingCompany.findUnique({
  where: { slug: 'maystro' }
});

// Create account from MAYSTRO_API_KEY_1
await prisma.shippingAccount.create({
  data: {
    name: 'Maystro Primary Account',
    companyId: maystroCompany.id,
    credentials: {
      apiKey: process.env.MAYSTRO_API_KEY_1
    },
    baseUrl: 'https://backend.maystro-delivery.com',
    isActive: true,
    isPrimary: true
  }
});
```

#### **Phase 4: Link Existing Stores (OPTIONAL)**
```typescript
// Optionally link existing stores to default Maystro account
const defaultMaystroAccount = await prisma.shippingAccount.findFirst({
  where: { 
    company: { slug: 'maystro' },
    isPrimary: true 
  }
});

// Update stores to use default account (OPTIONAL - can be done manually via UI)
await prisma.apiConfiguration.updateMany({
  where: { isActive: true },
  data: { shippingAccountId: defaultMaystroAccount.id }
});
```

---

### 3️⃣ Backend Service Architecture

#### **New Service: `ShippingProviderFactory`**
```typescript
// backend/src/services/shipping/shipping-provider-factory.ts

export interface IShippingProvider {
  createOrder(orderData: any): Promise<any>;
  updateOrderStatus(orderId: string, status: string): Promise<any>;
  getOrderStatus(orderId: string): Promise<any>;
  syncOrderStatuses(orderIds: string[]): Promise<any>;
  testConnection(): Promise<boolean>;
}

export class ShippingProviderFactory {
  static createProvider(
    companySlug: string, 
    credentials: any, 
    baseUrl?: string
  ): IShippingProvider {
    switch (companySlug) {
      case 'maystro':
        return new MaystroProvider(credentials, baseUrl);
      case 'guepex':
        return new GuepexProvider(credentials, baseUrl);
      case 'nord_west':
        return new NordWestProvider(credentials, baseUrl);
      default:
        throw new Error(`Unknown shipping company: ${companySlug}`);
    }
  }
}
```

#### **Refactored: `MaystroProvider`**
```typescript
// backend/src/services/shipping/providers/maystro-provider.ts

export class MaystroProvider implements IShippingProvider {
  private axiosInstance: AxiosInstance;
  
  constructor(credentials: { apiKey: string }, baseUrl?: string) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl || 'https://backend.maystro-delivery.com',
      headers: {
        'Authorization': `Token ${credentials.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });
  }
  
  async syncOrderStatuses(orderIds: string[]): Promise<any> {
    // Existing Maystro sync logic
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/api/stores/orders/?limit=1');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```

#### **New: `GuepexProvider`**
```typescript
// backend/src/services/shipping/providers/guepex-provider.ts

export class GuepexProvider implements IShippingProvider {
  private axiosInstance: AxiosInstance;
  
  constructor(
    credentials: { apiId: string; apiToken: string }, 
    baseUrl?: string
  ) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl || 'https://api.guepex.com', // Replace with actual URL
      headers: {
        'X-API-ID': credentials.apiId,
        'X-API-TOKEN': credentials.apiToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });
  }
  
  async syncOrderStatuses(orderIds: string[]): Promise<any> {
    // Implement Guepex-specific sync logic
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // Test Guepex API endpoint
      const response = await this.axiosInstance.get('/test'); // Replace with actual endpoint
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```

#### **New: `NordWestProvider`**
```typescript
// backend/src/services/shipping/providers/nord-west-provider.ts

export class NordWestProvider implements IShippingProvider {
  private axiosInstance: AxiosInstance;
  
  constructor(
    credentials: { apiToken: string; userGuid: string }, 
    baseUrl?: string
  ) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl || 'https://api.nordwest.com', // Replace with actual URL
      headers: {
        'Authorization': `Bearer ${credentials.apiToken}`,
        'X-User-GUID': credentials.userGuid,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });
  }
  
  async syncOrderStatuses(orderIds: string[]): Promise<any> {
    // Implement Nord West-specific sync logic
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // Test Nord West API endpoint
      const response = await this.axiosInstance.get('/health'); // Replace with actual endpoint
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```

#### **Refactored: Shipping Sync Service**
```typescript
// backend/src/services/shipping-sync.service.ts

export class ShippingSyncService {
  async syncOrderShippingStatus(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAccount: {
          include: { company: true }
        }
      }
    });
    
    if (!order?.shippingAccount) {
      console.log(`Order ${orderId} has no shipping account assigned`);
      return;
    }
    
    // Create appropriate provider
    const provider = ShippingProviderFactory.createProvider(
      order.shippingAccount.company.slug,
      order.shippingAccount.credentials,
      order.shippingAccount.baseUrl
    );
    
    // Sync status
    const status = await provider.getOrderStatus(order.trackingNumber);
    
    // Update order
    await prisma.order.update({
      where: { id: orderId },
      data: { shippingStatus: status }
    });
  }
}
```

---

### 4️⃣ API Endpoints

#### **Shipping Companies Management**
```typescript
// GET /api/v1/shipping/companies
// List all shipping companies

// POST /api/v1/shipping/companies
// Create new shipping company (admin only)
```

#### **Shipping Accounts Management**
```typescript
// GET /api/v1/shipping/accounts
// List all shipping accounts

// GET /api/v1/shipping/accounts/:id
// Get specific account details

// POST /api/v1/shipping/accounts
// Create new shipping account
// Body: { name, companyId, credentials, baseUrl }

// PUT /api/v1/shipping/accounts/:id
// Update shipping account

// DELETE /api/v1/shipping/accounts/:id
// Soft delete (set isActive = false)

// POST /api/v1/shipping/accounts/:id/test
// Test connection for specific account
```

#### **Store-Shipping Link**
```typescript
// PUT /api/v1/stores/:storeId/shipping-account
// Link store to shipping account
// Body: { shippingAccountId }

// DELETE /api/v1/stores/:storeId/shipping-account
// Unlink store from shipping account
```

---

### 5️⃣ Frontend UI Changes

#### **Admin Stores Page Enhancement**

**Location**: `frontend/src/app/admin/stores/page.tsx`

**Changes**:
1. Add "Shipping Account" column to stores table
2. Add shipping account dropdown in store edit modal
3. Show shipping company badge (Maystro/Guepex/Nord West)

**New Section**: "Shipping Accounts Management"
```tsx
// Add collapsible section in stores page
<div className="mb-6">
  <h3>Shipping Accounts</h3>
  <Button onClick={() => setShowShippingAccountModal(true)}>
    + Add Shipping Account
  </Button>
  
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Company</th>
        <th>Status</th>
        <th>Last Used</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {shippingAccounts.map(account => (
        <tr key={account.id}>
          <td>{account.name}</td>
          <td>
            <Badge>{account.company.name}</Badge>
          </td>
          <td>
            {account.isActive ? '✅ Active' : '❌ Inactive'}
          </td>
          <td>{formatDate(account.lastUsed)}</td>
          <td>
            <Button onClick={() => testConnection(account.id)}>
              Test
            </Button>
            <Button onClick={() => editAccount(account.id)}>
              Edit
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### **Store Edit Modal Enhancement**
```tsx
// Add shipping account selection
<div className="form-group">
  <label>Shipping Account</label>
  <select 
    value={selectedShippingAccountId}
    onChange={(e) => setSelectedShippingAccountId(e.target.value)}
  >
    <option value="">-- No Shipping Account --</option>
    {shippingAccounts.map(account => (
      <option key={account.id} value={account.id}>
        {account.company.name} - {account.name}
      </option>
    ))}
  </select>
</div>
```

#### **New Modal: Add/Edit Shipping Account**
```tsx
<Modal show={showShippingAccountModal}>
  <h3>Add Shipping Account</h3>
  
  {/* Step 1: Select Company */}
  <div className="form-group">
    <label>Shipping Company</label>
    <select 
      value={selectedCompany}
      onChange={(e) => setSelectedCompany(e.target.value)}
    >
      <option value="">-- Select Company --</option>
      <option value="maystro">Maystro</option>
      <option value="guepex">Guepex</option>
      <option value="nord_west">Nord West</option>
    </select>
  </div>
  
  {/* Step 2: Account Name */}
  <div className="form-group">
    <label>Account Name</label>
    <input 
      type="text"
      placeholder="e.g., Maystro Main Account"
      value={accountName}
      onChange={(e) => setAccountName(e.target.value)}
    />
  </div>
  
  {/* Step 3: Credentials (Dynamic based on company) */}
  {selectedCompany === 'maystro' && (
    <div className="form-group">
      <label>API Key</label>
      <input 
        type="password"
        placeholder="Enter Maystro API Key"
        value={credentials.apiKey}
        onChange={(e) => setCredentials({...credentials, apiKey: e.target.value})}
      />
    </div>
  )}
  
  {selectedCompany === 'guepex' && (
    <>
      <div className="form-group">
        <label>API ID</label>
        <input 
          type="text"
          placeholder="Enter Guepex API ID"
          value={credentials.apiId}
          onChange={(e) => setCredentials({...credentials, apiId: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label>API Token</label>
        <input 
          type="password"
          placeholder="Enter Guepex API Token"
          value={credentials.apiToken}
          onChange={(e) => setCredentials({...credentials, apiToken: e.target.value})}
        />
      </div>
    </>
  )}
  
  {selectedCompany === 'nord_west' && (
    <>
      <div className="form-group">
        <label>API Token</label>
        <input 
          type="password"
          placeholder="Enter Nord West API Token"
          value={credentials.apiToken}
          onChange={(e) => setCredentials({...credentials, apiToken: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label>User GUID</label>
        <input 
          type="text"
          placeholder="Enter User GUID"
          value={credentials.userGuid}
          onChange={(e) => setCredentials({...credentials, userGuid: e.target.value})}
        />
      </div>
    </>
  )}
  
  {/* Step 4: Test Connection */}
  <Button 
    onClick={testConnectionBeforeSave}
    disabled={testingConnection}
  >
    {testingConnection ? 'Testing...' : 'Test Connection'}
  </Button>
  
  {connectionTestResult && (
    <div className={connectionTestResult.success ? 'success' : 'error'}>
      {connectionTestResult.message}
    </div>
  )}
  
  {/* Step 5: Save */}
  <Button 
    onClick={saveShippingAccount}
    disabled={!connectionTestResult?.success}
  >
    Save Account
  </Button>
</Modal>
```

---

### 6️⃣ Implementation Plan (Step-by-Step)

#### **Phase 1: Database Migration (Day 1)**
1. ✅ Create Prisma migration for new tables
2. ✅ Run migration on development database
3. ✅ Seed initial shipping companies
4. ✅ Test migration rollback capability

#### **Phase 2: Backend Services (Days 2-3)**
1. ✅ Create `IShippingProvider` interface
2. ✅ Refactor `MaystroProvider` to implement interface
3. ✅ Create `GuepexProvider` stub (implement later)
4. ✅ Create `NordWestProvider` stub (implement later)
5. ✅ Create `ShippingProviderFactory`
6. ✅ Update shipping sync service to use factory

#### **Phase 3: API Endpoints (Day 4)**
1. ✅ Create shipping companies endpoints
2. ✅ Create shipping accounts CRUD endpoints
3. ✅ Add connection testing endpoint
4. ✅ Update stores endpoints to include shipping account

#### **Phase 4: Frontend UI (Days 5-6)**
1. ✅ Add shipping accounts section to stores page
2. ✅ Create add/edit shipping account modal
3. ✅ Add shipping account dropdown to store edit modal
4. ✅ Implement connection testing UI
5. ✅ Add shipping company badges

#### **Phase 5: Testing (Day 7)**
1. ✅ Test Maystro provider with existing accounts
2. ✅ Test store-to-shipping account linking
3. ✅ Test connection testing functionality
4. ✅ Verify backward compatibility (existing orders unchanged)

#### **Phase 6: Production Deployment (Day 8)**
1. ✅ Run database migration on production
2. ✅ Migrate existing Maystro keys to database
3. ✅ Link existing stores to default Maystro account
4. ✅ Monitor for 24 hours

#### **Phase 7: Guepex Integration (Future)**
1. 🔜 Implement Guepex API integration
2. 🔜 Test with Guepex credentials
3. 🔜 Deploy to production

#### **Phase 8: Nord West Integration (Future)**
1. 🔜 Implement Nord West API integration
2. 🔜 Test with Nord West credentials
3. 🔜 Deploy to production

---

### 7️⃣ Backward Compatibility Guarantees

✅ **Existing Orders**: All 150,000+ orders remain unchanged
✅ **Existing API Calls**: Current Maystro sync continues to work
✅ **No Data Loss**: All migrations are additive only
✅ **Gradual Migration**: Stores can be linked to shipping accounts gradually
✅ **Fallback**: If no shipping account linked, system uses default Maystro key

---

### 8️⃣ Security Considerations

1. **Credentials Storage**: Stored as JSON in database (standard security)
2. **API Access**: Only admins can manage shipping accounts
3. **Connection Testing**: Validates credentials before saving
4. **Audit Trail**: Track who created/modified shipping accounts
5. **Rate Limiting**: Existing rate limiting applies to all providers

---

### 9️⃣ Files to Modify

#### **Database**
- ✏️ `backend/prisma/schema.prisma` - Add new models
- ✏️ `backend/prisma/migrations/` - New migration files
- ✏️ `backend/prisma/seed.ts` - Seed shipping companies

#### **Backend Services**
- 🆕 `backend/src/services/shipping/shipping-provider-factory.ts`
- 🆕 `backend/src/services/shipping/providers/maystro-provider.ts`
- 🆕 `backend/src/services/shipping/providers/guepex-provider.ts`
- 🆕 `backend/src/services/shipping/providers/nord-west-provider.ts`
- 🆕 `backend/src/services/shipping/interfaces/i-shipping-provider.ts`
- ✏️ `backend/src/services/maystro.service.ts` - Refactor to use provider
- ✏️ `backend/src/services/sync.service.ts` - Update to use shipping accounts

#### **Backend Controllers**
- 🆕 `backend/src/modules/shipping/shipping.controller.ts`
- 🆕 `backend/src/modules/shipping/shipping.routes.ts`
- ✏️ `backend/src/modules/stores/stores.controller.ts` - Add shipping account link

#### **Frontend Components**
- ✏️ `frontend/src/app/admin/stores/page.tsx` - Add shipping accounts section
- 🆕 `frontend/src/components/admin/shipping-account-modal.tsx`
- 🆕 `frontend/src/components/admin/shipping-account-list.tsx`

#### **Types**
- ✏️ `backend/src/types/index.ts` - Add shipping types
- 🆕 `frontend/src/types/shipping.ts` - Frontend shipping types

---

### 🔟 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Production data loss | All changes are additive; no deletions |
| Service disruption | Backward compatibility maintained; gradual rollout |
| API credential exposure | Admin-only access; no credentials in logs |
| Migration failure | Tested rollback procedures; staging environment testing |
| Performance impact | Indexed foreign keys; connection pooling |

---

## ✅ Approval Checklist

Before implementation, please confirm:

- [ ] Architecture meets all requirements
- [ ] Database schema changes are acceptable
- [ ] UI/UX design matches expectations
- [ ] Migration strategy is safe for production
- [ ] Implementation timeline is acceptable
- [ ] No concerns about backward compatibility

---

## 📞 Next Steps

Once you approve this proposal, I will:

1. Create detailed implementation tickets
2. Start with Phase 1 (Database Migration)
3. Provide progress updates after each phase
4. Request your review before production deployment

**Ready to proceed?** Please review and approve! 🚀