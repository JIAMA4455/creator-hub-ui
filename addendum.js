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

// ==================== INTEGRATION WITH EXISTING SWITCHTAB ====================
// Модифицируем существующую функцию switchTab для вызова рендера при переключении
(function() {
    const originalSwitchTab = window.switchTab;
    window.switchTab = function(tabId, titleText) {
        originalSwitchTab(tabId, titleText);
        if (tabId === 'comments') {
            renderCommentsTable();
        } else if (tabId === 'reports') {
            renderReportsTable();
        }
    };
})();

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