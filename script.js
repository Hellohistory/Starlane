const CONFIG_STORAGE_KEY = 'starlaneConfig';
let intersectionObserver = null;

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        const config = await getConfig();
        applyAppSettings(config);
        renderPage(config);
    } catch (error) {
        handleError(error);
    }
}

// --- 页面渲染与应用设置 ---
function applyAppSettings(config) {
    const theme = config.theme || 'auto';
    const body = document.body;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme === 'auto' && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    if (config.backgroundType === 'image' && config.backgroundImage) {
        if (config.backgroundImage.startsWith('data:image')) {
            body.style.backgroundImage = `url(${config.backgroundImage})`;
        } else {
            body.style.backgroundImage = `url('${config.backgroundImage}')`;
        }
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
    } else {
        body.style.backgroundImage = 'none';
        body.style.backgroundColor = config.backgroundColor || '#f0f2f5';
    }
}

function renderPage(config) {
    document.title = config.pageTitle || 'Starlane';
    document.getElementById('page-title').textContent = config.pageTitle || 'Starlane';
    document.getElementById('sidebar-title').textContent = config.pageTitle || 'Starlane';

    const mainContainer = document.getElementById('starlane-container');
    const sidebarList = document.getElementById('sidebar-group-list');
    mainContainer.innerHTML = '';
    sidebarList.innerHTML = '';

    if (intersectionObserver) intersectionObserver.disconnect();
    intersectionObserver = new IntersectionObserver(handleScrollSpy, {
        rootMargin: "-50% 0px -50% 0px"
    });

    if (config.groups && Array.isArray(config.groups)) {
        config.groups.forEach((group, index) => {
            const groupAnchorId = `group-${index}`;
            const groupSection = createGroupSection(group, groupAnchorId);
            mainContainer.appendChild(groupSection);
            intersectionObserver.observe(groupSection);
            const sidebarItem = createSidebarItem(group, groupAnchorId);
            sidebarList.appendChild(sidebarItem);
        });
    }
    setupSearch();
}

function createGroupSection(group, anchorId) {
    const groupSection = document.createElement('section');
    groupSection.className = 'group';
    groupSection.id = anchorId;
    groupSection.innerHTML = `<h2 class="group-title">${group.name}</h2>`;
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';
    if (group.items && Array.isArray(group.items)) {
        group.items.forEach(item => itemsContainer.appendChild(createLinkCard(item)));
    }
    groupSection.appendChild(itemsContainer);
    return groupSection;
}

function createSidebarItem(group, anchorId) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${anchorId}`;
    a.textContent = group.name;
    a.dataset.targetId = anchorId;
    a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(anchorId).scrollIntoView({
            behavior: 'smooth'
        });
        document.body.classList.remove('sidebar-visible');
    });
    li.appendChild(a);
    return li;
}

function createLinkCard(item) {
    const linkCard = document.createElement('a');
    linkCard.className = 'link-card';
    linkCard.href = item.url;
    linkCard.target = '_blank';
    linkCard.rel = 'noopener noreferrer';
    let iconHtml = '';
    if (item.icon) {
        iconHtml = `<img class="link-icon" src="${item.icon}" alt="${item.name} icon" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';">`;
    }
    linkCard.innerHTML = `${iconHtml}<span class="link-name">${item.name}</span>`;
    return linkCard;
}

function handleScrollSpy(entries) {
    entries.forEach(entry => {
        const link = document.querySelector(`#sidebar-group-list a[data-target-id="${entry.target.id}"]`);
        if (link && entry.isIntersecting) {
            document.querySelectorAll('#sidebar-group-list a.active').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
        }
    });
}

// --- 配置管理 ---
async function getConfig() {
    const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (storedConfig) return JSON.parse(storedConfig);
    const response = await fetch('config.json');
    if (!response.ok) throw new Error(`无法加载默认配置文件: ${response.statusText}`);
    const fileConfig = await response.json();
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(fileConfig));
    return fileConfig;
}

// --- 事件监听主函数 ---
function setupEventListeners() {
    document.getElementById('menu-toggle-btn').addEventListener('click', () => document.body.classList.toggle('sidebar-visible'));
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('close-modal-btn').addEventListener('click', () => document.getElementById('settings-modal').classList.add('hidden'));
    document.getElementById('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') document.getElementById('settings-modal').classList.add('hidden'); });

    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', switchTab));
    document.getElementById('add-row-btn').addEventListener('click', () => addTableRow({ group: getGroupNamesFromUI()[0] || '默认分类' }, getGroupNamesFromUI()));

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
    document.getElementById('import-config-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', importConfig);
}

// --- 设置模态框 ---
async function openSettingsModal() {
    try {
        const config = await getConfig();
        populateServicesTab(config);
        populateGroupsTab(config);
        populateAppSettingsTab(config);
        document.getElementById('settings-modal').classList.remove('hidden');
    } catch (error) { handleError(error); }
}

