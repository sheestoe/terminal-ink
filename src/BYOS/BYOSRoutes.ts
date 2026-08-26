import {Router, Request, Response, NextFunction} from 'express';
import {IncomingHttpHeaders} from 'http';
import {displayRoute} from "./Display.js";
import {setupRoute} from "./Setup.js";
import {logRoute} from "./Log.js";
import {BYOS_DEVICE_MAC, BYOS_ENABLED} from "Config.js";
import {ROUTE_BYOS_DISPLAY, ROUTE_BYOS_LOG, ROUTE_BYOS_SETUP} from "Routes.js";

// all routes starts with /api/
export const BYOSRoutes = Router();

BYOSRoutes.use((req: Request, res: Response, next: NextFunction) => {
    const macId = getMacId(req);
    if (!BYOS_ENABLED) {
        console.error(`[BYOS] [${macId}] device is trying to connect, but BYOS is disabled`);
        res.status(401).json('BYOS is disabled');
        return;
    }
    if (BYOS_DEVICE_MAC === undefined) {
        console.error(`[BYOS] [${macId}] BYOS_DEVICE_MAC is not set in config`);
        res.status(401).json('BYOS is not fully set up');
        return;
    }
    if (macId !== BYOS_DEVICE_MAC) {
        console.error(`[BYOS] [${macId}] device is tried to connect with other MAC, that allowed - rejected`);
        res.status(401).json('This MAC is not allowed');
        return;
    }
    next();
});


BYOSRoutes.get(ROUTE_BYOS_SETUP.slice(4), async (req: Request, res: Response) => {
    const macId = getMacId(req);
    res.json(await setupRoute(macId));
});

BYOSRoutes.get(ROUTE_BYOS_DISPLAY.slice(4), async (req: Request, res: Response) => {
    const macId = getMacId(req);
    res.json(await displayRoute(macId, req.headers));
});

BYOSRoutes.post(ROUTE_BYOS_LOG.slice(4), async (req, res) => {
    const macId = getMacId(req);
    const accessToken = readAccessToken(req.headers);
    await logRoute(macId, accessToken, req.body);
    res.status(204).send();
});

function getMacId(req: Request): string {
    if (typeof req.headers['id'] !== 'string') {
        throw new Error('Missing id header');
    }
    return req.headers['id'];
}

function readAccessToken(headers: IncomingHttpHeaders): string {
    if (typeof headers['access-token'] !== 'string') {
        throw new Error('Missing access-token header');
    }
    return headers['access-token'];
}