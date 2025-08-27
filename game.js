(function () {
  let score = 0;

  const ready = (fn) => {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  };

  ready(() => {
    const btn = document.getElementById("flowerBtn");
    const scoreBoard = document.getElementById("scoreBoard");
    const message = document.getElementById("message");

    if (!btn || !scoreBoard) {
      console.error("Элементы не найдены. Проверь index.html");
      return;
    }

    btn.addEventListener("click", () => {
      score++;
      scoreBoard.textContent = "Очки: " + score;

      // Немного рандомных сообщений
      const phrases = [
        "🌸 Красота!",
        "🌺 Отличный выбор!",
        "🌼 Ты собрал ещё один цветок!",
        "🌹 Продолжай!",
        "🌷 Букет становится больше!"
      ];
      const random = phrases[Math.floor(Math.random() * phrases.length)];
      message.textContent = random;
    });
  });
})();
