import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Try to query the User table to verify connection
    const userCount = await prisma.user.count();
    
    console.log('✅ Database is connected and accessible!');
    console.log(`📊 Users in database: ${userCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

const success = await checkDatabase();
process.exit(success ? 0 : 1);
