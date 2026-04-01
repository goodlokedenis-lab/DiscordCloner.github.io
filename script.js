// Скрипт для страницы правил KastWorld
// Здесь можно добавить интерактивные элементы в будущем

document.addEventListener('DOMContentLoaded', function() {
    console.log('KastWorld Rules page loaded');
    
    // Пример: плавная прокрутка для якорей (если добавите)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