function switchTab(event) {
    const tabId = event.target.dataset.tab;
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

function populateServicesTab(config) {
    const tableBody = document.getElementById('config-table-body');
    tableBody.innerHTML = '';
    const groupNames = config.groups.map(g => g.name);
    config.groups.forEach(group => {
        if (group.items) {
            group.items.forEach(item => addTableRow({ ...item, group: group.name }, groupNames));
        }
    });
}

function addTableRow(item, groupNames) {
    const tr = document.getElementById('config-table-body').insertRow();
    tr.innerHTML = `
        <td><input type="text" class="name-input" value="${item.name || ''}" placeholder="如：Jellyfin"></td>
        <td><input type="url" class="url-input" value="${item.url || ''}" placeholder="https://..."></td>
        <td><div class="icon-input-wrapper">
            <input type="text" class="icon-url-input" value="${item.icon || ''}" placeholder="https://...">
            <button class="guess-icon-btn" title="智能识别图标">💡</button>
        </div></td>
        <td><img class="icon-preview" src="${item.icon || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';"></td>
        <td><select class="group-select">${groupNames.map(name => `<option value="${name}" ${name === item.group ? 'selected' : ''}>${name}</option>`).join('')}</select></td>
        <td><button class="delete-row-btn" title="删除此行">🗑️</button></td>
    `;
    const iconUrlInput = tr.querySelector('.icon-url-input');
    iconUrlInput.addEventListener('input', () => { tr.querySelector('.icon-preview').src = iconUrlInput.value; });
    tr.querySelector('.guess-icon-btn').addEventListener('click', (e) => guessIcon(e.target.closest('tr')));
    tr.querySelector('.delete-row-btn').addEventListener('click', () => tr.remove());
}

// --- 分类管理 ---
function populateGroupsTab(config) {
    const groupList = document.getElementById('group-list');
    groupList.innerHTML = '';
    config.groups.forEach(group => createGroupListItem(group.name));
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
    li.querySelector('.rename-group-btn').addEventListener('click', (e) => renameGroup(e.target.closest('li')));
    li.querySelector('.delete-group-btn').addEventListener('click', (e) => deleteGroup(e.target.closest('li')));
}

let draggingElement = null;
function handleDragStart(e) {
    if (e.target.matches('li[draggable="true"]')) {
        draggingElement = e.target;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => draggingElement.classList.add('dragging'), 0);
    }
}
function handleDragOver(e) {
    e.preventDefault();
    const container = e.currentTarget;
    const afterElement = getDragAfterElement(container, e.clientY);
    container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
    if (afterElement == null) {
        const lastElement = container.lastElementChild;
        if(lastElement && lastElement !== draggingElement) lastElement.classList.add('drag-over-bottom');
    } else {
        afterElement.classList.add('drag-over-top');
    }
}
function handleDragLeave(e) { /* No-op, handled by dragover */ }
function handleDrop(e) {
    e.preventDefault();
    const container = e.currentTarget;
    const afterElement = getDragAfterElement(container, e.clientY);
    if (draggingElement) {
        if (afterElement == null) {
            container.appendChild(draggingElement);
        } else {
            container.insertBefore(draggingElement, afterElement);
        }
    }
}
function handleDragEnd(e) {
    if (draggingElement) draggingElement.classList.remove('dragging');
    document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
    draggingElement = null;
}
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function addGroup() {
    const input = document.getElementById('new-group-name');
    const name = input.value.trim();
    if (!name || getGroupNamesFromUI().includes(name)) return alert("分类名不能为空或重复！");
    createGroupListItem(name);
    updateAllGroupSelects();
    input.value = '';
}
function deleteGroup(li) {
    const name = li.dataset.groupName;
    if (!confirm(`您确定要删除 "${name}" 分类吗？其中的服务项将被移动到第一个分类中。`)) return;
    li.remove();
    updateAllGroupSelects(name);
}
function renameGroup(li) {
    const span = li.querySelector('.group-name-span');
    const oldName = span.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'group-name-input';
    input.value = oldName;
    span.replaceWith(input);
    input.focus();
    input.addEventListener('blur', () => finishRename(input, oldName));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
}
function finishRename(input, oldName) {
    const newName = input.value.trim();
    const span = document.createElement('span');
    span.className = 'group-name-span';
    const existingNames = getGroupNamesFromUI().filter(name => name !== oldName);
    if (newName && newName !== oldName && !existingNames.includes(newName)) {
        span.textContent = newName;
        input.closest('li').dataset.groupName = newName;
        updateAllGroupSelects(oldName, newName);
    } else {
        span.textContent = oldName;
        if (newName !== oldName) alert("分类名不能为空或重复！");
    }
    input.replaceWith(span);
}
function getGroupNamesFromUI() { return Array.from(document.querySelectorAll('#group-list li')).map(li => li.dataset.groupName); }
function updateAllGroupSelects(oldName, newName) {
    document.querySelectorAll('.group-select').forEach(select => {
        const selectedValue = select.value;
        const newGroupNames = getGroupNamesFromUI();
        if (oldName && !newName) { // Deletion
            select.innerHTML = newGroupNames.map(name => `<option value="${name}">${name}</option>`).join('');
            select.value = newGroupNames.includes(selectedValue) ? selectedValue : (newGroupNames[0] || '');
        } else if (oldName && newName) { // Rename
            Array.from(select.options).forEach(opt => { if (opt.value === oldName) { opt.value = newName; opt.textContent = newName; }});
        } else { // Addition
            select.innerHTML = newGroupNames.map(name => `<option value="${name}" ${name === selectedValue ? 'selected' : ''}>${name}</option>`).join('');
        }
    });
}

