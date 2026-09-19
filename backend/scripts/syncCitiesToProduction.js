require('dotenv').config();
const mongoose = require('mongoose');

async function syncData() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);

    const client = mongoose.connection.client;
    const sourceDb = client.db('test');
    const targetDb = client.db('merisamaj');

    console.log('Fetching cities from "test" database...');
    const cities = await sourceDb.collection('cities').find({}).toArray();
    console.log(`Found ${cities.length} cities in "test" database.`);

    if (cities.length === 0) {
      console.log('No cities found in source database.');
      await mongoose.disconnect();
      return;
    }

    // Upsert cities into target DB matching by slug or name
    for (const city of cities) {
      const slug = city.slug || `${city.name}-${city.state || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      const existing = await targetDb.collection('cities').findOne({
        $or: [
          { slug: slug },
          { name: new RegExp(`^${city.name}$`, 'i') }
        ]
      });

      if (existing) {
        await targetDb.collection('cities').updateOne(
          { _id: existing._id },
          {
            $set: {
              name: city.name,
              code: city.code || existing.code,
              state: city.state || existing.state,
              country: city.country || 'India',
              isActive: city.isActive !== undefined ? city.isActive : true,
              slug: slug
            }
          }
        );
        console.log(`Updated city: ${city.name}`);
      } else {
        await targetDb.collection('cities').insertOne({
          name: city.name,
          code: city.code,
          state: city.state || 'Madhya Pradesh',
          country: city.country || 'India',
          isActive: city.isActive !== undefined ? city.isActive : true,
          slug: slug,
          createdAt: city.createdAt || new Date(),
          updatedAt: new Date()
        });
        console.log(`Inserted city: ${city.name}`);
      }
    }
    console.log(`Successfully synced ${cities.length} cities to "merisamaj" database.`);

    const totalTargetCities = await targetDb.collection('cities').countDocuments();
    console.log(`Target "merisamaj" DB now has ${totalTargetCities} cities.`);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Sync Error:', error);
    process.exit(1);
  }
}

syncData();
