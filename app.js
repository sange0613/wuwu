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
};

let items = loadItems();
let deletedItem = null;
let toastTimer = null;
let sortOrder = localStorage.getItem(SORT_KEY) === "daily-desc" ? "daily-desc" : "price-desc";
let editingId = null;

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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
  return div.innerHTML;
}

function render() {
  const sortValue = (item) => sortOrder === "daily-desc"
    ? item.price / daysOwned(item.purchaseDate)
    : item.price;
  const sortedItems = [...items].sort((a, b) => sortValue(b) - sortValue(a));
  const cards = sortedItems.map((item) => {
    const days = daysOwned(item.purchaseDate);
    const daily = item.price / days;
    return `
      <article class="item-row" data-id="${item.id}">
        <span class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="item-price">${formatCurrency(item.price, item.price % 1 ? 2 : 0)}</span>
        <button class="item-date edit-date" type="button" aria-label="修改 ${escapeHtml(item.name)} 的购买日期" data-edit-date="${item.id}">${formatDate(item.purchaseDate)}</button>
        <span class="item-days">已拥有 ${days.toLocaleString("zh-CN")} 天</span>
        <span class="daily-cost"><strong>${formatCurrency(daily, 2)}</strong><small>每天</small></span>
        <div class="item-actions">
          <button class="edit-button" type="button" aria-label="编辑 ${escapeHtml(item.name)}" data-edit="${item.id}">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m4 20 4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20ZM13.8 7.4l3 3" />
            </svg>
          </button>
          <button class="delete-button" type="button" aria-label="删除 ${escapeHtml(item.name)}" data-delete="${item.id}">
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
  elements.count.textContent = isEmpty ? "" : `${items.length} 件`;
  const totalAssets = items.reduce((sum, item) => sum + item.price, 0);
  const totalDaily = items.reduce((sum, item) => sum + item.price / daysOwned(item.purchaseDate), 0);
  elements.totalAssets.textContent = formatCurrency(totalAssets, totalAssets % 1 ? 2 : 0);
  elements.totalDailyCost.textContent = formatCurrency(totalDaily, 2);
}

function setFormOpen(isOpen, focus = false) {
  elements.formRegion.classList.toggle("is-open", isOpen);
  elements.toggleForm.setAttribute("aria-expanded", String(isOpen));
  elements.toggleLabel.textContent = "添加物品";
  if (isOpen && focus) {
    window.setTimeout(() => elements.name.focus(), 220);
  }
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
  elements.cancelEdit.hidden = true;
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
  elements.cancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: focusField === "date" ? "auto" : "smooth" });
  if (focusField === "date") {
    if (openDatePicker) openPurchaseDatePicker();
    else elements.purchaseDate.focus();
    return;
  }
  window.setTimeout(() => {
    elements.name.focus();
    elements.name.select();
  }, 260);
}

function openPurchaseDatePicker() {
  elements.purchaseDate.focus();
  if (typeof elements.purchaseDate.showPicker !== "function") return;
  try {
    elements.purchaseDate.showPicker();
  } catch {
    // The native calendar icon remains available when a browser blocks showPicker().
  }
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
  if (!Number.isFinite(price) || price <= 0) {
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
  }

  firstInvalid?.focus();
  return firstInvalid ? null : { name, price, purchaseDate };
}

function showDeleteToast() {
  window.clearTimeout(toastTimer);
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
    deletedItem = null;
  }, 4500);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = validate();
  if (!values) return;

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
  persistItems();
  render();
  exitEditMode();
  elements.name.focus();
});

elements.toggleForm.addEventListener("click", () => {
  const isOpen = elements.toggleForm.getAttribute("aria-expanded") === "true";
  setFormOpen(!isOpen, !isOpen);
});

elements.emptyAdd.addEventListener("click", () => {
  exitEditMode();
  setFormOpen(true, true);
});

elements.cancelEdit.addEventListener("click", () => {
  exitEditMode();
  elements.name.focus();
});

elements.sortOrder.addEventListener("change", () => {
  sortOrder = elements.sortOrder.value;
  localStorage.setItem(SORT_KEY, sortOrder);
  render();
});

elements.list.addEventListener("click", (event) => {
  if (event.target.closest("[data-add-card]")) {
    exitEditMode();
    setFormOpen(true, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  deletedItem = { item: items[index], index };
  if (editingId === items[index].id) exitEditMode();
  items.splice(index, 1);
  persistItems();
  render();
  showDeleteToast();
});

elements.undoDelete.addEventListener("click", () => {
  if (!deletedItem) return;
  items.splice(deletedItem.index, 0, deletedItem.item);
  deletedItem = null;
  persistItems();
  render();
  elements.toast.classList.remove("is-visible");
  window.clearTimeout(toastTimer);
});

[elements.name, elements.price, elements.purchaseDate].forEach((input) => {
  input.addEventListener("input", clearErrors);
});

elements.purchaseDate.addEventListener("click", openPurchaseDatePicker);

const now = new Date();
elements.today.dateTime = localDateString(now);
elements.today.textContent = `今天 · ${new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
}).format(now)}`;
elements.purchaseDate.max = localDateString(now);
elements.purchaseDate.value = localDateString(now);
elements.sortOrder.value = sortOrder;

render();
