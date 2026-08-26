import {beforeAll, expect, test} from "vitest";
import request from "supertest";
import {app} from "Server.js";
import {ROUTE_BYOS_DISPLAY, ROUTE_BYOS_LOG, ROUTE_BYOS_SETUP} from "../Routes.js";
import {initPuppeteer} from "../Screen/RenderHTML.js";

beforeAll(async () => {
    await initPuppeteer();
});

test('ROUTE_BYOS_SETUP', async () => {
    const response = await request(app).get(ROUTE_BYOS_SETUP)
        .set('id', 'TEST_BYOS_DEVICE_MAC');
    expect(response.status).toBe(200);
    expect(response.body['api_key']).toBe('TEST_BYOS_DEVICE_ACCESS_TOKEN');
})

test('ROUTE_BYOS_DISPLAY', async () => {
    const response = await request(app).get(ROUTE_BYOS_DISPLAY)
        .set('id', 'TEST_BYOS_DEVICE_MAC')
        .set('access-token', 'TEST_BYOS_DEVICE_ACCESS_TOKEN');
    expect(response.status).toBe(200);
    let imageUrl: string = response.body['image_url'];
    expect(imageUrl.length > 10).toBeTruthy();
    imageUrl = imageUrl.replace('TEST_PUBLIC_URL_ORIGIN', '');
    const imageRes = await request(app).get(imageUrl);
    expect(imageRes.statusCode).toBe(200);
    expect(imageRes.body.length > 1000).toBeTruthy();
})

test('ROUTE_BYOS_LOG', async () => {
    const response = await request(app).post(ROUTE_BYOS_LOG)
        .set('id', 'TEST_BYOS_DEVICE_MAC')
        .set('access-token', 'TEST_BYOS_DEVICE_ACCESS_TOKEN');
    expect(response.status).toBe(204);
})
