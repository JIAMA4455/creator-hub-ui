// --- Config ---
// Замени эту ссылку на свой Vercel URL после развертывания
const VERCEL_API_URL = 'https://creator-hub-backend.vercel.app/api'; 

let currentUser = null;

// Initialize default users in localStorage FIRST
if (!localStorage.getItem('ch_users')) {
    localStorage.setItem('ch_users', JSON.stringify([
        {id: 'user_admin', name: 'Даниил', role: 'Admin', active: true, token: 'ADMIN-SECRET-2026', createdAt: new Date().toLocaleDateString('ru-RU')}
    ]));
}

// Initialize default invites in localStorage FIRST  
if (!localStorage.getItem('ch_invites')) {
    localStorage.setItem('ch_invites', JSON.stringify([
        {code: 'ADMIN-SECRET-2026', role: 'Admin', used: false}
    ]));
}

// NOW load from localStorage (which now has defaults)
let dbUsers = JSON.parse(localStorage.getItem('ch_users')) || [];
let dbInvites = JSON.parse(localStorage.getItem('ch_invites')) || [];

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
        
        // Найти пользователя по имени автора для кликабельного профиля
        const authorUser = dbUsers.find(u => u.name === c.author);
        const authorId = authorUser ? authorUser.id : null;
        const authorClickable = authorId ? `style="color: var(--text-link); cursor: pointer;" onclick="openCreatorProfile('${authorId}')"` : '';
        
        div.innerHTML = `<span class="comment-author" ${authorClickable}>${c.author}</span><span class="comment-text">${c.text}</span>`;
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
        
        // Найти пользователя по имени автора для кликабельного профиля
        const authorUser = dbUsers.find(u => u.name === idea.author);
        const authorId = authorUser ? authorUser.id : null;
        const authorClickable = authorId ? `style="color: var(--text-link); cursor: pointer;" onclick="event.stopPropagation(); openCreatorProfile('${authorId}')"` : '';
        
        card.innerHTML = `
            <div class="idea-header">
                <div class="idea-title">${idea.title}</div>
                <div class="idea-status">${idea.status}</div>
            </div>
            <p class="idea-desc">${idea.desc}</p>
            <div class="idea-footer">
                <span class="idea-meta">Автор: <span ${authorClickable}>${idea.author}</span></span>
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
            <div style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">Вы можете редактировать свой профиль</div>
        `;
    } else {
        ttSection.innerHTML = user.tiktokUsername 
            ? `<div style="color:var(--text-link); cursor:pointer;" onclick="window.open('https://tiktok.com/@${user.tiktokUsername.replace('@','')}', '_blank')">📱 ${user.tiktokUsername}</div>` 
            : `<div style="color:var(--text-muted);">TikTok не указан</div>`;
    }

    // Добавляем дополнительную информацию о пользователе
    const userInfoHtml = `
        <div style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 15px; font-size: 13px;">
            <div style="background: var(--bg-tertiary); padding: 8px 12px; border-radius: 6px;">
                <div style="color: var(--text-muted); font-size: 11px;">Аккаунт создан</div>
                <div>${user.createdAt || 'Не известно'}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 8px 12px; border-radius: 6px;">
                <div style="color: var(--text-muted); font-size: 11px;">Статус</div>
                <div style="color: ${user.active ? 'var(--green)' : 'var(--red)'};">${user.active ? 'Активен' : 'Неактивен'}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 8px 12px; border-radius: 6px;">
                <div style="color: var(--text-muted); font-size: 11px;">ID пользователя</div>
                <div style="font-family: monospace; font-size: 12px;">${user.id}</div>
            </div>
        </div>
    `;
    
    // Найти куда вставить или обновить контейнер
    let userInfoContainer = document.getElementById('cp-user-info');
    if (!userInfoContainer) {
        userInfoContainer = document.createElement('div');
        userInfoContainer.id = 'cp-user-info';
        ttSection.parentNode.insertBefore(userInfoContainer, ttSection.nextSibling);
    }
    userInfoContainer.innerHTML = userInfoHtml;

    renderTikTokMetrics(user);
    
    // Если это свой профиль, добавляем кнопку редактирования
    if (isMe) {
        setTimeout(addEditProfileButton, 100);
    }
}

