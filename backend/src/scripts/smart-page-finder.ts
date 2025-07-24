import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

interface StoreResult {
  storeIdentifier: string;
  storeName: string;
  lastOrderId: number;
  exactPage: number;
  totalChecks: number;
  found: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  searchMethod: string;
}

async function smartPageFinder() {
  console.log('🧠 SMART PAGE FINDER WITH INTELLIGENT JUMPING...\n');

  try {
    const apiConfigs = await prisma.apiConfiguration.findMany({
      where: { isActive: true }
    });

    if (apiConfigs.length === 0) {
      console.log('❌ No active API configurations found!');
      return;
    }

    console.log(`✅ Found ${apiConfigs.length} active stores\n`);

    const results: StoreResult[] = [];

    for (const config of apiConfigs) {
      console.log(`🏪 Processing store: ${config.storeName} (${config.storeIdentifier})`);
      
      try {
        const lastOrderResult = await prisma.$queryRaw<Array<{ecoManagerId: string}>>`
          SELECT "ecoManagerId"
          FROM "orders"
          WHERE "storeIdentifier" = ${config.storeIdentifier}
            AND "source" = 'ECOMANAGER'
            AND "ecoManagerId" IS NOT NULL
          ORDER BY CAST("ecoManagerId" AS INTEGER) DESC
          LIMIT 1
        `;

        if (lastOrderResult.length === 0) {
          console.log('   ⚠️  No orders found in database for this store\n');
          continue;
        }

        const lastOrderId = parseInt(lastOrderResult[0].ecoManagerId);
        console.log(`   📈 Target order ID: ${lastOrderId}`);

        // Use smart cursor-based search with intelligent jumping
        console.log(`   🧠 Starting smart search with intelligent jumping...`);
        const searchResult = await smartCursorSearch(config, lastOrderId);

        results.push({
          storeIdentifier: config.storeIdentifier,
          storeName: config.storeName,
          lastOrderId,
          exactPage: searchResult.page,
          totalChecks: searchResult.totalChecks,
          found: searchResult.found,
          confidence: searchResult.found ? 'HIGH' : 'MEDIUM',
          searchMethod: searchResult.method
        });

        if (searchResult.found) {
          console.log(`   ✅ SUCCESS! Found order ${lastOrderId} on page ${searchResult.page}`);
          console.log(`   📊 Total API calls: ${searchResult.totalChecks}`);
          console.log(`   🎯 Method: ${searchResult.method}`);
        } else {
          console.log(`   ⚠️  Best estimate: page ${searchResult.page}`);
          console.log(`   📊 Total API calls: ${searchResult.totalChecks}`);
        }
        console.log('');

      } catch (error) {
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log('');
      }
    }

    // Create final results
    await createFinalResults(results);

  } catch (error) {
    console.error('❌ Smart finder failed:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

/**
 * Smart cursor-based search with intelligent jumping
 */
async function smartCursorSearch(config: any, targetOrderId: number): Promise<{
  found: boolean;
  page: number;
  totalChecks: number;
  method: string;
}> {
  
  const baseUrl = (config as any).baseUrl || 'https://natureldz.ecomanager.dz/api/shop/v2';
  let totalChecks = 0;

  console.log(`     🧠 Smart search for order ${targetOrderId}...`);

  try {
    // Phase 1: Sample a few cursor positions to understand the ID distribution
    console.log(`     📊 Phase 1: Sampling order ID distribution...`);
    const samples = await sampleOrderDistribution(baseUrl, config.apiToken);
    totalChecks += samples.totalChecks;

    if (samples.samples.length === 0) {
      console.log(`     ❌ Could not get any samples`);
      return { found: false, page: 1, totalChecks, method: 'NO_SAMPLES' };
    }

    // Display samples
    console.log(`     📋 Order ID samples:`);
    samples.samples.forEach((sample, index) => {
      console.log(`       Position ${sample.position}: ID ${sample.maxId} - ${sample.minId}`);
    });

    // Phase 2: Estimate target position based on ID distribution
    const estimatedPosition = estimatePositionFromSamples(samples.samples, targetOrderId);
    console.log(`     🎯 Estimated position for order ${targetOrderId}: ${estimatedPosition}`);

    // Phase 3: Jump to estimated area and search precisely
    console.log(`     🚀 Phase 2: Jumping to estimated area (position ${estimatedPosition})...`);
    const preciseResult = await preciseSearchAroundPosition(baseUrl, config.apiToken, targetOrderId, estimatedPosition);
    totalChecks += preciseResult.totalChecks;

    if (preciseResult.found) {
      const exactPage = Math.ceil(preciseResult.exactPosition / 20);
      console.log(`     ✅ Found at exact position ${preciseResult.exactPosition}, page ${exactPage}`);
      return {
        found: true,
        page: exactPage,
        totalChecks,
        method: 'SMART_JUMP_SEARCH'
      };
    }

    // Phase 4: Fallback estimation
    const fallbackPage = Math.max(1, Math.ceil(estimatedPosition / 20));
    console.log(`     📊 Fallback estimate: page ${fallbackPage}`);
    
    return {
      found: false,
      page: fallbackPage,
      totalChecks,
      method: 'SMART_ESTIMATION'
    };

  } catch (error: any) {
    console.error(`     ❌ Smart search failed: ${error.message}`);
    return { found: false, page: 1, totalChecks, method: 'ERROR_FALLBACK' };
  }
}

/**
 * Sample order distribution to understand ID ranges
 */
async function sampleOrderDistribution(baseUrl: string, apiToken: string): Promise<{
  samples: Array<{ position: number; minId: number; maxId: number; cursor?: string }>;
  totalChecks: number;
}> {
  
  const samples: Array<{ position: number; minId: number; maxId: number; cursor?: string }> = [];
  let totalChecks = 0;
  let cursor: string | null = null;
  let position = 0;

  // Sample at positions: 1, 100, 500, 1000, 2000, 5000
  const samplePositions = [1, 100, 500, 1000, 2000, 5000];
  let currentSampleIndex = 0;
  let targetPosition = samplePositions[currentSampleIndex];

  try {
    while (currentSampleIndex < samplePositions.length && totalChecks < 50) {
      const params: any = {
        per_page: 20,
        sort_direction: 'desc'
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const apiResult = await makeApiCallWithRateLimit(baseUrl, apiToken, params);
      totalChecks++;

      if (!apiResult.success || !apiResult.orders || apiResult.orders.length === 0) {
        break;
      }

      position += apiResult.orders.length;

      // Check if we've reached or passed our target sample position
      if (position >= targetPosition) {
        const orders = apiResult.orders;
        const minId = Math.min(...orders.map((o: any) => o.id));
        const maxId = Math.max(...orders.map((o: any) => o.id));

        samples.push({
          position: targetPosition,
          minId,
          maxId,
          cursor: apiResult.nextCursor
        });

        console.log(`       Sample at position ${targetPosition}: ID range ${maxId} - ${minId}`);

        // Move to next sample position
        currentSampleIndex++;
        if (currentSampleIndex < samplePositions.length) {
          targetPosition = samplePositions[currentSampleIndex];
        }
      }

      cursor = apiResult.nextCursor || null;
      if (!cursor) {
        break;
      }
    }

  } catch (error: any) {
    console.log(`       ⚠️  Sampling stopped: ${error.message}`);
  }

  return { samples, totalChecks };
}

/**
 * Estimate position based on order ID samples
 */
function estimatePositionFromSamples(samples: Array<{ position: number; minId: number; maxId: number }>, targetOrderId: number): number {
  if (samples.length === 0) return 1;

  // Find the best range where target ID might be
  for (let i = 0; i < samples.length - 1; i++) {
    const currentSample = samples[i];
    const nextSample = samples[i + 1];

    // Check if target is between these two samples
    if (targetOrderId <= currentSample.minId && targetOrderId >= nextSample.maxId) {
      // Linear interpolation between the two samples
      const idRange = currentSample.minId - nextSample.maxId;
      const positionRange = nextSample.position - currentSample.position;
      const idOffset = currentSample.minId - targetOrderId;
      const estimatedOffset = (idOffset / idRange) * positionRange;
      
      const estimatedPosition = Math.floor(currentSample.position + estimatedOffset);
      console.log(`       🎯 Target ${targetOrderId} estimated between positions ${currentSample.position}-${nextSample.position}`);
      console.log(`       📊 Linear interpolation: position ${estimatedPosition}`);
      
      return estimatedPosition;
    }
  }

  // If not found between samples, extrapolate
  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];

  if (targetOrderId > firstSample.maxId) {
    // Target is newer than our first sample
    console.log(`       🎯 Target ${targetOrderId} is newer than first sample, estimating early position`);
    return Math.max(1, firstSample.position - 100);
  }

  if (targetOrderId < lastSample.minId) {
    // Target is older than our last sample, extrapolate
    const avgIdPerPosition = (firstSample.maxId - lastSample.minId) / (lastSample.position - firstSample.position);
    const extrapolatedPosition = lastSample.position + ((lastSample.minId - targetOrderId) / avgIdPerPosition);
    console.log(`       🎯 Target ${targetOrderId} is older than last sample, extrapolating to position ${Math.floor(extrapolatedPosition)}`);
    return Math.floor(extrapolatedPosition);
  }

  // Default fallback
  return firstSample.position;
}

/**
 * Precise search around estimated position
 */
async function preciseSearchAroundPosition(baseUrl: string, apiToken: string, targetOrderId: number, estimatedPosition: number): Promise<{
  found: boolean;
  exactPosition: number;
  totalChecks: number;
}> {
  
  let totalChecks = 0;
  
  // Jump to estimated position using cursor navigation
  console.log(`     🎯 Jumping to estimated position ${estimatedPosition}...`);
  
  let cursor: string | null = null;
  let currentPosition = 0;
  
  // Navigate to estimated position
  while (currentPosition < estimatedPosition && totalChecks < 20) {
    const params: any = {
      per_page: 20,
      sort_direction: 'desc'
    };

    if (cursor) {
      params.cursor = cursor;
    }

    const apiResult = await makeApiCallWithRateLimit(baseUrl, apiToken, params);
    totalChecks++;

    if (!apiResult.success || !apiResult.orders || apiResult.orders.length === 0) {
      break;
    }

    currentPosition += apiResult.orders.length;
    cursor = apiResult.nextCursor || null;

    if (!cursor) break;
  }

  // Now search precisely in the area around estimated position
  console.log(`     🔍 Precise search around position ${currentPosition}...`);
  
  const searchRadius = 200; // Search ±200 positions (10 pages each direction)
  let searchPosition = Math.max(0, currentPosition - searchRadius);
  
  // Reset to search area
  cursor = null;
  currentPosition = 0;
  
  // Navigate to search start position
  while (currentPosition < searchPosition && totalChecks < 30) {
    const params: any = {
      per_page: 20,
      sort_direction: 'desc'
    };

    if (cursor) {
      params.cursor = cursor;
    }

    const apiResult = await makeApiCallWithRateLimit(baseUrl, apiToken, params);
    totalChecks++;

    if (!apiResult.success || !apiResult.orders || apiResult.orders.length === 0) {
      break;
    }

    currentPosition += apiResult.orders.length;
    cursor = apiResult.nextCursor || null;

    if (!cursor) break;
  }

  // Precise search in the target area
  const maxSearchChecks = 20; // Limit precise search
  let searchChecks = 0;
  
  while (searchChecks < maxSearchChecks && totalChecks < 50) {
    const params: any = {
      per_page: 20,
      sort_direction: 'desc'
    };

    if (cursor) {
      params.cursor = cursor;
    }

    const apiResult = await makeApiCallWithRateLimit(baseUrl, apiToken, params);
    totalChecks++;
    searchChecks++;

    if (!apiResult.success || !apiResult.orders || apiResult.orders.length === 0) {
      break;
    }

    // Check if target order is in this batch
    for (let i = 0; i < apiResult.orders.length; i++) {
      const order = apiResult.orders[i];
      if (order.id === targetOrderId) {
        const exactPosition = currentPosition + i + 1;
        console.log(`     ✅ FOUND! Order ${targetOrderId} at exact position ${exactPosition}`);
        return {
          found: true,
          exactPosition,
          totalChecks
        };
      }
    }

    currentPosition += apiResult.orders.length;
    cursor = apiResult.nextCursor || null;

    if (!cursor) break;
  }

  return {
    found: false,
    exactPosition: 0,
    totalChecks
  };
}

/**
 * Make API call with 1-minute rate limit handling
 */
async function makeApiCallWithRateLimit(baseUrl: string, apiToken: string, params: any): Promise<{
  success: boolean;
  orders?: any[];
  nextCursor?: string;
}> {
  
  try {
    const response = await axios.get(`${baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      params,
      timeout: 20000
    });

    const data = (response.data as any);
    return {
      success: true,
      orders: data.data || [],
      nextCursor: data.meta?.next_cursor
    };

  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log(`       ⏳ Rate limited, waiting 60 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute wait
      
      // Retry once after rate limit
      try {
        const response = await axios.get(`${baseUrl}/orders`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          params,
          timeout: 20000
        });

        const data = (response.data as any);
        return {
          success: true,
          orders: data.data || [],
          nextCursor: data.meta?.next_cursor
        };
      } catch (retryError: any) {
        console.log(`       ❌ Retry failed: ${retryError.message}`);
        return { success: false };
      }
    }

    console.log(`       ❌ API error: ${error.message}`);
    return { success: false };
  }
}

/**
 * Create final results and save them
 */
async function createFinalResults(results: StoreResult[]): Promise<void> {
  // Create JSON backup
  const backupData: any = {
    metadata: {
      createdAt: new Date().toISOString(),
      method: 'SMART_JUMP_SEARCH',
      totalStores: results.length,
      foundExact: results.filter(r => r.found).length
    },
    stores: {}
  };

  for (const result of results) {
    backupData.stores[result.storeIdentifier] = {
      lastPage: result.exactPage,
      lastOrderId: result.lastOrderId,
      timestamp: new Date().toISOString(),
      storeName: result.storeName,
      found: result.found,
      confidence: result.confidence,
      totalChecks: result.totalChecks,
      searchMethod: result.searchMethod
    };
  }

  // Save JSON backup
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const backupFilePath = path.join(dataDir, 'sync-pages-backup.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Smart search results saved: ${backupFilePath}`);

  // Update Redis
  console.log('\n💾 UPDATING REDIS...');
  for (const result of results) {
    const pageInfoKey = `ecomanager:pageinfo:${result.storeIdentifier}`;
    const pageInfo = {
      lastPage: result.exactPage,
      firstId: Math.max(1, result.lastOrderId - 19),
      lastId: result.lastOrderId,
      timestamp: new Date().toISOString(),
      storeName: result.storeName,
      recoveryMethod: 'SMART_JUMP_SEARCH',
      found: result.found,
      confidence: result.confidence
    };

    await redis.set(pageInfoKey, JSON.stringify(pageInfo), 'EX', 86400 * 7);
    console.log(`   ✅ Updated Redis for ${result.storeIdentifier}: page ${result.exactPage}`);
  }

  // Display final results
  console.log('\n🎯 SMART SEARCH RESULTS');
  console.log('=' .repeat(140));
  
  console.log('\n📋 Final Results:');
  console.log('-'.repeat(120));
  console.log('| Store ID | Store Name        | Last Order ID | Page | Checks | Found | Method           |');
  console.log('-'.repeat(120));

  for (const result of results) {
    const foundStatus = result.found ? '✅ YES' : '❌ NO';
    console.log(`| ${result.storeIdentifier.padEnd(8)} | ${result.storeName.padEnd(17)} | ${result.lastOrderId.toString().padEnd(13)} | ${result.exactPage.toString().padEnd(4)} | ${result.totalChecks.toString().padEnd(6)} | ${foundStatus.padEnd(5)} | ${result.searchMethod.padEnd(16)} |`);
  }
  console.log('-'.repeat(120));

  const totalChecks = results.reduce((sum, r) => sum + r.totalChecks, 0);
  const foundCount = results.filter(r => r.found).length;
  
  console.log(`\n📊 SUMMARY: ${foundCount}/${results.length} found exactly, ${totalChecks} total API calls`);
  console.log('🚀 Smart search complete - ready for production!');
}

// Run the smart finder
smartPageFinder().catch(console.error);