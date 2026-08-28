import re
with open('src/BYOS/Display.ts', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''    return {
        status: 0,
        filename: 'custom-screem-' + await getScreenHash(), // screen wouldn\'t update if data is not changed
        image_url: SCREEN_URL,
        refresh_rate: REFRESH_RATE_SECONDS,
        reset_firmware: false,
        update_firmware: false,
        firmware_url: '',
        special_function: BUTTON_2_CLICK_FUNCTION,
    };'''

replacement = '''    const redis = (await import('../Data/Redis.js')).redis;
    let override = await redis.get('config:override');
    let nextPlugin = override || await redis.lindex('config:rotation', 0) || 'weather';
    let screenTime = await redis.get('config:screen_time:' + nextPlugin);
    let refreshRate = screenTime ? parseInt(screenTime as string) * 60 : REFRESH_RATE_SECONDS;

    return {
        status: 0,
        filename: 'custom-screen-' + await getScreenHash(),
        image_url: SCREEN_URL,
        refresh_rate: refreshRate,
        reset_firmware: false,
        update_firmware: false,
        firmware_url: '',
        special_function: BUTTON_2_CLICK_FUNCTION,
    };'''

code = code.replace(target, replacement)

with open('src/BYOS/Display.ts', 'w', encoding='utf-8') as f:
    f.write(code)
