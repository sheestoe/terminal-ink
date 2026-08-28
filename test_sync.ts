import { redis } from './src/Data/Redis.js';
async function test() {
    const data = await redis.get('data:news');
    console.log("Type:", typeof data);
    console.log("IsArray:", Array.isArray(data));
}
test();