function addEditProfileButton() {
    const profileHeader = document.querySelector('.profile-header');
    if (!profileHeader) return;
    
    const existingEditBtn = document.getElementById('edit-profile-btn');
    if (existingEditBtn) return;
    
    const editBtn = document.createElement('button');
    editBtn.id = 'edit-profile-btn';
    editBtn.className = 'btn-primary';
    editBtn.style.cssText = 'position: absolute; top: 30px; right: 30px;';
    editBtn.innerHTML = '✏️ Редактировать профиль';
    editBtn.onclick = function() {
        // Открываем модальное окно редактирования профиля
        alert('Редактирование профиля в разработке');
    };
    
    profileHeader.style.position = 'relative';
    profileHeader.appendChild(editBtn);
}

function saveTikTokUsername() {
    const input = document.getElementById('tt-username-input').value.trim();
    const user = dbUsers.find(u => u.id === currentUser.id);
    if (user) {
        let cleanUsername = input.replace(/^@/, '');
        user.tiktokUsername = cleanUsername ? '@' + cleanUsername : '';
        saveDB();
        
        // Автоматически добавляем аккаунт в список tiktokAccounts
        if (cleanUsername && !tiktokAccounts.find(a => a.username.toLowerCase() === cleanUsername.toLowerCase())) {
            tiktokAccounts.push({
                username: cleanUsername,
                owner: user.name,
                followers: '0',
                likes: '0',
                er: '0%',
                avatar: user.tiktokAvatar || ('https://ui-avatars.com/api/?name=' + cleanUsername + '&background=random'),
                addedAt: new Date().toLocaleDateString('ru-RU'),
                userId: user.id
            });
            localStorage.setItem('tiktokAccounts', JSON.stringify(tiktokAccounts));
        }
        
        // Обновляем список аккаунтов если вкладка активна
        if (typeof renderAccountsList === 'function') {
            renderAccountsList();
        }
        
        renderTikTokMetrics(user);
        alert("TikTok аккаунт сохранен и добавлен в аналитику!");
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
        
        // Получаем данные из tiktokAccounts, если есть
        const cleanUsername = user.tiktokUsername.replace('@', '');
        const tiktokAccount = tiktokAccounts.find(a => a.username.toLowerCase() === cleanUsername.toLowerCase());
        
        if (tiktokAccount) {
            // Используем данные из tiktokAccounts
            document.getElementById('tt-followers').innerText = tiktokAccount.followers || '---';
            document.getElementById('tt-likes').innerText = tiktokAccount.likes || '---';
            document.getElementById('tt-videos').innerText = tiktokAccount.videos || '---';
            document.getElementById('tt-er').innerText = tiktokAccount.er || '---';
            
            // Сохраняем в user.tiktokMetrics для совместимости
            if (!user.tiktokMetrics) {
                user.tiktokMetrics = {
                    followers: tiktokAccount.followers || '---',
                    likes: tiktokAccount.likes || '---',
                    videos: tiktokAccount.videos || '---',
                    er: tiktokAccount.er || '---'
                };
                saveDB();
            }
        } else {
            // Используем старые данные или заглушки
            const m = user.tiktokMetrics || { followers: '---', likes: '---', videos: '---', er: '---' };
            document.getElementById('tt-followers').innerText = m.followers;
            document.getElementById('tt-likes').innerText = m.likes;
            document.getElementById('tt-videos').innerText = m.videos;
            document.getElementById('tt-er').innerText = m.er;
        }
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
        
        // Сохраняем реальные данные в пользователя
        user.tiktokMetrics = {
            followers: data.followers,
            likes: data.likes,
            videos: data.videos,
            er: data.er
        };
        if (data.avatar) {
            user.tiktokAvatar = data.avatar;
        }
        
        // Также обновляем данные в tiktokAccounts
        let tiktokAccount = tiktokAccounts.find(a => a.username.toLowerCase() === cleanUsername.toLowerCase());
        if (tiktokAccount) {
            // Обновляем существующий аккаунт
            tiktokAccount.followers = data.followers;
            tiktokAccount.likes = data.likes;
            tiktokAccount.er = data.er;
            tiktokAccount.avatar = data.avatar || tiktokAccount.avatar;
            tiktokAccount.userId = user.id;
            tiktokAccount.lastSynced = new Date().toLocaleString('ru-RU');
        } else {
            // Создаем новый аккаунт
            tiktokAccounts.push({
                username: cleanUsername,
                owner: user.name,
                followers: data.followers,
                likes: data.likes,
                er: data.er,
                avatar: data.avatar || ('https://ui-avatars.com/api/?name=' + cleanUsername + '&background=random'),
                addedAt: new Date().toLocaleDateString('ru-RU'),
                lastSynced: new Date().toLocaleString('ru-RU'),
                userId: user.id
            });
        }
        
        // Сохраняем оба источника данных
        saveDB();
        localStorage.setItem('tiktokAccounts', JSON.stringify(tiktokAccounts));
        
        // Обновляем список аккаунтов если вкладка активна
        if (typeof renderAccountsList === 'function') {
            renderAccountsList();
        }
        
        renderTikTokMetrics(user);
        alert("Данные TikTok успешно синхронизированы!");
        
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
    console.log("Кнопка нажата!");
    const code = document.getElementById("auth-invite-code").value;
    const name = document.getElementById("auth-name").value;
    
    if (!code) {
        alert("Введите ключ приглашения!");
        return;
    }
    
    if (!name) {
        alert("Введите ваше имя!");
        return;
    }
    
    // Simple login - always works for ADMIN-SECRET-2026
    if (code === "ADMIN-SECRET-2026") {
        alert("Успешный вход! Привет, " + name);
        localStorage.setItem("ch_token", "ADMIN-SECRET-2026");
        location.reload(); // Перезагрузить страницу
    } else {
        alert("Неверный ключ! Используй ADMIN-SECRET-2026");
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
    
    // Render data for new tabs
    if (tabId === 'comments') renderCommentsTable();
    if (tabId === 'reports') renderReportsTable();
    if (tabId === 'ideas') renderIdeas();
    if (tabId === 'creators') renderCreatorsList();
}
// Init
document.addEventListener('DOMContentLoaded', () => {
    saveDB(); // Ensure default invite exists
    // checkAuth(); // Вход отключен
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
// currentUser already declared at top of file

// Initialize accounts on page load
document.addEventListener('DOMContentLoaded', function() {
    renderAccountsList();
    populateOwnerSelect();
});

function populateOwnerSelect() {
    // Get users from dbUsers
    const select = document.getElementById('new-tt-owner');
    if (select) {
        select.innerHTML = '<option value="">Выберите владельца...</option>';
        dbUsers.forEach(u => {
            if (u.active) {
                select.innerHTML += `<option value="${u.name}">${u.name}</option>`;
            }
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
                <div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; background: #1e1f22; display: flex; align-items: center; justify-content: center;">
                    ${acc.avatar ? `<img src="${acc.avatar}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="color: white; font-weight: bold; font-size: 20px;">@${acc.username.slice(0,2)}</div>`}
                </div>
                <div>
                    <div style="color: white; font-weight: bold; font-size: 18px;">@${acc.username}</div>
                    <div style="color: #4ade80; font-size: 12px;">👤 ${acc.owner || 'Не назначен'}</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #1e1f22; margin-bottom: 10px;">
                <div style="text-align: center;">
                    <div style="color: white; font-weight: bold;">${acc.followers || 'N/A'}</div>
                    <div style="color: #888; font-size: 11px;">Подписчики</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: white; font-weight: bold;">${acc.likes || 'N/A'}</div>
                    <div style="color: #888; font-size: 11px;">Лайки</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #00ff9d; font-weight: bold;">${acc.er || 'N/A'}</div>
                    <div style="color: #888; font-size: 11px;">ER</div>
                </div>
            </div>
        </div>
    `).join('');
}

async function addTikTokAccount() {
    const usernameInput = document.getElementById('new-tt-username');
    const ownerInput = document.getElementById('new-tt-owner');
    const btn = document.querySelector('button[onclick="addTikTokAccount()"]');
    
    const username = usernameInput.value.trim().replace('@', '');
    const owner = ownerInput.value || 'Не назначен';
    
    if (!username) { alert('Введите username!'); return; }
    
    if (tiktokAccounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
        alert('Аккаунт уже добавлен!');
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Поиск...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/tiktok?username=' + username);
        const data = await response.json();
        
        tiktokAccounts.push({
            username: username,
            owner: owner,
            followers: data.followers || '0',
            likes: data.likes || '0',
            er: data.er || '0%',
            avatar: data.avatar || ('https://ui-avatars.com/api/?name=' + username + '&background=random'),
            addedAt: new Date().toLocaleDateString('ru-RU')
        });
        
        localStorage.setItem('tiktokAccounts', JSON.stringify(tiktokAccounts));
        
        usernameInput.value = '';
        renderAccountsList();
    } catch(e) {
        alert('Ошибка при получении аналитики TikTok');
        console.error(e);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
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


// --- MOCK DATA FOR NEW TABS ---
const mockComments = [
    { video: "Интервью с Илоном Маском", text: "Опять скам какой-то рекламируете", sentiment: "negative", sentimentLabel: "🚨 Скам/Негатив" },
    { video: "Обзор новой нейросети", text: "Очень крутой формат, жду продолжения!", sentiment: "positive", sentimentLabel: "💚 Позитив" },
    { video: "Как заработать в 2026", text: "А где ссылка на курс?", sentiment: "neutral", sentimentLabel: "⚪ Нейтрально" },
    { video: "Топ 5 ошибок новичков", text: "Видео сгенерировано ИИ, отписка", sentiment: "negative", sentimentLabel: "🚨 AI/Негатив" }
];

const mockReports = [
    { creator: "Даниил Титов", videos: 5, views: "1.2M" },
    { creator: "Алексей Смирнов", videos: 3, views: "450K" },
    { creator: "Иван Иванов", videos: 8, views: "2.1M" }
];

function renderCommentsTable() {
    const tbody = document.getElementById('comments-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = mockComments.map(c => `
        <tr style="border-bottom: 1px solid #1e1f22; transition: background 0.2s;" onmouseover="this.style.background='#36393f'" onmouseout="this.style.background='transparent'">
            <td style="padding: 15px; border-right: 1px solid #1e1f22;">${c.video}</td>
            <td style="padding: 15px; border-right: 1px solid #1e1f22;">${c.text}</td>
            <td style="padding: 15px;">
                <span style="padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; background: ${c.sentiment === 'positive' ? 'rgba(74, 222, 128, 0.2)' : c.sentiment === 'negative' ? 'rgba(237, 66, 69, 0.2)' : 'rgba(181, 186, 193, 0.2)'}; color: ${c.sentiment === 'positive' ? '#4ade80' : c.sentiment === 'negative' ? '#ed4245' : '#b5bac1'};">
                    ${c.sentimentLabel}
                </span>
            </td>
        </tr>
    `).join('');
}

function renderReportsTable() {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = mockReports.map(r => `
        <tr style="border-bottom: 1px solid #1e1f22; transition: background 0.2s;" onmouseover="this.style.background='#36393f'" onmouseout="this.style.background='transparent'">
            <td style="padding: 15px; font-weight: bold;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; background: #5865F2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">${r.creator.slice(0,2)}</div>
                    ${r.creator}
                </div>
            </td>
            <td style="padding: 15px; text-align: center; color: #4ade80;">${r.videos}</td>
            <td style="padding: 15px; text-align: right; font-family: monospace; font-size: 16px;">${r.views}</td>
        </tr>
    `).join('');
}

// --- MOCK DATA FOR NEW TABS ---
let mockComments = [
    { video: "Интервью с Илоном Маском", text: "Опять скам какой-то рекламируете", sentiment: "scam", sentimentLabel: "🚨 Скам" },
    { video: "Обзор новой нейросети", text: "Очень крутой формат, жду продолжения!", sentiment: "positive", sentimentLabel: "💚 Позитив" },
    { video: "Как заработать в 2026", text: "А где ссылка на курс?", sentiment: "scam", sentimentLabel: "🚨 Скам" },
    { video: "Топ 5 ошибок новичков", text: "Видео сгенерировано ИИ, отписка", sentiment: "negative", sentimentLabel: "😠 Негатив" },
    { video: "Распаковка iPhone 20", text: "Мне тоже такой хочется!", sentiment: "positive", sentimentLabel: "💚 Позитив" },
    { video: "10 лайфхаков для TikTok", text: "Ничего нового, зря потратил время", sentiment: "negative", sentimentLabel: "😠 Негатив" },
    { video: "Мой первый миллион", text: "Вдохновляет, спасибо за мотивацию!", sentiment: "positive", sentimentLabel: "💚 Позитив" }
];

let mockReports = [
    { creator: "Даниил Титов", videos: 5, views: "1.2M", engagement: "4.8%" },
    { creator: "Алексей Смирнов", videos: 3, views: "450K", engagement: "3.2%" },
    { creator: "Иван Иванов", videos: 8, views: "2.1M", engagement: "5.1%" },
    { creator: "Мария Петрова", videos: 12, views: "3.4M", engagement: "6.3%" },
    { creator: "Сергей Кузнецов", videos: 6, views: "980K", engagement: "4.1%" }
];

// ==================== COMMENTS TAB FUNCTIONS ====================
function renderCommentsTable(comments = mockComments) {
    const tbody = document.getElementById('comments-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = comments.map(c => `
        <tr style="border-bottom: 1px solid var(--bg-floating); transition: background 0.2s;" onmouseover="this.style.backgroundColor='var(--background-modifier-hover)'" onmouseout="this.style.backgroundColor='transparent'">
            <td style="padding: 15px; border-right: 1px solid var(--bg-floating); font-weight: 500; color: var(--text-normal);">${c.video}</td>
            <td style="padding: 15px; border-right: 1px solid var(--bg-floating); color: var(--text-normal);">${c.text}</td>
            <td style="padding: 15px;">
                <span style="padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; background: ${c.sentiment === 'positive' ? 'rgba(74, 222, 128, 0.2)' : c.sentiment === 'negative' ? 'rgba(237, 66, 69, 0.2)' : 'rgba(255, 184, 0, 0.2)'}; color: ${c.sentiment === 'positive' ? '#4ade80' : c.sentiment === 'negative' ? '#ed4245' : '#ffb800' };">
                    ${c.sentimentLabel}
                </span>
            </td>
        </tr>
    `).join('');
    document.getElementById('comments-count').textContent = comments.length;
}

function loadMockComments() {
    // Можно добавить случайный комментарий для демо
    const newComment = {
        video: "Новый ролик " + Math.floor(Math.random()*1000),
        text: "Случайный комментарий " + Date.now(),
        sentiment: ["positive", "negative", "scam"][Math.floor(Math.random()*3)],
        sentimentLabel: ""
    };
    newComment.sentimentLabel = newComment.sentiment === 'positive' ? '💚 Позитив' : newComment.sentiment === 'negative' ? '😠 Негатив' : '🚨 Скам';
    mockComments.unshift(newComment);
    renderCommentsTable();
    alert('Добавлен новый случайный комментарий!');
}

function filterComments(sentiment) {
    if (sentiment === 'all') {
        renderCommentsTable();
        return;
    }
    const filtered = mockComments.filter(c => c.sentiment === sentiment);
    renderCommentsTable(filtered);
}

function searchComments(query) {
    if (!query.trim()) {
        renderCommentsTable();
        return;
    }
    const filtered = mockComments.filter(c => 
        c.video.toLowerCase().includes(query.toLowerCase()) || 
        c.text.toLowerCase().includes(query.toLowerCase())
    );
    renderCommentsTable(filtered);
}

// ==================== REPORTS TAB FUNCTIONS ====================
function renderReportsTable(reports = mockReports) {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = reports.map(r => `
        <tr style="border-bottom: 1px solid var(--bg-floating); transition: background 0.2s;" onmouseover="this.style.backgroundColor='var(--background-modifier-hover)'" onmouseout="this.style.backgroundColor='transparent'">
            <td style="padding: 15px; border-right: 1px solid var(--bg-floating); font-weight: 600; color: var(--text-normal);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; background: var(--blurple); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; color: white;">${r.creator.slice(0,2)}</div>
                    ${r.creator}
                </div>
            </td>
            <td style="padding: 15px; border-right: 1px solid var(--bg-floating); text-align: center; color: #4ade80; font-weight: bold;">${r.videos}</td>
            <td style="padding: 15px; border-right: 1px solid var(--bg-floating); text-align: right; font-family: monospace; font-size: 16px; color: var(--text-normal);">${r.views}</td>
            <td style="padding: 15px; text-align: center; color: var(--text-normal);">${r.engagement}</td>
        </tr>
    `).join('');
    
    // Update summary cards
    if (reports.length > 0) {
        const topCreator = reports.reduce((prev, current) => prev.videos > current.videos ? prev : current);
        const topViews = reports.reduce((prev, current) => {
            const prevViews = parseFloat(prev.views.replace('K','').replace('M',''));
            const currViews = parseFloat(current.views.replace('K','').replace('M',''));
            return prevViews > currViews ? prev : current;
        });
        const totalVideos = reports.reduce((sum, r) => sum + r.videos, 0);
        
        document.getElementById('top-creator-name').textContent = topCreator.creator;
        document.getElementById('top-views-name').textContent = topViews.creator;
        document.getElementById('total-videos').textContent = totalVideos;
    }
}

function loadMockReports() {
    // Обновляем дату
    document.getElementById('reports-updated').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    // Можно добавить случайные изменения в данные
    mockReports.forEach(r => {
        r.videos += Math.floor(Math.random() * 2); // +0 или +1
    });
    renderReportsTable();
    alert('Данные отчетов обновлены!');
}

function exportToPDF() {
    // Заглушка для генерации PDF
    alert('Функция выгрузки PDF в разработке. В реальном приложении здесь будет использоваться библиотека типа jsPDF.');
    console.log('Экспорт данных в PDF:', mockReports);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Если вкладки активны по умолчанию (например, при прямом переходе по URL)
    if (document.getElementById('tab-comments') && document.getElementById('tab-comments').classList.contains('active')) {
        renderCommentsTable();
    }
    if (document.getElementById('tab-reports') && document.getElementById('tab-reports').classList.contains('active')) {
        renderReportsTable();
    }
});

// --- IDEAS ---
let dbIdeas = [
    {id: 1, title: 'Формат "А что если?"', author: 'Даниил', status: 'В работе', assignee: 'user_admin', tag: 'Эксперимент'},
    {id: 2, title: 'Разбор нейросети X', author: 'Алексей', status: 'Новое', assignee: '', tag: 'Обзор'}
];

function renderIdeas(viewMode = 'linear') {
    const container = document.getElementById('ideas-linear');
    if (!container) {
        // Если контейнера нет, попробуем найти куда вставить или создадим
        const tab = document.getElementById('tab-ideas');
        if (tab) {
            let cont = tab.querySelector('#ideas-container');
            if (!cont) {
                cont = document.createElement('div');
                cont.id = 'ideas-container';
                cont.style.padding = '20px';
                tab.appendChild(cont);
            }
        }
    }
    const actualContainer = document.getElementById('ideas-linear');
    if (!actualContainer) return;
    
    // Генерируем options для селекта из dbUsers
    const userOptions = dbUsers.filter(u => u.active).map(u => 
        `<option value="${u.name}">` + u.name + `</option>`
    ).join('');

    actualContainer.innerHTML = dbIdeas.map(idea => `
        <div style="background: #2b2d31; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid ${idea.status === 'В работе' ? '#f5c043' : '#4ade80'}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h3 style="color: white; margin: 0; font-size: 18px;">${idea.title}</h3>
                <span style="font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #1e1f22; color: #b5bac1;">${idea.tag}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-top: 1px solid #1e1f22; padding-top: 15px;">
                <div style="color: #888; display: flex; gap: 15px; align-items: center;">
                    <span>Автор: ${idea.author}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>Исполнитель:</span>
                        <select onchange="assignIdea(${idea.id}, this.value)" style="background: #1e1f22; color: white; border: 1px solid #3f4147; padding: 4px 8px; border-radius: 4px; outline: none; cursor: pointer;">
                            <option value="">Не назначен</option>
                            ${dbUsers.filter(u => u.active).map(u => `<option value="${u.name}" ${idea.assignee === u.name ? 'selected' : ''}>${u.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <span style="color: ${idea.status === 'В работе' ? '#f5c043' : '#4ade80'}; font-weight: bold;">
                    ${idea.status}
                </span>
            </div>
        </div>
    `).join('');
}

window.assignIdea = function(ideaId, assigneeName) {
    const idea = dbIdeas.find(i => i.id === ideaId);
    if (idea) {
        idea.assignee = assigneeName;
        idea.status = assigneeName ? 'В работе' : 'Новое';
        renderIdeas();
    }
};

// --- PROFILE MODAL LOGIC ---
(function() {
  function initProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-btn');
    const saveBtn = document.getElementById('save-profile');
    const nameInput = document.getElementById('profile-name');
    const roleSelect = document.getElementById('profile-role');
    const tiktokInput = document.getElementById('profile-tiktok');
    const usernamePanel = document.getElementById('current-username');

    function showModal() {
      modal.style.display = 'flex';
      const saved = localStorage.getItem('ch_profile');
      if (saved) {
        try {
          const p = JSON.parse(saved);
          nameInput.value = p.name || '';
          roleSelect.value = p.role || '';
          tiktokInput.value = p.tiktok || '';
        } catch(e) {}
      }
    }

    function hideModal() { modal.style.display = 'none'; }

    function saveProfile() {
      const name = nameInput.value.trim();
      const role = roleSelect.value;
      let tiktok = tiktokInput.value.trim();

      if (!name) { alert('Введите имя'); return; }
      if (!role) { alert('Выберите роль'); return; }
      if (tiktok && !tiktok.startsWith('@')) tiktok = '@' + tiktok;

      localStorage.setItem('ch_profile', JSON.stringify({ name, role, tiktok }));
      if (usernamePanel) usernamePanel.textContent = name;

      // Автоматически добавить TikTok в аналитику аккаунтов
      if (tiktok) {
        const username = tiktok.replace('@', '');
        const accounts = JSON.parse(localStorage.getItem('tiktokAccounts') || '[]');
        if (!accounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
          accounts.push({ username, owner: name, followers: 'loading...', likes: '...', er: '...', addedAt: new Date().toLocaleDateString('ru-RU') });
          localStorage.setItem('tiktokAccounts', JSON.stringify(accounts));
          if (typeof tiktokAccounts !== 'undefined') tiktokAccounts.push({ username, owner: name, followers: 'loading...', likes: '...', er: '...' });
        }
      }
      hideModal();
    }

    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);
    if (usernamePanel) { usernamePanel.addEventListener('click', showModal); usernamePanel.style.cursor = 'pointer'; }

    if (!localStorage.getItem('ch_profile')) {
      showModal();
    } else {
      try {
        const p = JSON.parse(localStorage.getItem('ch_profile'));
        if (usernamePanel && p.name) usernamePanel.textContent = p.name;
      } catch(e) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initProfileModal);
  else initProfileModal();
})();
