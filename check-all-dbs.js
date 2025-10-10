require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkAllDatabases() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    // List all databases
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    console.log('\n📊 All databases:');
    for (const dbInfo of dbs.databases) {
      console.log(`\n🗄️  Database: ${dbInfo.name}`);
      
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
      
      // Check for coaches in this database
      if (collections.some(c => c.name === 'coaches')) {
        const coaches = await db.collection('coaches').find({}).toArray();
        console.log(`   👥 Coaches: ${coaches.length}`);
        
        if (coaches.length > 0) {
          console.log('   📋 Coach list:');
          coaches.slice(0, 5).forEach((coach, i) => {
            console.log(`     ${i+1}. ${coach.username} | ${coach.password} | ${coach.name}`);
          });
          
          const clee1243 = coaches.find(c => c.username === 'clee1243');
          if (clee1243) {
            console.log(`   ✅ FOUND clee1243 in database "${dbInfo.name}":`, clee1243);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAllDatabases();
