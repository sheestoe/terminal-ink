import { redis } from './Redis.js';
import Parser from 'rss-parser';

export async function syncWeatherData() {
    try {
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
        
        const fetchFeed = async (url: string, name: string) => {
            try {
                const feed = await parser.parseURL(url);
                return {
                    name,
                    items: feed.items.slice(0, 4).map(item => ({
                        title: item.title,
                        date: item.pubDate
                    }))
                };
            } catch (e) {
                console.error("Failed to fetch", name, e);
                return { name, items: [] };
            }
        };

        const [g1, bbc, cnn] = await Promise.all([
            fetchFeed('https://g1.globo.com/rss/g1/', 'G1 Globo'),
            fetchFeed('https://feeds.bbci.co.uk/portuguese/rss.xml', 'BBC Brasil'),
            fetchFeed('https://www.cnnbrasil.com.br/feed/', 'CNN Brasil')
        ]);

        await redis.set('data:news', JSON.stringify([g1, bbc, cnn]));
        console.log("News synced to Redis");
    } catch (e) {
        console.error("News sync failed", e);
    }
}

export async function ensureDefaultConfig() {
    const refresh = await redis.get('config:refresh_rate');
    if (!refresh) {
        await redis.set('config:refresh_rate', 3600);
    }

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

    setInterval(syncWeatherData, 2 * 60 * 60 * 1000);
    setInterval(syncNewsData, 2 * 60 * 60 * 1000);
}
