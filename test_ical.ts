import ical from 'node-ical';

async function run() {
    const events = await ical.async.fromURL('https://calendar.google.com/calendar/ical/pazevedo.dev%40gmail.com/private-3e1aee5bccc22ce222c7dffc97423915/basic.ics');
    
    const rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart.getTime() + 8 * 24 * 60 * 60 * 1000);

    for (let k in events) {
        if (!events.hasOwnProperty(k)) continue;
        const ev = events[k];
        if (ev.type !== 'VEVENT') continue;

        const title = ev.summary;

        if (ev.rrule) {
            const dates = ev.rrule.between(rangeStart, rangeEnd);
            if (dates.length > 0) {
                console.log("RECURRING:", title, dates.map(d => d.toISOString()));
            }
        } else {
            const start = new Date(ev.start);
            if (start >= rangeStart && start <= rangeEnd) {
                console.log("ONETIME:", title, start.toISOString());
            }
        }
    }
}
run();
