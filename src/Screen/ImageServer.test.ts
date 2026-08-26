import {expect, test, beforeAll} from "vitest";
import {checkImageUrl} from "./Screen.js";
import {app} from "Server.js";
import request from 'supertest';
import {ROUTE_IMAGE, ROUTE_PLUGIN_REDIRECT} from "Routes.js";
import {SECRET_KEY} from "Config.js";
import {initPuppeteer} from "./RenderHTML.js";

beforeAll(async () => {
    await initPuppeteer();
});


test('checkImageUrl', async () => {
    const result = await checkImageUrl('https://github.com/usetrmnl/byos_node_lite/blob/main/assets/images/color.jpg?raw=true');
    expect(result).toBeTruthy();
})

test('ROUTE_IMAGE', async () => {
    const response = await request(app).get(ROUTE_IMAGE)
        .query({'secret_key': SECRET_KEY});
    const image: Buffer = response.body;
    expect(response.status).toBe(200);
    expect(image.length > 1000).toBeTruthy();
})

test('ROUTE_PLUGIN_REDIRECT', async () => {
    const response = await request(app).get(ROUTE_PLUGIN_REDIRECT)
        .query({'secret_key': SECRET_KEY});
    expect(response.status).toBe(200);
    expect(response.body['filename'].length > 10).toBeTruthy();
    let imageUrl: string = response.body['url'];
    expect(imageUrl.length > 10).toBeTruthy();
    imageUrl = imageUrl.replace('TEST_PUBLIC_URL_ORIGIN', '');
    const imageRes = await request(app).get(imageUrl);
    expect(imageRes.statusCode).toBe(200);
    expect(imageRes.body.length > 1000).toBeTruthy();
})
