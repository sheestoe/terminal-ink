import { redis } from './Redis.js';
import Parser from 'rss-parser';

export async function syncWeatherData() {
    try {
        // Marília, SP coordinates
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-22.2208&longitude=-49.9472&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSao_Paulo");
        const data = await res.json();
        await redis.set('data:weather', JSON.stringify(data));
        console.log("Weather synced to Redis");
    } catch (e) {
        console.error("Weather sync failed", e);
    }
}

export async function syncNewsData() {
    try {
        const parser = new Parser();
        const feed = await parser.parseURL('https://g1.globo.com/rss/g1/');
        const items = feed.items.slice(0, 4).map(item => ({
            title: item.title,
            date: item.pubDate
        }));
        await redis.set('data:news', JSON.stringify(items));
        console.log("News synced to Redis");
    } catch (e) {
        console.error("News sync failed", e);
    }
}

export async function ensureDefaultConfig() {
    // Set default refresh rate to 1 hora (3600 segundos) se não existir
    const refresh = await redis.get('config:refresh_rate');
    if (!refresh) {
        await redis.set('config:refresh_rate', 3600);
    }

    // Set default rotation if not exists
    const rotation = await redis.lrange('config:rotation', 0, -1);
    if (!rotation || rotation.length === 0) {
        await redis.rpush('config:rotation', 'weather', 'news');
    }
}

export function startBackgroundSync() {
    console.log("Starting background sync cron jobs...");
    ensureDefaultConfig();
    syncWeatherData();
    syncNewsData();

    // Refresh every 2 hours
    setInterval(syncWeatherData, 2 * 60 * 60 * 1000);
    setInterval(syncNewsData, 2 * 60 * 60 * 1000);
}

