/* ExpenseTracker — vanilla JS + localStorage. No backend, no build step. */
"use strict";

const KEY = "expense-tracker-entries-v1";
const $ = (id) => document.getElementById(id);

let entries = load();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function save() { localStorage.setItem(KEY, JSON.stringify(entries)); }

/* --- Monthly budgets per category --- */
const BUDGET_KEY = "expense-tracker-budgets-v1";
let budgets = loadBudgets();

function loadBudgets() {
  try { return JSON.parse(localStorage.getItem(BUDGET_KEY)) || {}; }
  catch { return {}; }
}
function saveBudgets() { localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets)); }

/* Pure helper (kept DOM-free so it can be unit-tested in node). */
function budgetProgress(spent, limit) {
  if (!(limit > 0)) return { pct: 0, remaining: 0, over: 0, status: "none" };
  const pct = Math.round((spent / limit) * 100);
  if (spent > limit) return { pct, remaining: 0, over: spent - limit, status: "over" };
  if (pct >= 80) return { pct, remaining: limit - spent, over: 0, status: "warn" };
  return { pct, remaining: limit - spent, over: 0, status: "ok" };
}

function setBudget(e) {
  e.preventDefault();
  const category = $("budgetCategory").value;
  const limit = parseFloat($("budgetAmount").value);
  if (!category || !(limit > 0)) return;
  budgets[category] = toPKR(limit, displayCurrency); // store in PKR
  saveBudgets();
  $("budgetForm").reset();
  render();
}

function removeBudget(category) {
  delete budgets[category];
  saveBudgets();
  render();
}

function renderBudgets(monthEntries) {
  const wrap = $("budgets");
  wrap.innerHTML = "";
  const names = Object.keys(budgets).sort();
  $("budgetsEmptyMsg").style.display = names.length ? "none" : "block";
  for (const cat of names) {
    const limit = budgets[cat];
    const spent = monthEntries.filter((x) => x.type === "expense" && x.category === cat)
      .reduce((s, x) => s + entryPKR(x), 0);
    const p = budgetProgress(spent, limit);
    const row = document.createElement("div");
    row.className = "budget-row";
    row.innerHTML =
      `<div class="budget-top"><strong></strong><small></small><button class="del" title="Remove budget">✕</button></div>` +
      `<div class="bar"><div class="bar-fill"></div></div>` +
      `<p class="budget-note"></p>`;
    row.querySelector("strong").textContent = cat;
    row.querySelector("small").textContent = fmt(spent) + " of " + fmt(limit) + " (" + p.pct + "%)";
    const fill = row.querySelector(".bar-fill");
    fill.style.width = Math.min(100, p.pct) + "%";
    if (p.status !== "ok") fill.classList.add(p.status);
    const note = row.querySelector(".budget-note");
    if (p.status === "over") { note.textContent = "Over budget by " + fmt(p.over); note.classList.add("over"); }
    else note.textContent = fmt(p.remaining) + " left this month";
    row.querySelector(".del").addEventListener("click", () => removeBudget(cat));
    wrap.appendChild(row);
  }
}
/* --- end budgets --- */

/* --- Multi-currency: amounts are stored in the currency they were entered
   in; every total converts through PKR (the base currency) at fixed
   reference rates. Older entries without a currency are treated as PKR. --- */
const CURRENCIES = {
  PKR: { symbol: "Rs", rate: 1 },
  USD: { symbol: "$", rate: 278 },
  EUR: { symbol: "€", rate: 300 },
};
const CURRENCY_KEY = "expense-tracker-currency-v1";
let displayCurrency = loadCurrency();

function loadCurrency() {
  try {
    const c = localStorage.getItem(CURRENCY_KEY);
    return CURRENCIES[c] ? c : "PKR";
  } catch { return "PKR"; }
}
function saveCurrency() { localStorage.setItem(CURRENCY_KEY, displayCurrency); }

/* Pure helpers (DOM-free, unit-testable in node). */
function toPKR(amount, currency) {
  return amount * (CURRENCIES[currency] || CURRENCIES.PKR).rate;
}
function fromPKR(pkr, currency) {
  return pkr / (CURRENCIES[currency] || CURRENCIES.PKR).rate;
}
function entryPKR(x) { return toPKR(x.amount, x.currency || "PKR"); }

/* Format a PKR amount in the selected display currency. */
const fmt = (n) => {
  const c = CURRENCIES[displayCurrency];
  return c.symbol + " " + Math.round(fromPKR(n, displayCurrency)).toLocaleString("en-US");
};

