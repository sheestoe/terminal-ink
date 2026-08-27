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
                        dayMatch.tasks.push({ content: t.content, time: '' });
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
                process.env['GOOGLE_CLIENT_ID'],
                process.env['GOOGLE_CLIENT_SECRET']
            );
            oauth2Client.setCredentials(tokens);
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            // Fetch ALL subscribed calendars
            const calListRes = await calendar.calendarList.list({ minAccessRole: 'reader' });
            const allCals = calListRes.data.items || [];
            console.log("Found calendars:", allCals.map(c => c.summary).join(', '));

            // Check if user has a filter list in Redis
            let calFilterRaw: any = await redis.get('config:calendar_ids');
            let calFilter: string[] = [];
            if (calFilterRaw) {
                calFilter = typeof calFilterRaw === 'string' ? JSON.parse(calFilterRaw) : calFilterRaw;
            }

            const calsToFetch = calFilter.length > 0
                ? allCals.filter(c => calFilter.includes(c.id || '') || calFilter.includes(c.summary || ''))
                : allCals;

            for (const cal of calsToFetch) {
                if (!cal.id) continue;
                try {
                    const res = await calendar.events.list({
                        calendarId: cal.id,
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

                        const isAllDay = !ev.start.dateTime;
                        const localDate = new Date(new Date(dateRaw).getTime() - offset);
                        const dueStr = localDate.toISOString().split('T')[0];
                        
                        // Extract HH:MM in local time
                        let timeStr = '';
                        if (!isAllDay) {
                            const eventLocal = new Date(dateRaw);
                            timeStr = eventLocal.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                        }

                        const dayMatch = days.find(d => d.date === dueStr);
                        if (dayMatch) {
                            dayMatch.tasks.push({ content: ev.summary || 'Evento', time: timeStr });
                        }
                    });
                } catch (calErr) {
                    console.error("Failed to fetch calendar:", cal.summary, calErr);
                }
            }

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
                                dayMatch.tasks.push({ content: ev.summary || 'Evento', time: '' });
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
        // Primary: Open-Meteo (free, no key needed)
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-22.2208&longitude=-49.9472&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSao_Paulo");
        const data = await res.json();

        if (data.error || !data.current) {
            throw new Error(data.reason || 'Open-Meteo error');
        }

        await redis.set('data:weather', JSON.stringify(data));
        console.log("Weather synced to Redis (Open-Meteo)");
    } catch (e) {
        console.error("Open-Meteo failed, trying wttr.in backup:", (e as Error).message);
        try {
            // Fallback: wttr.in — no key, very generous limits
            const res = await fetch("https://wttr.in/Bauru?format=j1");
            const w = await res.json();
            const cur = w.current_condition[0];
            const days = w.weather;

            // Map wttr.in format to Open-Meteo format so the Liquid template works unchanged
            const mapped = {
                current: {
                    temperature_2m: parseFloat(cur.temp_C),
                    apparent_temperature: parseFloat(cur.FeelsLikeC),
                    relative_humidity_2m: parseFloat(cur.humidity),
                    weather_code: parseInt(cur.weatherCode),
                    wind_speed_10m: parseFloat(cur.windspeedKmph),
                },
                daily: {
                    weather_code:  days.map((d: any) => parseInt(d.hourly[4]?.weatherCode || 0)),
                    temperature_2m_max: days.map((d: any) => parseFloat(d.maxtempC)),
                    temperature_2m_min: days.map((d: any) => parseFloat(d.mintempC)),
                    precipitation_probability_max: days.map((d: any) => parseFloat(d.hourly[4]?.chanceofrain || 0)),
                    time: days.map((d: any) => d.date),
                }
            };

            await redis.set('data:weather', JSON.stringify(mapped));
            console.log("Weather synced to Redis (wttr.in backup)");
        } catch (e2) {
            console.error("Weather sync failed (both sources)", e2);
        }
    }
}

