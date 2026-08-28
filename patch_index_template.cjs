const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(/<label class="interval-label">\\s*<input type="number" class="interval-input" min="1" max="1440">\\s*<span style="margin-top:2px;">minutos<\/span>\\s*<\/label>/,
  `<label class="interval-label" style="flex-direction:column; gap:2px;"><div style="font-size:0.75rem;">API (min)</div><input type="number" class="interval-input" min="1" max="1440" style="width:50px; text-align:center;"></label><label class="interval-label" style="flex-direction:column; gap:2px;"><div style="font-size:0.75rem;">Tela (min)</div><input type="number" class="screen-input" min="1" max="1440" style="width:50px; text-align:center;" value="15"></label>`
);

html = html.replace(/inputInterval\\.value = state\\.intervals\\[plugin\\.id\\] \\|\\s 60;/,
  'inputInterval.value = state.intervals[plugin.id] || 60; const inputScreen = tpl.querySelector(".screen-input"); inputScreen.value = (state.screen_times && state.screen_times[plugin.id]) ? state.screen_times[plugin.id] : 15;'
p);

atml = html.replace(/state\\.intervals\\[plugin\\.id\\] = parseInt\\(e\\.target\\.value\\) \\|\\| 60;\\s*showSaveButton\\(\\);\\s*\\}\\);/,
  'state.intervals[plugin.id] = parseInt(e.target.value) || 60; showSaveButton(); }); inputScreen.addEventListener("input", (e) => { if(!state.screen_times) state.screen_times = {}; state.screen_times[plugin.id] = parseInt(e.target.value) || 15; showSaveButton(); });'
p);

fs.writeFileSync('public/index.html', html, 'utf8');