function setCurrency(code) {
  if (!CURRENCIES[code]) return;
  displayCurrency = code;
  saveCurrency();
  $("currencySelect").value = code;
  updateCurrencyPlaceholders();
  render();
}

function updateCurrencyPlaceholders() {
  const sym = CURRENCIES[displayCurrency].symbol;
  $("amount").placeholder = "Amount (" + sym + ")";
  $("budgetAmount").placeholder = "Monthly limit (" + sym + ")";
  $("recAmount").placeholder = "Amount (" + sym + ")";
}
/* --- end multi-currency --- */

/* --- Dark/light theme toggle --- */
const THEME_KEY = "expense-tracker-theme-v1";

/* Stored choice wins; otherwise follow the OS preference; dark by default. */
function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") return t;
  } catch { /* private mode etc. — fall through to the default */ }
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)
      return "light";
  } catch { /* matchMedia unavailable — fall through */ }
  return "dark";
}
let theme = loadTheme();

/* Chart colours follow the theme so labels and gridlines stay readable. */
function chartColors() {
  return theme === "light"
    ? { grid: "#d0d7de", muted: "#57606a", text: "#1f2328" }
    : { grid: "#30363d", muted: "#8b949e", text: "#e6edf3" };
}

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  $("themeToggle").textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  $("themeToggle").title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
}

function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  applyTheme();
  render(); // redraw the charts with the new theme colours
}
/* --- end theme toggle --- */

const thisMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

/* --- Recurring entries: auto-added once per month --- */
const RECURRING_KEY = "expense-tracker-recurring-v1";
const REC_APPLIED_KEY = "expense-tracker-recurring-applied-v1";
let recurring = loadRecurring();
let recurringApplied = loadRecurringApplied();

function loadRecurring() {
  try { return JSON.parse(localStorage.getItem(RECURRING_KEY)) || []; }
  catch { return []; }
}
function loadRecurringApplied() {
  try { return JSON.parse(localStorage.getItem(REC_APPLIED_KEY)) || {}; }
  catch { return {}; }
}
function saveRecurring() { localStorage.setItem(RECURRING_KEY, JSON.stringify(recurring)); }
function saveRecurringApplied() { localStorage.setItem(REC_APPLIED_KEY, JSON.stringify(recurringApplied)); }

