/**
 * Comprehensive Shipping Sync Diagnostic Script
 * 
 * This script diagnoses why order status updates are not working with the new
 * shipping-sync.service.ts and maystro-provider.ts architecture.
 * 
 * Run: npx ts-node src/scripts/diagnose-shipping-sync-issue.ts
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface DiagnosticResult {
  section: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

async function addResult(section: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
  results.push({ section, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${section}] ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

async function checkShippingCompanies() {
  console.log('\n📦 === CHECKING SHIPPING COMPANIES ===\n');
  
  try {
    const companies = await prisma.shippingCompany.findMany({
      include: {
        accounts: true
      }
    });

    if (companies.length === 0) {
      await addResult('Shipping Companies', 'FAIL', 'No shipping companies found in database', {
        action: 'Run: npm run db:seed to create shipping companies'
      });
    } else {
      await addResult('Shipping Companies', 'PASS', `Found ${companies.length} shipping companies`, {
        companies: companies.map(c => ({
          name: c.name,
          slug: c.slug,
          accountCount: c.accounts.length
        }))
      });
    }

    return companies;
  } catch (error: any) {
    await addResult('Shipping Companies', 'FAIL', 'Error checking shipping companies', {
      error: error.message
    });
    return [];
  }
}

async function checkShippingAccounts() {
  console.log('\n🔑 === CHECKING SHIPPING ACCOUNTS ===\n');
  
  try {
    const accounts = await prisma.shippingAccount.findMany({
      include: {
        company: true,
        stores: true,
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (accounts.length === 0) {
      await addResult('Shipping Accounts', 'FAIL', 'No shipping accounts configured', {
        action: 'Create shipping accounts in Admin > Settings > Shipping Accounts'
      });
    } else {
      for (const account of accounts) {
        const status = account.isActive ? 'PASS' : 'WARNING';
        await addResult('Shipping Accounts', status, `Account: ${account.name}`, {
          company: account.company.name,
          isActive: account.isActive,
          isPrimary: account.isPrimary,
          linkedStores: account.stores.length,
          ordersWithAccount: account.orders.length,
          credentials: Object.keys(account.credentials as any),
          lastUsed: account.lastUsed,
          stats: {
            requests: account.requestCount,
            success: account.successCount,
            errors: account.errorCount
          }
        });
      }
    }

    return accounts;
  } catch (error: any) {
    await addResult('Shipping Accounts', 'FAIL', 'Error checking shipping accounts', {
      error: error.message
    });
    return [];
  }
}

async function checkStoreShippingLinks() {
  console.log('\n🏪 === CHECKING STORE-SHIPPING ACCOUNT LINKS ===\n');
  
  try {
    const stores = await prisma.apiConfiguration.findMany({
      include: {
        shippingAccount: {
          include: {
            company: true
          }
        }
      }
    });

    let linkedCount = 0;
    let unlinkedCount = 0;

    for (const store of stores) {
      if (store.shippingAccountId) {
        linkedCount++;
        await addResult('Store Links', 'PASS', `Store "${store.storeName}" is linked`, {
          storeId: store.id,
          storeName: store.storeName,
          storeIdentifier: store.storeIdentifier,
          shippingAccount: store.shippingAccount?.name,
          shippingCompany: store.shippingAccount?.company.name
        });
      } else {
        unlinkedCount++;
        await addResult('Store Links', 'WARNING', `Store "${store.storeName}" is NOT linked to any shipping account`, {
          storeId: store.id,
          storeName: store.storeName,
          storeIdentifier: store.storeIdentifier,
          action: 'Link this store to a shipping account in Admin > Stores'
        });
      }
    }

    await addResult('Store Links Summary', linkedCount > 0 ? 'PASS' : 'FAIL', 
      `${linkedCount} stores linked, ${unlinkedCount} stores unlinked`);

    return stores;
  } catch (error: any) {
    await addResult('Store Links', 'FAIL', 'Error checking store-shipping links', {
      error: error.message
    });
    return [];
  }
}

async function checkOrdersWithShippingAccounts() {
  console.log('\n📋 === CHECKING ORDERS WITH SHIPPING ACCOUNTS ===\n');
  
  try {
    // Check recent orders
    const recentOrders = await prisma.order.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        shippingAccount: {
          include: {
            company: true
          }
        }
      }
    });

    let withAccount = 0;
    let withoutAccount = 0;
    let withTracking = 0;
    let withoutTracking = 0;

    for (const order of recentOrders) {
      if (order.shippingAccountId) {
        withAccount++;
      } else {
        withoutAccount++;
      }

      if (order.trackingNumber) {
        withTracking++;
      } else {
        withoutTracking++;
      }
    }

    await addResult('Orders Analysis', withAccount > 0 ? 'PASS' : 'WARNING', 
      `Recent orders: ${withAccount} with shipping account, ${withoutAccount} without`, {
      withTrackingNumber: withTracking,
      withoutTrackingNumber: withoutTracking
    });

    // Check orders that should be synced but might fail
    const ordersToSync = await prisma.order.findMany({
      where: {
        trackingNumber: { not: null },
        shippingStatus: { not: 'LIVRÉ' }
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        shippingAccount: {
          include: {
            company: true
          }
        }
      }
    });

    let syncableOrders = 0;
    let unsyncableOrders = 0;

    for (const order of ordersToSync) {
      if (order.shippingAccountId && order.trackingNumber) {
        syncableOrders++;
        await addResult('Syncable Orders', 'PASS', `Order ${order.reference} can be synced`, {
          reference: order.reference,
          trackingNumber: order.trackingNumber,
          currentStatus: order.shippingStatus,
          shippingAccount: order.shippingAccount?.name,
          company: order.shippingAccount?.company.name
        });
      } else {
        unsyncableOrders++;
        await addResult('Syncable Orders', 'FAIL', `Order ${order.reference} CANNOT be synced`, {
          reference: order.reference,
          trackingNumber: order.trackingNumber,
          currentStatus: order.shippingStatus,
          hasShippingAccount: !!order.shippingAccountId,
          hasTrackingNumber: !!order.trackingNumber,
          issue: !order.shippingAccountId ? 'No shipping account assigned' : 'No tracking number'
        });
      }
    }

    await addResult('Sync Readiness', syncableOrders > 0 ? 'PASS' : 'FAIL',
      `${syncableOrders} orders ready to sync, ${unsyncableOrders} orders cannot sync`);

  } catch (error: any) {
    await addResult('Orders Check', 'FAIL', 'Error checking orders', {
      error: error.message
    });
  }
}

async function checkLegacyMaystroOrders() {
  console.log('\n🔄 === CHECKING LEGACY MAYSTRO ORDERS ===\n');
  
  try {
    const legacyOrders = await prisma.order.findMany({
      where: {
        OR: [
          { maystroOrderId: { not: null } },
          { trackingNumber: { not: null } }
        ],
        shippingAccountId: null // Legacy orders without new shipping account
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    if (legacyOrders.length > 0) {
      await addResult('Legacy Orders', 'WARNING', 
        `Found ${legacyOrders.length} legacy orders without shipping account assignment`, {
        count: legacyOrders.length,
        samples: legacyOrders.slice(0, 3).map(o => ({
          reference: o.reference,
          trackingNumber: o.trackingNumber,
          maystroOrderId: o.maystroOrderId,
          status: o.shippingStatus
        })),
        action: 'These orders will not sync with new system. Consider migrating them.'
      });
    } else {
      await addResult('Legacy Orders', 'PASS', 'No legacy orders found or all migrated');
    }
  } catch (error: any) {
    await addResult('Legacy Orders', 'FAIL', 'Error checking legacy orders', {
      error: error.message
    });
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔧 === CHECKING ENVIRONMENT VARIABLES ===\n');
  
  const requiredVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'MAYSTRO_API_KEY',
    'MAYSTRO_BASE_URL'
  ];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      await addResult('Environment', 'PASS', `${varName} is set`);
    } else {
      await addResult('Environment', 'FAIL', `${varName} is NOT set`, {
        action: `Add ${varName} to your .env file`
      });
    }
  }
}

async function generateFixRecommendations() {
  console.log('\n💡 === FIX RECOMMENDATIONS ===\n');
  
  const failedChecks = results.filter(r => r.status === 'FAIL');
  const warnings = results.filter(r => r.status === 'WARNING');

  if (failedChecks.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed! System is properly configured.');
    return;
  }

  console.log('\n🔴 CRITICAL ISSUES TO FIX:\n');
  failedChecks.forEach((check, index) => {
    console.log(`${index + 1}. [${check.section}] ${check.message}`);
    if (check.details?.action) {
      console.log(`   Action: ${check.details.action}`);
    }
  });

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    warnings.forEach((check, index) => {
      console.log(`${index + 1}. [${check.section}] ${check.message}`);
      if (check.details?.action) {
        console.log(`   Action: ${check.details.action}`);
      }
    });
  }

  console.log('\n📝 RECOMMENDED FIXES:\n');
  console.log('1. Ensure shipping companies and accounts are created:');
  console.log('   docker-compose exec backend npm run db:seed\n');
  
  console.log('2. Link each store to a shipping account:');
  console.log('   - Go to Admin > Stores');
  console.log('   - For each store, click "Link Shipping Account"');
  console.log('   - Select the appropriate shipping account\n');
  
  console.log('3. Verify the link was saved:');
  console.log('   docker-compose exec postgres psql -U libertaphonix_prod -d libertaphonix_production -c "SELECT id, \\"storeName\\", \\"shippingAccountId\\" FROM api_configurations;"\n');
  
  console.log('4. Check backend logs for errors:');
  console.log('   docker-compose logs -f backend | grep -i "shipping\\|sync\\|error"\n');
  
  console.log('5. Test shipping sync manually:');
  console.log('   docker-compose exec backend npx ts-node src/scripts/test-shipping-sync.ts\n');
}

async function main() {
  console.log('🔍 ========================================');
  console.log('🔍 SHIPPING SYNC DIAGNOSTIC TOOL');
  console.log('🔍 ========================================\n');

  try {
    await checkEnvironmentVariables();
    await checkShippingCompanies();
    await checkShippingAccounts();
    await checkStoreShippingLinks();
    await checkOrdersWithShippingAccounts();
    await checkLegacyMaystroOrders();
    
    await generateFixRecommendations();

    console.log('\n📊 === DIAGNOSTIC SUMMARY ===\n');
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📋 Total Checks: ${results.length}\n`);

  } catch (error: any) {
    console.error('❌ Fatal error during diagnostics:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

main();