(function () {
  // Конфигурация игры
  const GAME_TIME = 60; // секунд
  const GRID_SIZE = 9;  // 3x3 поле
  const TYPES = ["rose", "tulip", "chrys", "empty"];

  // Верные клики: базовые очки, комбо множитель
  const BASE_POINTS = 10;
  const MISS_PENALTY = 5; // штраф за промах

  // Состояние
  const state = {
    running: false,
    timeLeft: GAME_TIME,
    score: 0,
    combo: 1,
    comboMax: 1,
    order: { rose: 0, tulip: 0, chrys: 0 },
    progress: { rose: 0, tulip: 0, chrys: 0 },
    cells: Array(GRID_SIZE).fill("empty"),
    timerId: null
  };

  // Элементы DOM
  const el = {};
  const $ = (id) => document.getElementById(id);

  function bindDom() {
    el.time = $("time");
    el.score = $("score");
    el.combo = $("combo");
    el.message = $("message");
    el.startBtn = $("startBtn");
    el.resetBtn = $("resetBtn");
    el.grid = $("grid");

    el.need = {
      rose: $("need-rose"),
      tulip: $("need-tulip"),
      chrys: $("need-chrys"),
    };
    el.bar = {
      rose: $("bar-rose"),
      tulip: $("bar-tulip"),
      chrys: $("bar-chrys"),
    };

    // создать 9 клеток
    el.grid.innerHTML = "";
    for (let i = 0; i < GRID_SIZE; i++) {
      const cell = document.createElement("button");
      cell.className = "cell empty";
      cell.setAttribute("data-idx", String(i));
      cell.setAttribute("aria-label", "пусто");
      cell.textContent = "—";
      el.grid.appendChild(cell);
    }
  }

  // Утилиты
  const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function rollCellType() {
    // распределение с небольшим перевесом к нужным товарам
    // увеличим шанс выпадения типов, у которых ещё есть потребность
    const weights = [];
    const pushType = (type, w) => { for (let i = 0; i < w; i++) weights.push(type); };

    const needs = {
      rose: Math.max(state.order.rose - state.progress.rose, 0),
      tulip: Math.max(state.order.tulip - state.progress.tulip, 0),
      chrys: Math.max(state.order.chrys - state.progress.chrys, 0)
    };

    // базовый пул
    pushType("empty", 5);
    pushType("rose", needs.rose > 0 ? 5 : 2);
    pushType("tulip", needs.tulip > 0 ? 5 : 2);
    pushType("chrys", needs.chrys > 0 ? 5 : 2);

    return choice(weights);
  }

  function rerollGrid(full = false) {
    const cellNodes = el.grid.querySelectorAll(".cell");
    for (let i = 0; i < cellNodes.length; i++) {
      if (!full && Math.random() < 0.5) continue; // частичное обновление

      const type = rollCellType();
      state.cells[i] = type;

      const n = cellNodes[i];
      n.className = "cell " + type;
      switch (type) {
        case "rose": n.textContent = "Роза"; n.setAttribute("aria-label","Роза"); break;
        case "tulip": n.textContent = "Тюльпан"; n.setAttribute("aria-label","Тюльпан"); break;
        case "chrys": n.textContent = "Хризантема"; n.setAttribute("aria-label","Хризантема"); break;
        default: n.textContent = "—"; n.setAttribute("aria-label","пусто");
      }
    }
  }

  function newOrder() {
    // целевые количества (слегка рандомные, чтобы «чуть сложнее»)
    state.order.rose  = rnd(4, 7);
    state.order.tulip = rnd(4, 7);
    state.order.chrys = rnd(4, 7);
    state.progress = { rose: 0, tulip: 0, chrys: 0 };

    el.need.rose.textContent = `${state.progress.rose}/${state.order.rose}`;
    el.need.tulip.textContent = `${state.progress.tulip}/${state.order.tulip}`;
    el.need.chrys.textContent = `${state.progress.chrys}/${state.order.chrys}`;

    updateBars();
  }

  function updateBars() {
    const pct = (got, need) => (need === 0 ? 100 : Math.min(100, Math.round((got / need) * 100)));
    el.bar.rose.style.width = pct(state.progress.rose, state.order.rose) + "%";
    el.bar.tulip.style.width = pct(state.progress.tulip, state.order.tulip) + "%";
    el.bar.chrys.style.width = pct(state.progress.chrys, state.order.chrys) + "%";

    el.need.rose.textContent = `${state.progress.rose}/${state.order.rose}`;
    el.need.tulip.textContent = `${state.progress.tulip}/${state.order.tulip}`;
    el.need.chrys.textContent = `${state.progress.chrys}/${state.order.chrys}`;
  }

  function setMessage(text) {
    el.message.textContent = text;
  }

  function refreshHud() {
    el.time.textContent = String(state.timeLeft);
    el.score.textContent = String(state.score);
    el.combo.textContent = String(state.combo);
  }

  function gameOver(win) {
    state.running = false;
    clearInterval(state.timerId);
    el.startBtn.disabled = false;
    el.resetBtn.disabled = false;

    const accuracyBonus = Math.max(0, Math.round((state.comboMax - 1) * 5));
    const timeBonus = win ? state.timeLeft * 2 : 0;
    const final = state.score + accuracyBonus + timeBonus;

    setMessage(
      (win ? "Заказ выполнен. " : "Время вышло. ") +
      `Бонус комбо: ${accuracyBonus}, бонус времени: ${timeBonus}. Итоговый счёт: ${final}.`
    );
  }

  function checkWin() {
    const done =
      state.progress.rose >= state.order.rose &&
      state.progress.tulip >= state.order.tulip &&
      state.progress.chrys >= state.order.chrys;
    if (done) gameOver(true);
  }

  function handleClickCell(idx) {
    if (!state.running) return;

    const type = state.cells[idx];
    let correct = false;

    if (type === "rose" && state.progress.rose < state.order.rose) {
      state.progress.rose++; correct = true;
    } else if (type === "tulip" && state.progress.tulip < state.order.tulip) {
      state.progress.tulip++; correct = true;
    } else if (type === "chrys" && state.progress.chrys < state.order.chrys) {
      state.progress.chrys++; correct = true;
    }

    if (correct) {
      state.score += BASE_POINTS * state.combo;
      state.combo = Math.min(state.combo + 1, 10);
      state.comboMax = Math.max(state.comboMax, state.combo);

      // мгновенно перегенерим только кликнутую клетку
      const node = el.grid.querySelector(`.cell[data-idx="${idx}"]`);
      const newType = rollCellType();
      state.cells[idx] = newType;
      node.className = "cell " + newType;
      node.textContent =
        newType === "rose" ? "Роза" :
        newType === "tulip" ? "Тюльпан" :
        newType === "chrys" ? "Хризантема" : "—";
      node.setAttribute("aria-label", node.textContent);

      updateBars();
      setMessage("Верно");
      checkWin();
    } else {
      // промах
      if (type !== "empty") {
        state.score = Math.max(0, state.score - MISS_PENALTY);
      }
      state.combo = 1;
      setMessage("Промах");
    }

    refreshHud();
  }

  function startTimer() {
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      if (!state.running) return;
      state.timeLeft -= 1;
      refreshHud();

      // каждые 2 секунды слегка перемешиваем поле
      if (state.timeLeft % 2 === 0) rerollGrid(false);

      if (state.timeLeft <= 0) {
        gameOver(false);
      }
    }, 1000);
  }

  function attachEvents() {
    el.startBtn.addEventListener("click", () => {
      if (state.running) return;
      state.running = true;
      state.timeLeft = GAME_TIME;
      state.score = 0;
      state.combo = 1;
      state.comboMax = 1;
      newOrder();
      rerollGrid(true);
      refreshHud();
      setMessage("Идёт сбор заказа");
      el.startBtn.disabled = true;
      el.resetBtn.disabled = false;
      startTimer();
    });

    el.resetBtn.addEventListener("click", () => {
      clearInterval(state.timerId);
      state.running = false;
      state.timeLeft = GAME_TIME;
      state.score = 0;
      state.combo = 1;
      state.comboMax = 1;
      newOrder();
      rerollGrid(true);
      refreshHud();
      setMessage("Готово к старту");
      el.startBtn.disabled = false;
      el.resetBtn.disabled = true;
    });

    el.grid.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const idxStr = target.getAttribute("data-idx");
      if (!idxStr) return;
      handleClickCell(parseInt(idxStr, 10));
    });

    // горячая клавиша: R — сброс
    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "r") el.resetBtn.click();
    });
  }

  // Инициализация
  const ready = (fn) => {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  };

  ready(() => {
    bindDom();
    attachEvents();
    newOrder();
    rerollGrid(true);
    refreshHud();
    setMessage("Готово к старту");
    el.resetBtn.disabled = true;
  });
})();
