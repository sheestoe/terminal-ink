const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
const plugins = ['weather', 'news', 'trending', 'todoist', 'agenda'];
for (const p of plugins) {
    html = html.replace(target, rep);
}
const loadTarget = 'document.getElementById(''interval-todoist'').value = config.intervals.todoist;';
const loadRep = loadTarget + '\\n            document.getElementById(''screen-weather'').value = config.screen_times.weather || 15;\\n            document.getElementById(''screen-news'').value = config.screen_times.news || 15;\\n            document.getElementById(''screen-trending'').value = config.screen_times.trending || 15;\\n            document.getElementById(''screen-todoist'').value = config.screen_times.todoist || 15;\\n            document.getElementById(''screen-agenda'').value = config.screen_times.agenda || 15;';
html = html.replace(loadTarget, loadRep);
const saveTarget = 'intervals: {';
const saveRep = 'screen_times: {\\n                weather: document.getElementById(''screen-weather'').value,\\n                news: document.getElementById(''screen-news'').value,\\n                trending: document.getElementById(''screen-trending'').value,\\n                todoist: document.getElementById(''screen-todoist'').value,\\n                agenda: document.getElementById(''screen-agenda'').value,\\n            },\\n            intervals: {';
html = html.replace(saveTarget, saveRep);
fs.writeFileSync('public/index.html', html, 'utf8');
