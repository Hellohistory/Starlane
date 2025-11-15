// 文件路径: js/api.js

const CONFIG_ENDPOINT = '/data/config.json';
const SAVE_ENDPOINT = '/api/save';

export async function getConfig() {
    const response = await fetch(CONFIG_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`无法加载配置文件 ${CONFIG_ENDPOINT}: ${response.statusText}`);
    }
    return await response.json();
}

export async function saveConfigData(saveData, token) {
    return fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Save-Token': token || ''
        },
        body: JSON.stringify(saveData)
    });
}
