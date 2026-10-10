const STORAGE_KEY = "daily-cost-items-v2";
const SORT_KEY = "daily-cost-sort-v2";

const seedItems = [
  { id: "sample-macbook", name: "MacBook Air", price: 8999, purchaseDate: "2024-06-18" },
  { id: "sample-chair", name: "人体工学椅", price: 2699, purchaseDate: "2025-01-12" },
  { id: "sample-headphones", name: "降噪耳机", price: 2299, purchaseDate: "2025-11-03" },
];

const elements = {
  today: document.querySelector("#today"),
  form: document.querySelector("#item-form"),
  formRegion: document.querySelector("#form-region"),
  toggleForm: document.querySelector("#toggle-form"),
  toggleLabel: document.querySelector("#toggle-form span"),
  name: document.querySelector("#name"),
  price: document.querySelector("#price"),
  purchaseDate: document.querySelector("#purchase-date"),
  nameError: document.querySelector("#name-error"),
  priceError: document.querySelector("#price-error"),
  dateError: document.querySelector("#date-error"),
  saveButton: document.querySelector("#save-button"),
  cancelEdit: document.querySelector("#cancel-edit"),
  list: document.querySelector("#items-list"),
  ledger: document.querySelector("#ledger"),
  emptyState: document.querySelector("#empty-state"),
  emptyAdd: document.querySelector("#empty-add"),
  count: document.querySelector("#item-count"),
  totalAssets: document.querySelector("#total-assets"),
  totalDailyCost: document.querySelector("#total-daily-cost"),
  sortOrder: document.querySelector("#sort-order"),
  toast: document.querySelector("#toast"),
  undoDelete: document.querySelector("#undo-delete"),
  toastLabel: document.querySelector("#toast span"),
  formTitle: document.querySelector("#form-title"),
  closeForm: document.querySelector("#close-form"),
  search: document.querySelector("#search-items"),
  searchEmpty: document.querySelector("#search-empty"),
  calendar: document.querySelector("#calendar"),
  calendarButton: document.querySelector("#open-calendar"),
  calendarYear: document.querySelector("#calendar-year"),
  calendarMonth: document.querySelector("#calendar-month"),
  calendarDays: document.querySelector("#calendar-days"),
  importFile: document.querySelector("#import-file"),
};

let items = loadItems();
let deletedItem = null;
let toastTimer = null;
let sortOrder = loadSortOrder();
let editingId = null;
let calendarDate = new Date();

function loadSortOrder() {
  try { return localStorage.getItem(SORT_KEY) === "daily-desc" ? "daily-desc" : "price-desc"; }
  catch { return "price-desc"; }
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return new URLSearchParams(window.location.search).has("demo") ? seedItems : [];
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isValidItem) : [];
  } catch {
    return [];
  }
}

function persistItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    notify("保存失败，请导出备份，避免丢失数据");
    return false;
  }
  return true;
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return year >= 1900 && year <= new Date().getFullYear()
    && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    && value <= localDateString();
}

function isValidItem(item) {
  return item && typeof item.id === "string" && item.id.length > 0 && item.id.length < 200
    && typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 40
    && typeof item.price === "number" && Number.isFinite(item.price) && item.price > 0
    && item.price <= 999999999 && isValidDate(item.purchaseDate);
}

