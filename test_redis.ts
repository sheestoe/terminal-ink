import { redis } from './src/Data/Redis.js';
async function run() {
    const data = await redis.get('data:agenda');
    console.log(JSON.stringify(data, null, 2));
}
run();
