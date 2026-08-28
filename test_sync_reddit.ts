
import { syncTrendingData } from './src/Data/BackgroundSync.js';
import { redis } from './src/Data/Redis.js';

(async () => {
    console.log('Syncing trending data...');
    await syncTrendingData();
    const trending = await redis.get('data:trending');
    console.log(trending);
    process.exit(0);
})();

