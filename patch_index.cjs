const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The elements don't exist, we must add them.
// Let's replace the whole block where the intervals are.
const plugins = ['weather', 'news', 'trending', 'todoist', 'agenda'];
for (const p of plugins) {
    // Find the label for that plugin
    const regex = new RegExp('<label>Atualizar em \\\(minutos\\_):</label>\\\s*<input type="number" id="interval-' + p + '" min="5">');
    const replacement = `<label>Atualizar dados (min):</label>
                        <input type="number" id="interval-${p}" min="5" style="width:80px;">
                        <label style="margin-left:15px;">Ficar na tela (min):</label>
                        <input type="number" id="screen-${p}" min="1" style="width:80px;" value="15">`;
    html = html.replace(regex, replacement);
}

// In loadConfig, we need to populate these fields safely
const loadConfigFixTarget = `document.getElementById('interval-todoist').value = config.intervals.todoist;`;
const loadConfigFixRep = loadConfigFixTarget + `
            if (document.getElementById('screen-weather')) {
                document.getElementById('screen-weather').value = config.screen_times?.weather || 15;
                document.getElementById('screen-news').value = config.screen_times?.news || 15;
                document.getElementById('screen-trending').value = config.screen_times?.trending || 15;
                document.getElementById('screen-todoist').value = config.screen_times?.todoist || 15;
                document.getElementById('screen-agenda').value = config.screen_times?.agenda || 15;
            }
`;
html = html.replace(loadConfigFixTarget, loadConfigFixRep);

// And we need to fix the state initialization that is crashing!
html = html.replace(`let state = { rotation: [], screen_times: {
                weather: document.getElementById("screen-weather").value,
                news: document.getElementById("screen-news").value,
                trending: document.getElementById("screen-trending").value,
                todoist: document.getElementById("screen-todoist").value,
                agenda: document.getElementById("screen-agenda").value,
            },
            intervals: {}, news_feeds: [], trending_feeds: [] };`, 
            `let state = { rotation: [], screen_times: {}, intervals: {}, news_feeds: [], trending_feeds: [] };`);

// In saveConfig, populate screen_times correctly
const saveTarget = `screen_times: {
                weather: document.getElementById('screen-weather').value,
                news: document.getElementById('screen-news').value,
                trending: document.getElementById('screen-trending').value,
                todoist: document.getElementById('screen-todoist').value,
                agenda: document.getElementById('screen-agenda').value,
            },`;
let saveRep = `screen_times: {
                weather: document.getElementById('screen-weather')?.value || 15,
                news: document.getElementById('screen-news')?.value || 15,
                trending: document.getElementById('screen-trending')?.value || 15,
                todoist: document.getElementById('screen-todoist')?.value || 15,
                agenda: document.getElementById('screen-agenda')?.value || 15,
            }, `;
html = html.replace(saveTarget, saveRep);

// Finally save it.
fs.writeFileSync('public/index.html', html, 'utf8');
