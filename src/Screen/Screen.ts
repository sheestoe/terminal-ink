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
    // 1. Check for OVERRIDE
    const override = await redis.get('config:override');
    let currentPlugin = override;

    // 2. If no override, POP from rotation queue and PUSH to the back
    if (!currentPlugin) {
        currentPlugin = await redis.lpop('config:rotation') || 'weather';
        await redis.rpush('config:rotation', currentPlugin);
    }

    // 3. Render the correct screen based on the plugin name
    let html = '';
    
    if (currentPlugin === 'weather') {
        const cachedWeather = await redis.get('data:weather');
        const data = cachedWeather || {};
        html = await buildLiquid('Weather', { data } as any);
    } 
    else if (currentPlugin === 'news') {
        // We will build AllTheNews liquid template next, for now just a raw dump or a simple template
        const cachedNews = await redis.get('data:news');
        const data = cachedNews || [];
        html = await buildLiquid('News', { news: data } as any);
    }
    else if (currentPlugin === 'todoist') {
        const cachedTodoist = await redis.get('data:todoist');
        const data = cachedTodoist || [];
        html = await buildLiquid('Todoist', { projects: data } as any);
    }
    else if (currentPlugin === 'image') {
        // For image override
        const imageUrl = await redis.get('config:override_image_url');
        html = `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`;
    }
    else {
        html = `<div style="padding: 50px; font-size: 30px;">Plugin not found: ${currentPlugin}</div>`;
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