function calendarDayNumber(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysOwned(purchaseDate) {
  const elapsed = calendarDayNumber(localDateString()) - calendarDayNumber(purchaseDate);
  return Math.max(1, Math.floor(elapsed / 86_400_000) + 1);
}

function formatCurrency(value, digits = 0) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(dateString) {
  return dateString.replaceAll("-", ".");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function render() {
  const sortValue = (item) => sortOrder === "daily-desc"
    ? item.price / daysOwned(item.purchaseDate)
    : item.price;
  const query = elements.search.value.trim().toLocaleLowerCase();
  const sortedItems = items.filter(item => item.name.toLocaleLowerCase().includes(query))
    .sort((a, b) => sortValue(b) - sortValue(a));
  const cards = sortedItems.map((item) => {
    const days = daysOwned(item.purchaseDate);
    const daily = item.price / days;
    return `
      <article class="item-row" data-id="${escapeHtml(item.id)}">
        <button type="button" class="item-name" data-edit="${escapeHtml(item.id)}" title="${escapeHtml(item.name)}" aria-label="编辑 ${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>
        <span class="item-price">${formatCurrency(item.price, item.price % 1 ? 2 : 0)}</span>
        <button class="item-date edit-date" type="button" aria-label="修改 ${escapeHtml(item.name)} 的购买日期" data-edit-date="${escapeHtml(item.id)}">${formatDate(item.purchaseDate)}</button>
        <span class="item-days">已拥有 ${days.toLocaleString("zh-CN")} 天</span>
        <span class="daily-cost"><strong class="${daily >= 1000000 ? "is-very-long" : daily >= 1000 ? "is-long" : ""}">${formatCurrency(daily, 2)}</strong><small>/ 天</small></span>
        <div class="item-actions">
          <button class="edit-button" type="button" aria-label="编辑 ${escapeHtml(item.name)}" data-edit="${escapeHtml(item.id)}">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m4 20 4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20ZM13.8 7.4l3 3" />
            </svg>
          </button>
          <button class="delete-button" type="button" aria-label="删除 ${escapeHtml(item.name)}" data-delete="${escapeHtml(item.id)}">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
            </svg>
          </button>
        </div>
      </article>`;
  }).join("");
  elements.list.innerHTML = `${cards}
    <button class="item-row add-card" type="button" data-add-card>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
      <span>添加新物品</span>
    </button>`;

  const isEmpty = items.length === 0;
  elements.ledger.hidden = isEmpty;
  elements.emptyState.hidden = !isEmpty;
  elements.searchEmpty.hidden = !query || sortedItems.length > 0 || isEmpty;
  elements.count.textContent = query ? `${sortedItems.length} / ${items.length} 件` : `${items.length} 件`;
  const totalAssets = items.reduce((sum, item) => sum + item.price, 0);
  const totalDaily = items.reduce((sum, item) => sum + item.price / daysOwned(item.purchaseDate), 0);
  elements.totalAssets.textContent = formatCurrency(totalAssets, totalAssets % 1 ? 2 : 0);
  elements.totalDailyCost.textContent = formatCurrency(totalDaily, 2);
}

function setFormOpen(isOpen, focus = false) {
  if (isOpen && !elements.formRegion.open) elements.formRegion.showModal();
  if (!isOpen && elements.formRegion.open) elements.formRegion.close();
  if (isOpen && focus) elements.name.focus();
}

function clearErrors() {
  [elements.name, elements.price, elements.purchaseDate].forEach((input) => {
    input.removeAttribute("aria-invalid");
  });
  elements.nameError.textContent = "";
  elements.priceError.textContent = "";
  elements.dateError.textContent = "";
}

function exitEditMode() {
  editingId = null;
  elements.form.reset();
  elements.purchaseDate.value = localDateString();
  elements.saveButton.textContent = "保存";
  elements.formTitle.textContent = "添加物品";
  closeCalendar();
  clearErrors();
}

function startEditing(item, focusField = "name", openDatePicker = false) {
  editingId = item.id;
  setFormOpen(true);
  clearErrors();
  elements.name.value = item.name;
  elements.price.value = item.price;
  elements.purchaseDate.value = item.purchaseDate;
  elements.saveButton.textContent = "更新";
  elements.formTitle.textContent = "编辑物品";
  if (focusField === "date") {
    if (openDatePicker) openPurchaseDatePicker();
    else elements.purchaseDate.focus();
    return;
  }
  elements.name.focus();
  elements.name.select();
}

function openPurchaseDatePicker() {
  const value = elements.purchaseDate.value || localDateString();
  const [year, month] = value.split("-").map(Number);
  calendarDate = new Date(year, month - 1, 1);
  elements.calendar.hidden = false;
  elements.calendarButton.setAttribute("aria-expanded", "true");
  renderCalendar();
  elements.calendarYear.focus();
}

function closeCalendar() {
  elements.calendar.hidden = true;
  elements.calendarButton.setAttribute("aria-expanded", "false");
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const currentYear = new Date().getFullYear();
  elements.calendarYear.innerHTML = Array.from({ length: currentYear - 1899 }, (_, i) => {
    const y = currentYear - i;
    return `<option value="${y}"${y === year ? " selected" : ""}>${y} 年</option>`;
  }).join("");
  elements.calendarMonth.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i}"${i === month ? " selected" : ""}>${i + 1} 月</option>`).join("");
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  elements.calendarDays.innerHTML = "<span></span>".repeat(offset) + Array.from({ length: days }, (_, i) => {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return `<button type="button" data-calendar-date="${date}" aria-label="${year}年${month + 1}月${i + 1}日" aria-pressed="${date === elements.purchaseDate.value}" class="${date === localDateString() ? "is-today" : ""}"${date > localDateString() ? " disabled" : ""}>${i + 1}</button>`;
  }).join("");
  document.querySelector("#previous-month").disabled = year === 1900 && month === 0;
  document.querySelector("#next-month").disabled = year === currentYear && month >= new Date().getMonth();
}

function selectCalendarDate(value) {
  elements.purchaseDate.value = value;
  clearErrors();
  closeCalendar();
  elements.calendarButton.focus();
}

function validate() {
  clearErrors();
  const name = elements.name.value.trim();
  const price = Number(elements.price.value);
  const purchaseDate = elements.purchaseDate.value;
  let firstInvalid = null;

  if (!name) {
    elements.name.setAttribute("aria-invalid", "true");
    elements.nameError.textContent = "请输入物品名称";
    firstInvalid ??= elements.name;
  }
  if (!Number.isFinite(price) || price <= 0 || price > 999999999) {
    elements.price.setAttribute("aria-invalid", "true");
    elements.priceError.textContent = "请输入有效的价格";
    firstInvalid ??= elements.price;
  }
  if (!purchaseDate) {
    elements.purchaseDate.setAttribute("aria-invalid", "true");
    elements.dateError.textContent = "请选择购买日期";
    firstInvalid ??= elements.purchaseDate;
  } else if (purchaseDate > localDateString()) {
    elements.purchaseDate.setAttribute("aria-invalid", "true");
    elements.dateError.textContent = "购买日期不能晚于今天";
    firstInvalid ??= elements.purchaseDate;
  } else if (!isValidDate(purchaseDate)) {
    elements.purchaseDate.setAttribute("aria-invalid", "true");
    elements.dateError.textContent = "请输入 1900 年起的有效购买日期";
    firstInvalid ??= elements.purchaseDate;
  }

  firstInvalid?.focus();
  return firstInvalid ? null : { name, price, purchaseDate };
}

function showDeleteToast() {
  notify("已删除物品", true);
}

function notify(message, undo = false) {
  window.clearTimeout(toastTimer);
  elements.toastLabel.textContent = message;
  elements.undoDelete.hidden = !undo;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
    deletedItem = null;
  }, 6000);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = validate();
  if (!values) return;
  const previousItems = items;
  items = items.map(item => ({ ...item }));

  if (editingId) {
    const itemIndex = items.findIndex((item) => item.id === editingId);
    if (itemIndex >= 0) {
      items[itemIndex] = { ...items[itemIndex], ...values };
    }
  } else {
    items.push({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      ...values,
    });
  }
  if (!persistItems()) { items = previousItems; return; }
  render();
  exitEditMode();
  setFormOpen(false);
  notify("已保存物品");
});

