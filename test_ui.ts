import process from 'process';
process.env.SECRET_KEY = "dummy";
process.env.PUBLIC_URL_ORIGIN = "http://dummy";
process.env.TODOIST_TOKEN = "cf13351a86a46d58e3ebfd6a88755bc8674c5a73";

import { buildLiquid } from './src/Screen/BuildLiquid.js';
import { redis } from './src/Data/Redis.js';
import { syncTodoistData, syncCalendarData } from './src/Data/BackgroundSync.js';
import fs from 'fs';

async function generate() {
    await syncTodoistData();
await redis.set('config:calendar_urls', JSON.stringify(['https://calendar.google.com/calendar/ical/pazevedo.dev%40gmail.com/private-3e1aee5bccc22ce222c7dffc97423915/basic.ics']));
await syncCalendarData(); 

    const cachedTodoist = await redis.get('data:todoist');
    const html1 = await buildLiquid('Todoist', { projects: cachedTodoist } as any);
    if (!fs.existsSync('previews')) fs.mkdirSync('previews'); fs.writeFileSync('previews/todoist.html', html1, 'utf8');
    console.log('✅ todoist.html gerado!');

    const cachedAgenda = await redis.get('data:agenda');
    const html2 = await buildLiquid('Agenda', { agenda: cachedAgenda } as any);
    fs.writeFileSync('previews/agenda.html', html2, 'utf8');
    console.log('✅ agenda.html gerado!');
    
    process.exit(0);
}
generate();







