/* =========================
   수정하기 쉬운 설정
========================= */
const ASSETS = {
  whiteBg: "./assets/white-bg.png",
  topFixed: "./assets/top-fixed-ui-image.png",
  card: "./assets/card-layer.png",
  menuMove: "./assets/menu-moving-image.png",
  menuFrame: "./assets/menu-fram.png",
  overseasBtn: "./assets/overseas-btn.png",
};

const UI = {
  phoneWidth: 591,
  phoneHeight: 1159,

  /* 카드 */
  cardTrackStartY: 14,
  dragEnableCardCount: 3,
  cardGap: 14,

  /* 메뉴 드래그 시작점 / 끝점 */
  menuMoveStartX: 0,
  menuMoveMinX: -80,
  menuMoveMaxX: 80,

  /* 저장용 캔버스 배율 */
  exportScale: 2,
};

/* =========================
   요소
========================= */
const accountInput = document.getElementById("accountInput");
const nameInput = document.getElementById("nameInput");
const depositInput = document.getElementById("depositInput");
const realizedInput = document.getElementById("realizedInput");

const addCardBtn = document.getElementById("addCardBtn");
const demoBtn = document.getElementById("demoBtn");
const captureBtn = document.getElementById("captureBtn");

const cardInputs = document.getElementById("cardInputs");
const cardInputTemplate = document.getElementById("cardInputTemplate");

const cardTrack = document.getElementById("cardTrack");
const cardViewport = document.getElementById("cardViewport");
const menuMoveImage = document.getElementById("menuMoveImage");

const accountText = document.getElementById("accountText");
const assetText = document.getElementById("assetText");
const assetRateText = document.getElementById("assetRateText");
const totalPnLText = document.getElementById("totalPnLText");
const totalEvalText = document.getElementById("totalEvalText");
const d2Text = document.getElementById("d2Text");
const buyText = document.getElementById("buyText");
const realizedText = document.getElementById("realizedText");

const captureTarget = document.getElementById("captureArea");

/* =========================
   상태
========================= */
let cardTrackY = UI.cardTrackStartY;
let menuMoveX = UI.menuMoveStartX;

/* =========================
   디버그
========================= */
console.log("accountInput:", accountInput);
console.log("cardTrack:", cardTrack);
console.log("menuMoveImage:", menuMoveImage);
console.log("cardInputTemplate:", cardInputTemplate);

/* =========================
   유틸
========================= */
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatInt(value) {
  return Math.round(value || 0).toLocaleString("ko-KR");
}

function formatSignedInt(value) {
  const n = Math.round(value || 0);
  if (n > 0) return formatInt(n);
  if (n < 0) return `-${formatInt(Math.abs(n))}`;
  return "0";
}

function formatSignedRate(value) {
  const n = Number(value || 0);
  if (n > 0) return `${n.toFixed(2)}%`;
  if (n < 0) return `-${Math.abs(n).toFixed(2)}%`;
  return "0.00%";
}