// --- 页面设置 ---
function populateAppSettingsTab(config) {
    document.getElementById('page-title-input').value = config.pageTitle || '';
    document.getElementById('theme-select').value = config.theme || 'auto';
    const bgType = config.backgroundType || 'color';
    document.querySelector(`input[name="backgroundType"][value="${bgType}"]`).checked = true;
    document.getElementById('bg-color-input').value = config.backgroundColor || '#f0f2f5';
    document.getElementById('bg-image-input').value = config.backgroundImage || '';
    toggleBackgroundInputs();
}
function previewAppSettings(event) {
    if (event.target.name === 'backgroundType') toggleBackgroundInputs();
    const form = document.getElementById('app-settings-form');
    const tempConfig = {
        pageTitle: form.pageTitle.value,
        theme: form.theme.value,
        backgroundType: form.backgroundType.value,
        backgroundColor: form.backgroundColor.value,
        backgroundImage: form.backgroundImage.value
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
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) alert('警告：图片文件过大（>2MB），可能无法永久保存在浏览器中。建议使用URL方式或压缩图片。');
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('bg-image-input').value = e.target.result;
        previewAppSettings(event);
    };
    reader.readAsDataURL(file);
}

function saveConfig() {
    const form = document.getElementById('app-settings-form');
    const newConfig = {
        pageTitle: form.pageTitle.value,
        theme: form.theme.value,
        backgroundType: form.backgroundType.value,
        backgroundColor: form.backgroundColor.value,
        backgroundImage: form.backgroundImage.value,
        groups: []
    };
    const groupsMap = new Map();
    const orderedGroupNames = getGroupNamesFromUI();
    orderedGroupNames.forEach(name => groupsMap.set(name, []));
    document.querySelectorAll('#config-table-body tr').forEach(tr => {
        const item = {
            name: tr.querySelector('.name-input').value,
            url: tr.querySelector('.url-input').value,
            icon: tr.querySelector('.icon-url-input').value,
        };
        const groupName = tr.querySelector('.group-select').value;
        if (!item.name || !item.url) return;
        if (groupsMap.has(groupName)) { groupsMap.get(groupName).push(item); }
    });
    for (const name of orderedGroupNames) { newConfig.groups.push({ name, items: groupsMap.get(name) || [] }); }
    try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
        alert('配置已保存！页面将刷新以应用更改。');
        location.reload();
    } catch (error) { handleError(new Error("保存配置失败：" + error.message)); }
}
function exportConfig() {
    getConfig().then(currentConfig => {
        const dataStr = JSON.stringify(currentConfig, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'config.json'; a.click();
        URL.revokeObjectURL(url);
    });
}
function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            JSON.parse(e.target.result);
            if (confirm('您确定要导入此配置吗？这将覆盖您现有的浏览器设置。')) {
                localStorage.setItem(CONFIG_STORAGE_KEY, e.target.result);
                alert('导入成功！页面将刷新。');
                location.reload();
            }
        } catch (error) { alert('导入失败！文件内容不是有效的JSON格式。'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}
function resetConfig() {
    if (confirm('您确定要重置为默认配置吗？所有更改都将丢失。')) {
        localStorage.removeItem(CONFIG_STORAGE_KEY);
        alert('已重置为默认配置。页面将刷新。');
        location.reload();
    }
}

function guessIcon(tr) {
    const urlInput = tr.querySelector('.url-input'), nameInput = tr.querySelector('.name-input'), iconInput = tr.querySelector('.icon-url-input');
    const serviceUrl = urlInput.value, serviceName = nameInput.value.toLowerCase().trim();
    if (!serviceUrl && !serviceName) return alert("请先填写服务名称或网址。");
    let iconUrl = '';
    if (serviceName) {
        iconUrl = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${serviceName.replace(/\s+/g, '')}.png`;
    } else if (serviceUrl) {
        try {
            const domain = new URL(serviceUrl).hostname;
            iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;
        } catch (e) { console.warn("无法从URL解析域名:", serviceUrl); }
    }
    iconInput.value = iconUrl;
    tr.querySelector('.icon-preview').src = iconUrl;
}
function setupSearch() {
    document.getElementById('search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.group').forEach(group => {
            let visibleCardsInGroup = 0;
            group.querySelectorAll('.link-card').forEach(card => {
                const cardName = card.querySelector('.link-name').textContent.toLowerCase();
                const isVisible = cardName.includes(searchTerm);
                card.style.display = isVisible ? 'flex' : 'none';
                if (isVisible) visibleCardsInGroup++;
            });
            group.style.display = visibleCardsInGroup > 0 ? 'block' : 'none';
        });
    });
}
function handleError(error) {
    console.error('Starlane 发生错误:', error);
    document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: red;"><h1>发生错误</h1><p>${error.message}</p></div>`;
}