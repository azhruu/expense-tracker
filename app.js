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

const fmt = (n) => "Rs " + Math.round(n).toLocaleString("en-PK");
const thisMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

function addEntry(e) {
  e.preventDefault();
  const entry = {
    id: Date.now(),
    type: $("type").value,
    title: $("title").value.trim(),
    amount: parseFloat($("amount").value),
    category: $("category").value,
    date: $("date").value,
  };
  if (!entry.title || !(entry.amount > 0) || !entry.date) return;
  entries.unshift(entry);
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

function filtered() {
  const m = $("monthFilter").value;
  const c = $("categoryFilter").value;
  return entries.filter((x) =>
    (!m || x.date.startsWith(m)) && (!c || x.category === c));
}

function render() {
  const month = thisMonth();
  const monthEntries = entries.filter((x) => x.date.startsWith(month));
  const income = monthEntries.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const expenses = monthEntries.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);
  const allIncome = entries.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const allExpenses = entries.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0);

  $("balance").textContent = fmt(allIncome - allExpenses);
  $("income").textContent = fmt(income);
  $("expenses").textContent = fmt(expenses);

  const list = $("entries");
  list.innerHTML = "";
  const rows = filtered();
  $("emptyMsg").style.display = rows.length ? "none" : "block";
  for (const x of rows) {
    const li = document.createElement("li");
    li.innerHTML =
      `<div class="entry-main"><span></span><small>${x.date} · ${x.category}</small></div>` +
      `<div><span class="amt ${x.type === "income" ? "in" : "out"}">${x.type === "income" ? "+" : "−"} ${fmt(x.amount)}</span>` +
      `<button class="del" title="Delete">✕</button></div>`;
    li.querySelector(".entry-main span").textContent = x.title;
    li.querySelector(".del").addEventListener("click", () => removeEntry(x.id));
    list.appendChild(li);
  }
  drawChart(monthEntries);
}

function drawChart(monthEntries) {
  const canvas = $("chart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const byCat = {};
  for (const x of monthEntries)
    if (x.type === "expense") byCat[x.category] = (byCat[x.category] || 0) + x.amount;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (!cats.length) {
    ctx.fillStyle = "#8b949e"; ctx.font = "15px sans-serif";
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
    ctx.fillStyle = "#e6edf3"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(cat, x + barW / 2, 220);
    ctx.fillText(fmt(val), x + barW / 2, 200 - h - 8);
    ctx.textAlign = "left";
  });
}

$("entryForm").addEventListener("submit", addEntry);
$("monthFilter").addEventListener("change", render);
$("categoryFilter").addEventListener("change", render);
$("date").value = new Date().toISOString().slice(0, 10);
$("monthFilter").value = thisMonth();
render();
