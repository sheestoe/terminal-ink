import { redis } from './Redis.js';
import Parser from 'rss-parser';
import { google } from 'googleapis';
import ical from 'node-ical';

export async function syncCalendarData() {
    try {
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localToday = new Date(today.getTime() - offset);
        localToday.setUTCHours(0, 0, 0, 0);

        const days: { date: string, dayName: string, tasks: any[] }[] = [];
        const dayNames = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

        for (let i = 0; i < 8; i++) {
            const d = new Date(localToday);
            d.setUTCDate(d.getUTCDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            let name = i === 0 ? 'HOJE' : i === 1 ? 'AMANHÃ' : dayNames[d.getUTCDay()];
            days.push({ date: dateStr, dayName: name, tasks: [] });
        }

        const rangeStart = new Date();
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(rangeStart.getTime() + 8 * 24 * 60 * 60 * 1000);

        // 1. Todoist tasks
        try {
            const rawTd = await redis.get('data:todoist_agenda_raw');
            if (rawTd) {
                const tdTasks = typeof rawTd === 'string' ? JSON.parse(rawTd) : rawTd;
                tdTasks.forEach((t: any) => {
                    const dayMatch = days.find(d => d.date === t.due);
                    if (dayMatch) {
                        dayMatch.tasks.push({ content: t.content });
                    }
                });
            }
        } catch(e) { console.error("Failed to parse todoist agenda raw", e); }

        // 2. Fetch via Google Calendar OAuth OR Fallback to iCal URLs
        const googleTokensRaw = await redis.get('config:google_tokens');
        if (googleTokensRaw) {
            console.log("Using Google OAuth to fetch Calendar events...");
            const tokens = typeof googleTokensRaw === 'string' ? JSON.parse(googleTokensRaw) : googleTokensRaw;
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );
            oauth2Client.setCredentials(tokens);
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            
            // By default, fetches primary. If they want other calendars, we can loop over them later.
            const res = await calendar.events.list({
                calendarId: 'primary',
                timeMin: rangeStart.toISOString(),
                timeMax: rangeEnd.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });
            
            const events = res.data.items || [];
            events.forEach(ev => {
                if (!ev.start) return;
                const dateRaw = ev.start.dateTime || ev.start.date;
                if (!dateRaw) return;
                
                const localDate = new Date(new Date(dateRaw).getTime() - offset);
                const dueStr = localDate.toISOString().split('T')[0];
                const dayMatch = days.find(d => d.date === dueStr);
                if (dayMatch) {
                    dayMatch.tasks.push({ content: ev.summary || 'Evento' });
                }
            });

        } else {
            // Fallback to iCal logic
            let urlsRaw: any = await redis.get('config:calendar_urls');
            if (typeof urlsRaw === 'string') {
                try { urlsRaw = JSON.parse(urlsRaw); } catch(e) { urlsRaw = [urlsRaw]; }
            }
            let urls = urlsRaw || [];
            if (!Array.isArray(urls)) urls = [urls];

            for (const url of urls) {
                if (!url) continue;
                try {
                    const events = await ical.async.fromURL(url);
                    for (let k in events) {
                        if (!events.hasOwnProperty(k)) continue;
                        const ev = events[k] as any;
                        if (ev.type !== 'VEVENT') continue;

                        const addEvent = (date: Date) => {
                            const localDate = new Date(date.getTime() - offset);
                            const dueStr = localDate.toISOString().split('T')[0];
                            const dayMatch = days.find(d => d.date === dueStr);
                            if (dayMatch) {
                                dayMatch.tasks.push({ content: ev.summary || 'Evento' });
                            }
                        };

                        if (ev.rrule) {
                            const dates = ev.rrule.between(rangeStart, rangeEnd);
                            dates.forEach(d => addEvent(d));
                        } else {
                            const start = new Date(ev.start);
                            if (start >= rangeStart && start <= rangeEnd) {
                                addEvent(start);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch calendar URL", url, err);
                }
            }
        }

        const hasAgendaTasks = days.some(d => d.tasks.length > 0);
        await redis.set('data:agenda', hasAgendaTasks ? JSON.stringify(days) : '[]');
        console.log("Calendar synced to Redis");
    } catch (e) {
        console.error("Calendar sync failed", e);
    }
}

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
        if (!token) return;

        const headers = { 'Authorization': 'Bearer ' + token };
        const [tasksRes, projectsRes] = await Promise.all([
            fetch('https://api.todoist.com/api/v1/tasks', { headers }),
            fetch('https://api.todoist.com/api/v1/projects', { headers })
        ]);

        if (!tasksRes.ok || !projectsRes.ok) return;

        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();
        
        const tasks = tasksData.results || tasksData || [];
        const projects = projectsData.results || projectsData || [];

                const projectMap = new Map();
        projects.forEach(p => projectMap.set(p.id, { name: p.name, tasks: [] }));

        const agendaTasks: any[] = [];

        tasks.forEach(t => {
            const projectName = projectMap.has(t.project_id) ? projectMap.get(t.project_id).name : 'Inbox';
            if (projectMap.has(t.project_id)) {
                projectMap.get(t.project_id).tasks.push({ content: t.content });
            }
            if (t.due && t.due.date) {
                agendaTasks.push({ content: '[TD] ' + t.content, due: t.due.date.split('T')[0] });
            }
        });

        await redis.set('data:todoist_agenda_raw', JSON.stringify(agendaTasks));

        let grouped = Array.from(projectMap.values()).filter(p => p.tasks.length > 0);
        
        let targetProjects: any = await redis.get('config:todoist_projects');
        if (typeof targetProjects === 'string') {
            try { targetProjects = JSON.parse(targetProjects); } catch (e) { targetProjects = []; }
        }

        if (targetProjects && targetProjects.length > 0) {
            grouped = targetProjects.map(name => grouped.find(p => p.name.toLowerCase() === name.toLowerCase())).filter(Boolean);
        } else {
            grouped = grouped.slice(0, 3);
        }

        await redis.set('data:todoist', JSON.stringify(grouped));
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

export async function checkAndSync() {
    try {
        const now = Date.now();

        // 1. WEATHER (Expires at 6:00 AM next day, or if forced)
        const weatherExpire = await redis.get('expire:weather');
        if (!weatherExpire || now > parseInt(weatherExpire as string)) {
            await syncWeatherData();
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(6, 0, 0, 0);
            await redis.set('expire:weather', tomorrow.getTime().toString());
        }

        // 2. NEWS (Expires every 2 hours, or if forced)
        const newsExpire = await redis.get('expire:news');
        if (!newsExpire || now > parseInt(newsExpire as string)) {
            await syncNewsData();
            await redis.set('expire:news', (now + 2 * 60 * 60 * 1000).toString());
        }

        // 3. TODOIST (Expires every 15 minutes, or if forced)
        const todoistExpire = await redis.get('expire:todoist');
        if (!todoistExpire || now > parseInt(todoistExpire as string)) {
            await syncTodoistData();
            await redis.set('expire:todoist', (now + 2 * 60 * 60 * 1000).toString());
        }

            // 4. CALENDAR (Expires every 2 hours, or if forced)
        const calExpire = await redis.get('expire:calendar');
        if (!calExpire || now > parseInt(calExpire as string)) {
            await syncCalendarData();
            await redis.set('expire:calendar', (now + 2 * 60 * 60 * 1000).toString());
        }
    } catch (e) {
        console.error("Error in checkAndSync:", e);
    }
}

export function startBackgroundSync() {
    console.log("Starting unified background sync engine...");
    ensureDefaultConfig();
    
    // Run immediately, then check every 60 seconds
    checkAndSync();
    setInterval(checkAndSync, 60 * 1000);
}


















