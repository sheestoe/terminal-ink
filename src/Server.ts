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
import {startBackgroundSync} from "./Data/BackgroundSync.js";
import {redis} from "./Data/Redis.js";
import { google } from 'googleapis';

export const app = express();
startBackgroundSync();
app.use(express.json());

function isSecretKeyValid(req: Request, res: Response) {
    if (req.query['secret_key'] !== SECRET_KEY) {
        res.setHeader('Content-Type', 'application/json');
        res.status(401).json('Wrong or missing secret_key');
        return false;
    }
    return true;
}

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
    
    // Auto-rotate if KOReader is in portrait mode (width < height). 
    // TRMNL plugins are designed for landscape, so we render landscape and rotate to fit portrait.
    const isPortrait = headerWidth < headerHeight;
    const autoWidth = isPortrait ? headerHeight : headerWidth;
    const autoHeight = isPortrait ? headerWidth : headerHeight;
    const autoRotate = isPortrait ? 90 : (isKOReader ? 0 : 90);
    
    let deviceConfig: any = { width: autoWidth, height: autoHeight, rotate: autoRotate, format: 'png' }; // Default settings
    
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
