import { getConfig, saveConfigData } from './api.js';
import { handleError } from './ui.js';

let settingsInitialized = false;
let currentConfig = null; // 内存中保存一份
let editingItemElement = null; // 当前正在编辑的 DOM 元素

const SAVE_TOKEN_STORAGE_KEY = 'starlane_save_token';
const settingsModal = document.getElementById('settings-modal');
const editorDialog = document.getElementById('item-editor-dialog');

// --- 初始化 ---
export function initializeSettingsPanel() {
    if (settingsInitialized) return;
    settingsInitialized = true;

    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('close-modal-btn').addEventListener('click', closeSettingsModal);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab + '-tab').classList.add('active');
        });
    });

    document.getElementById('add-group-btn').addEventListener('click', addNewGroup);
    document.getElementById('save-config-btn').addEventListener('click', saveConfig);
    document.getElementById('reset-config-btn').addEventListener('click', () => {
        if(confirm('确定重置所有未保存的修改吗？')) openSettingsModal();
    });

    document.getElementById('bg-file-input').addEventListener('change', handleBgUpload);

    setupDialogEvents();

    document.getElementById('export-config-btn').addEventListener('click', exportConfig);
    document.getElementById('import-config-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', importConfig);
}

async function openSettingsModal() {
    try {
        currentConfig = await getConfig();
        renderEditorBoard(currentConfig);
        populateAppSettings(currentConfig);
        settingsModal.classList.remove('hidden');
        setTimeout(() => settingsModal.classList.add('visible'), 10);
    } catch (error) {
        handleError(error);
    }
}

function closeSettingsModal() {
    settingsModal.classList.remove('visible');
    setTimeout(() => settingsModal.classList.add('hidden'), 300);
}

// --- 渲染编辑器核心逻辑 ---

function renderEditorBoard(config) {
    const board = document.getElementById('editor-board');
    board.innerHTML = ''; // 清空

    if (!config.groups) config.groups = [];

    config.groups.forEach(group => {
        const groupEl = createGroupElement(group.name, group.items || []);
        board.appendChild(groupEl);
    });

    initSortable();
}

function createGroupElement(name, items) {
    const div = document.createElement('div');
    div.className = 'editor-group';
    div.innerHTML = `
        <div class="editor-group-header">
            <span class="drag-handle-group">☰</span>
            <input type="text" class="group-name-input" value="${name}">
            <div class="group-controls">
                <button class="delete-group-btn" title="删除分类">✕</button>
            </div>
        </div>
        <div class="editor-items-list"></div>
    `;

    // 绑定删除分类事件
    div.querySelector('.delete-group-btn').addEventListener('click', () => {
        if (confirm(`确定删除分类 "${div.querySelector('.group-name-input').value}" 吗？里面的卡片也会被删除。`)) {
            div.remove();
        }
    });

    const listEl = div.querySelector('.editor-items-list');
    
    // 渲染卡片
    items.forEach(item => {
        listEl.appendChild(createCardElement(item));
    });

    // 添加“新增卡片”按钮
    const addBtn = document.createElement('button');
    addBtn.className = 'add-item-btn';
    addBtn.textContent = '+ 添加服务';
    addBtn.addEventListener('click', () => openEditDialog(null, addBtn));
    listEl.appendChild(addBtn);

    return div;
}

function createCardElement(item) {
    const div = document.createElement('div');
    div.className = 'editor-card';
    div.dataset.name = item.name;
    div.dataset.url = item.url;
    div.dataset.icon = item.icon;
    
    div.innerHTML = `
        <img src="${item.icon || ''}" onerror="this.style.display='none'">
        <span>${item.name}</span>
        <div class="edit-hint">编辑</div>
    `;
    
    // 点击卡片打开编辑
    div.addEventListener('click', () => openEditDialog(div));
    return div;
}

function addNewGroup() {
    const board = document.getElementById('editor-board');
    const newGroup = createGroupElement('新分类', []);
    board.appendChild(newGroup);
    initSortable(); // 重新绑定拖拽
    newGroup.scrollIntoView({ behavior: 'smooth' });
    newGroup.querySelector('input').focus();
}

// --- SortableJS 初始化 ---

function initSortable() {
    const board = document.getElementById('editor-board');

    Sortable.create(board, {
        handle: '.drag-handle-group',
        animation: 150,
        ghostClass: 'sortable-ghost'
    });

    document.querySelectorAll('.editor-items-list').forEach(list => {
        Sortable.create(list, {
            group: 'shared-items', // 允许跨列表
            animation: 150,
            ghostClass: 'sortable-ghost',
            draggable: '.editor-card' // 不允许拖拽“添加按钮”
        });
    });
}

// --- Dialog 编辑逻辑 ---

