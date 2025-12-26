import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';

async function resetDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();

    console.log('🗑️  Dropping all tables...');
    
    // Drop all tables
    await AppDataSource.dropDatabase();

    console.log('✅ Database reset complete!');
    console.log('💡 Restart your server to recreate tables automatically (synchronize is enabled in dev mode)');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();

