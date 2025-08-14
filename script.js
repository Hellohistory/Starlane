let intersectionObserver = null;

// --- 缓存 DOM 元素 ---
const backgroundElement = document.querySelector('.background-aurora');
const settingsModal = document.getElementById('settings-modal');

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
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'auto' && prefersDark)) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
    }

    if (config.backgroundType === 'image' && config.backgroundImage) {
        backgroundElement.style.background = `url('${config.backgroundImage}')`;
        backgroundElement.style.backgroundSize = 'cover';
        backgroundElement.style.backgroundPosition = 'center center';
        backgroundElement.style.backgroundRepeat = 'no-repeat';
        backgroundElement.style.animation = 'none';
    } else if (config.backgroundType === 'color' && config.backgroundColor) {
        backgroundElement.style.background = config.backgroundColor;
        backgroundElement.style.animation = 'none';
    } else {
        backgroundElement.style.background = '';
        backgroundElement.style.backgroundSize = '';
        backgroundElement.style.backgroundPosition = '';
        backgroundElement.style.animation = '';
    }
}

function renderPage(config) {
    const pageTitle = config.pageTitle || 'Starlane';
    document.title = pageTitle;
    document.getElementById('page-title').textContent = pageTitle;
    document.getElementById('sidebar-title').textContent = pageTitle;

    const mainContainer = document.getElementById('starlane-container');
    const sidebarList = document.getElementById('sidebar-group-list');

    mainContainer.innerHTML = '';
    sidebarList.innerHTML = '';

    if (intersectionObserver) intersectionObserver.disconnect();
    intersectionObserver = new IntersectionObserver(handleScrollSpy, {
        rootMargin: "-50% 0px -50% 0px"
    });

    if (config.groups && Array.isArray(config.groups) && config.groups.length > 0) {
        config.groups.forEach((group, index) => {
            const groupAnchorId = `group-${index}`;
            const groupSection = createGroupSection(group, groupAnchorId);
            mainContainer.appendChild(groupSection);
            intersectionObserver.observe(groupSection);
            const sidebarItem = createSidebarItem(group, groupAnchorId);
            sidebarList.appendChild(sidebarItem);
        });
    } else {
        mainContainer.innerHTML = '<p style="text-align:center;">配置文件为空或加载失败，请在设置中添加服务。</p>';
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
        iconHtml = `<img class="link-icon" src="${item.icon}" alt="${item.name} icon" loading="lazy" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';">`;
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
    // 添加 cache: 'no-store' 确保每次都获取最新文件，避免浏览器缓存问题
    const response = await fetch('/data/config.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`无法加载配置文件 /data/config.json: ${response.statusText}`);
    }
    return await response.json();
}

// --- 事件监听主函数 ---
function setupEventListeners() {
    // 侧边栏控制
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const openSidebar = () => { document.body.classList.add('sidebar-visible'); };
    const closeSidebar = () => { document.body.classList.remove('sidebar-visible'); };

    menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.contains('sidebar-visible') ? closeSidebar() : openSidebar();
    });
    sidebarOverlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('#sidebar-group-list').forEach(list => {
        list.addEventListener('click', (e) => {
            if(e.target.tagName === 'A' && window.innerWidth <= 992) {
                closeSidebar();
            }
        });
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('sidebar-visible')) {
            closeSidebar();
        }
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992 && document.body.classList.contains('sidebar-visible')) {
            closeSidebar();
        }
    });

    // 设置模态框控制
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('close-modal-btn').addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') closeSettingsModal();
    });

    // 模态框内部事件
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', switchTab));
    document.getElementById('add-row-btn').addEventListener('click', () => addTableRow({ group: getGroupNamesFromUI()[0] || '默认分类' }, getGroupNamesFromUI()));
    document.getElementById('add-group-btn').addEventListener('click', addGroup);
    const groupListContainer = document.getElementById('group-list');
    groupListContainer.addEventListener('dragstart', handleDragStart);
    groupListContainer.addEventListener('dragover', handleDragOver);
    groupListContainer.addEventListener('dragleave', handleDragLeave);
    groupListContainer.addEventListener('drop', handleDrop);
    groupListContainer.addEventListener('dragend', handleDragEnd);

    // 页面设置
    document.getElementById('app-settings-form').addEventListener('input', previewAppSettings);
    document.getElementById('bg-file-input').addEventListener('change', handleBackgroundFileUpload);

    // 配置保存与导入导出
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
        settingsModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            settingsModal.classList.add('visible');
        });
    } catch (error) { handleError(error); }
}