function setupDialogEvents() {
    const form = document.getElementById('item-editor-form');
    
    // 图标预览
    document.getElementById('edit-icon').addEventListener('input', (e) => {
        document.getElementById('edit-preview-img').src = e.target.value;
    });

    // 自动猜测图标
    document.getElementById('guess-icon-btn').addEventListener('click', () => {
        const url = document.getElementById('edit-url').value;
        if (!url) return;
        try {
            const domain = new URL(url).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`;
            document.getElementById('edit-icon').value = iconUrl;
            document.getElementById('edit-preview-img').src = iconUrl;
        } catch(e) {}
    });

    // 关闭/取消
    document.getElementById('cancel-edit-btn').addEventListener('click', () => editorDialog.close());

    // 删除项目
    document.getElementById('delete-item-btn').addEventListener('click', () => {
        if (editingItemElement) {
            editingItemElement.remove();
        }
        editorDialog.close();
    });

    // 确认保存
    document.getElementById('confirm-edit-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = {
            name: document.getElementById('edit-name').value,
            url: document.getElementById('edit-url').value,
            icon: document.getElementById('edit-icon').value
        };

        if (editingItemElement) {
            // 修改现有卡片
            updateCardElement(editingItemElement, data);
        } else {
            // 新增卡片 (targetList 在 openEditDialog 中暂存)
            const targetList = window.targetAddList; 
            const newCard = createCardElement(data);
            targetList.insertBefore(newCard, targetList.lastElementChild); // 插在按钮前面
        }
        editorDialog.close();
    });
}

function openEditDialog(cardElement, addButtonElement = null) {
    editingItemElement = cardElement;
    
    if (cardElement) {
        // 编辑模式
        document.getElementById('edit-name').value = cardElement.dataset.name;
        document.getElementById('edit-url').value = cardElement.dataset.url;
        document.getElementById('edit-icon').value = cardElement.dataset.icon;
        document.getElementById('edit-preview-img').src = cardElement.dataset.icon;
        document.getElementById('delete-item-btn').classList.remove('hidden');
    } else {
        // 新增模式
        document.getElementById('item-editor-form').reset();
        document.getElementById('edit-preview-img').src = '';
        document.getElementById('delete-item-btn').classList.add('hidden');
        window.targetAddList = addButtonElement.parentElement; // 记住要加到哪个列表
    }
    
    editorDialog.showModal();
}

function updateCardElement(el, data) {
    el.dataset.name = data.name;
    el.dataset.url = data.url;
    el.dataset.icon = data.icon;
    el.querySelector('img').src = data.icon;
    el.querySelector('img').style.display = data.icon ? 'block' : 'none';
    el.querySelector('span').textContent = data.name;
}

// --- 保存与数据处理 ---

async function saveConfig() {
    const btn = document.getElementById('save-config-btn');
    btn.textContent = '保存中...';
    btn.disabled = true;

    const form = document.getElementById('app-settings-form');
    const config = {
        pageTitle: form.pageTitle.value,
        theme: form.theme.value,
        backgroundType: form.backgroundType.value,
        backgroundColor: form.backgroundColor.value,
        backgroundImage: document.getElementById('bg-image-input').value,
        groups: []
    };

    document.querySelectorAll('.editor-group').forEach(groupEl => {
        const groupName = groupEl.querySelector('.group-name-input').value;
        const items = [];
        groupEl.querySelectorAll('.editor-card').forEach(card => {
            items.push({
                name: card.dataset.name,
                url: card.dataset.url,
                icon: card.dataset.icon
            });
        });
        config.groups.push({ name: groupName, items: items });
    });

    try {
        let token = localStorage.getItem(SAVE_TOKEN_STORAGE_KEY);
        if (!token) {
            token = prompt('请输入保存密钥 (SAVE_TOKEN):');
            if (token) localStorage.setItem(SAVE_TOKEN_STORAGE_KEY, token);
        }

        const res = await saveConfigData(config, token);
        if (res.ok) {
            location.reload();
        } else {
            const msg = await res.text();
            alert('保存失败: ' + msg);
            if (res.status === 401) localStorage.removeItem(SAVE_TOKEN_STORAGE_KEY);
        }
    } catch (e) {
        alert('网络错误: ' + e.message);
    } finally {
        btn.textContent = '保存并刷新';
        btn.disabled = false;
    }
}

function populateAppSettings(config) {
    document.getElementById('page-title-input').value = config.pageTitle || '';
    document.getElementById('theme-select').value = config.theme || 'auto';
    
    const bgType = config.backgroundType === 'image' ? 'image' : 'color';
    document.querySelector(`input[name="backgroundType"][value="${bgType}"]`).checked = true;
    
    document.getElementById('bg-color-input').value = config.backgroundColor || '#f0f2f5';
    document.getElementById('bg-image-input').value = config.backgroundImage || '';
    
    toggleBgInputs();
    document.querySelectorAll('input[name="backgroundType"]').forEach(r => 
        r.addEventListener('change', toggleBgInputs)
    );
}

function toggleBgInputs() {
    const isImg = document.getElementById('bg-type-image').checked;
    document.getElementById('bg-color-wrapper').classList.toggle('hidden', isImg);
    document.getElementById('bg-image-wrapper').classList.toggle('hidden', !isImg);
}

function handleBgUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => document.getElementById('bg-image-input').value = ev.target.result;
    reader.readAsDataURL(file);
}

function exportConfig() {
    const dataStr = JSON.stringify(currentConfig, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "starlane-config.json";
    a.click();
}

function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const json = JSON.parse(ev.target.result);
            renderEditorBoard(json);
            populateAppSettings(json);
            alert('配置已加载到编辑器，请检查无误后点击“保存”生效。');
        } catch (err) {
            alert('JSON 格式错误');
        }
    };
    reader.readAsText(file);
}