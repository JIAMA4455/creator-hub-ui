// --- Config ---
// Замени эту ссылку на свой Vercel URL после развертывания
const VERCEL_API_URL = 'https://creator-hub-backend.vercel.app/api'; 

let currentUser = null;

let dbUsers = JSON.parse(localStorage.getItem('ch_users')) || [];
// Initialize with default admin invite if not exists
if (!localStorage.getItem('ch_invites')) {
    localStorage.setItem('ch_invites', JSON.stringify([
        {code: 'ADMIN-SECRET-2026', role: 'Admin', used: false}
    ]));
}
let dbInvites = JSON.parse(localStorage.getItem('ch_invites')) || [
    { code: 'ADMIN-SECRET-2026', role: 'Admin', used: false }
];

function saveDB() {
    localStorage.setItem('ch_users', JSON.stringify(dbUsers));
    localStorage.setItem('ch_invites', JSON.stringify(dbInvites));
}

// Инициализация базы данных (Local Storage для идей)
const defaultIdeas = [
    { id: 1, title: "Обзор M5 (Скрытые меню)", desc: "Показать скрытые комбинации кнопок в салоне, которые включают сервисные режимы. \n\nРеференс: BMW TikToker", author: "Daniil Titov", likedBy: ['user_2'], comments: [{id: 101, author: "Evgeniy", text: "Отличная идея, заберу на этой неделе!"}], status: "Назначена", x:0, y:0, vx:0, vy:0 },
    { id: 2, title: "Пранк с ключами (POV)", desc: "Формат от первого лица, якобы потерял ключи от авто, но заводишь с телефона.", author: "Producer", likedBy: ['user_1', 'user_3'], comments: [], status: "Новая", x:0, y:0, vx:0, vy:0 }
];

let ideas = JSON.parse(localStorage.getItem('ch_ideas'));
if (!ideas) {
    ideas = defaultIdeas;
    saveIdeas();
}

function saveIdeas() {
    localStorage.setItem('ch_ideas', JSON.stringify(ideas));
    updateKPIs();
}

// --- Navigation ---
function switchTab(tabId, titleText) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
        t.style.display = 'none';
    });

    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
        if (tabId === 'ideas') {
            renderLinearView();
            if (document.getElementById('ideas-network').classList.contains('active')) {
                initNetworkCanvas();
            }
        }
    }
    document.getElementById('page-title').innerText = titleText;
}

function switchIdeaView(viewType) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.getElementById('ideas-' + viewType).classList.add('active');

    document.querySelectorAll('.view-controls .btn-icon').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (viewType === 'network') initNetworkCanvas();
    else cancelAnimationFrame(animationFrameId);
}

// --- Modals ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = function(e) {
    if (e.target.classList.contains('modal')) e.target.style.display = "none";
}

// --- CRUD Ideas ---
function openIdeaModal(id = null) {
    const titleInput = document.getElementById('idea-title-input');
    const descInput = document.getElementById('idea-desc-input');
    const idInput = document.getElementById('idea-id');
    const modalTitle = document.getElementById('idea-form-title');

    if (id) {
        const idea = ideas.find(i => i.id === id);
        modalTitle.innerText = "Редактировать гипотезу";
        titleInput.value = idea.title;
        descInput.value = idea.desc;
        idInput.value = idea.id;
    } else {
        modalTitle.innerText = "Создать гипотезу";
        titleInput.value = "";
        descInput.value = "";
        idInput.value = "";
    }
    openModal('modal-idea-form');
}

function saveIdea() {
    const title = document.getElementById('idea-title-input').value.trim();
    const desc = document.getElementById('idea-desc-input').value.trim();
    const id = document.getElementById('idea-id').value;

    if (!title) return alert("Введите название!");

    if (id) {
        // Edit
        const idea = ideas.find(i => i.id == id);
        idea.title = title;
        idea.desc = desc;
    } else {
        // Create
        ideas.push({
            id: Date.now(),
            title,
            desc,
            author: currentUser.name,
            likedBy: [],
            comments: [],
            status: "Новая",
            x:0, y:0, vx:0, vy:0
        });
    }

    saveIdeas();
    closeModal('modal-idea-form');
    renderLinearView();
    if(document.getElementById('ideas-network').classList.contains('active')) initNetworkCanvas();
}

