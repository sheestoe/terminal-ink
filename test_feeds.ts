
import { redis } from './src/Data/Redis.js';
(async () => {
    console.log('News:', await redis.get('config:feeds:news'));
    console.log('Trending:', await redis.get('config:feeds:trending'));
    process.exit(0);
})();

