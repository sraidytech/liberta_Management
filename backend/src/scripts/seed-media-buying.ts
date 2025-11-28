/**
 * Seed script for Media Buying module
 * Creates default ad sources and initial exchange rate
 * 
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/seed-media-buying.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSources = [
  {
    name: 'Facebook Ads',
    slug: 'facebook_ads',
    icon: 'FB',
    color: '#1877F2',
    isActive: true,
  },
  {
    name: 'Google Ads',
    slug: 'google_ads',
    icon: 'G',
    color: '#EA4335',
    isActive: true,
  },
  {
    name: 'TikTok Ads',
    slug: 'tiktok_ads',
    icon: 'TT',
    color: '#000000',
    isActive: true,
  },
  {
    name: 'Instagram Ads',
    slug: 'instagram_ads',
    icon: 'IG',
    color: '#E4405F',
    isActive: true,
  },
  {
    name: 'Snapchat Ads',
    slug: 'snapchat_ads',
    icon: 'SC',
    color: '#FFFC00',
    isActive: true,
  },
  {
    name: 'Influencer Marketing',
    slug: 'influencer',
    icon: 'IN',
    color: '#8B5CF6',
    isActive: true,
  },
  {
    name: 'Other',
    slug: 'other',
    icon: '?',
    color: '#6B7280',
    isActive: true,
  },
];

async function seedMediaBuying() {
  console.log('🌱 Starting Media Buying seed...\n');

  // Get admin user for exchange rate creation
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.error('❌ No admin user found. Please create an admin user first.');
    process.exit(1);
  }

  // Seed Ad Sources
  console.log('📢 Creating default ad sources...');
  for (const source of defaultSources) {
    // Check by both slug and name to avoid duplicates
    const existingBySlug = await prisma.adSource.findUnique({
      where: { slug: source.slug },
    });
    const existingByName = await prisma.adSource.findUnique({
      where: { name: source.name },
    });

    if (existingBySlug || existingByName) {
      console.log(`  ⏭️  Source "${source.name}" already exists, skipping...`);
    } else {
      await prisma.adSource.create({
        data: source,
      });
      console.log(`  ✅ Created source: ${source.name}`);
    }
  }

  // Seed initial exchange rate
  console.log('\n💱 Creating initial exchange rate...');
  const existingRate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: 'USD',
      toCurrency: 'DZD',
    },
    orderBy: { effectiveDate: 'desc' },
  });

  if (existingRate) {
    console.log(`  ⏭️  Exchange rate already exists (1 USD = ${existingRate.rate} DZD), skipping...`);
  } else {
    await prisma.exchangeRate.create({
      data: {
        fromCurrency: 'USD',
        toCurrency: 'DZD',
        rate: 140.0,
        effectiveDate: new Date(),
        createdById: adminUser.id,
      },
    });
    console.log('  ✅ Created initial exchange rate: 1 USD = 140 DZD');
  }

  console.log('\n✨ Media Buying seed completed successfully!');
}

seedMediaBuying()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });