import {SetupResponse} from "./Setup.js";
import {DisplayResponse} from "./Display.js";
import {IncomingHttpHeaders} from "http";
import {IS_TEST_ENV} from "../Config.js";

export async function proxySetup(macId: string): Promise<SetupResponse | null> {
    return requestCore('GET', '/api/setup', {id: macId});
}

export async function proxyDisplay(headers: IncomingHttpHeaders): Promise<DisplayResponse | null> {
    delete headers['host'];
    return requestCore('GET', '/api/display', headers);
}

export async function proxyLog(macId: string, accessToken: string, body: {
    [key: string]: any
}) {
    return requestCore('POST', '/api/log', {
        id: macId,
        'access-token': accessToken
    }, body);
}

async function requestCore(
    method: string,
    path: string,
    headers: { [key: string]: string | string[] | undefined },
    body?: {
        [key: string]: any
    }) {
    if (IS_TEST_ENV) {
        return false;
    }

    const response = await fetch('https://usetrmnl.com' + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers,
        },
        body: body ? JSON.stringify(body) : null,
    });
    if (!response.ok) {
        console.error(`[PROXY] ${path} failed: ` + await response.text());
        return null;
    }
    const resultText = await response.text();
    return resultText === '' ? {} : JSON.parse(resultText);
}