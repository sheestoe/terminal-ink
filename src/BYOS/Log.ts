import {proxyLog} from "./Proxy.js";
import {BYOS_PROXY} from "Config.js";

export async function logRoute(macId: string, accessToken: string, body: any) {
    if (!body || !body['log'] || !body['log']['logs_array']) {
        return;
    }
    body['log']['logs_array'].map((record: any) => {
        let ts = record['creation_timestamp'];
        if (ts) {
            ts = new Date(ts * 1000).toISOString();
        }
        console.log([
            `[LOG]`,
            `[${macId}]`,
            `EVENT_TIME`,
            ts,
            record['log_message'],
            'file:' + record['log_sourcefile'] + ':' + record['log_codeline']
        ].join(' '))
    });
    if (BYOS_PROXY) {
        await proxyLog(macId, accessToken, body);
    }
}