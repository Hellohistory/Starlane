// js/ui.js
let intersectionObserver = null;
let layoutControlsInitialized = false;
const backgroundElement = document.querySelector('.background-aurora');
const sidebarListElement = document.getElementById('sidebar-group-list');

export function applyAppSettings(config) {
    const theme = config.theme || 'auto';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme === 'auto' && prefersDark)) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
    }
    if (!backgroundElement) return;
    if (config.backgroundType === 'image' && config.backgroundImage) {
        backgroundElement.style.background = `url('${config.backgroundImage}') center/cover no-repeat fixed`;
    } else if (config.backgroundType === 'color' && config.backgroundColor) {
        backgroundElement.style.background = config.backgroundColor;
    } else {
        backgroundElement.style.background = '';
    }
}

export function renderPage(config) {
    const pageTitle = config.pageTitle || 'Starlane';
    document.title = pageTitle;
    const titleEl = document.getElementById('page-title');
    if(titleEl) titleEl.textContent = pageTitle;
    const sbTitle = document.getElementById('sidebar-title');
    if(sbTitle) sbTitle.textContent = pageTitle;

    const mainContainer = document.getElementById('starlane-container');
    const sidebarList = sidebarListElement;

    if (!mainContainer || !sidebarList) return;

    mainContainer.innerHTML = '';
    sidebarList.innerHTML = '';

    if (intersectionObserver) intersectionObserver.disconnect();
    intersectionObserver = new IntersectionObserver(handleScrollSpy, { rootMargin: '-50% 0px -50% 0px' });

    const groups = Array.isArray(config.groups) ? config.groups : [];
    if (groups.length > 0) {
        groups.forEach((group, index) => {
            const groupAnchorId = `group-${index}`;
            const groupSection = createGroupSection(group, groupAnchorId);
            mainContainer.appendChild(groupSection);
            intersectionObserver.observe(groupSection);
            sidebarList.appendChild(createSidebarItem(group, groupAnchorId));
        });
    } else {
        mainContainer.innerHTML = '<p style="text-align:center;margin-top:50px;color:var(--muted)">暂无服务，请点击右上角设置添加。</p>';
    }
    setupSearch();
}

export function initializeLayoutControls() {
    if (layoutControlsInitialized) return;
    layoutControlsInitialized = true;
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const closeSidebar = () => document.body.classList.remove('sidebar-visible');
    if(menuToggleBtn) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.body.classList.toggle('sidebar-visible');
        });
    }
    if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    if(sidebarListElement) sidebarListElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && window.innerWidth <= 992) closeSidebar();
    });
}

export function handleError(error) {
    console.error(error);
    alert('加载失败: ' + error.message);
}

function createGroupSection(group, anchorId) {
    const section = document.createElement('section');
    section.className = 'group';
    section.id = anchorId;
    section.innerHTML = `<h2 class="group-title">${group.name}</h2><div class="items-container"></div>`;
    const container = section.querySelector('.items-container');
    (group.items || []).forEach(item => container.appendChild(createLinkCard(item)));
    return section;
}

function createLinkCard(item) {
    const a = document.createElement('a');
    a.className = 'link-card';
    a.href = item.url || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (item.icon) {
        const img = document.createElement('img');
        img.className = 'link-icon';
        img.src = item.icon;
        img.loading = 'lazy';
        img.onerror = function() { this.style.display = 'none'; };
        a.appendChild(img);
    }
    const span = document.createElement('span');
    span.className = 'link-name';
    span.textContent = item.name;
    a.appendChild(span);
    return a;
}

function createSidebarItem(group, anchorId) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${anchorId}`;
    a.textContent = group.name;
    a.dataset.targetId = anchorId;
    a.onclick = (e) => {
        e.preventDefault();
        document.getElementById(anchorId).scrollIntoView({ behavior: 'smooth' });
    };
    li.appendChild(a);
    return li;
}

function handleScrollSpy(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            document.querySelectorAll('#sidebar-group-list a.active').forEach(a => a.classList.remove('active'));
            const link = document.querySelector(`#sidebar-group-list a[data-target-id="${entry.target.id}"]`);
            if(link) link.classList.add('active');
        }
    });
}

function setupSearch() {
    const input = document.getElementById('search-input');
    if(!input || input.dataset.ready) return;
    input.dataset.ready = 'true';
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.group').forEach(group => {
            let hasMatch = false;
            group.querySelectorAll('.link-card').forEach(card => {
                const match = card.innerText.toLowerCase().includes(term);
                card.style.display = match ? 'flex' : 'none';
                if(match) hasMatch = true;
            });
            group.style.display = hasMatch ? 'block' : 'none';
        });
    });
}