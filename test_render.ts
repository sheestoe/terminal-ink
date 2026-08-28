import { buildLiquid } from './src/Screen/BuildLiquid.js';
import { redis } from './src/Data/Redis.js';

async function test() {
    const cachedNews = await redis.get('data:news');
    const html = await buildLiquid('News', { news: cachedNews } as any);
    console.log(html);
}
test();
