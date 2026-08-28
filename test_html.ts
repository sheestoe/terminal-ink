import { buildLiquid } from './src/Screen/BuildLiquid.js';
import { redis } from './src/Data/Redis.js';
import fs from 'fs';

async function test() {
    const cachedNews = await redis.get('data:news');
    const html = await buildLiquid('News', { news: cachedNews } as any);
    fs.writeFileSync('test.html', html);
    console.log("HTML length:", html.length);
}
test();
