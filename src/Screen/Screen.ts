import {PNGto1BIT} from "./PNGto1BIT.js";
import {TEMPLATE_FOLDER} from "Config.js";
import {renderToImage} from "./RenderHTML.js";
import {buildLiquid} from "./BuildLiquid.js";
import crypto from "crypto";
import {readFileSync} from "node:fs";
import {redis} from "../Data/Redis.js";

const headerHtml = readFileSync(TEMPLATE_FOLDER + '/Header.html', 'utf8');

export async function buildScreen() {
    let override = await redis.get('config:override');
    let isOverride = !!override;
    let html = '';
    let currentPlugin = override as string | null;

    for (let i = 0; i < 10; i++) {
        if (!isOverride) {
            currentPlugin = await redis.lpop('config:rotation') || 'weather';
            await redis.rpush('config:rotation', currentPlugin);
        }

        if (currentPlugin === 'weather') {
            const data = await redis.get('data:weather');
            if (data && Object.keys(data as object).length > 0) {
                html = await buildLiquid('Weather', { data } as any);
                break;
            }
        }
        else if (currentPlugin === 'news') {
            const data = await redis.get('data:news');
            if (data && (data as any[]).length > 0) {
                html = await buildLiquid('News', { news: data } as any);
                break;
            }
        }
        else if (currentPlugin === 'todoist') {
            const data = await redis.get('data:todoist');
            if (data && (data as any[]).length > 0) {
                html = await buildLiquid('Todoist', { projects: data } as any);
                break;
            }
        }
        else if (currentPlugin === 'agenda') {
            const data = await redis.get('data:agenda');
            if (data && (data as any[]).length > 0) {
                html = await buildLiquid('Agenda', { agenda: data } as any);
                break;
            }
        }
        else if (currentPlugin === 'image') {
            const imageUrl = await redis.get('config:override_image_url');
            html = '<img src="' + imageUrl + '" style="width: 100%; height: 100%; object-fit: cover;" />';
            break;
        }

        if (isOverride) {
            html = '<div style="padding: 50px; font-size: 30px;">Override plugin empty or invalid: ' + currentPlugin + '</div>';
            break;
        }
    }

    if (!html) {
        html = '<div style="padding: 50px; font-size: 30px;">No valid screens available in rotation.</div>';
    }

    const image = await renderToImage(headerHtml + html);
    return PNGto1BIT(image);
}

export async function getScreenHash() {
    return crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
}

export async function checkImageUrl(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Image URL check failed: ${res.status}`);
        }
    } catch (e) {
        console.error("Image URL check error", e);
    }
}
