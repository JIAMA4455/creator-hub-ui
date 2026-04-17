import re
with open('index.html', 'r') as f:
    html = f.read()

new_nav = '''<div class="channel-group">АНАЛИТИКА И ОТЧЕТЫ</div>
            <ul class="nav-links">
                <li class="nav-item" onclick="switchTab('analytics', 'Аналитика аккаунтов')">
                    <span class="icon">📈</span> Аккаунты
                </li>
                <li class="nav-item" onclick="switchTab('comments', 'Анализ комментариев')">
                    <span class="icon">💬</span> Комментарии
                </li>
                <li class="nav-item" onclick="switchTab('reports', 'Командные отчёты')">
                    <span class="icon">📑</span> Отчёты
                </li>
                <li class="nav-item" id="nav-admin" onclick="switchTab('admin', 'Админ-панель')" style="display: none;">
                    <span class="icon">🛡️</span> Админ-панель
                </li>
            </ul>'''

html = re.sub(r'<div class="channel-group">АНАЛИТИКА</div>.*?</ul>', new_nav, html, flags=re.DOTALL)
with open('index.html', 'w') as f:
    f.write(html)
