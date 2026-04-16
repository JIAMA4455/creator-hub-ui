// Ультрапростой тест для проверки логина
function testLogin() {
    console.log("=== ТЕСТ ЛОГИНА ===");
    console.log("1. Проверяем кнопку...");
    const btn = document.querySelector('button[onclick="loginWithInvite()"]');
    if (!btn) {
        console.error("❌ Кнопка не найдена!");
        alert("ОШИБКА: Кнопка входа не найдена!");
        return;
    }
    console.log("✅ Кнопка найдена:", btn);
    
    console.log("2. Проверяем поля ввода...");
    const codeInput = document.getElementById('auth-invite-code');
    const nameInput = document.getElementById('auth-name');
    if (!codeInput || !nameInput) {
        console.error("❌ Поля ввода не найдены!");
        alert("ОШИБКА: Поля ввода не найдены!");
        return;
    }
    console.log("✅ Поля найдены");
    
    console.log("3. Проверяем функцию loginWithInvite...");
    if (typeof window.loginWithInvite !== 'function') {
        console.error("❌ Функция loginWithInvite не определена!");
        alert("ОШИБКА: Функция loginWithInvite не загружена!");
        return;
    }
    console.log("✅ Функция существует");
    
    alert("✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Пробуем войти...");
    
    // Автозаполняем тестовые данные
    codeInput.value = 'ADMIN-SECRET-2026';
    nameInput.value = 'Даниил';
    
    // Запускаем функцию
    window.loginWithInvite();
}

// Добавляем кнопку теста на страницу
function addTestButton() {
    const testBtn = document.createElement('button');
    testBtn.textContent = '🧪 ТЕСТИРОВАТЬ ВХОД';
    testBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:red;color:white;padding:10px;border:none;border-radius:5px;cursor:pointer;';
    testBtn.onclick = testLogin;
    document.body.appendChild(testBtn);
    console.log("Кнопка теста добавлена!");
}

// Запускаем при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTestButton);
} else {
    addTestButton();
}