elements.toggleForm.addEventListener("click", () => {
  exitEditMode();
  setFormOpen(true, true);
});

elements.emptyAdd.addEventListener("click", () => {
  exitEditMode();
  setFormOpen(true, true);
});

elements.cancelEdit.addEventListener("click", () => {
  setFormOpen(false);
});

elements.closeForm.addEventListener("click", () => setFormOpen(false));
elements.formRegion.addEventListener("close", exitEditMode);
elements.formRegion.addEventListener("click", event => {
  if (event.target !== elements.formRegion) return;
  const rect = elements.formRegion.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setFormOpen(false);
});
elements.formRegion.addEventListener("cancel", event => {
  if (!elements.calendar.hidden) { event.preventDefault(); closeCalendar(); elements.calendarButton.focus(); }
});
elements.search.addEventListener("input", render);

elements.sortOrder.addEventListener("change", () => {
  sortOrder = elements.sortOrder.value;
  try { localStorage.setItem(SORT_KEY, sortOrder); } catch { notify("排序已切换，但无法保存偏好"); }
  render();
});

elements.list.addEventListener("click", (event) => {
  if (event.target.closest("[data-add-card]")) {
    exitEditMode();
    setFormOpen(true, true);
    return;
  }
  const dateButton = event.target.closest("[data-edit-date]");
  if (dateButton) {
    const item = items.find((candidate) => candidate.id === dateButton.dataset.editDate);
    if (item) startEditing(item, "date", true);
    return;
  }
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    const item = items.find((candidate) => candidate.id === editButton.dataset.edit);
    if (item) startEditing(item);
    return;
  }
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const index = items.findIndex((item) => item.id === button.dataset.delete);
  if (index < 0) return;
  const previousItems = items;
  const previousDeletedItem = deletedItem;
  deletedItem = { item: items[index], index };
  if (editingId === items[index].id) exitEditMode();
  items = items.filter((_, itemIndex) => itemIndex !== index);
  if (!persistItems()) { items = previousItems; deletedItem = previousDeletedItem; return; }
  render();
  showDeleteToast();
});

