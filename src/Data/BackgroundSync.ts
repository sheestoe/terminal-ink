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

export async function syncTodoistData() {
    try {
        const token = process.env.TODOIST_TOKEN;
        if (!token) {
            console.error("No TODOIST_TOKEN set");
            return;
        }

        const headers = { 'Authorization': 'Bearer ' + token };
        const [tasksRes, projectsRes] = await Promise.all([
            fetch('https://api.todoist.com/api/v1/tasks', { headers }),
            fetch('https://api.todoist.com/api/v1/projects', { headers })
        ]);

        if (!tasksRes.ok || !projectsRes.ok) {
            console.error("Todoist fetch failed");
            return;
        }

        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();
        
        const tasks = tasksData.results || [];
        const projects = projectsData.results || [];

        const projectMap = new Map();
        projects.forEach(p => {
            projectMap.set(p.id, { name: p.name, tasks: [] });
        });

        tasks.forEach(t => {
            if (projectMap.has(t.project_id)) {
                projectMap.get(t.project_id).tasks.push({
                    content: t.content,
                    due: t.due ? t.due.date : null
                });
            }
        });

        const grouped = Array.from(projectMap.values()).filter(p => p.tasks.length > 0);
        await redis.set('data:todoist', JSON.stringify(grouped));
        console.log("Todoist synced to Redis");
    } catch (e) {
        console.error("Todoist sync failed", e);
    }
}

export async function ensureDefaultConfig() {
    const refresh = await redis.get('config:refresh_rate');
    if (!refresh) {
        await redis.set('config:refresh_rate', 3600);
    }

    const rotation = await redis.lrange('config:rotation', 0, -1);
    if (!rotation || rotation.length === 0) {
        await redis.rpush('config:rotation', 'weather', 'news', 'todoist');
    }
}

export function startBackgroundSync() {
    console.log("Starting background sync cron jobs...");
    ensureDefaultConfig();
    syncWeatherData();
    syncNewsData();
    syncTodoistData();

    setInterval(syncWeatherData, 2 * 60 * 60 * 1000);
    setInterval(syncNewsData, 2 * 60 * 60 * 1000);
    setInterval(syncTodoistData, 15 * 60 * 1000);
}


