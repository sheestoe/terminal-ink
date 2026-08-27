import express, {NextFunction, Request, Response} from "express";
import {
    SECRET_KEY,
    SERVER_HOST,
    SERVER_PORT,
    BYOS_ENABLED,
    REFRESH_RATE_SECONDS,
    SCREEN_URL, IS_TEST_ENV
} from "Config.js";
import {buildScreen, checkImageUrl, getScreenHash} from "Screen/Screen.js";
import {BYOSRoutes} from "BYOS/BYOSRoutes.js";
import {ROUTE_IMAGE, ROUTE_PLUGIN_REDIRECT} from "Routes.js";
import {initPuppeteer} from "./Screen/RenderHTML.js";
import {startBackgroundSync, checkAndSync} from "./Data/BackgroundSync.js";
import {redis} from "./Data/Redis.js";
import { google } from 'googleapis';

export const app = express();
startBackgroundSync();
app.use(express.json());
app.use(express.static('public'));

function isSecretKeyValid(req: Request, res: Response) {
    if (req.query['secret_key'] !== SECRET_KEY) {
        console.error(`[Display API] Invalid secret key provided: ${req.query['secret_key']}`);
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing secret_key query parameter.' });
        return false;
    }
    return true;
}

app.get('/api/web/config', async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) return;
    const rotation = await redis.lrange('config:rotation', 0, -1) || [];
    
    const intervals = {
        weather: await redis.get('config:interval:weather') || 60,
        news: await redis.get('config:interval:news') || 120,
        trending: await redis.get('config:interval:trending') || 120,
        todoist: await redis.get('config:interval:todoist') || 15,
        agenda: await redis.get('config:interval:agenda') || 120,
    };
    
    const screen_times = {
        weather: await redis.get('config:screen_time:weather') || 15,
        news: await redis.get('config:screen_time:news') || 15,
        trending: await redis.get('config:screen_time:trending') || 15,
        todoist: await redis.get('config:screen_time:todoist') || 15,
        agenda: await redis.get('config:screen_time:agenda') || 15,
    };
    
    const rawFeeds = await redis.get('config:feeds:news');
    let news_feeds = typeof rawFeeds === 'string' ? JSON.parse(rawFeeds) : rawFeeds;
    if (!news_feeds || !Array.isArray(news_feeds)) {
        news_feeds = [
            { url: 'https://g1.globo.com/rss/g1/', name: 'G1 Globo' },
            { url: 'https://www.cnnbrasil.com.br/feed/', name: 'CNN Brasil' },
        ];
    }

    const rawTrending = await redis.get('config:feeds:trending');
    let trending_feeds = typeof rawTrending === 'string' ? JSON.parse(rawTrending) : rawTrending;
    if (!trending_feeds || !Array.isArray(trending_feeds)) {
        trending_feeds = [
            { url: 'https://www.reddit.com/r/brasil/hot.rss', name: 'Reddit r/brasil' },
            { url: 'https://www.reddit.com/r/technology/hot.rss', name: 'Tech Trending' }
        ];
    }
    
    res.json({ rotation, intervals, news_feeds, trending_feeds });
});

app.post('/api/web/config', async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) return;
    const { rotation, intervals, news_feeds, trending_feeds } = req.body;
    
    if (Array.isArray(rotation)) {
        await redis.del('config:rotation');
        if (rotation.length > 0) {
            await redis.rpush('config:rotation', ...rotation);
        }
    }
    
    if (intervals) {
        if (intervals.weather) await redis.set('config:interval:weather', intervals.weather);
        if (intervals.news) await redis.set('config:interval:news', intervals.news);
        if (intervals.trending) await redis.set('config:interval:trending', intervals.trending);
        if (intervals.todoist) await redis.set('config:interval:todoist', intervals.todoist);
        if (intervals.agenda) await redis.set('config:interval:agenda', intervals.agenda);
    }
    
    const { screen_times } = req.body;
    if (screen_times) {
        if (screen_times.weather) await redis.set('config:screen_time:weather', screen_times.weather);
        if (screen_times.news) await redis.set('config:screen_time:news', screen_times.news);
        if (screen_times.trending) await redis.set('config:screen_time:trending', screen_times.trending);
        if (screen_times.todoist) await redis.set('config:screen_time:todoist', screen_times.todoist);
        if (screen_times.agenda) await redis.set('config:screen_time:agenda', screen_times.agenda);
    }
    
    if (Array.isArray(news_feeds)) {
        await redis.set('config:feeds:news', JSON.stringify(news_feeds));
    }
    if (Array.isArray(trending_feeds)) {
        await redis.set('config:feeds:trending', JSON.stringify(trending_feeds));
    }
    
    res.json({ success: true });
});

