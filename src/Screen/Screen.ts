import {PNGto1BIT} from "./PNGto1BIT.js";
import {TEMPLATE_FOLDER} from "Config.js";
import {renderToImage} from "./RenderHTML.js";
import {buildLiquid} from "./BuildLiquid.js";
import crypto from "crypto";
import {readFileSync} from "node:fs";
import {redis} from "../Data/Redis.js";
import {Jimp} from "jimp";

const headerHtml = readFileSync(TEMPLATE_FOLDER + '/Header.html', 'utf8');

export async function buildScreen(format: 'bmp' | 'png' = 'bmp', rotation: number = 0, width: number = 800, height: number = 480) {
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
                try {
                    html = await buildLiquid('Weather', { data, screen_height: height } as any);
                    break;
                } catch(e) { console.error('Weather template failed, skipping', e); }
            }
        }
        else if (currentPlugin.startsWith('feed')) {
            const data = await redis.get(`data:feed_board:${currentPlugin}`);
            if (data && (data as any[]).length > 0) {
                try {
                    html = await buildLiquid('News', { news: data, screen_height: height } as any);
                    break;
                } catch(e) { console.error(`Feed board template failed (${currentPlugin}), skipping`, e); }
            }
        }
        else if (currentPlugin === 'todoist') {
            const data = await redis.get('data:todoist');
            if (data && (data as any[]).length > 0) {
                try {
                    html = await buildLiquid('Todoist', { projects: data, screen_height: height } as any);
                    break;
                } catch(e) { console.error('Todoist template failed, skipping', e); }
            }
        }
        else if (currentPlugin === 'agenda') {
            const data = await redis.get('data:agenda');
            if (data && (data as any[]).length > 0) {
                try {
                    html = await buildLiquid('Agenda', { agenda: data, screen_height: height } as any);
                    break;
                } catch(e) { console.error('Agenda template failed, skipping', e); }
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

    let finalHtml = headerHtml + html;
    finalHtml = finalHtml.replace(/width: 800px;/g, `width: ${width}px;`).replace(/height: 480px;/g, `height: ${height}px;`);

    const image = await renderToImage(finalHtml, width, height);
    
    if (format === 'png' || rotation !== 0) {
        const jimpImage = await Jimp.read(image);
        if (rotation !== 0) {
            jimpImage.rotate(rotation);
        }
        
        if (format === 'png') {
            jimpImage.greyscale();
            return await jimpImage.getBuffer("image/png");
        }
        
        // If BMP but rotated, pass the rotated buffer to PNGto1BIT
        const rotatedBuffer = await jimpImage.getBuffer("image/png");
        // If rotated by 90 or 270, width and height are swapped for the final BMP
        const finalWidth = (rotation === 90 || rotation === 270) ? height : width;
        const finalHeight = (rotation === 90 || rotation === 270) ? width : height;
        return PNGto1BIT(rotatedBuffer, finalWidth, finalHeight);
    }
    
    return PNGto1BIT(image, width, height);
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
