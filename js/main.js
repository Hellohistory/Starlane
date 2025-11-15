// 文件路径: js/main.js

import { getConfig } from './api.js';
import { applyAppSettings, renderPage, handleError, initializeLayoutControls } from './ui.js';
import { initializeSettingsPanel } from './settings.js';

async function initializeApp() {
    try {
        const config = await getConfig();
        applyAppSettings(config);
        renderPage(config);
    } catch (error) {
        handleError(error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeLayoutControls();
    initializeSettingsPanel();
    initializeApp();
});
