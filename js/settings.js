// 文件路径: js/settings.js

import { getConfig, saveConfigData } from './api.js';
import { applyAppSettings, handleError } from './ui.js';

let settingsInitialized = false;
let draggingElement = null;

const SAVE_TOKEN_STORAGE_KEY = 'starlane_save_token';

const settingsModal = document.getElementById('settings-modal');

function getPersistedToken() {
    try {
        return localStorage.getItem(SAVE_TOKEN_STORAGE_KEY);
    } catch (error) {
        console.warn('无法访问 localStorage，将尝试回退到 sessionStorage。', error);
        try {
            return sessionStorage.getItem(SAVE_TOKEN_STORAGE_KEY);
        } catch (fallbackError) {
            console.warn('无法访问 sessionStorage。', fallbackError);
            return null;
        }
    }
}

function setPersistedToken(value) {
    try {
        if (value === null) {
            localStorage.removeItem(SAVE_TOKEN_STORAGE_KEY);
        } else {
            localStorage.setItem(SAVE_TOKEN_STORAGE_KEY, value);
        }
        return;
    } catch (error) {
        console.warn('无法写入 localStorage，将尝试回退到 sessionStorage。', error);
    }
    try {
        if (value === null) {
            sessionStorage.removeItem(SAVE_TOKEN_STORAGE_KEY);
        } else {
            sessionStorage.setItem(SAVE_TOKEN_STORAGE_KEY, value);
        }
    } catch (fallbackError) {
        console.warn('无法写入 sessionStorage。', fallbackError);
    }
}

export function initializeSettingsPanel() {
    if (settingsInitialized) {
        return;
    }
    settingsInitialized = true;

    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('close-modal-btn').addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (event) => {
        if (event.target.id === 'settings-modal') {
            closeSettingsModal();
        }
    });

    document.querySelectorAll('.tab-btn').forEach((button) => button.addEventListener('click', switchTab));
    document.getElementById('add-row-btn').addEventListener('click', () => addTableRow({
        group: getGroupNamesFromUI()[0] || '默认分类'
    }, getGroupNamesFromUI()));
    document.getElementById('add-group-btn').addEventListener('click', addGroup);

    const groupListContainer = document.getElementById('group-list');
    groupListContainer.addEventListener('dragstart', handleDragStart);
    groupListContainer.addEventListener('dragover', handleDragOver);
    groupListContainer.addEventListener('dragleave', handleDragLeave);
    groupListContainer.addEventListener('drop', handleDrop);
    groupListContainer.addEventListener('dragend', handleDragEnd);

    document.getElementById('app-settings-form').addEventListener('input', previewAppSettings);
    document.getElementById('bg-file-input').addEventListener('change', handleBackgroundFileUpload);

    document.getElementById('save-config-btn').addEventListener('click', saveConfig);
    document.getElementById('reset-config-btn').addEventListener('click', resetConfig);
    document.getElementById('export-config-btn').addEventListener('click', exportConfig);
    document.getElementById('import-config-btn').addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input').addEventListener('change', importConfig);

    toggleBackgroundInputs();
}

async function openSettingsModal() {
    try {
        const config = await getConfig();
        populateServicesTab(config);
        populateGroupsTab(config);
        populateAppSettingsTab(config);
        settingsModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            settingsModal.classList.add('visible');
        });
    } catch (error) {
        handleError(error);
    }
}

function closeSettingsModal() {
    settingsModal.classList.remove('visible');
    settingsModal.addEventListener('transitionend', () => {
        settingsModal.classList.add('hidden');
    }, { once: true });
}

