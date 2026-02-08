import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function startServer() {
  try {
    console.log('\n🔍 Checking database connection...\n');
    
    // Test database connectivity with a simple query
    const userCount = await prisma.user.count();
    
    console.log('✅ Database is connected and accessible!');
    console.log(`📊 Users in database: ${userCount}\n`);
    
    // Import and start the server
    console.log('🚀 Starting server...\n');
    const { createServer } = await import('./src/index.js');
    return true;
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\n⚠️  Cannot start server without database connection.');
    console.error('Please verify:');
    console.error('  1. Database server is running');
    console.error('  2. DATABASE_URL env var is correct');
    console.error('  3. Network connectivity to the database\n');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

const success = await startServer();
process.exit(success ? 0 : 1);
