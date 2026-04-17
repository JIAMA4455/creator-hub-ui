import re
with open('script.js', 'r') as f:
    code = f.read()

# Replace the whole addTikTokAccount function
code = re.sub(r'function addTikTokAccount\(\) \{.*?(?=function showAccountsList|function deleteTikTokAccount)', '''async function addTikTokAccount() {
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

''', code, flags=re.DOTALL)

# Update renderAccountsList
code = re.sub(r'function renderAccountsList\(\) \{.*?(?=function addTikTokAccount|async function addTikTokAccount)', '''function renderAccountsList() {
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

''', code, flags=re.DOTALL)

with open('script.js', 'w') as f:
    f.write(code)