function getToneClass(value) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatAccountNumber(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`;
}

/* =========================
   카드 입력 UI
========================= */
function updateCardTitles() {
  const items = [...cardInputs.querySelectorAll(".card-input-box")];
  items.forEach((item, idx) => {
    const title = item.querySelector(".card-input-title");
    if (title) title.textContent = `카드 ${idx + 1}`;
  });
}

function bindCardInputEvents(box) {
  const deleteBtn = box.querySelector(".delete-card-btn");

  deleteBtn.addEventListener("click", () => {
    box.remove();
    updateCardTitles();
    renderAll();
  });

  box.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", renderAll);
  });
}

function addCardInput(data = {}) {
  if (!cardInputTemplate) {
    console.error("cardInputTemplate를 못 찾음");
    return;
  }

  const node = cardInputTemplate.content.firstElementChild.cloneNode(true);

  node.querySelector(".stock-name-input").value = data.name ?? "케이뱅크";
  node.querySelector(".buy-price-input").value = data.buy ?? 7890;
  node.querySelector(".sell-price-input").value = data.sell ?? 7890;
  node.querySelector(".qty-input").value = data.qty ?? 1;
  node.querySelector(".cash-type-input").value = data.cashType ?? "현금";

  bindCardInputEvents(node);
  cardInputs.appendChild(node);
  updateCardTitles();
  renderAll();
}

function readCardInputs() {
  return [...cardInputs.querySelectorAll(".card-input-box")].map((box) => ({
    name: box.querySelector(".stock-name-input").value.trim() || "종목명",
    buy: toNumber(box.querySelector(".buy-price-input").value),
    sell: toNumber(box.querySelector(".sell-price-input").value),
    qty: toNumber(box.querySelector(".qty-input").value),
    cashType: box.querySelector(".cash-type-input").value.trim() || "현금",
  }));
}

/* =========================
   계산식
========================= */
function calcStock(stock) {
  const buy = Math.max(0, stock.buy);
  const sell = Math.max(0, stock.sell);
  const qty = Math.max(0, stock.qty);

  const money = buy * qty;
  const evalValue = qty * sell;
  const pnl = evalValue - money;
  const rate = money > 0 ? (pnl / money) * 100 : 0;
  const avg = buy;

  return {
    ...stock,
    qty,
    money,
    evalValue,
    pnl,
    rate,
    avg,
  };
}

function calcSummary(calculatedCards) {
  const deposit = toNumber(depositInput.value);
  const realized = toNumber(realizedInput.value);

  const totalPnL = calculatedCards.reduce((sum, card) => sum + card.pnl, 0);
  const totalEval = calculatedCards.reduce((sum, card) => sum + card.evalValue, 0);
  const totalBuy = calculatedCards.reduce((sum, card) => sum + card.money, 0);

  const d2 = deposit - totalBuy;
  const asset = totalEval + d2;
  const assetRate = totalBuy > 0 ? (totalPnL / totalBuy) * 100 : 0;

  return {
    deposit,
    realized,
    totalPnL,
    totalEval,
    totalBuy,
    d2,
    asset,
    assetRate,
  };
}

/* =========================
   렌더링
========================= */
function renderTopTexts(summary) {
  const accNum = accountText?.querySelector(".account-number");
  const accName = accountText?.querySelector(".account-name");

  if (accNum) {
    accNum.textContent = formatAccountNumber(accountInput.value);
  }

  if (accName) {
    accName.textContent = " " + (nameInput.value || "");
  }

  assetText.textContent = formatInt(summary.asset);
  assetText.className = "top-text top-asset num-text";
  assetText.style.color = "#4A4C51";

  assetRateText.textContent = formatSignedRate(summary.assetRate);
  assetRateText.className = `top-text top-asset-rate num-text ${getToneClass(summary.assetRate)}`;

  totalPnLText.textContent = formatSignedInt(summary.totalPnL);
  totalPnLText.className = `top-text top-total-pnl num-text ${getToneClass(summary.totalPnL)}`;

  totalEvalText.textContent = formatInt(summary.totalEval);
  totalEvalText.className = "top-text top-total-eval num-text flat";

  d2Text.textContent = formatSignedInt(summary.d2);
  d2Text.className = "top-text top-d2 num-text";
  d2Text.style.color = "#4A4C51";

  buyText.textContent = formatInt(summary.totalBuy);
  buyText.className = "top-text top-buy num-text flat";

  realizedText.textContent = formatSignedInt(summary.realized);
  realizedText.className = "top-text top-realized num-text";
  realizedText.style.color = "#4A4C51";
}

function createCardHtml(card) {
  return `
    <div class="stock-card">
      <img class="card-bg" src="${ASSETS.card}" alt="card background" draggable="false" />
      <div class="card-text-layer">
        <div class="card-text card-name">${escapeHtml(card.name)}</div>
        <div class="card-text card-pnl ${getToneClass(card.pnl)}">${formatSignedInt(card.pnl)}</div>
        <div class="card-text card-rate ${getToneClass(card.rate)}">${formatSignedRate(card.rate)}</div>
        <div class="card-text card-qty flat">${formatInt(card.qty)}</div>
        <div class="card-text card-avg flat">${formatInt(card.avg)}</div>
      </div>
    </div>
  `;
}

function updateCardDragState(cardCount) {
  const enabled = cardCount >= UI.dragEnableCardCount;

  if (enabled) {
    cardTrack.style.pointerEvents = "auto";
    cardTrack.style.cursor = "grab";
    cardTrack.dataset.dragEnabled = "true";
  } else {
    cardTrack.style.pointerEvents = "none";
    cardTrack.style.cursor = "default";
    cardTrack.dataset.dragEnabled = "false";
    cardTrackY = UI.cardTrackStartY;
    applyCardTrackY();
  }
}

function getCardDragBounds() {
  if (!cardViewport || !cardTrack) {
    return { minY: 0, maxY: 0 };
  }

  const viewportHeight = cardViewport.clientHeight;
  const trackHeight = cardTrack.scrollHeight;

  const minY = Math.min(0, viewportHeight - trackHeight) - 10;
  const maxY = UI.cardTrackStartY;

  return { minY, maxY };
}

function renderCardLayer(calculatedCards) {
  cardTrack.innerHTML = calculatedCards.map(createCardHtml).join("");

  const cards = [...cardTrack.querySelectorAll(".stock-card")];
  cards.forEach((card, index) => {
    card.style.marginBottom =
      index === cards.length - 1 ? "0px" : `${UI.cardGap}px`;
  });

  const bounds = getCardDragBounds();
  cardTrackY = Math.max(bounds.minY, Math.min(cardTrackY, bounds.maxY));

  applyCardTrackY();
  updateCardDragState(calculatedCards.length);
}

function renderAll() {
  const rawCards = readCardInputs();
  const calculatedCards = rawCards.map(calcStock);
  const summary = calcSummary(calculatedCards);

  renderTopTexts(summary);
  renderCardLayer(calculatedCards);
}

/* =========================
   카드 레이어 전체 드래그
========================= */
function applyCardTrackY() {
  const { minY, maxY } = getCardDragBounds();

  if (cardTrackY < minY) cardTrackY = minY;
  if (cardTrackY > maxY) cardTrackY = maxY;

  cardTrack.style.transform = `translateY(${cardTrackY}px)`;
}

function bindCardTrackDrag() {
  let dragging = false;
  let startY = 0;
  let startTranslate = 0;

  function onMove(e) {
    if (!dragging) return;
    const dy = e.clientY - startY;
    cardTrackY = startTranslate + dy;
    applyCardTrackY();
  }

  function onUp() {
    dragging = false;
    cardTrack.classList.remove("dragging");
    document.body.classList.remove("dragging-ui");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }

  cardTrack.addEventListener("pointerdown", (e) => {
    if (cardTrack.dataset.dragEnabled !== "true") return;

    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    startTranslate = cardTrackY;

    cardTrack.classList.add("dragging");
    document.body.classList.add("dragging-ui");

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  cardTrackY = UI.cardTrackStartY;
  applyCardTrackY();
}

/* =========================
   메뉴 좌우 드래그
========================= */
function applyMenuMoveX() {
  const viewportWidth = menuMoveImage.parentElement.clientWidth;
  const imageHeight = menuMoveImage.clientHeight || 80;
  const imageWidth = menuMoveImage.naturalWidth
    ? (menuMoveImage.naturalWidth * imageHeight) / menuMoveImage.naturalHeight
    : menuMoveImage.clientWidth;

  const autoMinX = Math.min(0, viewportWidth - imageWidth);
  const minX = UI.menuMoveMinX === null ? autoMinX : UI.menuMoveMinX;
  const maxX = UI.menuMoveMaxX;

  if (menuMoveX > maxX) menuMoveX = maxX;
  if (menuMoveX < minX) menuMoveX = minX;

  menuMoveImage.style.transform = `translateX(${menuMoveX}px)`;
}

function bindMenuDrag() {
  let dragging = false;
  let startX = 0;
  let startTranslate = 0;

  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    menuMoveX = startTranslate + dx;
    applyMenuMoveX();
  }

  function onUp() {
    dragging = false;
    menuMoveImage.classList.remove("dragging");
    document.body.classList.remove("dragging-ui");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }

  menuMoveImage.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startTranslate = menuMoveX;
    menuMoveImage.classList.add("dragging");
    document.body.classList.add("dragging-ui");

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  if (menuMoveImage.complete) {
    applyMenuMoveX();
  } else {
    menuMoveImage.addEventListener("load", applyMenuMoveX, { once: true });
  }

  window.addEventListener("resize", applyMenuMoveX);
}

/* =========================
   캡처
========================= */
async function capturePhoneScreenshot() {
  if (!captureTarget) {
    alert("스샷 대상(captureArea)을 찾을 수 없어.");
    return;
  }

  try {
    document.body.classList.add("capturing");

    const rect = captureTarget.getBoundingClientRect();

    const canvas = await html2canvas(captureTarget, {
      backgroundColor: null,
      useCORS: true,
      logging: false,
      scale: 3,
      imageTimeout: 0,
      width: rect.width,
      height: rect.height,
      windowWidth: rect.width,
      windowHeight: rect.height,
      scrollX: 0,
      scrollY: 0
    });

    const ctx = canvas.getContext("2d");
    const baseRect = captureTarget.getBoundingClientRect();
    const renderScale = canvas.width / baseRect.width;

    function getNoiseTargets() {
      const numberTargets = [
        ...captureTarget.querySelectorAll(
          ".num-text, .card-pnl, .card-rate, .card-qty, .card-avg, .account-number"
        )
      ];

      const textTargets = [
        ...captureTarget.querySelectorAll(
          ".account-name, .card-name, .top-text"
        )
      ].filter((el) =>
        !el.classList.contains("num-text") &&
        !el.classList.contains("top-account")
      );

      return { numberTargets, textTargets };
    }

    function getExactTextRect(el, text) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);

      const fontWeight = style.fontWeight || "400";
      const fontSize = parseFloat(style.fontSize) || 16;
      const fontFamily = style.fontFamily || "sans-serif";
      const textAlign =
        style.textAlign === "right" || el.classList.contains("num-text")
          ? "right"
          : style.textAlign === "center"
          ? "center"
          : "left";

      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const measuredWidth = ctx.measureText(String(text)).width;
      ctx.restore();

      const scaledRect = {
        left: (r.left - baseRect.left) * renderScale,
        top: (r.top - baseRect.top) * renderScale,
        width: r.width * renderScale,
        height: r.height * renderScale
      };

      const textWidth = measuredWidth * renderScale;
      const textHeight = Math.max(fontSize * 1.08 * renderScale, scaledRect.height * 0.78);

      let x = scaledRect.left;

      if (textAlign === "right") {
        x = scaledRect.left + scaledRect.width - textWidth;
      } else if (textAlign === "center") {
        x = scaledRect.left + (scaledRect.width - textWidth) / 2;
      }

      const y = scaledRect.top + Math.max(0, (scaledRect.height - textHeight) / 2);

      return {
        x,
        y,
        w: textWidth,
        h: textHeight,
        fontSize,
        textAlign
      };
    }

    function addPixelNoiseToRect(x, y, w, h, amount = 0.08, mode = "number") {
      const ix = Math.max(0, Math.floor(x));
      const iy = Math.max(0, Math.floor(y));
      const iw = Math.max(1, Math.floor(w));
      const ih = Math.max(1, Math.floor(h));

      const imageData = ctx.getImageData(ix, iy, iw, ih);
      const data = imageData.data;

      for (let py = 0; py < ih; py++) {
        for (let px = 0; px < iw; px++) {
          if (Math.random() > amount) continue;

          const idx = (py * iw + px) * 4;

          let delta;
          if (mode === "number") {
            delta = Math.random() < 0.5
              ? -(18 + Math.random() * 24)
              : (12 + Math.random() * 18);
          } else {
            delta = Math.random() < 0.5
              ? -(12 + Math.random() * 16)
              : (8 + Math.random() * 12);
          }

          data[idx] = Math.max(0, Math.min(255, data[idx] + delta));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + delta));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + delta));
        }
      }

      ctx.putImageData(imageData, ix, iy);
    }

    function addSoftNoiseOverlay(x, y, w, h, count = 18, blurPx = 0.1, alphaBase = 0.08) {
      const overlay = document.createElement("canvas");
      overlay.width = Math.max(1, Math.ceil(w));
      overlay.height = Math.max(1, Math.ceil(h));

      const octx = overlay.getContext("2d");
      octx.save();
      octx.filter = `blur(${blurPx}px) brightness(0.95)`;

      for (let i = 0; i < count; i++) {
        const nx = Math.random() * overlay.width;
        const ny = Math.random() * overlay.height;
        const size = Math.random() < 0.7 ? 1.2 : 1.8;
        const alpha = alphaBase + Math.random() * 0.08;

        octx.fillStyle = `rgba(105,105,105,${alpha})`;
        octx.fillRect(nx, ny, size, size);
      }

      octx.restore();

      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.drawImage(overlay, x, y, w, h);
      ctx.restore();
    }

    const { numberTargets, textTargets } = getNoiseTargets();

    numberTargets.forEach((el) => {
      const text = (el.textContent || "").trim();
      if (!text) return;

      const exact = getExactTextRect(el, text);
      const textLen = text.length;

      const padX = (2 + textLen * 0.55) * renderScale;
      const padY = 1.5 * renderScale;

      const x = exact.x - padX;
      const y = exact.y - padY;
      const w = exact.w + padX * 2;
      const h = exact.h + padY * 2;

      const amount = Math.min(
        0.12,
        0.10 + textLen * 0.010 + exact.fontSize * 0.0010
      );

      addPixelNoiseToRect(x, y, w, h, amount, "number");
      addSoftNoiseOverlay(x, y, w, h, Math.max(14, Math.round(textLen * 2.2)), 0.1, 0.08);
    });

    textTargets.forEach((el) => {
      const text = (el.textContent || "").trim();
      if (!text) return;

      const exact = getExactTextRect(el, text);
      const textLen = text.length;
      const isAccountName = el.classList.contains("account-name");

      const padX = isAccountName
        ? (2.8 + textLen * 0.6) * renderScale
        : (2.2 + textLen * 0.5) * renderScale;

      const padY = isAccountName ? 2.1 * renderScale : 1.8 * renderScale;

      const x = exact.x - padX;
      const y = exact.y - padY;
      const w = exact.w + padX * 2;
      const h = exact.h + padY * 2;

      const amount = isAccountName
        ? Math.min(0.20, 0.08 + textLen * 0.008 + exact.fontSize * 0.0012)
        : Math.min(0.16, 0.06 + textLen * 0.006 + exact.fontSize * 0.0010);

      addPixelNoiseToRect(x, y, w, h, amount, "text");
      addSoftNoiseOverlay(x, y, w, h, Math.max(10, Math.round(textLen * 1.6)), 0.7, 0.07);
    });

    const link = document.createElement("a");
    const now = new Date();

    const fileName =
      `kb-stock-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-` +
      `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}.png`;

    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error(error);
    alert("스샷 저장 중 오류가 났어.");
  } finally {
    document.body.classList.remove("capturing");
  }
}

/* =========================
   예시값
========================= */
function loadDemo() {
  cardInputs.innerHTML = "";

  accountInput.value = "012-345-678 90";
  nameInput.value = "홍길동";
  depositInput.value = "12735";
  realizedInput.value = "0";

  addCardInput({
    name: "세중",
    buy: 1450,
    sell: 1500,
    qty: 5,
    cashType: "현금",
  });

  cardTrackY = UI.cardTrackStartY;
  menuMoveX = UI.menuMoveStartX;

  applyCardTrackY();
  applyMenuMoveX();
  renderAll();
}

/* =========================
   이벤트
========================= */
[nameInput, depositInput, realizedInput].forEach((input) => {
  input.addEventListener("input", renderAll);
});

accountInput.addEventListener("input", () => {
  accountInput.value = formatAccountNumber(accountInput.value);
  renderAll();
});

addCardBtn.addEventListener("click", () => {
  addCardInput({
    name: "새 종목",
    buy: 1000,
    sell: 1000,
    qty: 1,
    cashType: "현금",
  });
});

demoBtn.addEventListener("click", loadDemo);
captureBtn.addEventListener("click", capturePhoneScreenshot);

/* =========================
   체크
========================= */
if (!accountInput || !nameInput || !depositInput || !realizedInput) {
  console.error("상단 입력 요소를 못 찾음");
}

if (!cardTrack) {
  console.error("cardTrack을 못 찾음");
}

if (!menuMoveImage) {
  console.error("menuMoveImage를 못 찾음");
}

if (!cardInputTemplate) {
  console.error("cardInputTemplate를 못 찾음");
}

/* =========================
   시작
========================= */
bindCardTrackDrag();
bindMenuDrag();
loadDemo();
renderAll();