app.post('/api/web/sync-now', async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) return;
    
    const { plugin } = req.body;
    
    if (plugin) {
        // The calendar plugin is named "agenda" in the UI array but "calendar" in the expire keys
        const expireKey = plugin === 'agenda' ? 'calendar' : plugin;
        await redis.del(`expire:${expireKey}`);
    } else {
        await redis.del('expire:weather');
        await redis.del('expire:news');
        await redis.del('expire:trending');
        await redis.del('expire:todoist');
        await redis.del('expire:calendar');
    }
    
    // trigger check in background so we don't block response
    checkAndSync();
    
    res.json({ success: true });
});

// Google OAuth routes — must be registered BEFORE BYOS middleware
const oauth2Client = new google.auth.OAuth2(
    process.env['GOOGLE_CLIENT_ID'],
    process.env['GOOGLE_CLIENT_SECRET'],
    (process.env['PUBLIC_URL_ORIGIN'] || `http://${SERVER_HOST}:${SERVER_PORT}`) + '/api/auth/google/callback'
);

app.get('/api/auth/google', (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) return;
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        prompt: 'consent'
    });
    res.redirect(url);
});

app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    const code = req.query['code'] as string;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        await redis.set('config:google_tokens', JSON.stringify(tokens));
        res.send("<h1>Google Calendar Authenticated!</h1><p>You can close this window.</p>");
    } catch (e) {
        console.error("Auth error", e);
        res.status(500).send("Auth Failed: " + (e as Error).message);
    }
});

// Kindle-compatible display endpoint — matches what TRMNL.sh expects
app.get('/api/display', async (req: Request, res: Response) => {
    const refresh_rate = await redis.get('config:refresh_rate') || REFRESH_RATE_SECONDS;
    const hash = await getScreenHash();
    
    const deviceId = req.headers['id'] || 'default';
    const headerWidth = req.headers['png-width'] ? parseInt(req.headers['png-width'] as string) : 800;
    const headerHeight = req.headers['png-height'] ? parseInt(req.headers['png-height'] as string) : 600;
    const isKOReader = !!req.headers['png-width'];
    let deviceConfig: any = { width: headerWidth, height: headerHeight, rotate: isKOReader ? 0 : 90, format: 'png' }; // Default settings
    
    const storedConfig = await redis.get(`config:device:${deviceId}`);
    if (storedConfig) {
        deviceConfig = { ...deviceConfig, ...(typeof storedConfig === 'string' ? JSON.parse(storedConfig) : storedConfig) };
    }

    // Allow URL query params to override device config for testing
    const rotate = req.query.rotate || deviceConfig.rotate;
    const width = req.query.width || deviceConfig.width;
    const height = req.query.height || deviceConfig.height;
    const format = req.query.format || deviceConfig.format;

    const imageUrl = (process.env['PUBLIC_URL_ORIGIN'] || `http://${SERVER_HOST}:${SERVER_PORT}`) + `/image?secret_key=${SECRET_KEY}&format=${format}&width=${width}&height=${height}&rotate=${rotate}`;
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
        image_url: imageUrl,
        filename: `trmnl-${hash}.${format}`,
        refresh_rate: Number(refresh_rate),
    });
});

// BYOS after OAuth so /api/auth/* doesn't get swallowed
if (BYOS_ENABLED) {
    app.use('/api', BYOSRoutes);
}

app.get('/', (_, res: Response) => {
    res.send();
})

app.get(ROUTE_PLUGIN_REDIRECT, async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    const refresh_rate = await redis.get('config:refresh_rate') || REFRESH_RATE_SECONDS;
    res.setHeader('Content-Type', 'application/json');
    res.json({
        filename: 'custom-screen-' + await getScreenHash(),
        url: SCREEN_URL,
        refresh_rate: Number(refresh_rate),
    });
});

app.get(ROUTE_IMAGE, async (req: Request, res: Response) => {
    if (!isSecretKeyValid(req, res)) {
        return;
    }
    const format = req.query.format === 'png' ? 'png' : 'bmp';
    const rotate = parseInt(req.query.rotate as string) || 0;
    const width = parseInt(req.query.width as string) || 800;
    const height = parseInt(req.query.height as string) || 480;
    const imageBuffer = await buildScreen(format, rotate, width, height);
    res.setHeader('Content-Type', format === 'png' ? 'image/png' : 'image/bmp');
    res.send(imageBuffer);
})

app.use((req: Request, res: Response) => {
    console.log(`[404] ${req.method} ${req.url}`);
    res.status(404).json({error: 'Not Found', message: 'The requested path could not be found: ' + req.url});
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({error: 'Internal Server Error', message: 'Something went wrong!'});
});

if (!IS_TEST_ENV) {
    app.listen(SERVER_PORT, SERVER_HOST, async (error) => {
        if (error) {
            throw error;
        } else {
            await initPuppeteer();
            console.log(`Server started. Check it http://127.0.0.1:${SERVER_PORT + ROUTE_IMAGE}?secret_key=... OR ${SCREEN_URL}`);
            checkImageUrl(SCREEN_URL);
        }
    })
}
