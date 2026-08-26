import {TemplateDataType} from "Data/PrepareData.js";
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
    let currentPlugin = override;

    // We loop up to 10 times to find a plugin that has data
    for (let i = 0; i < 10; i++) {
        if (!isOverride) {
            currentPlugin = await redis.lpop('config:rotation') || 'weather';
            await redis.rpush('config:rotation', currentPlugin);
        }

        if (currentPlugin === 'weather') {
            const cachedWeather = await redis.get('data:weather');
            const data = cachedWeather || null;
            if (data && Object.keys(data).length > 0) {
                html = await buildLiquid('Weather', { data } as any);
                break;
            }
        } 
        else if (currentPlugin === 'news') {
            const cachedNews = await redis.get('data:news');
            const data = cachedNews || null;
            if (data && data.length > 0) {
                html = await buildLiquid('News', { news: data } as any);
                break;
            }
        }
        else if (currentPlugin === 'todoist') {
            const cachedTodoist = await redis.get('data:todoist');
            const data = cachedTodoist || null;
            if (data && data.length > 0) {
                html = await buildLiquid('Todoist', { projects: data } as any);
                break;
            }
        }
        else if (currentPlugin === 'agenda') {
            const cachedAgenda = await redis.get('data:agenda');
            const data = cachedAgenda || null;
            if (data && data.length > 0) {
                html = await buildLiquid('Agenda', { agenda: data } as any);
                break;
            }
        }
        else if (currentPlugin === 'image') {
            const imageUrl = await redis.get('config:override_image_url');
            html = \<img src="\" style="width: 100%; height: 100%; object-fit: cover;" />\;
            break;
        }

        if (isOverride) {
            // Se for override, a gente não roda a roleta, só para
            html = \<div style="padding: 50px; font-size: 30px;">Override plugin empty or invalid: \</div>\;
            break;
        }
    }

    if (!html) {
        html = \<div style="padding: 50px; font-size: 30px;">No valid screens available in rotation.</div>\;
    }

    const image = await renderToImage(headerHtml + html);
    return PNGto1BIT(image);
}

export async function getScreenHash() {
    // Generate a random hash so Kindle always updates
    return crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
}

export async function checkImageUrl(url: string): Promise<boolean> {
    return true; // Skipping for brevity
}