elements.undoDelete.addEventListener("click", () => {
  if (!deletedItem) return;
  const previousItems = items;
  items = [...items];
  items.splice(deletedItem.index, 0, deletedItem.item);
  if (!persistItems()) { items = previousItems; return; }
  deletedItem = null;
  render();
  elements.toast.classList.remove("is-visible");
  window.clearTimeout(toastTimer);
});

[elements.name, elements.price, elements.purchaseDate].forEach((input) => {
  input.addEventListener("input", clearErrors);
});

elements.calendarButton.addEventListener("click", () => elements.calendar.hidden ? openPurchaseDatePicker() : closeCalendar());
elements.calendarYear.addEventListener("change", () => { calendarDate.setFullYear(Number(elements.calendarYear.value)); renderCalendar(); });
elements.calendarMonth.addEventListener("change", () => { calendarDate.setMonth(Number(elements.calendarMonth.value)); renderCalendar(); });
document.querySelector("#previous-month").addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
document.querySelector("#next-month").addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
elements.calendarDays.addEventListener("click", event => {
  const button = event.target.closest("[data-calendar-date]");
  if (button && !button.disabled) selectCalendarDate(button.dataset.calendarDate);
});
document.querySelector("#calendar-today").addEventListener("click", () => selectCalendarDate(localDateString()));

document.querySelector("#export-items").addEventListener("click", () => {
  const backup = { app: "wuwu", version: 1, exportedAt: new Date().toISOString(), items };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `无物-备份-${localDateString()}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("备份已导出，请妥善保存");
});
document.querySelector("#import-items").addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", async () => {
  const file = elements.importFile.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("备份文件过大");
    const backup = JSON.parse(await file.text());
    const incoming = Array.isArray(backup) ? backup : backup.items;
    if (!Array.isArray(incoming) || incoming.length > 10000 || !incoming.every(isValidItem)) throw new Error("备份格式或物品数据不正确");
    const ids = new Set(items.map(item => item.id));
    const additions = [];
    for (const item of incoming) {
      if (ids.has(item.id)) continue;
      additions.push({ id: item.id, name: item.name.trim(), price: item.price, purchaseDate: item.purchaseDate });
      ids.add(item.id);
    }
    const previousItems = items;
    items = [...items, ...additions];
    if (!persistItems()) { items = previousItems; return; }
    elements.search.value = "";
    render();
    notify(`已导入 ${additions.length} 件物品，保留已有物品`);
  } catch (error) {
    notify(error instanceof SyntaxError ? "无法读取备份，请选择有效的 JSON 文件" : error.message);
  } finally { elements.importFile.value = ""; }
});

const now = new Date();
elements.today.dateTime = localDateString(now);
elements.today.textContent = `今天 · ${new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
}).format(now)}`;
elements.purchaseDate.max = localDateString(now);
elements.purchaseDate.min = "1900-01-01";
elements.purchaseDate.value = localDateString(now);
elements.sortOrder.value = sortOrder;

render();

// Recalculate when returning to the page, including after midnight.
function refreshToday() {
  const today = localDateString();
  elements.today.dateTime = today;
  elements.today.textContent = `今天 · ${new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date())}`;
  elements.purchaseDate.max = today;
  render();
}
window.addEventListener("focus", refreshToday);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshToday(); });
window.setInterval(refreshToday, 60000);
