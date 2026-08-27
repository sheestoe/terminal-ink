import puppeteer, { Page } from "puppeteer";
import fs from 'fs/promises';
import { ASSETS_FOLDER, IS_TEST_ENV } from "Config.js";

export const BASE_URL_CHROME = 'http://localhost';

let page: Page;

export async function initPuppeteer() {
    if (page) {
        console.warn('Puppeteer already initialized');
        return;
    }
    if (!IS_TEST_ENV) {
        console.log('start of Puppeteer init');
    }
    const browser = await puppeteer.launch({
        headless: true,
        protocolTimeout: 30000,
        timeout: 30000,
        args: [
            '--no-sandbox',
            '--disable-web-security',
            '--disable-gpu',
            '--disable-dev-shm-usage',
        ]
    });
    page = await browser.newPage();
    await page.setViewport({ width: 800, height: 480 });
    await page.setRequestInterception(true);
    page.on('pageerror', (error: any) => console.error('Puppeteer error:', error.message));
    page.on('requestfailed', request => console.log(`Puppeteer failed: ${request.failure()?.errorText} ${request.url()}`));
    page.on('request', async (interceptedRequest) => {
        if (interceptedRequest.isInterceptResolutionHandled()) {
            return;
        }
        const url = interceptedRequest.url();
        if (!url.startsWith(BASE_URL_CHROME + '/assets/')) {
            await interceptedRequest.continue();
            return;
        }
        try {
            const filePathPart = url.replace(BASE_URL_CHROME + '/assets/', '/');
            const file = await fs.readFile(ASSETS_FOLDER + filePathPart);
            await interceptedRequest.respond({ body: file });
        } catch (error) {
            await interceptedRequest.abort();
        }
    });
    if (!IS_TEST_ENV) {
        console.log('end of Puppeteer init');
    }
}

let isRendering = false;

export async function renderToImage(html: string, width: number = 800, height: number = 480) {
    while (isRendering) {
        await new Promise(r => setTimeout(r, 100));
    }
    isRendering = true;
    try {
        await page.setViewport({ width, height });
        await page.goto('about:blank');
        // networkidle0 forces Puppeteer to wait until all external images and fonts are fully downloaded
        await page.setContent(html, { waitUntil: "networkidle0" });
        const image: Uint8Array = await page.screenshot();
        return Buffer.from(image);
    } finally {
        isRendering = false;
    }
}