function switchTab(event) {
    const tabId = event.target.dataset.tab;
    document.querySelectorAll('.tab-btn, .tab-content').forEach((element) => element.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

function populateServicesTab(config) {
    const tableBody = document.getElementById('config-table-body');
    tableBody.innerHTML = '';
    const groupNames = Array.isArray(config.groups) ? config.groups.map((group) => group.name) : [];
    (config.groups || []).forEach((group) => {
        (group.items || []).forEach((item) => addTableRow({ ...item, group: group.name }, groupNames));
    });
}

function addTableRow(item, groupNames) {
    const tbody = document.getElementById('config-table-body');
    const tr = tbody.insertRow();
    tr.innerHTML = `
        <td data-label="服务名称"><input type="text" class="name-input" value="${item.name || ''}" placeholder="如：Jellyfin"></td>
        <td data-label="网址 (URL)"><input type="url" class="url-input" value="${item.url || ''}" placeholder="https://..."></td>
        <td data-label="图标地址"><div class="icon-input-wrapper">
            <input type="text" class="icon-url-input" value="${item.icon || ''}" placeholder="https://...">
            <button class="guess-icon-btn" title="智能识别图标">💡</button>
        </div></td>
        <td data-label="预览"><img class="icon-preview" src="${item.icon || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';"></td>
        <td data-label="所属分类"><select class="group-select">${groupNames.map((name) => `<option value="${name}" ${name === item.group ? 'selected' : ''}>${name}</option>`).join('')}</select></td>
        <td data-label="操作"><button class="delete-row-btn" title="删除此行">🗑️</button></td>
    `;
    const iconUrlInput = tr.querySelector('.icon-url-input');
    iconUrlInput.addEventListener('input', () => {
        tr.querySelector('.icon-preview').src = iconUrlInput.value;
    });
    tr.querySelector('.guess-icon-btn').addEventListener('click', (event) => {
        event.preventDefault();
        guessIcon(event.target.closest('tr'));
    });
    tr.querySelector('.delete-row-btn').addEventListener('click', () => tr.remove());
}

function populateGroupsTab(config) {
    const groupList = document.getElementById('group-list');
    groupList.innerHTML = '';
    (config.groups || []).forEach((group) => createGroupListItem(group.name));
}

function createGroupListItem(name) {
    const li = document.createElement('li');
    li.dataset.groupName = name;
    li.draggable = true;
    li.innerHTML = `
        <span class="drag-handle">☰</span>
        <span class="group-name-span">${name}</span>
        <div class="group-actions">
            <button class="rename-group-btn" title="重命名">✏️</button>
            <button class="delete-group-btn" title="删除">🗑️</button>
        </div>
    `;
    document.getElementById('group-list').appendChild(li);
    li.querySelector('.rename-group-btn').addEventListener('click', (event) => renameGroup(event.target.closest('li')));
    li.querySelector('.delete-group-btn').addEventListener('click', (event) => deleteGroup(event.target.closest('li')));
}

function handleDragStart(event) {
    if (event.target.matches('li[draggable="true"]')) {
        draggingElement = event.target;
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => draggingElement.classList.add('dragging'), 0);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    const container = event.currentTarget;
    const afterElement = getDragAfterElement(container, event.clientY);
    if (afterElement == null) {
        if (container.lastElementChild && container.lastElementChild !== draggingElement) {
            container.lastElementChild.classList.add('drag-over-bottom');
        }
    } else {
        afterElement.classList.add('drag-over-top');
    }
}

function handleDragLeave(event) {
    const listItem = event.target.closest('li');
    if (listItem) {
        listItem.classList.remove('drag-over-top', 'drag-over-bottom');
    }
}

function handleDrop(event) {
    event.preventDefault();
    const container = event.currentTarget;
    const afterElement = getDragAfterElement(container, event.clientY);
    if (draggingElement) {
        if (afterElement == null) {
            container.appendChild(draggingElement);
        } else {
            container.insertBefore(draggingElement, afterElement);
        }
    }
}

function handleDragEnd() {
    if (draggingElement) {
        draggingElement.classList.remove('dragging');
    }
    document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach((element) => {
        element.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    draggingElement = null;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function addGroup() {
    const input = document.getElementById('new-group-name');
    const name = input.value.trim();
    if (!name || getGroupNamesFromUI().includes(name)) {
        alert('分类名不能为空或重复！');
        return;
    }
    createGroupListItem(name);
    updateAllGroupSelects();
    input.value = '';
}

function deleteGroup(listItem) {
    const name = listItem.dataset.groupName;
    if (!confirm(`您确定要删除 "${name}" 分类吗？其中的服务项将被移动到第一个分类中。`)) {
        return;
    }
    listItem.remove();
    updateAllGroupSelects(name);
}

function renameGroup(listItem) {
    const span = listItem.querySelector('.group-name-span');
    const oldName = span.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'group-name-input';
    input.value = oldName;
    span.replaceWith(input);
    input.focus();

    const finish = () => {
        const newName = input.value.trim();
        const newSpan = document.createElement('span');
        newSpan.className = 'group-name-span';
        const existingNames = getGroupNamesFromUI().filter((name) => name !== oldName);
        if (newName && newName !== oldName && !existingNames.includes(newName)) {
            newSpan.textContent = newName;
            input.closest('li').dataset.groupName = newName;
            updateAllGroupSelects(oldName, newName);
        } else {
            newSpan.textContent = oldName;
            if (newName !== oldName) {
                alert('分类名不能为空或重复！');
            }
        }
        input.replaceWith(newSpan);
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            input.blur();
        }
    });
}

function getGroupNamesFromUI() {
    return Array.from(document.querySelectorAll('#group-list li')).map((li) => li.dataset.groupName);
}

function updateAllGroupSelects(oldName, newName) {
    document.querySelectorAll('.group-select').forEach((select) => {
        const selectedValue = select.value;
        if (oldName && !newName) {
            const newGroupNames = getGroupNamesFromUI();
            select.innerHTML = newGroupNames.map((name) => `<option value="${name}">${name}</option>`).join('');
            select.value = newGroupNames.includes(selectedValue) ? selectedValue : (newGroupNames[0] || '');
        } else if (oldName && newName) {
            Array.from(select.options).forEach((option) => {
                if (option.value === oldName) {
                    option.value = newName;
                    option.textContent = newName;
                }
            });
        } else {
            const newGroupNames = getGroupNamesFromUI();
            const currentOptions = Array.from(select.options).map((option) => option.value);
            newGroupNames.forEach((name) => {
                if (!currentOptions.includes(name)) {
                    select.add(new Option(name, name));
                }
            });
        }
    });
}

function populateAppSettingsTab(config) {
    document.getElementById('page-title-input').value = config.pageTitle || '';
    document.getElementById('theme-select').value = config.theme || 'auto';
    let backgroundType = config.backgroundType;
    if (backgroundType !== 'color' && backgroundType !== 'image') {
        backgroundType = 'color';
    }
    const typeInput = document.querySelector(`input[name="backgroundType"][value="${backgroundType}"]`);
    if (typeInput) {
        typeInput.checked = true;
    }
    document.getElementById('bg-color-input').value = config.backgroundColor || '#f0f2f5';
    document.getElementById('bg-image-input').value = config.backgroundImage || '';
    toggleBackgroundInputs();
}

function previewAppSettings(event) {
    if (event && event.target.name === 'backgroundType') {
        toggleBackgroundInputs();
    }
    const form = document.getElementById('app-settings-form');
    const tempConfig = {
        pageTitle: form.pageTitle.value,
        theme: form.theme.value,
        backgroundType: form.backgroundType.value,
        backgroundColor: form.backgroundColor.value,
        backgroundImage: document.getElementById('bg-image-input').value
    };
    applyAppSettings(tempConfig);
}

function toggleBackgroundInputs() {
    const useImage = document.getElementById('bg-type-image').checked;
    document.getElementById('bg-color-wrapper').classList.toggle('hidden', useImage);
    document.getElementById('bg-image-wrapper').classList.toggle('hidden', !useImage);
}

function handleBackgroundFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        alert('警告：图片文件过大（>2MB），可能无法永久保存在浏览器中。建议使用URL方式或压缩图片。');
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target.result;
        document.getElementById('bg-image-input').value = dataUrl;
        previewAppSettings(null);
    };
    reader.readAsDataURL(file);
}

async function saveConfig() {
    const saveButton = document.getElementById('save-config-btn');
    saveButton.textContent = '正在保存...';
    saveButton.disabled = true;

    const form = document.getElementById('app-settings-form');
    const bgImageInput = document.getElementById('bg-image-input');
    const saveData = {
        pageTitle: form.pageTitle.value,
        theme: form.theme.value,
        backgroundType: form.backgroundType.value,
        backgroundColor: form.backgroundColor.value,
        backgroundImage: bgImageInput.value,
        groups: []
    };

    const groupsMap = new Map();
    const orderedGroupNames = getGroupNamesFromUI();
    orderedGroupNames.forEach((name) => groupsMap.set(name, []));
    document.querySelectorAll('#config-table-body tr').forEach((tr) => {
        const item = {
            name: tr.querySelector('.name-input').value,
            url: tr.querySelector('.url-input').value,
            icon: tr.querySelector('.icon-url-input').value
        };
        const groupName = tr.querySelector('.group-select').value;
        if (item.name && item.url && groupsMap.has(groupName)) {
            groupsMap.get(groupName).push(item);
        }
    });
    for (const name of orderedGroupNames) {
        saveData.groups.push({ name, items: groupsMap.get(name) || [] });
    }

    try {
        let token = getPersistedToken();
        if (token === null) {
            token = prompt('请输入您的保存密钥 (如果您在部署时设置了):', '');
            if (token !== null) {
                setPersistedToken(token);
            }
        }

        const response = await saveConfigData(saveData, token);
        if (response.ok) {
            alert('保存成功！页面即将刷新以应用更改。');
            location.reload();
        } else if (response.status === 401) {
            alert('保存失败：密钥错误！请刷新页面后重试。');
            setPersistedToken(null);
        } else {
            const errorText = await response.text();
            alert(`保存失败：${errorText}`);
        }
    } catch (error) {
        alert(`保存时发生网络错误: ${error.message}`);
    } finally {
        saveButton.textContent = '保存并刷新';
        saveButton.disabled = false;
    }
}

function exportConfig() {
    const form = document.getElementById('app-settings-form');
    const bgImageInput = document.getElementById('bg-image-input');
    const exportData = {
        pageTitle: form.pageTitle.value,
        theme: form.theme.value,
        backgroundType: form.backgroundType.value,
        backgroundColor: form.backgroundColor.value,
        backgroundImage: bgImageInput.value,
        groups: []
    };

    const groupsMap = new Map();
    const orderedGroupNames = getGroupNamesFromUI();
    orderedGroupNames.forEach((name) => groupsMap.set(name, []));
    document.querySelectorAll('#config-table-body tr').forEach((tr) => {
        const item = {
            name: tr.querySelector('.name-input').value,
            url: tr.querySelector('.url-input').value,
            icon: tr.querySelector('.icon-url-input').value
        };
        const groupName = tr.querySelector('.group-select').value;
        if (item.name && item.url && groupsMap.has(groupName)) {
            groupsMap.get(groupName).push(item);
        }
    });
    for (const name of orderedGroupNames) {
        exportData.groups.push({ name, items: groupsMap.get(name) || [] });
    }

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importConfig(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        try {
            const importedConfig = JSON.parse(loadEvent.target.result);
            if (confirm('导入配置将覆盖当前设置面板中的所有内容（需要手动保存才能生效），要继续吗？')) {
                populateServicesTab(importedConfig);
                populateGroupsTab(importedConfig);
                populateAppSettingsTab(importedConfig);
            }
        } catch (error) {
            alert('导入失败！文件内容不是有效的JSON格式。');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function resetConfig() {
    if (confirm('此操作会重置您在设置面板中的所有修改，回到上次保存的状态。要继续吗？')) {
        closeSettingsModal();
        openSettingsModal();
    }
}

function guessIcon(tableRow) {
    const urlInput = tableRow.querySelector('.url-input');
    const nameInput = tableRow.querySelector('.name-input');
    const iconInput = tableRow.querySelector('.icon-url-input');
    const serviceUrl = urlInput.value;
    const serviceName = nameInput.value.toLowerCase().trim();
    if (!serviceUrl && !serviceName) {
        alert('请先填写服务名称或网址。');
        return;
    }
    let iconUrl = '';
    if (serviceUrl) {
        try {
            const domain = new URL(serviceUrl).hostname;
            iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;
        } catch (error) {
            if (serviceName) {
                iconUrl = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${serviceName.replace(/\s+/g, '')}.png`;
            }
        }
    } else if (serviceName) {
        iconUrl = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${serviceName.replace(/\s+/g, '')}.png`;
    }
    iconInput.value = iconUrl;
    tableRow.querySelector('.icon-preview').src = iconUrl;
}
