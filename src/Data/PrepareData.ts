import {TIMEZONE} from "Config.js";

export type TemplateDataType = {
    time: string
    data: any, // We will inject the open-meteo JSON here
}

export async function prepareData(): Promise<TemplateDataType> {
    const time = new Date().toLocaleTimeString(undefined, {
        timeZone: TIMEZONE,
        hour: 'numeric',
    });
    
    // Fetch Weather Data for Haiku
    let data = {};
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=celsius");
        data = await response.json();
    } catch (e) {
        console.error("Failed to fetch weather data", e);
    }

    return {
        time,
        data,
    }
}
