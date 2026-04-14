function switchTab(tabId, titleText) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    const clickedItem = Array.from(navItems).find(
        item => item.getAttribute('onclick').includes(tabId)
    );
    if (clickedItem) {
        clickedItem.classList.add('active');
    }

    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block';
        
        // Инициализация Canvas при открытии вкладки идей
        if (tabId === 'ideas' && document.getElementById('ideas-network').classList.contains('active')) {
            initNetworkCanvas();
        }
    }

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.innerText = titleText;
    }
}

// Переключение видов Идей (Линейный <-> Паутина)
function switchIdeaView(viewType) {
    const views = document.querySelectorAll('.view-container');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('ideas-' + viewType).classList.add('active');

    const btns = document.querySelectorAll('.view-controls .btn-icon');
    btns.forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (viewType === 'network') {
        initNetworkCanvas();
    } else {
        cancelAnimationFrame(animationFrameId); // Останавливаем анимацию, если ушли из паутины
    }
}

// ----------------------------------------------------
// ЛОГИКА ПАУТИНЫ ТАЛАНТОВ (КАНВАС)
// ----------------------------------------------------
const mockIdeas = [
    { id: 1, title: "Обзор M5 (Скрытые меню)", likes: 15, group: 'Review', x: 0, y: 0, vx: 0, vy: 0 },
    { id: 2, title: "Сравнение выхлопа", likes: 45, group: 'Review', x: 0, y: 0, vx: 0, vy: 0 },
    { id: 3, title: "Пранк с ключами", likes: 2, group: 'Entertainment', x: 0, y: 0, vx: 0, vy: 0 },
    { id: 4, title: "Топ-3 ошибки при покупке", likes: 28, group: 'Guide', x: 0, y: 0, vx: 0, vy: 0 },
    { id: 5, title: "Дрифт на снегу (SlowMo)", likes: 60, group: 'Entertainment', x: 0, y: 0, vx: 0, vy: 0 }
];

let animationFrameId;

function initNetworkCanvas() {
    const canvas = document.getElementById('network-canvas');
    const ctx = canvas.getContext('2d');
    
    // Подгоняем размер под контейнер
    const container = document.getElementById('ideas-network');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Начальные случайные позиции и векторы движения
    mockIdeas.forEach(idea => {
        idea.x = Math.random() * canvas.width;
        idea.y = Math.random() * canvas.width;
        idea.vx = (Math.random() - 0.5) * 0.4; // Очень медленное движение
        idea.vy = (Math.random() - 0.5) * 0.4;
        idea.radius = Math.max(15, idea.likes * 1.5); // Размер зависит от лайков
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Движение и отскок от стен
        mockIdeas.forEach(idea => {
            idea.x += idea.vx;
            idea.y += idea.vy;

            if (idea.x - idea.radius < 0 || idea.x + idea.radius > canvas.width) idea.vx *= -1;
            if (idea.y - idea.radius < 0 || idea.y + idea.radius > canvas.height) idea.vy *= -1;
        });

        // Рисуем линии (паутину) между близкими идеями
        for (let i = 0; i < mockIdeas.length; i++) {
            for (let j = i + 1; j < mockIdeas.length; j++) {
                const dx = mockIdeas[i].x - mockIdeas[j].x;
                const dy = mockIdeas[i].y - mockIdeas[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Если идеи близко друг к другу, соединяем линией
                if (dist < 250) {
                    ctx.beginPath();
                    ctx.moveTo(mockIdeas[i].x, mockIdeas[i].y);
                    ctx.lineTo(mockIdeas[j].x, mockIdeas[j].y);
                    ctx.strokeStyle = `rgba(88, 101, 242, ${1 - dist/250})`; // Blurple color, fades out
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        // Рисуем кружочки (Идеи)
        mockIdeas.forEach(idea => {
            ctx.beginPath();
            ctx.arc(idea.x, idea.y, idea.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#23a559'; // Green color for ideas
            ctx.fill();
            
            // Свечение (Glow) вокруг больших кругов
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#4ade80';
            ctx.fill();
            ctx.shadowBlur = 0; // Сброс теней для текста

            // Текст (Название)
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Если текст слишком длинный, обрезаем
            let shortTitle = idea.title.length > 15 ? idea.title.substring(0,15) + '...' : idea.title;
            
            // Пишем текст под кружком
            ctx.fillText(shortTitle, idea.x, idea.y + idea.radius + 15);
            // Пишем лайки внутри кружка
            ctx.fillText(`❤️ ${idea.likes}`, idea.x, idea.y);
        });

        animationFrameId = requestAnimationFrame(draw);
    }

    cancelAnimationFrame(animationFrameId);
    draw();
}

document.addEventListener('DOMContentLoaded', () => {
    switchTab('dashboard', 'Сводка');
});