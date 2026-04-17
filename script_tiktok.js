// TikTok API Logic for Dashboard
async function scanTikTokAccount() {
    const input = document.getElementById('new-tt-username');
    const btn = document.getElementById('scan-tt-btn');
    const resultDiv = document.getElementById('tt-scan-result');
    
    const username = input.value.trim();
    if (!username) {
        alert('Введите юзернейм TikTok');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Поиск...';
    
    try {
        const response = await fetch(`/api/tiktok?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        // Показываем результат в стиле Discord
        resultDiv.innerHTML = `
            <div style="background: #1e1f22; border-radius: 8px; padding: 15px; display: flex; align-items: center; gap: 15px; margin-top: 15px;">
                <img src="${data.avatar}" alt="avatar" style="width: 60px; height: 60px; border-radius: 50%;">
                <div style="flex: 1; color: white;">
                    <h4 style="margin: 0 0 5px 0; font-size: 16px;">@${username.replace(/^@/, '')}</h4>
                    <div style="display: flex; gap: 15px; color: #b5bac1; font-size: 14px;">
                        <span>👥 ${data.followers} подписчиков</span>
                        <span>❤️ ${data.likes} лайков</span>
                        <span>🎬 ${data.videos} видео</span>
                        <span>📈 ER: ${data.er}</span>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        resultDiv.innerHTML = `<div style="color: #ed4245; margin-top: 15px;">❌ Ошибка загрузки данных</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔍 Анализировать';
    }
}