/* Pure helpers (DOM-free, unit-testable in node). */
function daysInMonth(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function recurringDateForMonth(rec, monthStr) {
  const day = Math.min(Math.max(1, rec.day || 1), daysInMonth(monthStr));
  return monthStr + "-" + String(day).padStart(2, "0");
}
function dueRecurring(list, applied, monthStr) {
  return list.filter((r) => !(applied[r.id] || []).includes(monthStr))
    .map((r, i) => ({ id: Date.now() + i, recurringId: r.id, type: r.type,
      title: r.title, amount: r.amount, currency: r.currency || "PKR",
      category: r.category,
      date: recurringDateForMonth(r, monthStr) }));
}

/* Adds this month's recurring instances once; a deleted instance is not
   resurrected until next month, because the month stays marked applied. */
function applyRecurring() {
  const month = thisMonth();
  const due = dueRecurring(recurring, recurringApplied, month);
  if (!due.length) return 0;
  entries = due.concat(entries);
  for (const x of due) {
    (recurringApplied[x.recurringId] = recurringApplied[x.recurringId] || []).push(month);
  }
  save();
  saveRecurringApplied();
  return due.length;
}

function addRecurring(e) {
  e.preventDefault();
  const rec = {
    id: Date.now(),
    type: $("recType").value,
    title: $("recTitle").value.trim(),
    amount: parseFloat($("recAmount").value),
    currency: $("recCurrency").value,
    category: $("recCategory").value,
    day: parseInt($("recDay").value, 10),
  };
  if (!rec.title || !(rec.amount > 0) || !(rec.day >= 1 && rec.day <= 31)) return;
  recurring.unshift(rec);
  saveRecurring();
  $("recurringForm").reset();
  $("recDay").value = 1;
  render();
}

function removeRecurring(id) {
  recurring = recurring.filter((r) => r.id !== id);
  saveRecurring();
  render();
}

function renderRecurring() {
  const list = $("recurringList");
  list.innerHTML = "";
  $("recurringEmptyMsg").style.display = recurring.length ? "none" : "block";
  const appliedThisMonth = recurring.filter((r) =>
    (recurringApplied[r.id] || []).includes(thisMonth())).length;
  $("recurringStatus").textContent = recurring.length
    ? appliedThisMonth + " of " + recurring.length + " recurring entries added for this month."
    : "";
  for (const r of recurring) {
    const li = document.createElement("li");
    li.innerHTML =
      `<div class="entry-main"><span></span><small></small></div>` +
      `<div><span class="amt ${r.type === "income" ? "in" : "out"}">${r.type === "income" ? "+" : "−"} ${fmt(entryPKR(r))}</span>` +
      `<button class="del" title="Delete recurring entry">✕</button></div>`;
    li.querySelector(".entry-main span").textContent = r.title;
    li.querySelector(".entry-main small").textContent =
      r.category + " · day " + r.day + " of each month";
    li.querySelector(".del").addEventListener("click", () => removeRecurring(r.id));
    list.appendChild(li);
  }
}
/* --- end recurring --- */

function addEntry(e) {
  e.preventDefault();
  const fields = {
    type: $("type").value,
    title: $("title").value.trim(),
    amount: parseFloat($("amount").value),
    currency: $("currency").value,
    category: $("category").value,
    date: $("date").value,
  };
  if (!fields.title || !(fields.amount > 0) || !fields.date) return;
  if (editingId !== null) {
    entries = applyEdit(entries, editingId, fields);
    save();
    cancelEdit();
    render();
    return;
  }
  entries.unshift({ id: Date.now(), ...fields });
  save();
  $("entryForm").reset();
  $("date").value = new Date().toISOString().slice(0, 10);
  render();
}

function removeEntry(id) {
  entries = entries.filter((x) => x.id !== id);
  save();
  render();
}

/* --- Edit an existing entry --- */
let editingId = null;

/* Pure helper (DOM-free, unit-testable in node): merge `fields` into the
   entry with `id`, keeping its position; an unknown id leaves the list alone. */
function applyEdit(list, id, fields) {
  return list.map((x) => (x.id === id ? { ...x, ...fields } : x));
}

function startEdit(id) {
  const x = entries.find((e) => e.id === id);
  if (!x) return;
  editingId = id;
  $("type").value = x.type;
  $("title").value = x.title;
  $("amount").value = x.amount;
  $("currency").value = x.currency || "PKR";
  $("category").value = x.category;
  $("date").value = x.date;
  $("formTitle").textContent = "Edit entry";
  $("submitBtn").textContent = "Save changes";
  $("cancelEditBtn").style.display = "";
  $("title").focus();
}

function cancelEdit() {
  editingId = null;
  $("entryForm").reset();
  $("date").value = new Date().toISOString().slice(0, 10);
  $("formTitle").textContent = "Add entry";
  $("submitBtn").textContent = "Add";
  $("cancelEditBtn").style.display = "none";
}
/* --- end edit --- */

/* --- Search entries by title --- */

/* Pure helper (DOM-free, unit-testable in node): case-insensitive substring
   match on the entry title; a blank query matches everything. */
function searchMatches(title, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return String(title || "").toLowerCase().includes(q);
}

function filtered() {
  const m = $("monthFilter").value;
  const c = $("categoryFilter").value;
  const q = $("searchInput").value;
  return entries.filter((x) =>
    (!m || x.date.startsWith(m)) && (!c || x.category === c)
    && searchMatches(x.title, q));
}
/* --- end search --- */

/* --- CSV export / import --- */
function csvEscape(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCSV(rows) {
  const lines = [["type", "title", "amount", "currency", "category", "date"].join(",")];
  for (const x of rows)
    lines.push([x.type, x.title, x.amount, x.currency || "PKR", x.category, x.date].map(csvEscape).join(","));
  return lines.join("\n") + "\n";
}

/* Minimal RFC 4180-style parser: quoted fields, doubled quotes, CRLF. */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseEntriesCSV(text) {
  const rows = parseCSV(text.trim());
  if (!rows.length) return { imported: [], skipped: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const data = (header.includes("title") && header.includes("amount")) ? rows.slice(1) : rows;
  const imported = [];
  let skipped = 0;
  for (const r of data) {
    // New format: type,title,amount,currency,category,date.
    // Old 5-column files (no currency) still import as PKR.
    const [type, title, amount, maybeCurrency, maybeCategory, maybeDate] = r.map((v) => (v || "").trim());
    const hasCurrency = r.length >= 6;
    const currency = hasCurrency && CURRENCIES[maybeCurrency] ? maybeCurrency : "PKR";
    const category = hasCurrency ? maybeCategory : maybeCurrency;
    const date = hasCurrency ? maybeDate : maybeCategory;
    const amt = parseFloat(amount);
    if ((type !== "income" && type !== "expense") || !title || !(amt > 0)
        || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped++; continue; }
    imported.push({ id: Date.now() + imported.length, type, title, amount: amt,
                    currency, category: category || "Other", date });
  }
  return { imported, skipped };
}

function exportCSV() {
  const rows = filtered();
  if (!rows.length) { $("csvStatus").textContent = "Nothing to export — no entries match the current filters."; return; }
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "expense-tracker-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
  $("csvStatus").textContent = "Exported " + rows.length + " entries to CSV.";
}

function importCSVFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const { imported, skipped } = parseEntriesCSV(reader.result);
    if (imported.length) { entries = imported.concat(entries); save(); render(); }
    $("csvStatus").textContent = "Imported " + imported.length + " entries"
      + (skipped ? " (" + skipped + " invalid rows skipped)" : "") + ".";
  };
  reader.readAsText(file);
}
/* --- end CSV --- */

/* --- Yearly summary: monthly income/expense totals + trend line chart --- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Pure helper (DOM-free, unit-testable in node): per-month income and
   expense totals (in PKR) for one year; months with no entries stay 0. */
function monthlyTotals(list, year) {
  const months = MONTHS.map(() => ({ income: 0, expenses: 0 }));
  for (const x of list) {
    if (!x.date || !x.date.startsWith(String(year) + "-")) continue;
    const m = parseInt(x.date.slice(5, 7), 10) - 1;
    if (m < 0 || m > 11) continue;
    if (x.type === "income") months[m].income += entryPKR(x);
    else if (x.type === "expense") months[m].expenses += entryPKR(x);
  }
  return months;
}

function selectedYear() {
  const y = parseInt($("yearFilter").value, 10);
  return Number.isFinite(y) ? Math.min(2100, Math.max(2000, y)) : new Date().getFullYear();
}

function drawYearChart() {
  const year = selectedYear();
  $("yearFilter").value = year;
  const months = monthlyTotals(entries, year);
  const yearIncome = months.reduce((s, m) => s + m.income, 0);
  const yearExpenses = months.reduce((s, m) => s + m.expenses, 0);
  $("yearIncome").textContent = fmt(yearIncome);
  $("yearExpenses").textContent = fmt(yearExpenses);
  $("yearNet").textContent = fmt(yearIncome - yearExpenses);

  const nets = months.map((m) => m.income - m.expenses);
  const best = nets.indexOf(Math.max(...nets));
  const worst = nets.indexOf(Math.min(...nets));
  $("yearNote").textContent = (yearIncome || yearExpenses)
    ? "Best month: " + MONTHS[best] + " (" + fmt(nets[best]) + ") · " +
      "Worst month: " + MONTHS[worst] + " (" + fmt(nets[worst]) + ")."
    : "No entries in " + year + " yet.";

  const canvas = $("yearChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const maxVal = Math.max(1, ...months.flatMap((m) => [m.income, m.expenses]));
  const padL = 74, padR = 20, padT = 24, padB = 30;
  const plotW = canvas.width - padL - padR;
  const plotH = canvas.height - padT - padB;
  const xAt = (i) => padL + (plotW * i) / 11;
  const yAt = (v) => padT + plotH - (plotH * v) / maxVal;

  // Gridlines + y-axis labels (4 steps).
  const cc = chartColors();
  ctx.strokeStyle = cc.grid; ctx.fillStyle = cc.muted;
  ctx.font = "12px sans-serif"; ctx.textAlign = "right";
  for (let g = 0; g <= 4; g++) {
    const v = (maxVal * g) / 4;
    const y = yAt(v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(canvas.width - padR, y); ctx.stroke();
    ctx.fillText(fmt(v), padL - 8, y + 4);
  }
  // X-axis month labels.
  ctx.textAlign = "center";
  months.forEach((_, i) => ctx.fillText(MONTHS[i], xAt(i), canvas.height - 10));
  // Legend.
  ctx.textAlign = "left";
  ctx.fillStyle = "#3fb950"; ctx.fillText("— Income", padL, 14);
  ctx.fillStyle = "#f85149"; ctx.fillText("— Expenses", padL + 90, 14);

  const drawLine = (color, pick) => {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    months.forEach((m, i) => {
      const x = xAt(i), y = yAt(pick(m));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    months.forEach((m, i) => {
      ctx.beginPath(); ctx.arc(xAt(i), yAt(pick(m)), 3.5, 0, Math.PI * 2); ctx.fill();
    });
  };
  drawLine("#3fb950", (m) => m.income);
  drawLine("#f85149", (m) => m.expenses);
  ctx.lineWidth = 1;
}
/* --- end yearly summary --- */

function render() {
  const month = thisMonth();
  const monthEntries = entries.filter((x) => x.date.startsWith(month));
  const income = monthEntries.filter((x) => x.type === "income").reduce((s, x) => s + entryPKR(x), 0);
  const expenses = monthEntries.filter((x) => x.type === "expense").reduce((s, x) => s + entryPKR(x), 0);
  const allIncome = entries.filter((x) => x.type === "income").reduce((s, x) => s + entryPKR(x), 0);
  const allExpenses = entries.filter((x) => x.type === "expense").reduce((s, x) => s + entryPKR(x), 0);

  $("balance").textContent = fmt(allIncome - allExpenses);
  $("income").textContent = fmt(income);
  $("expenses").textContent = fmt(expenses);

  const list = $("entries");
  list.innerHTML = "";
  const rows = filtered();
  $("emptyMsg").style.display = rows.length ? "none" : "block";
  const q = $("searchInput").value.trim();
  $("emptyMsg").textContent = (q && !rows.length)
    ? "No entries match “" + q + "” — try a different title."
    : "No entries yet — add your first one above.";
  for (const x of rows) {
    const li = document.createElement("li");
    li.innerHTML =
      `<div class="entry-main"><span></span><small>${x.date} · ${x.category}</small></div>` +
      `<div><span class="amt ${x.type === "income" ? "in" : "out"}">${x.type === "income" ? "+" : "−"} ${fmt(entryPKR(x))}</span>` +
      `<button class="edit" title="Edit">✎</button><button class="del" title="Delete">✕</button></div>`;
    li.querySelector(".entry-main span").textContent = x.title;
    li.querySelector(".edit").addEventListener("click", () => startEdit(x.id));
    li.querySelector(".del").addEventListener("click", () => removeEntry(x.id));
    list.appendChild(li);
  }
  drawChart(monthEntries);
  drawYearChart();
  renderBudgets(monthEntries);
  renderRecurring();
}

function drawChart(monthEntries) {
  const canvas = $("chart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const byCat = {};
  for (const x of monthEntries)
    if (x.type === "expense") byCat[x.category] = (byCat[x.category] || 0) + entryPKR(x);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (!cats.length) {
    ctx.fillStyle = chartColors().muted; ctx.font = "15px sans-serif";
    ctx.fillText("No expenses this month yet.", 12, 30);
    return;
  }
  const max = Math.max(...cats.map((c) => c[1]));
  const barW = Math.min(90, (canvas.width - 40) / cats.length - 24);
  cats.forEach(([cat, val], i) => {
    const h = (val / max) * 170;
    const x = 30 + i * (barW + 24);
    ctx.fillStyle = "#58a6ff";
    ctx.fillRect(x, 200 - h, barW, h);
    ctx.fillStyle = chartColors().text; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(cat, x + barW / 2, 220);
    ctx.fillText(fmt(val), x + barW / 2, 200 - h - 8);
    ctx.textAlign = "left";
  });
}

$("entryForm").addEventListener("submit", addEntry);
$("cancelEditBtn").addEventListener("click", cancelEdit);
$("budgetForm").addEventListener("submit", setBudget);
$("recurringForm").addEventListener("submit", addRecurring);
$("exportBtn").addEventListener("click", exportCSV);
$("importFile").addEventListener("change", (e) => { importCSVFile(e.target.files[0]); e.target.value = ""; });
$("monthFilter").addEventListener("change", render);
$("categoryFilter").addEventListener("change", render);
$("searchInput").addEventListener("input", render);
$("yearFilter").addEventListener("change", render);
$("currencySelect").addEventListener("change", (e) => setCurrency(e.target.value));
$("themeToggle").addEventListener("click", toggleTheme);
$("date").value = new Date().toISOString().slice(0, 10);
$("monthFilter").value = thisMonth();
$("yearFilter").value = new Date().getFullYear();
$("currencySelect").value = displayCurrency;
updateCurrencyPlaceholders();
applyTheme();
applyRecurring();
render();
