import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash the admin password
  const hashedPassword = await bcrypt.hash('123456789', 12);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'contact@libertaphoenix.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      name: 'Admin Libertaphoenix',
      availability: 'ONLINE',
    },
    create: {
      email: 'contact@libertaphoenix.com',
      password: hashedPassword,
      name: 'Admin Libertaphoenix',
      role: 'ADMIN',
      isActive: true,
      availability: 'ONLINE',
      maxOrders: 0, // Admin doesn't handle orders directly
      currentOrders: 0,
    },
  });

  console.log('✅ Admin user created/updated:', {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
  });

  // Create some sample API configurations for EcoManager stores
  const apiConfigs = [
    {
      storeName: 'NATU - Natural DZ',
      storeIdentifier: 'NATU',
      apiToken: 'QSSbMS8sHJTg84pbX2zR9rFUm4QACkDsH315XXCRE67SVF8gkrQgkkNyzxqsSOB4PDVEu7pdqK38kdwL',
      baseUrl: 'https://natureldz.ecomanager.dz',
      isActive: true,
    },
    {
      storeName: 'PURNA - Purna Store',
      storeIdentifier: 'PURNA',
      apiToken: 'dqEjmOe1nNprl4xpqOKBP5ZiPJA0JvYHGGDgT86ksnUruXoaKNLECopMlLApKWgW2WI51TuoE1YdI9hQ',
      baseUrl: 'https://natureldz.ecomanager.dz',
      isActive: true,
    },
    {
      storeName: 'DILST - Dilst Store',
      storeIdentifier: 'DILST',
      apiToken: 'yC9UHJ8LrHPT6BDTapH1J7HzcdyftsV7dJ1d9yUqt0J0R1aRSxwnYD54daiiUvClGxsqPfKeRuiiWlha',
      baseUrl: 'https://natureldz.ecomanager.dz',
      isActive: true,
    },
    {
      storeName: 'MGSTR - Magasin Store',
      storeIdentifier: 'MGSTR',
      apiToken: 'yIEyxqQDgrGP2PtkMnV3wsN0ICFtdgQsqP5lweVe5nvVvXSCPDmn7MWv7CnaW0RZ0WEiEdFyk7pCU3MI',
      baseUrl: 'https://natureldz.ecomanager.dz',
      isActive: true,
    },
    {
      storeName: 'JWLR - Jewelry Store',
      storeIdentifier: 'JWLR',
      apiToken: '5UhNLDi8Xt39XG2FrZxK0Bw9qM5nYLrmiEIoOuqE4g9jX9efZ6Ndz4tPJVqhJ4Y31LxXaAuO17QWD5uq',
      baseUrl: 'https://natureldz.ecomanager.dz',
      isActive: true,
    },
  ];

  console.log('🏪 Creating API configurations for EcoManager stores...');

  for (const config of apiConfigs) {
    const apiConfig = await prisma.apiConfiguration.upsert({
      where: { storeIdentifier: config.storeIdentifier },
      update: {
        storeName: config.storeName,
        apiToken: config.apiToken,
        isActive: config.isActive,
        updatedAt: new Date(),
      },
      create: {
        ...config,
        createdById: adminUser.id,
      },
    });

    console.log(`✅ API Config created/updated: ${apiConfig.storeName} (${apiConfig.storeIdentifier})`);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Admin Login Credentials:');
  console.log('Email: contact@libertaphoenix.com');
  console.log('Password: 123456789');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });