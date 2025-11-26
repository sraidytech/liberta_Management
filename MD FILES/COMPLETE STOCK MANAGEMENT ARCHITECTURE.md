# 🎯 PHASE 3: COMPLETE STOCK MANAGEMENT ARCHITECTURE

Based on your requirements, here's the comprehensive design:

---

## 📊 REQUIREMENTS SUMMARY

### **Business Rules**
1. ✅ Lots tracked by **SKU only** (one product per lot)
2. ✅ **FEFO strategy** (First Expired, First Out)
3. ✅ **Auto-deduction** on order status changes:
   - `SHIPPED` → Deduct from "Total Shipped"
   - `DELIVERED` (shippingStatus: "LIVRÉ") → Deduct from "Total Sold"
   - `CANCELLED` or shippingStatus: "ANNULÉ" → Add back to stock
   - `RETURNED` → Add back to stock
4. ✅ **Low stock alerts** at 100 units threshold to all managers
5. ✅ **Movement types**: IN, OUT, ADJUSTMENT, RETURN, TRANSFER
6. ✅ **Single warehouse** initially (multi-warehouse ready)
7. ✅ **Cost tracking** per lot for valuation and COGS
8. ✅ **Auto-create products** from OrderItems when first lot arrives
9. ✅ **Start fresh** - no historical order tracking

### **Permissions**
- **ADMIN**: Full access to everything
- **TEAM_MANAGER**: View all, manage settings
- **STOCK_MANAGEMENT_AGENT**: Full CRUD on lots, movements, reports (NO order access)

---

## 🗄️ DATABASE SCHEMA DESIGN

### **New Models**

```prisma
// Product Master Table (auto-created from OrderItems)
model Product {
  id                String   @id @default(cuid())
  sku               String   @unique
  name              String
  description       String?
  category          String?
  unit              String   @default("piece") // piece, box, kg, etc.
  
  // Stock settings
  minThreshold      Int      @default(100)
  reorderPoint      Int?
  
  // Tracking
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  lots              Lot[]
  stockLevels       StockLevel[]
  
  @@index([sku])
  @@index([isActive])
  @@map("products")
}

// Warehouse/Location Model (single warehouse initially)
model Warehouse {
  id                String   @id @default(cuid())
  code              String   @unique
  name              String
  address           String?
  isActive          Boolean  @default(true)
  isPrimary         Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  lots              Lot[]
  stockMovements    StockMovement[]
  stockLevels       StockLevel[]
  
  @@map("warehouses")
}

// Lot Model (batches from production)
model Lot {
  id                String   @id @default(cuid())
  lotNumber         String   @unique
  productId         String
  warehouseId       String
  
  // Quantities
  initialQuantity   Int
  currentQuantity   Int
  reservedQuantity  Int      @default(0)
  
  // Dates
  productionDate    DateTime
  expiryDate        DateTime?
  receivedDate      DateTime @default(now())
  
  // Cost tracking
  unitCost          Float?
  totalCost         Float?
  
  // Optional fields
  supplierInfo      String?
  qualityStatus     String?  // PENDING, APPROVED, REJECTED
  notes             String?  @db.Text
  
  // Tracking
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  product           Product     @relation(fields: [productId], references: [id])
  warehouse         Warehouse   @relation(fields: [warehouseId], references: [id])
  movements         StockMovement[]
  
  @@index([productId])
  @@index([warehouseId])
  @@index([expiryDate])
  @@index([isActive])
  @@map("lots")
}

// Stock Movement Model (all transactions)
model StockMovement {
  id                String            @id @default(cuid())
  movementType      StockMovementType
  
  // References
  productId         String
  lotId             String?
  warehouseId       String
  orderId           String?
  userId            String
  
  // Movement details
  quantity          Int
  unitCost          Float?
  totalCost         Float?
  
  // Before/After snapshots
  quantityBefore    Int
  quantityAfter     Int
  
  // Additional info
  reference         String?  // Order reference, transfer ID, etc.
  reason            String?
  notes             String?  @db.Text
  
  // Tracking
  createdAt         DateTime @default(now())
  
  // Relations
  product           Product   @relation(fields: [productId], references: [id])
  lot               Lot?      @relation(fields: [lotId], references: [id])
  warehouse         Warehouse @relation(fields: [warehouseId], references: [id])
  order             Order?    @relation(fields: [orderId], references: [id])
  user              User      @relation("StockMovements", fields: [userId], references: [id])
  
  @@index([movementType])
  @@index([productId])
  @@index([lotId])
  @@index([warehouseId])
  @@index([orderId])
  @@index([userId])
  @@index([createdAt])
  @@map("stock_movements")
}

// Stock Level Model (current inventory per product/warehouse)
model StockLevel {
  id                String   @id @default(cuid())
  productId         String
  warehouseId       String
  
  // Quantities
  totalQuantity     Int      @default(0)
  availableQuantity Int      @default(0)
  reservedQuantity  Int      @default(0)
  
  // Shipped vs Sold tracking
  totalShipped      Int      @default(0)
  totalSold         Int      @default(0)
  
  // Valuation
  averageCost       Float?
  totalValue        Float?
  
  // Tracking
  lastMovementAt    DateTime?
  updatedAt         DateTime @updatedAt
  
  // Relations
  product           Product   @relation(fields: [productId], references: [id])
  warehouse         Warehouse @relation(fields: [warehouseId], references: [id])
  
  @@unique([productId, warehouseId])
  @@index([productId])
  @@index([warehouseId])
  @@map("stock_levels")
}

// Stock Alert Model (low stock notifications)
model StockAlert {
  id                String      @id @default(cuid())
  productId         String
  warehouseId       String
  alertType         StockAlertType
  severity          AlertSeverity
  
  // Alert details
  currentQuantity   Int
  threshold         Int
  message           String
  
  // Status
  isResolved        Boolean     @default(false)
  resolvedAt        DateTime?
  resolvedBy        String?
  
  // Tracking
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@index([productId])
  @@index([warehouseId])
  @@index([alertType])
  @@index([isResolved])
  @@index([createdAt])
  @@map("stock_alerts")
}

// Enums
enum StockMovementType {
  IN              // Lot received from production
  OUT             // Deducted when order delivered
  ADJUSTMENT      // Manual correction
  RETURN          // Customer return
  TRANSFER        // Between warehouses
}

enum StockAlertType {
  LOW_STOCK
  OUT_OF_STOCK
  EXPIRING_SOON
  EXPIRED
  NEGATIVE_STOCK
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}
```

### **Schema Updates**

```prisma
// Add to User model
model User {
  // ... existing fields ...
  stockMovements    StockMovement[] @relation("StockMovements")
}

// Add to Order model
model Order {
  // ... existing fields ...
  stockMovements    StockMovement[]
  stockDeducted     Boolean         @default(false)
  stockDeductedAt   DateTime?
}

// Update UserRole enum
enum UserRole {
  ADMIN
  TEAM_MANAGER
  COORDINATEUR
  AGENT_SUIVI
  AGENT_CALL_CENTER
  QUALITY_AGENT
  STOCK_MANAGEMENT_AGENT  // NEW
}
```

---

## 🔧 BACKEND STRUCTURE

### **Module Organization**

```
backend/src/modules/stock/
├── stock.controller.ts          # Main controller
├── stock.routes.ts               # API routes
├── stock.service.ts              # Business logic
├── lot.service.ts                # Lot management
├── movement.service.ts           # Movement tracking
├── deduction.service.ts          # Auto-deduction logic
├── alert.service.ts              # Alert management
├── report.service.ts             # Reports & analytics
└── types.ts                      # TypeScript interfaces
```

### **API Endpoints**

```typescript
// Products
GET    /api/stock/products                    # List all products
GET    /api/stock/products/:id                # Get product details
POST   /api/stock/products                    # Create product (auto or manual)
PUT    /api/stock/products/:id                # Update product
DELETE /api/stock/products/:id                # Deactivate product

// Lots
GET    /api/stock/lots                        # List lots with filters
GET    /api/stock/lots/:id                    # Get lot details
POST   /api/stock/lots                        # Create new lot (receive stock)
PUT    /api/stock/lots/:id                    # Update lot details
DELETE /api/stock/lots/:id                    # Deactivate lot

// Movements
GET    /api/stock/movements                   # List movements with filters
GET    /api/stock/movements/:id               # Get movement details
POST   /api/stock/movements/adjustment        # Manual adjustment
POST   /api/stock/movements/transfer          # Transfer between warehouses
POST   /api/stock/movements/return            # Process return

// Stock Levels
GET    /api/stock/levels                      # Current stock levels
GET    /api/stock/levels/:productId           # Stock level for product
GET    /api/stock/levels/warehouse/:id        # Stock levels by warehouse

// Alerts
GET    /api/stock/alerts                      # List active alerts
PUT    /api/stock/alerts/:id/resolve          # Resolve alert
GET    /api/stock/alerts/summary              # Alert summary

// Reports
GET    /api/stock/reports/stock-level         # Stock level report
GET    /api/stock/reports/movements           # Movement report
GET    /api/stock/reports/expiry              # Expiry report
GET    /api/stock/reports/valuation           # Valuation report
GET    /api/stock/reports/turnover            # Turnover report
GET    /api/stock/reports/low-stock           # Low stock report
POST   /api/stock/reports/export              # Export report

// Warehouses
GET    /api/stock/warehouses                  # List warehouses
POST   /api/stock/warehouses                  # Create warehouse
PUT    /api/stock/warehouses/:id              # Update warehouse
```

### **Auto-Deduction Integration**

Update [`orders.controller.ts:updateOrderStatus()`](backend/src/modules/orders/orders.controller.ts:531):

```typescript
// After status update, trigger stock deduction
if (status === 'SHIPPED' || status === 'DELIVERED' || status === 'CANCELLED' || status === 'RETURNED') {
  await stockDeductionService.processOrderStatusChange(
    updatedOrder,
    existingOrder.status,
    status
  );
}
```

