require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function simpleCheck() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('test');
    const coaches = await db.collection('coaches').find({}).toArray();
    
    console.log(`\n👥 Found ${coaches.length} coaches:`);
    coaches.forEach((coach, i) => {
      console.log(`${i+1}. ${coach.username} | ${coach.password} | ${coach.name}`);
    });
    
    const clee1243 = coaches.find(c => c.username === 'clee1243');
    if (clee1243) {
      console.log('\n✅ Found clee1243:', clee1243);
    } else {
      console.log('\n❌ clee1243 not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

simpleCheck();