function deleteIdea(id) {
    if(confirm("Удалить идею?")) {
        ideas = ideas.filter(i => i.id !== id);
        saveIdeas();
        closeModal('modal-comments');
        renderLinearView();
    }
}

// --- Likes & Comments ---
function toggleLike(id, event) {
    if(event) event.stopPropagation();
    const idea = ideas.find(i => i.id === id);
    const index = idea.likedBy.indexOf(currentUser.id);
    
    if (index > -1) idea.likedBy.splice(index, 1); // Unlike
    else idea.likedBy.push(currentUser.id); // Like
    
    saveIdeas();
    renderLinearView();
}

function openCommentsModal(id) {
    const idea = ideas.find(i => i.id === id);
    document.getElementById('view-idea-title').innerText = idea.title;
    document.getElementById('view-idea-author').innerHTML = `Автор: <b>${idea.author}</b> | Статус: ${idea.status} 
        <span style="float:right; cursor:pointer; color:var(--text-link);" onclick="openIdeaModal(${idea.id}); closeModal('modal-comments')">✏️ Редактировать</span>
        <span style="float:right; cursor:pointer; color:var(--red); margin-right:15px;" onclick="deleteIdea(${idea.id})">🗑️ Удалить</span>`;
    document.getElementById('view-idea-desc').innerText = idea.desc;
    document.getElementById('comment-idea-id').value = idea.id;
    
    renderComments(idea);
    openModal('modal-comments');
}

function renderComments(idea) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '';
    
    if(idea.comments.length === 0) {
        list.innerHTML = '<div class="comment-text" style="color:var(--text-muted)">Нет комментариев. Будьте первым!</div>';
        return;
    }

    idea.comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-bubble';
        div.innerHTML = `<span class="comment-author">${c.author}</span><span class="comment-text">${c.text}</span>`;
        list.appendChild(div);
    });
    list.scrollTop = list.scrollHeight;
}

function addComment() {
    const textInput = document.getElementById('new-comment-text');
    const text = textInput.value.trim();
    const id = parseInt(document.getElementById('comment-idea-id').value);

    if (!text) return;

    const idea = ideas.find(i => i.id === id);
    idea.comments.push({ id: Date.now(), author: currentUser.name, text: text });
    
    saveIdeas();
    textInput.value = '';
    renderComments(idea);
    renderLinearView(); // Обновляем счетчик на карточке
}

function handleCommentEnter(e) {
    if (e.key === 'Enter') addComment();
}

// --- Render Views ---
function updateKPIs() {
    const totalEl = document.getElementById('kpi-total-ideas');
    if(totalEl) totalEl.innerText = ideas.length;
}

