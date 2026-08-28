const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const plugins = ['weather', 'news', 'trending', 'todoist', 'agenda'];
for (const p of plugins) {
    const searchStr = '<label>Atualizar em (minutos):</label>\n                        <input type="number" id="interval-'+p+'" min="5">';
    const repStr = '<label>Atualizar API (min):</label>\n                        <input type="number" id="interval-'+p+'" min="5" style="width:80px;">\n                        <label style="margin-left:15px;">Tempo de Tela (min):</label>\n                        <input type="number" id="screen-'+p+'" min="1" style="width:80px;" value="15">';
    html = html.replace(searchStr, repStr);
}

const loadStr = "document.getElementById('interval-todoist').value = config.intervals.todoist;";
const loadRep = loadStr + '\n            if(document.getElementById(\"screen-weather\")) { document.getElementById(\"screen-weather\").value = config.screen_times.weather || 15; document.getElementById(\"screen-news\").value = config.screen_times.news || 15; document.getElementById(\"screen-trending\").value = config.screen_times.trending || 15; document.getElementById(\"screen-todoist\").value = config.screen_times.todoist || 15; document.getElementById(\"screen-agenda\").value = config.screen_times.agenda || 15; }';
html = html.replace(loadStr, loadRep);

const saveStr = "intervals: {";
const saveRep = "screen_times: {\n                weather: document.getElementById('screen-weather') ? document.getElementById('screen-weather').value : 15,\n                news: document.getElementById('screen-news') ? document.getElementById('screen-news').value : 15,\n                trending: document.getElementById('screen-trending') ? document.getElementById('screen-trending').value : 15,\n                todoist: document.getElementById('screen-todoist') ? document.getElementById('screen-todoist').value : 15,\n                agenda: document.getElementById('screen-agenda') ? document.getElementById('screen-agenda').value : 15,\n            },\n            intervals: {";
html = html.replace(saveStr, saveRep);

fs.writeFileSync('public/index.html', html, 'utf8');
