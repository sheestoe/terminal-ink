import process from 'process';
process.env.SECRET_KEY = "dummy";
process.env.PUBLIC_URL_ORIGIN = "http://dummy";
process.env.TODOIST_TOKEN = "cf13351a86a46d58e3ebfd6a88755bc8674c5a73";

import { buildLiquid } from './src/Screen/BuildLiquid.js';
import { redis } from './src/Data/Redis.js';
import { syncTodoistData } from './src/Data/BackgroundSync.js';
import fs from 'fs';

async function generate() {
    await syncTodoistData(); 

    const cachedTodoist = await redis.get('data:todoist');
    const html1 = await buildLiquid('Todoist', { projects: cachedTodoist } as any);
    fs.writeFileSync('todoist.html', html1, 'utf8');
    console.log('✅ todoist.html gerado!');

    const cachedAgenda = await redis.get('data:todoist_agenda');
    const html2 = await buildLiquid('TodoistAgenda', { agenda: cachedAgenda } as any);
    fs.writeFileSync('todoist_agenda.html', html2, 'utf8');
    console.log('✅ todoist_agenda.html gerado!');
    
    process.exit(0);
}
generate();
