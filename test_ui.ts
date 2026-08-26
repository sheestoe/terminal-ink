import process from 'process';
process.env.SECRET_KEY = "dummy";
process.env.PUBLIC_URL_ORIGIN = "http://dummy";

import { buildLiquid } from './src/Screen/BuildLiquid.js';
import { redis } from './src/Data/Redis.js';
import { syncNewsData } from './src/Data/BackgroundSync.js';
import fs from 'fs';

async function generate() {
    await syncNewsData(); // Força baixar os 3 canais novos pro Redis

    const cachedNews = await redis.get('data:news');
    const cachedWeather = await redis.get('data:weather');

    const newsHtml = await buildLiquid('News', { news: cachedNews } as any);
    fs.writeFileSync('news.html', newsHtml, 'utf8');
    console.log('✅ news.html gerado!');

    const weatherHtml = await buildLiquid('Weather', { data: cachedWeather } as any);
    fs.writeFileSync('weather.html', weatherHtml, 'utf8');
    console.log('✅ weather.html gerado!');
    
    process.exit(0);
}
generate();
