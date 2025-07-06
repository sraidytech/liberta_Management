import prisma from '../config/database';
import redis from '../config/redis';

async function testOnlineStatus() {
  console.log('🔍 Testing Online Status Detection System...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        availability: true,
        isActive: true
      }
    });

    console.log(`📊 Found ${users.length} users in database\n`);

    // Check Redis activity for each user
    for (const user of users) {
      const activityKey = `activity:agent:${user.id}`;
      const lastActivity = await redis.get(activityKey);
      
      let realStatus = 'OFFLINE';
      let timeSinceActivity = 'Never';
      
      if (lastActivity) {
        const lastActivityTime = new Date(lastActivity);
        const now = new Date();
        const timeDiff = now.getTime() - lastActivityTime.getTime();
        const minutes = Math.floor(timeDiff / (1000 * 60));
        
        timeSinceActivity = `${minutes} minutes ago`;
        
        // User is online if they have activity within 15 minutes
        if (timeDiff <= 15 * 60 * 1000) {
          realStatus = 'ONLINE';
        }
      }

      console.log(`👤 ${user.name || user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   DB Status: ${user.availability}`);
      console.log(`   Real Status: ${realStatus}`);
      console.log(`   Last Activity: ${timeSinceActivity}`);
      console.log(`   Active Account: ${user.isActive ? 'Yes' : 'No'}`);
      console.log('');
    }

    // Test the isAgentOnline function logic
    console.log('🧪 Testing Online Detection Logic...\n');
    
    const ACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    
    for (const user of users.slice(0, 3)) { // Test first 3 users
      const activityKey = `activity:agent:${user.id}`;
      const lastActivity = await redis.get(activityKey);
      
      let isOnline = false;
      
      if (lastActivity) {
        const lastActivityTime = new Date(lastActivity);
        const now = new Date();
        const timeDiff = now.getTime() - lastActivityTime.getTime();
        isOnline = timeDiff <= ACTIVITY_TIMEOUT;
      }
      
      console.log(`🔍 ${user.name || user.email}: ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);
    }

    // Show Redis keys for debugging
    console.log('\n🔑 Redis Activity Keys:');
    const keys = await redis.keys('activity:agent:*');
    console.log(`Found ${keys.length} activity keys in Redis`);
    
    for (const key of keys.slice(0, 5)) { // Show first 5 keys
      const value = await redis.get(key);
      const userId = key.replace('activity:agent:', '');
      const user = users.find(u => u.id === userId);
      console.log(`   ${key}: ${value} (${user?.name || 'Unknown User'})`);
    }

  } catch (error) {
    console.error('❌ Error testing online status:', error);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

// Run the test
testOnlineStatus().catch(console.error);