function renderLinearView() {
    const container = document.getElementById('ideas-linear');
    container.innerHTML = '';

    ideas.forEach(idea => {
        const isLiked = idea.likedBy.includes(currentUser.id);
        const likeClass = isLiked ? 'liked' : '';
        const likeHeart = isLiked ? '❤️' : '🤍';

        const card = document.createElement('div');
        card.className = 'idea-card';
        card.onclick = () => openCommentsModal(idea.id);
        
        card.innerHTML = `
            <div class="idea-header">
                <div class="idea-title">${idea.title}</div>
                <div class="idea-status">${idea.status}</div>
            </div>
            <p class="idea-desc">${idea.desc}</p>
            <div class="idea-footer">
                <span class="idea-meta">Автор: ${idea.author}</span>
                <div class="idea-actions">
                    <span class="action-btn">💬 ${idea.comments.length}</span>
                    <span class="action-btn ${likeClass}" onclick="toggleLike(${idea.id}, event)">${likeHeart} ${idea.likedBy.length}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Network Canvas (Spiderweb) ---
let animationFrameId;
function initNetworkCanvas() {
    const canvas = document.getElementById('network-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('ideas-network');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Инициализация координат если их нет
    ideas.forEach(idea => {
        if(idea.x === 0 && idea.y === 0) {
            idea.x = Math.random() * canvas.width;
            idea.y = Math.random() * canvas.height;
            idea.vx = (Math.random() - 0.5) * 0.4; 
            idea.vy = (Math.random() - 0.5) * 0.4;
        }
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ideas.forEach(idea => {
            idea.x += idea.vx;
            idea.y += idea.vy;
            // Делаем круги больше (базовый радиус 45)
            idea.radius = Math.max(45, 45 + idea.likedBy.length * 5);

            if (idea.x - idea.radius < 0 || idea.x + idea.radius > canvas.width) idea.vx *= -1;
            if (idea.y - idea.radius < 0 || idea.y + idea.radius > canvas.height) idea.vy *= -1;
        });

        // Линии (Паутина)
        for (let i = 0; i < ideas.length; i++) {
            for (let j = i + 1; j < ideas.length; j++) {
                const dx = ideas[i].x - ideas[j].x;
                const dy = ideas[i].y - ideas[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Увеличил дистанцию связи до 350
                if (dist < 350) {
                    ctx.beginPath();
                    ctx.moveTo(ideas[i].x, ideas[i].y);
                    ctx.lineTo(ideas[j].x, ideas[j].y);
                    ctx.strokeStyle = `rgba(88, 101, 242, ${1 - dist/350})`; 
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }
        }

        // Узлы (Идеи)
        ideas.forEach(idea => {
            ctx.beginPath();
            ctx.arc(idea.x, idea.y, idea.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#2b2d31'; // Тёмный фон в стиле Discord
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#5865F2'; // Discord Blurple
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(88, 101, 242, 0.4)';
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let shortTitle = idea.title.length > 16 ? idea.title.substring(0,14) + '...' : idea.title;
            // Текст внутри кружка
            ctx.fillText(shortTitle, idea.x, idea.y - 8);
            
            ctx.fillStyle = '#b5bac1'; // серый цвет для лайков
            ctx.font = '12px Inter, sans-serif';
            ctx.fillText(`❤️ ${idea.likedBy.length}`, idea.x, idea.y + 12);
        });

        animationFrameId = requestAnimationFrame(draw);
    }

    cancelAnimationFrame(animationFrameId);
    draw();
}

// --- Creators Tab ---
function renderCreatorsList() {
    document.getElementById('creators-list-view').style.display = 'block';
    document.getElementById('creator-profile-view').style.display = 'none';
    
    const grid = document.getElementById('creators-grid');
    grid.innerHTML = '';
    
    const activeUsers = dbUsers.filter(u => u.active);
    
    activeUsers.forEach(u => {
        const card = document.createElement('div');
        card.className = 'creator-card';
        card.onclick = () => openCreatorProfile(u.id);
        
        const initial = u.name ? u.name.charAt(0).toUpperCase() : 'U';
        const hue = (u.name.length * 25 + u.name.charCodeAt(0) * 10) % 360; // Псевдослучайный цвет по имени
        
        card.innerHTML = `
            <div class="avatar-large" style="background: hsl(${hue}, 60%, 50%);">${initial}</div>
            <h3 style="margin-bottom: 5px; color: white;">${u.name}</h3>
            <div class="status">${u.role}</div>
        `;
        grid.appendChild(card);
    });
}

let viewedUserId = null;

function openCreatorProfile(userId) {
    viewedUserId = userId;
    const user = dbUsers.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('creators-list-view').style.display = 'none';
    document.getElementById('creator-profile-view').style.display = 'block';
    
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    const hue = (user.name.length * 25 + user.name.charCodeAt(0) * 10) % 360;
    
    document.getElementById('cp-avatar').innerText = initial;
    document.getElementById('cp-avatar').style.background = `hsl(${hue}, 60%, 50%)`;
    document.getElementById('cp-name').innerText = user.name;
    document.getElementById('cp-role').innerText = user.role;

    const ttSection = document.getElementById('cp-tiktok-section');
    const isMe = (userId === currentUser.id);
    
    if (isMe) {
        ttSection.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="color:#b5bac1;">TikTok:</span>
                <input type="text" id="tt-username-input" class="form-input" style="margin:0; width:150px; padding: 4px 8px;" placeholder="@username" value="${user.tiktokUsername || ''}">
                <button class="btn-primary" style="padding: 4px 10px;" onclick="saveTikTokUsername()">Сохранить</button>
            </div>
        `;
    } else {
        ttSection.innerHTML = user.tiktokUsername 
            ? `<div style="color:var(--text-link); cursor:pointer;" onclick="window.open('https://tiktok.com/@${user.tiktokUsername.replace('@','')}', '_blank')">📱 ${user.tiktokUsername}</div>` 
            : `<div style="color:var(--text-muted);">TikTok не указан</div>`;
    }

    renderTikTokMetrics(user);
}

function saveTikTokUsername() {
    const input = document.getElementById('tt-username-input').value.trim();
    const user = dbUsers.find(u => u.id === currentUser.id);
    if (user) {
        let cleanUsername = input.replace(/^@/, '');
        user.tiktokUsername = cleanUsername ? '@' + cleanUsername : '';
        saveDB();
        renderTikTokMetrics(user);
        alert("TikTok аккаунт сохранен!");
    }
}

function renderTikTokMetrics(user) {
    const grid = document.getElementById('cp-metrics-grid');
    const emptyMsg = document.getElementById('cp-tt-empty');
    const syncBtn = document.getElementById('btn-sync-tiktok');

    if (!user.tiktokUsername) {
        grid.style.display = 'none';
        syncBtn.style.display = 'none';
        emptyMsg.style.display = 'block';
    } else {
        grid.style.display = 'grid';
        emptyMsg.style.display = 'none';
        syncBtn.style.display = 'inline-block';
        
        const m = user.tiktokMetrics || { followers: '---', likes: '---', videos: '---', er: '---' };
        document.getElementById('tt-followers').innerText = m.followers;
        document.getElementById('tt-likes').innerText = m.likes;
        document.getElementById('tt-videos').innerText = m.videos;
        document.getElementById('tt-er').innerText = m.er;
    }
}

async function syncTikTokData() {
    const user = dbUsers.find(u => u.id === viewedUserId);
    if (!user || !user.tiktokUsername) return;
    
    const btn = document.getElementById('btn-sync-tiktok');
    btn.innerText = "⏳ Парсинг...";
    btn.disabled = true;

    try {
        const cleanUsername = user.tiktokUsername.replace('@', '');
        
        // Делаем реальный запрос на наш микросервис
        const response = await fetch(`${VERCEL_API_URL}?username=${cleanUsername}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        // Сохраняем реальные данные
        user.tiktokMetrics = {
            followers: data.followers,
            likes: data.likes,
            videos: data.videos,
            er: data.er
        };
        if (data.avatar) {
            user.tiktokAvatar = data.avatar;
        }
        
        saveDB();
        renderTikTokMetrics(user);
        
    } catch (error) {
        console.error("Ошибка парсинга:", error);
        alert("Ошибка при парсинге данных. Проверьте юзернейм или попробуйте позже.");
    } finally {
        btn.innerText = "🔄 Синхронизировать";
        btn.disabled = false;
    }
}

function closeCreatorProfile() {
    document.getElementById('creators-list-view').style.display = 'block';
    document.getElementById('creator-profile-view').style.display = 'none';
}

function checkAuth() {
    const token = localStorage.getItem('ch_token');
    if (!token) {
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        return;
    }

    const user = dbUsers.find(u => u.token === token && u.active);
    if (!user) {
        logout();
        return;
    }

    currentUser = user;
    
    // Hide login, show app
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    // Set User UI
    document.getElementById('current-username').innerText = currentUser.name;
    document.getElementById('current-role').innerText = currentUser.role;
    
    // Show admin tab if Admin
    if (currentUser.role === 'Admin') {
        document.getElementById('nav-admin').style.display = 'flex';
    }

    if (document.getElementById('tab-ideas').classList.contains('active')) {
        renderLinearView();
    }
}

function loginWithInvite() {
    const code = document.getElementById('auth-invite-code').value.trim();
    const name = document.getElementById('auth-name').value.trim();
    const errorEl = document.getElementById('auth-error');
    
    if (!code) {
        errorEl.innerText = "Введите ключ";
        return;
    }

    // 1. Ищем сам ключ в базе выданных инвайтов
    const invite = dbInvites.find(i => i.code === code);
    if (!invite) {
        errorEl.innerText = "Неверный код приглашения";
        return;
    }

    // 2. Ищем пользователя с этим ключом
    let user = dbUsers.find(u => u.token === code);

    if (user) {
        // Аккаунт уже существует (повторный вход)
        if (!user.active) {
            errorEl.innerText = "Доступ по этому ключу заблокирован администратором";
            return;
        }
        // Если при входе ввели имя, обновляем его
        if (name) user.name = name;
        saveDB();
        
        localStorage.setItem('ch_token', user.token);
        errorEl.innerText = "";
        checkAuth();
    } else {
        // Первый вход по этому ключу
        if (!name) {
            errorEl.innerText = "Для первой активации ключа введите ваше Имя";
            return;
        }

        // Создаем аккаунт, жестко привязанный к этому ключу
        const newUser = {
            id: 'user_' + Date.now(),
            name: name,
            role: invite.role,
            active: true,
            token: code 
        };
        dbUsers.push(newUser);
        
        invite.used = true;
        saveDB();

        localStorage.setItem('ch_token', code);
        errorEl.innerText = "";
        checkAuth();
    }
}

function logout(e) {
    if (e) e.stopPropagation();
    localStorage.removeItem('ch_token');
    location.reload();
}

function goToMyProfile() {
    switchTab('creators', 'Команда креаторов');
    openCreatorProfile(currentUser.id);
}

function generateInvite() {
    const role = document.getElementById('new-invite-role').value;
    const code = Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    dbInvites.push({ code, role, used: false });
    saveDB();

    document.getElementById('new-invite-result').innerHTML = `Готово! Ключ: <span style="user-select:all; background:#1e1f22; padding:4px 8px; border-radius:4px;">${code}</span> (Роль: ${role})`;
    loadAdminUsers();
}

function loadAdminUsers() {
    const list = document.getElementById('admin-users-list');
    list.innerHTML = dbUsers.map(u => `
        <div style="display:flex; justify-content:space-between; padding: 10px; border-bottom: 1px solid #444;">
            <div>
                <b style="color:white;">${u.name}</b> <span style="color:#aaa;">(Роль: ${u.role})</span>
                ${u.active ? '<span style="color:#4ade80; margin-left:10px;">Активен</span>' : '<span style="color:#ed4245; margin-left:10px;">Отозван</span>'}
            </div>
            ${u.active && u.id !== currentUser.id ? `<button class="btn-primary" style="background:#ed4245;" onclick="revokeUser('${u.id}')">Отозвать доступ</button>` : ''}
        </div>
    `).join('');
}

function revokeUser(id) {
    if(!confirm("Заблокировать этот ключ? Пользователь больше не сможет зайти на сайт.")) return;
    const user = dbUsers.find(u => u.id === id);
    if (user) {
        user.active = false;
        saveDB();
        loadAdminUsers();
    }
}

function switchTab(tabId, titleText) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
        t.style.display = 'none';
    });

    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
        
        if (tabId === 'ideas') {
            renderLinearView();
            if (document.getElementById('ideas-network').classList.contains('active')) {
                initNetworkCanvas();
            }
        }
        if (tabId === 'creators') {
            renderCreatorsList();
        }
        if (tabId === 'admin') {
            loadAdminUsers();
        }
    }
    document.getElementById('page-title').innerText = titleText;
}
// Init
document.addEventListener('DOMContentLoaded', () => {
    saveDB(); // Ensure default invite exists
    checkAuth();
    updateKPIs();
});


// TikTok Profile Loader
function loadTikTokProfile() {
    const username = document.getElementById('tiktok-user').value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    const card = document.getElementById('tt-card');
    const empty = document.getElementById('tt-empty');
    
    card.style.display = 'block';
    empty.style.display = 'none';
    
    // Clean username
    const cleanUsername = username.replace('@', '');
    
    // For demo - show the username
    document.getElementById('tt-name').textContent = '@' + cleanUsername;
    document.getElementById('tt-avatar').src = 'https://p16-sign-va.tiktokcdn.com/tiktok-obj/' + cleanUsername + '?quality=95&Ratio=1&=webp';
    document.getElementById('tt-embed').innerHTML = '<blockquote class="tiktok-embed" cite="@' + cleanUsername + '" data-unique-id="' + cleanUsername + '"><section><a target="_blank" href="https://www.tiktok.com/@' + cleanUsername + '"></a></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>';
    
    // Demo data (replace with real API later)
    document.getElementById('tt-followers').textContent = 'Loading...';
    document.getElementById('tt-likes').textContent = 'Loading...';
    document.getElementById('tt-videos').textContent = 'Loading...';
    document.getElementById('tt-er').textContent = '---';
}

// ==================== TIKTOK ACCOUNTS ====================
let tiktokAccounts = JSON.parse(localStorage.getItem('tiktokAccounts') || '[]');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Initialize accounts on page load
document.addEventListener('DOMContentLoaded', function() {
    renderAccountsList();
    populateOwnerSelect();
});

function populateOwnerSelect() {
    // Get users from localStorage or use default
    const users = JSON.parse(localStorage.getItem('users') || '[{"name":"Даниил"},{"name":"Команда"}]');
    const select = document.getElementById('new-tt-owner');
    if (select) {
        select.innerHTML = '<option value="">Выберите владельца...</option>';
        users.forEach(u => {
            select.innerHTML += `<option value="${u.name}">${u.name}</option>`;
        });
    }
}

function renderAccountsList() {
    const grid = document.getElementById('accounts-grid');
    if (!grid) return;
    
    if (tiktokAccounts.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;"><p style="font-size: 48px; margin: 0;">📱</p><p>Нет аккаунтов. Добавьте первый!</p></div>';
        return;
    }
    
    grid.innerHTML = tiktokAccounts.map((acc, idx) => `
        <div onclick="showAccountDetail(${idx})" style="background: #2b2d31; padding: 20px; border-radius: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #fe2c55, #25f4ee); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">
                    @${acc.username.slice(0,2)}
                </div>
                <div>
                    <div style="color: white; font-weight: bold; font-size: 18px;">@${acc.username}</div>
                    <div style="color: #4ade80; font-size: 12px;">👤 ${acc.owner || 'Не назначен'}</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #1e1f22;">
                <span style="color: #888; font-size: 12px;">Добавлен</span>
                <span style="color: #666; font-size: 12px;">${acc.addedAt || 'Недавно'}</span>
            </div>
        </div>
    `).join('');
}

function addTikTokAccount() {
    const username = document.getElementById('new-tt-username').value.trim().replace('@', '');
    const owner = document.getElementById('new-tt-owner').value;
    
    if (!username) {
        alert('Введите username!');
        return;
    }
    
    if (!owner) {
        alert('Выберите владельца!');
        return;
    }
    
    // Check if already exists
    if (tiktokAccounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
        alert('Аккаунт уже добавлен!');
        return;
    }
    
    tiktokAccounts.push({
        username: username,
        owner: owner,
        addedAt: new Date().toLocaleDateString('ru-RU')
    });
    
    localStorage.setItem('tiktokAccounts', JSON.stringify(tiktokAccounts));
    
    // Clear inputs
    document.getElementById('new-tt-username').value = '';
    document.getElementById('new-tt-owner').value = '';
    
    renderAccountsList();
    alert('Аккаунт добавлен! Кликните по нему для просмотра аналитики.');
}

function showAccountsList() {
    document.getElementById('accounts-list-view').style.display = 'block';
    document.getElementById('accounts-detail-view').style.display = 'none';
}

function showAccountDetail(idx) {
    const acc = tiktokAccounts[idx];
    if (!acc) return;
    
    document.getElementById('accounts-list-view').style.display = 'none';
    document.getElementById('accounts-detail-view').style.display = 'block';
    
    // Set account info
    document.getElementById('detail-username').textContent = '@' + acc.username;
    document.getElementById('detail-owner').textContent = acc.owner;
    document.getElementById('detail-nickname').textContent = acc.username + ' - TikTok';
    document.getElementById('detail-avatar').src = `https://p16-sign-va.tiktokcdn.com/tiktok-obj/${acc.username}?quality=95`;
    
    // Set embed
    document.getElementById('detail-embed').innerHTML = `<blockquote class="tiktok-embed" cite="@${acc.username}" data-unique-id="${acc.username}"><section><a target="_blank" href="https://www.tiktok.com/@${acc.username}"></a></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`;
    
    // Demo metrics (in real app, fetch from API)
    document.getElementById('detail-followers').textContent = 'Загрузка...';
    document.getElementById('detail-likes').textContent = 'Загрузка...';
    document.getElementById('detail-videos').textContent = '...';
    document.getElementById('detail-er').textContent = '...';
    
    // Show card, hide error
    document.getElementById('account-detail-card').style.display = 'block';
    document.getElementById('account-error').style.display = 'none';
}

// Keep existing loadTikTokProfile function for compatibility
function loadTikTokProfile() {
    const username = document.getElementById('tiktok-user')?.value.trim();
    if (username) {
        // Add to accounts if not exists
        if (!tiktokAccounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
            tiktokAccounts.push({
                username: username.replace('@',''),
                owner: currentUser.name || 'Команда',
                addedAt: new Date().toLocaleDateString('ru-RU')
            });
            localStorage.setItem('tiktokAccounts', JSON.stringify(tiktokAccounts));
        }
        // Show detail
        const idx = tiktokAccounts.findIndex(a => a.username.toLowerCase() === username.replace('@','').toLowerCase());
        if (idx >= 0) showAccountDetail(idx);
    }
}
