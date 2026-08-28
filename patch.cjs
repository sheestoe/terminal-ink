const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Clear bad state
html = html.replace(/let state = { rotation: \\[\\], screen_times: \K{\\s\\S]*?intervals: {\}, news_feeds: \\[\\], trending_feeds: \\[\\] \\};/, 'let state = { rotation: [], screen_times: {}, intervals: {}, news_feeds: [], trending_feeds: [] };');

html = html.replace(/let state = { rotation: \\[\\], screen_times: {}, screen_times: \K{\\s\\S]*?intervals: {\}, news_feeds: \\[\\], trending_feeds: \\[\\] \\};/, 'let state = { rotation: [], screen_times: {}, intervals: {}, news_feeds: [], trending_feeds: [] };');

// Update template
const targetTpl = `                <label class="interval-label">
                    <input type="number" class="interval-input" min="1" max="1440">
                    <span style="margin-top:2px;">minutos</span>
                </label>`;
const repTpl = `                <label class="interval-label" style="flex-direction:column; gap:2px;">
                    <div style="font-size:0.75rem;">API (min)</div>
                    <input type="number" class="interval-input" min="1" max="1440" style="width:50px; text-align:center;">
                </label>
                <label class="interval-label" style="flex-direction:column; gap:2px;">
                    <div style="font-size:0.75rem;">Tela (min)</div>
                    <input type="number" class="screen-input" min="1" max="1440" style="width:50px; text-align:center;" value="15">
                </label>`;
html = html.replace(targetTpl, repTpl);

// Update render
const targetRender = `                const inputInterval = tpl.querySelector(".interval-input");
                inputInterval.value = state.intervals[plugin.id] || 60;

                checkbox.addEventListener("change", (e) => {`;
const repRender = `                const inputInterval = tpl.querySelector(".interval-input");
                inputInterval.value = state.intervals[plugin.id] || 60;

                const inputScreen = tpl.querySelector(".screen-input");
                inputScreen.value = state.screen_times[plugin.id] || 15;

                checkbox.addEventListener("change", (e) => {`;
html = html.replace(targetRender, repRender);

// Add event listener for screen
const targetRender2 = `               inputInterval.addEventListener("input", (e) => {
                    state.intervals[plugin.id] = parseInt(e.target.value) || 60;
                    showSaveButton();
                });`;
const repRender2 = targetRender2 + `
                inputScreen.addEventListener("input", (e) => {
                    state.screen_times[plugin.id] = parseInt(e.target.value) || 15;
                    showSaveButton();
                });`;
html = html.replace(targetRender2, repRender2);

fs.writeFileSync('public/index.html', html, 'utf8');