---

## 🎨 FRONTEND STRUCTURE

### **New Pages**

```
frontend/src/app/
├── admin/
│   └── stock/
│       ├── page.tsx                    # Stock dashboard
│       ├── products/page.tsx           # Product management
│       ├── lots/page.tsx               # Lot management
│       ├── movements/page.tsx          # Movement history
│       ├── alerts/page.tsx             # Stock alerts
│       └── reports/page.tsx            # Reports & analytics
│
└── stock-agent/
    ├── page.tsx                        # Stock agent dashboard
    ├── lots/page.tsx                   # Lot management
    ├── movements/page.tsx              # Movement tracking
    └── reports/page.tsx                # Reports
```

### **Components**

```
frontend/src/components/stock/
├── stock-dashboard.tsx                 # Overview dashboard
├── stock-level-widget.tsx              # Current stock widget
├── low-stock-alerts.tsx                # Alert widget
├── recent-movements.tsx                # Recent activity
├── expiry-warnings.tsx                 # Expiring products
├── lot-list.tsx                        # Lot table
├── lot-form-modal.tsx                  # Add/Edit lot
├── movement-list.tsx                   # Movement history
├── movement-form-modal.tsx             # Record movement
├── product-list.tsx                    # Product table
├── product-form-modal.tsx              # Add/Edit product
├── stock-reports.tsx                   # Reports interface
├── valuation-chart.tsx                 # Stock value chart
└── turnover-chart.tsx                  # Turnover analytics
```

---

## 🔐 PERMISSION MATRIX

| Feature | ADMIN | TEAM_MANAGER | STOCK_MANAGEMENT_AGENT |
|---------|-------|--------------|------------------------|
| View Dashboard | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ |
| Create/Edit Products | ✅ | ✅ | ✅ |
| Delete Products | ✅ | ❌ | ❌ |
| View Lots | ✅ | ✅ | ✅ |
| Create Lots | ✅ | ✅ | ✅ |
| Edit Lots | ✅ | ✅ | ✅ |
| Delete Lots | ✅ | ❌ | ✅ |
| View Movements | ✅ | ✅ | ✅ |
| Record Adjustments | ✅ | ✅ | ✅ |
| View Alerts | ✅ | ✅ | ✅ |
| Resolve Alerts | ✅ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ |
| Manage Warehouses | ✅ | ✅ | ❌ |
| View Orders | ✅ | ✅ | ❌ |

---

## 🔄 AUTO-DEDUCTION LOGIC

```typescript
// Pseudo-code for deduction service
async processOrderStatusChange(order, oldStatus, newStatus) {
  // Only process if order has items with SKUs
  const itemsWithSKU = order.items.filter(item => item.sku);
  
  if (itemsWithSKU.length === 0) {
    await createAlert({
      type: 'MISSING_SKU',
      orderId: order.id,
      message: 'Order items missing SKU - cannot deduct stock'
    });
    return;
  }
  
  // Determine action based on status change
  if (newStatus === 'SHIPPED') {
    await deductStock(order, 'SHIPPED');
  } else if (newStatus === 'DELIVERED' && order.shippingStatus === 'LIVRÉ') {
    await deductStock(order, 'DELIVERED');
  } else if (newStatus === 'CANCELLED' || order.shippingStatus === 'ANNULÉ') {
    await addBackStock(order, 'CANCELLED');
  } else if (newStatus === 'RETURNED') {
    await addBackStock(order, 'RETURNED');
  }
}

async deductStock(order, type) {
  for (const item of order.items) {
    if (!item.sku) continue;
    
    // Find product by SKU
    const product = await findOrCreateProduct(item.sku, item.title);
    
    // Get available lots using FEFO strategy
    const lots = await getAvailableLots(product.id, item.quantity);
    
    if (lots.totalAvailable < item.quantity) {
      await createAlert({
        type: 'INSUFFICIENT_STOCK',
        productId: product.id,
        required: item.quantity,
        available: lots.totalAvailable
      });
      continue;
    }
    
    // Deduct from lots (FEFO)
    for (const lot of lots.items) {
      const qtyToDeduct = Math.min(lot.currentQuantity, item.quantity);
      
      await createStockMovement({
        type: 'OUT',
        productId: product.id,
        lotId: lot.id,
        orderId: order.id,
        quantity: qtyToDeduct,
        quantityBefore: lot.currentQuantity,
        quantityAfter: lot.currentQuantity - qtyToDeduct
      });
      
      await updateLot(lot.id, {
        currentQuantity: lot.currentQuantity - qtyToDeduct
      });
      
      item.quantity -= qtyToDeduct;
      if (item.quantity === 0) break;
    }
    
    // Update stock level
    await updateStockLevel(product.id, type);
  }
  
  // Mark order as stock deducted
  await updateOrder(order.id, {
    stockDeducted: true,
    stockDeductedAt: new Date()
  });
}
```

---

This architecture provides a complete, production-ready stock management system. Ready to proceed with implementation?