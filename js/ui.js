// 文件路径: js/ui.js

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

    if (!backgroundElement) {
        return;
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

export function renderPage(config) {
    const pageTitle = config.pageTitle || 'Starlane';
    document.title = pageTitle;
    document.getElementById('page-title').textContent = pageTitle;
    document.getElementById('sidebar-title').textContent = pageTitle;

    const mainContainer = document.getElementById('starlane-container');
    const sidebarList = sidebarListElement;

    if (!mainContainer || !sidebarList) {
        console.error('无法渲染页面：缺少主要容器或侧边栏列表元素。');
        return;
    }

    mainContainer.innerHTML = '';
    sidebarList.innerHTML = '';

    if (intersectionObserver) {
        intersectionObserver.disconnect();
    }
    intersectionObserver = new IntersectionObserver(handleScrollSpy, {
        rootMargin: '-50% 0px -50% 0px'
    });

    const groups = Array.isArray(config.groups) ? config.groups : [];
    if (groups.length > 0) {
        groups.forEach((group, index) => {
            const groupAnchorId = `group-${index}`;
            const groupSection = createGroupSection(group, groupAnchorId);
            mainContainer.appendChild(groupSection);
            intersectionObserver.observe(groupSection);
            const sidebarItem = createSidebarItem(group, groupAnchorId);
            sidebarList.appendChild(sidebarItem);
        });
    } else {
        const emptyParagraph = document.createElement('p');
        emptyParagraph.style.textAlign = 'center';
        emptyParagraph.textContent = '配置文件为空或加载失败，请在设置中添加服务。';
        mainContainer.appendChild(emptyParagraph);
    }

    setupSearch();
}

export function initializeLayoutControls() {
    if (layoutControlsInitialized) {
        return;
    }
    layoutControlsInitialized = true;

    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (!menuToggleBtn || !sidebarOverlay || !sidebarListElement) {
        console.error('初始化侧边栏控制失败：相关 DOM 元素不存在。');
        return;
    }

    const openSidebar = () => document.body.classList.add('sidebar-visible');
    const closeSidebar = () => document.body.classList.remove('sidebar-visible');

    menuToggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (document.body.classList.contains('sidebar-visible')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarOverlay.addEventListener('click', closeSidebar);
    sidebarListElement.addEventListener('click', (event) => {
        if (event.target.tagName === 'A' && window.innerWidth <= 992) {
            closeSidebar();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.body.classList.contains('sidebar-visible')) {
            closeSidebar();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992 && document.body.classList.contains('sidebar-visible')) {
            closeSidebar();
        }
    });
}

export function handleError(error) {
    console.error('Starlane 发生错误:', error);
    const container = document.getElementById('starlane-container') || document.body;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.padding = '50px';
    wrapper.style.color = '#ff5252';
    wrapper.style.background = 'rgba(255, 82, 82, 0.1)';
    wrapper.style.borderRadius = 'var(--border-radius-md)';

    const title = document.createElement('h1');
    title.textContent = '发生错误';

    const message = document.createElement('p');
    message.textContent = error.message;

    const hint = document.createElement('p');
    hint.textContent = '请检查服务器上的 /data/config.json 文件是否存在且格式正确，或检查网络连接。';

    wrapper.appendChild(title);
    wrapper.appendChild(message);
    wrapper.appendChild(hint);
    container.appendChild(wrapper);
}

function createGroupSection(group, anchorId) {
    const groupSection = document.createElement('section');
    groupSection.className = 'group';
    groupSection.id = anchorId;

    const h2 = document.createElement('h2');
    h2.className = 'group-title';
    h2.textContent = group.name;
    groupSection.appendChild(h2);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';
    if (Array.isArray(group.items)) {
        group.items.forEach((item) => {
            itemsContainer.appendChild(createLinkCard(item));
        });
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
    a.addEventListener('click', (event) => {
        event.preventDefault();
        document.getElementById(anchorId).scrollIntoView({ behavior: 'smooth' });
    });
    li.appendChild(a);
    return li;
}

function createLinkCard(item) {
    const linkCard = document.createElement('a');
    linkCard.className = 'link-card';
    if (item.url && (item.url.startsWith('http:') || item.url.startsWith('https:'))) {
        linkCard.href = item.url;
    } else {
        linkCard.href = '#';
        if (item.url) {
            console.warn(`Blocked invalid URL: ${item.url}`);
        }
    }
    linkCard.target = '_blank';
    linkCard.rel = 'noopener noreferrer';

    if (item.icon) {
        const img = document.createElement('img');
        img.className = 'link-icon';
        img.src = item.icon;
        img.alt = `${item.name} icon`;
        img.loading = 'lazy';
        img.onerror = function () {
            this.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        };
        linkCard.appendChild(img);
    }

    const span = document.createElement('span');
    span.className = 'link-name';
    span.textContent = item.name;
    linkCard.appendChild(span);

    return linkCard;
}

function handleScrollSpy(entries) {
    entries.forEach((entry) => {
        const link = document.querySelector(`#sidebar-group-list a[data-target-id="${entry.target.id}"]`);
        if (link && entry.isIntersecting) {
            document.querySelectorAll('#sidebar-group-list a.active').forEach((anchor) => anchor.classList.remove('active'));
            link.classList.add('active');
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput || searchInput.dataset.listener) {
        return;
    }
    searchInput.dataset.listener = 'true';
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();
        document.querySelectorAll('.group').forEach((group) => {
            let visibleCardsInGroup = 0;
            group.querySelectorAll('.link-card').forEach((card) => {
                const cardName = card.querySelector('.link-name').textContent.toLowerCase();
                const isVisible = cardName.includes(searchTerm);
                card.style.display = isVisible ? 'flex' : 'none';
                if (isVisible) {
                    visibleCardsInGroup += 1;
                }
            });
            group.style.display = visibleCardsInGroup > 0 ? 'block' : 'none';
        });
    });
}
