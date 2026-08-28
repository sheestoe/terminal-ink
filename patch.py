import re
with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()
plugins = ['weather', 'news', 'trending', 'todoist', 'agenda']
for p in plugins:
    target = '<label>Atualizar em (minutos):</label>\n                        <input type="number" id="interval-' + p + '" min="5">'
    rep = '<label>Atualizar dados (min):</label>\n                        <input type="number" id="interval-' + p + '" min="5" style="width:80px;">\n                        <label style="margin-left:15px;">Ficar na tela (min):</label>\n                        <input type="number" id="screen-' + p + '" min="1" style="width:80px;">'
    html = html.replace(target, rep)
loadTarget = "document.getElementById('interval-todoist').value = config.intervals.todoist;"
loadRep = loadTarget + '\n            document.getElementById(\"screen-weather\").value = config.screen_times.weather || 15;\n            document.getElementById(\"screen-news\").value = config.screen_times.news || 15;\n            document.getElementById(\"screen-trending\").value = config.screen_times.trending || 15;\n            document.getElementById(\"screen-todoist\").value = config.screen_times.todoist || 15;\n            document.getElementById(\"screen-agenda\").value = config.screen_times.agenda || 15;'
html = html.replace(loadTarget, loadRep)
saveTarget = "intervals: {"
saveRep = 'screen_times: {\n                weather: document.getElementById(\"screen-weather\").value,\n                news: document.getElementById(\"screen-news\").value,\n                trending: document.getElementById(\"screen-trending\").value,\n                todoist: document.getElementById(\"screen-todoist\").value,\n                agenda: document.getElementById(\"screen-agenda\").value,\n            },\n            intervals: {'
html = html.replace(saveTarget, saveRep)
with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