function closeSettingsModal() {
    settingsModal.classList.remove('visible');
    settingsModal.addEventListener('transitionend', () => {
        settingsModal.classList.add('hidden');
    }, { once: true });
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
        <td data-label="服务名称"><input type="text" class="name-input" value="${item.name || ''}" placeholder="如：Jellyfin"></td>
        <td data-label="网址 (URL)"><input type="url" class="url-input" value="${item.url || ''}" placeholder="https://..."></td>
        <td data-label="图标地址"><div class="icon-input-wrapper">
            <input type="text" class="icon-url-input" value="${item.icon || ''}" placeholder="https://...">
            <button class="guess-icon-btn" title="智能识别图标">💡</button>
        </div></td>
        <td data-label="预览"><img class="icon-preview" src="${item.icon || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}" onerror="this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';"></td>
        <td data-label="所属分类"><select class="group-select">${groupNames.map(name => `<option value="${name}" ${name === item.group ? 'selected' : ''}>${name}</option>`).join('')}</select></td>
        <td data-label="操作"><button class="delete-row-btn" title="删除此行">🗑️</button></td>
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
    if (afterElement == null) {
        if(container.lastElementChild && container.lastElementChild !== draggingElement) container.lastElementChild.classList.add('drag-over-bottom');
    } else {
        afterElement.classList.add('drag-over-top');
    }
}
function handleDragLeave(e) {
    e.target.closest('li')?.classList.remove('drag-over-top', 'drag-over-bottom');
}
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
function handleDragEnd() {
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
    const finish = () => {
        const newName = input.value.trim();
        const newSpan = document.createElement('span');
        newSpan.className = 'group-name-span';
        const existingNames = getGroupNamesFromUI().filter(n => n !== oldName);
        if (newName && newName !== oldName && !existingNames.includes(newName)) {
            newSpan.textContent = newName;
            input.closest('li').dataset.groupName = newName;
            updateAllGroupSelects(oldName, newName);
        } else {
            newSpan.textContent = oldName;
            if (newName !== oldName) alert("分类名不能为空或重复！");
        }
        input.replaceWith(newSpan);
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
}
function getGroupNamesFromUI() { return Array.from(document.querySelectorAll('#group-list li')).map(li => li.dataset.groupName); }
function updateAllGroupSelects(oldName, newName) {
    document.querySelectorAll('.group-select').forEach(select => {
        const selectedValue = select.value;
        if (oldName && !newName) {
            const newGroupNames = getGroupNamesFromUI();
            select.innerHTML = newGroupNames.map(name => `<option value="${name}">${name}</option>`).join('');
            select.value = newGroupNames.includes(selectedValue) ? selectedValue : (newGroupNames[0] || '');
        } else if (oldName && newName) {
            Array.from(select.options).forEach(opt => { if (opt.value === oldName) { opt.value = newName; opt.textContent = newName; }});
        } else {
            const newGroupNames = getGroupNamesFromUI();
            const currentOptions = Array.from(select.options).map(o => o.value);
            newGroupNames.forEach(name => {
                if(!currentOptions.includes(name)) select.add(new Option(name, name));
            });
        }
    });
}

// --- 页面设置 ---
function populateAppSettingsTab(config) {
    document.getElementById('page-title-input').value = config.pageTitle || '';
    document.getElementById('theme-select').value = config.theme || 'auto';
    let bgType = config.backgroundType;
    if (bgType !== 'color' && bgType !== 'image') {
        bgType = 'color';
    }
    document.querySelector(`input[name="backgroundType"][value="${bgType}"]`).checked = true;
    document.getElementById('bg-color-input').value = config.backgroundColor || '#f0f2f5';
    document.getElementById('bg-image-input').value = config.backgroundImage || '';
    toggleBackgroundInputs();
}
function previewAppSettings(event) {
    if (event && event.target.name === 'backgroundType') toggleBackgroundInputs();
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
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) alert('警告：图片文件过大（>2MB），可能无法永久保存在浏览器中。建议使用URL方式或压缩图片。');
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        document.getElementById('bg-image-input').value = dataUrl;
        previewAppSettings(null);
    };
    reader.readAsDataURL(file);
}

