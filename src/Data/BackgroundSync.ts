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
        
        const tasks = tasksData.results || tasksData || [];
        const projects = projectsData.results || projectsData || [];

        const projectMap = new Map();
        projects.forEach(p => {
            projectMap.set(p.id, { name: p.name, tasks: [] });
        });

        const agendaTasks = [];

        tasks.forEach(t => {
            const projectName = projectMap.has(t.project_id) ? projectMap.get(t.project_id).name : 'Inbox';
            const taskObj = {
                content: t.content,
                due: t.due ? t.due.date : null,
                project: projectName
            };

            if (projectMap.has(t.project_id)) {
                projectMap.get(t.project_id).tasks.push(taskObj);
            }

            if (t.due) {
                agendaTasks.push(taskObj);
            }
        });

        agendaTasks.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

        let grouped = Array.from(projectMap.values()).filter(p => p.tasks.length > 0);
        
                // Load target projects from Redis
        let targetProjects: any = await redis.get('config:todoist_projects');
        if (typeof targetProjects === 'string') {
            try { targetProjects = JSON.parse(targetProjects); } catch (e) { targetProjects = []; }
        }

        if (targetProjects && targetProjects.length > 0) {
            // Filter and sort based on target array
            grouped = targetProjects.map(name => grouped.find(p => p.name.toLowerCase() === name.toLowerCase()))
                                    .filter(Boolean);
        } else {
            // If no config, take first 3 that have tasks
            grouped = grouped.slice(0, 3);
        }

        await redis.set('data:todoist', JSON.stringify(grouped));
        await redis.set('data:todoist_agenda', JSON.stringify(agendaTasks));
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
        await redis.rpush('config:rotation', 'weather', 'news', 'todoist', 'todoist_agenda');
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






