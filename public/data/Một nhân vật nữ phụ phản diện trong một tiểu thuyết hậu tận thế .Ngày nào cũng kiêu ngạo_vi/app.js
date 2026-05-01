// State Management
const state = {
    currentView: 'home',
    currentChapterIndex: parseInt(localStorage.getItem('lastChapter')) || 0,
    fontSize: parseInt(localStorage.getItem('fontSize')) || 19,
    metadata: null,
    toc: []
};

// DOM Elements
const mainContent = document.getElementById('mainContent');
const sidebar = document.getElementById('sidebar');
const settingsModal = document.getElementById('settingsModal');
const overlay = document.getElementById('overlay');
const progressBar = document.getElementById('progressBar');
const chapterList = document.getElementById('chapterList');

// Initialize
async function init() {
    try {
        // Parallel fetch for speed
        const [metaRes, tocRes] = await Promise.all([
            fetch('status.json'),
            fetch('toc.json')
        ]);
        
        state.metadata = await metaRes.json();
        state.toc = await tocRes.json();
        
        renderHome();
        renderChapterList();
        setupEventListeners();
        updateProgressBar();
    } catch (err) {
        console.error('Failed to initialize app:', err);
        mainContent.innerHTML = `<div class="loading-view"><p style="color:var(--accent-color)">Lỗi: Không thể tải dữ liệu truyện. Vui lòng kiểm tra lại file.</p></div>`;
    }
}

// Rendering Functions
function renderHome() {
    state.currentView = 'home';
    window.scrollTo(0, 0);
    
    // Fix cover image path - it's in the same directory
    const coverPath = '末世女配，开局把女主推进丧尸堆.png'; // Updated to match file name found
    
    mainContent.innerHTML = `
        <div class="home-view">
            <div class="book-cover-container">
                <img src="${coverPath}" alt="Book Cover" class="book-cover" onerror="this.src='https://via.placeholder.com/400x600?text=No+Cover'">
            </div>
            <div class="book-info">
                <h1>${state.metadata.book_name}</h1>
                <p class="author">Tác giả: ${state.metadata.author}</p>
                <div class="description">${state.metadata.description}</div>
                <div style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center; margin-bottom:2rem;">
                    ${state.metadata.tags.split('|').map(tag => `<span style="background:var(--surface-color); padding:0.3rem 0.8rem; border-radius:20px; font-size:0.9rem; border:1px solid var(--glass-border);">${tag}</span>`).join('')}
                </div>
                <div style="display:flex; gap:1rem; justify-content:center;">
                    <button class="primary" id="startReadingBtn">Bắt đầu đọc</button>
                    ${localStorage.getItem('lastChapter') !== null ? `<button id="continueReadingBtn">Đọc tiếp (Chương ${parseInt(localStorage.getItem('lastChapter')) + 1})</button>` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('startReadingBtn').onclick = () => openChapter(0);
    const continueBtn = document.getElementById('continueReadingBtn');
    if (continueBtn) {
        continueBtn.onclick = () => openChapter(state.currentChapterIndex);
    }
}

async function renderChapter(index) {
    state.currentView = 'reader';
    state.currentChapterIndex = index;
    
    // Show loading state
    mainContent.innerHTML = `
        <div class="loading-view">
            <div class="spinner"></div>
            <p>Đang tải chương ${index + 1}...</p>
        </div>
    `;
    
    window.scrollTo(0, 0);

    try {
        const response = await fetch(`chapters/chapter${index + 1}.json`);
        if (!response.ok) throw new Error('Chapter not found');
        const chapter = await response.json();

        mainContent.innerHTML = `
            <div class="reader-view">
                <div class="reader-header">
                    <h2>${chapter.title}</h2>
                </div>
                <div class="reader-content" style="font-size: ${state.fontSize}px;">
                    ${chapter.content}
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:4rem; padding-top:2rem; border-top:1px solid var(--glass-border);">
                    <button id="prevBtn" ${index === 0 ? 'disabled' : ''}>← Trước</button>
                    <button id="nextBtn" ${index === state.toc.length - 1 ? 'disabled' : ''}>Tiếp →</button>
                </div>
            </div>
        `;

        if (index > 0) {
            document.getElementById('prevBtn').onclick = () => openChapter(index - 1);
        }
        if (index < state.toc.length - 1) {
            document.getElementById('nextBtn').onclick = () => openChapter(index + 1);
        }
        
        localStorage.setItem('lastChapter', index);
        updateProgressBar();
    } catch (err) {
        console.error('Failed to load chapter:', err);
        mainContent.innerHTML = `
            <div class="loading-view">
                <p style="color:var(--accent-color)">Lỗi: Không thể tải nội dung chương này.</p>
                <button onclick="renderHome()">Quay lại trang chủ</button>
            </div>
        `;
    }
}

function renderChapterList() {
    chapterList.innerHTML = state.toc.map((title, index) => `
        <div class="chapter-item" style="padding:1.2rem; border-bottom:1px solid var(--glass-border); cursor:pointer; transition:0.3s;" onclick="openChapter(${index})">
            <span style="display:block; font-weight:500;">${title}</span>
        </div>
    `).join('');
}

function openChapter(index) {
    renderChapter(index);
    closeAllMenus();
}

function closeAllMenus() {
    sidebar.classList.remove('active');
    settingsModal.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openMenu(menu) {
    menu.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('homeBtn').onclick = renderHome;
    
    document.getElementById('tocBtn').onclick = () => openMenu(sidebar);
    document.getElementById('settingsBtn').onclick = () => openMenu(settingsModal);
    
    document.getElementById('closeSidebarBtn').onclick = closeAllMenus;
    document.getElementById('closeSettingsBtn').onclick = closeAllMenus;
    overlay.onclick = closeAllMenus;

    // Font Controls
    document.getElementById('fontUp').onclick = () => {
        if (state.fontSize < 40) {
            state.fontSize += 2;
            updateFontSize();
        }
    };
    document.getElementById('fontDown').onclick = () => {
        if (state.fontSize > 12) {
            state.fontSize -= 2;
            updateFontSize();
        }
    };

    // Scroll Progress
    window.onscroll = () => {
        if (state.currentView === 'reader') {
            updateProgressBar();
        }
    };
}

function updateFontSize() {
    const content = document.querySelector('.reader-content');
    if (content) {
        content.style.fontSize = `${state.fontSize}px`;
    }
    localStorage.setItem('fontSize', state.fontSize);
}

function updateProgressBar() {
    if (state.currentView === 'home') {
        progressBar.style.width = '0%';
        return;
    }
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (height <= 0) {
        progressBar.style.width = '0%';
        return;
    }
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + "%";
}

init();