// --- 保存、导出、导入、重置 ---
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
    orderedGroupNames.forEach(name => groupsMap.set(name, []));
    document.querySelectorAll('#config-table-body tr').forEach(tr => {
        const item = {
            name: tr.querySelector('.name-input').value,
            url: tr.querySelector('.url-input').value,
            icon: tr.querySelector('.icon-url-input').value,
        };
        const groupName = tr.querySelector('.group-select').value;
        if (item.name && item.url) {
            if (groupsMap.has(groupName)) { groupsMap.get(groupName).push(item); }
        }
    });
    for (const name of orderedGroupNames) { saveData.groups.push({ name, items: groupsMap.get(name) || [] }); }

    try {
        let token = sessionStorage.getItem('starlane_save_token');
        if (token === null) {
            token = prompt("请输入您的保存密钥 (如果您在部署时设置了):", "");
            if (token !== null) {
                sessionStorage.setItem('starlane_save_token', token);
            }
        }

        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Save-Token': token || '' },
            body: JSON.stringify(saveData)
        });

        if (response.ok) {
            alert('保存成功！页面即将刷新以应用更改。');
            location.reload();
        } else if (response.status === 401) {
            alert('保存失败：密钥错误！请刷新页面后重试。');
            sessionStorage.removeItem('starlane_save_token');
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
        pageTitle: form.pageTitle.value, theme: form.theme.value,
        backgroundType: form.backgroundType.value, backgroundColor: form.backgroundColor.value,
        backgroundImage: bgImageInput.value, groups: []
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
        if (item.name && item.url) {
            if (groupsMap.has(groupName)) { groupsMap.get(groupName).push(item); }
        }
    });
    for (const name of orderedGroupNames) { exportData.groups.push({ name, items: groupsMap.get(name) || [] }); }

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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedConfig = JSON.parse(e.target.result);
            if (confirm('导入配置将覆盖当前设置面板中的所有内容（需要手动保存才能生效），要继续吗？')) {
                populateServicesTab(importedConfig);
                populateGroupsTab(importedConfig);
                populateAppSettingsTab(importedConfig);
            }
        } catch (error) { alert('导入失败！文件内容不是有效的JSON格式。'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}
function resetConfig() {
    if (confirm('此操作会重置您在设置面板中的所有修改，回到上次保存的状态。要继续吗？')) {
        closeSettingsModal(); // or just reopen it
        openSettingsModal();
    }
}

// --- 其他工具函数 ---
function guessIcon(tr) {
    const urlInput = tr.querySelector('.url-input'), nameInput = tr.querySelector('.name-input'), iconInput = tr.querySelector('.icon-url-input');
    const serviceUrl = urlInput.value, serviceName = nameInput.value.toLowerCase().trim();
    if (!serviceUrl && !serviceName) return alert("请先填写服务名称或网址。");
    let iconUrl = '';
    if (serviceUrl) {
        try {
            const domain = new URL(serviceUrl).hostname;
            iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;
        } catch (e) {
            if (serviceName) iconUrl = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${serviceName.replace(/\s+/g, '')}.png`;
        }
    } else if (serviceName) {
        iconUrl = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${serviceName.replace(/\s+/g, '')}.png`;
    }
    iconInput.value = iconUrl;
    tr.querySelector('.icon-preview').src = iconUrl;
}
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if(searchInput.dataset.listener) return;
    searchInput.dataset.listener = 'true';
    searchInput.addEventListener('input', (e) => {
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
    const container = document.getElementById('starlane-container') || document.body;
    container.innerHTML = `<div style="text-align: center; padding: 50px; color: #ff5252; background: rgba(255, 82, 82, 0.1); border-radius: var(--border-radius-md);"><h1>发生错误</h1><p>${error.message}</p><p>请检查服务器上的 /data/config.json 文件是否存在且格式正确，或检查网络连接。</p></div>`;
}