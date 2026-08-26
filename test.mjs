import { Liquid } from 'liquidjs';
import fs from 'fs';
import path from 'path';

const engine = new Liquid({
    root: path.resolve('src/Template'),
    extname: '.liquid',
    dynamicPartials: true,
    strictFilters: false,
    strictVariables: false,
});

async function run() {
    const data = {
        time: "10:00",
        data: {
            daily: {
                weather_code: [1],
                temperature_2m_min: [15],
                temperature_2m_max: [25]
            },
            daily_units: {
                temperature_2m_max: "°C"
            }
        }
    };
    const html = await engine.renderFile('HaikuWeather', data);
    const headerHtml = fs.readFileSync('src/Template/Header.html', 'utf8');
    fs.writeFileSync('test.html', headerHtml + html);
}
run();