export async function syncTrendingData() {
    try {
        const parser = new Parser({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        const fetchFeed = async (url: string, name: string) => {
            try {
                // Reddit blocks Render/AWS IPs aggressively. Use allorigins proxy.
                let fetchUrl = url;
                if (url.includes('reddit.com')) {
                    fetchUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
                }
                const feed = await parser.parseURL(fetchUrl);
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

        let rawFeeds: any = await redis.get('config:feeds:trending');
        let feedsList = [];
        if (typeof rawFeeds === 'string') {
            try { feedsList = JSON.parse(rawFeeds); } catch (e) {}
        } else if (Array.isArray(rawFeeds)) {
            feedsList = rawFeeds;
        }

        if (feedsList.length === 0) {
            feedsList = [
                { url: 'https://www.reddit.com/r/brasil/hot.rss', name: 'Reddit r/brasil' },
                { url: 'https://www.reddit.com/r/technology/hot.rss', name: 'Tech Trending' }
            ];
        }

        const feedPromises = feedsList.map((f: any) => fetchFeed(f.url, f.name));
        const feedResults = await Promise.all(feedPromises);

        await redis.set('data:trending', JSON.stringify(feedResults));
        console.log("Trending synced to Redis");
    } catch (e) {
        console.error("Trending sync failed", e);
    }
}

export async function syncNewsData() {
    try {
        const parser = new Parser({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        const fetchFeed = async (url: string, name: string) => {
            try {
                // Reddit blocks Render/AWS IPs aggressively. Use allorigins proxy.
                let fetchUrl = url;
                if (url.includes('reddit.com')) {
                    fetchUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
                }
                const feed = await parser.parseURL(fetchUrl);
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

        let rawFeeds: any = await redis.get('config:feeds:news');
        let feedsList = [];
        if (typeof rawFeeds === 'string') {
            try { feedsList = JSON.parse(rawFeeds); } catch (e) {}
        } else if (Array.isArray(rawFeeds)) {
            feedsList = rawFeeds;
        }

        if (feedsList.length === 0) {
            feedsList = [
                { url: 'https://g1.globo.com/rss/g1/', name: 'G1 Globo' },
                { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', name: 'BBC Brasil' },
                { url: 'https://www.cnnbrasil.com.br/feed/', name: 'CNN Brasil' }
            ];
        }

        const feedPromises = feedsList.map((f: any) => fetchFeed(f.url, f.name));
        const feedResults = await Promise.all(feedPromises);

        await redis.set('data:news', JSON.stringify(feedResults));
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

        // Intervals (in minutes)
        const iWeather = parseInt(await redis.get('config:interval:weather') as string) || 60;
        const iNews = parseInt(await redis.get('config:interval:news') as string) || 120;
        const iTrending = parseInt(await redis.get('config:interval:trending') as string) || 120;
        const iTodoist = parseInt(await redis.get('config:interval:todoist') as string) || 15;
        const iCalendar = parseInt(await redis.get('config:interval:agenda') as string) || 120;

        // 1. WEATHER
        const weatherExpire = await redis.get('expire:weather');
        if (!weatherExpire || now > parseInt(weatherExpire as string)) {
            await syncWeatherData();
            await redis.set('expire:weather', (now + iWeather * 60 * 1000).toString());
        }

        // 2. NEWS
        const newsExpire = await redis.get('expire:news');
        if (!newsExpire || now > parseInt(newsExpire as string)) {
            await syncNewsData();
            await redis.set('expire:news', (now + iNews * 60 * 1000).toString());
        }
        
        // 2b. TRENDING
        const trendingExpire = await redis.get('expire:trending');
        if (!trendingExpire || now > parseInt(trendingExpire as string)) {
            await syncTrendingData();
            await redis.set('expire:trending', (now + iTrending * 60 * 1000).toString());
        }

        // 3. TODOIST
        const todoistExpire = await redis.get('expire:todoist');
        if (!todoistExpire || now > parseInt(todoistExpire as string)) {
            await syncTodoistData();
            await redis.set('expire:todoist', (now + iTodoist * 60 * 1000).toString());
        }

        // 4. CALENDAR
        const calExpire = await redis.get('expire:calendar');
        if (!calExpire || now > parseInt(calExpire as string)) {
            await syncCalendarData();
            await redis.set('expire:calendar', (now + iCalendar * 60 * 1000).toString());
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



















