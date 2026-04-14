function switchTab(tabId, titleText) {
    // 1. Убираем класс 'active' у всех вкладок (кнопок в сайдбаре)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // 2. Добавляем 'active' той кнопке, на которую кликнули
    const clickedItem = Array.from(navItems).find(
        item => item.getAttribute('onclick').includes(tabId)
    );
    if (clickedItem) {
        clickedItem.classList.add('active');
    }

    // 3. Скрываем весь контент
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none'; // Жестко прячем
    });

    // 4. Показываем нужный контент
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block'; // Показываем
    }

    // 5. Меняем заголовок страницы (как название канала)
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.innerText = titleText;
    }
}

// Инициализация (чтобы при загрузке точно был активен дашборд)
document.addEventListener('DOMContentLoaded', () => {
    switchTab('dashboard', 'Сводка');
});