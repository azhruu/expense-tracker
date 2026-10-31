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

/* --- CSV export / import --- */
function csvEscape(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCSV(rows) {
  const lines = [["type", "title", "amount", "category", "date"].join(",")];
  for (const x of rows)
    lines.push([x.type, x.title, x.amount, x.category, x.date].map(csvEscape).join(","));
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
    const [type, title, amount, category, date] = r.map((v) => (v || "").trim());
    const amt = parseFloat(amount);
    if ((type !== "income" && type !== "expense") || !title || !(amt > 0)
        || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped++; continue; }
    imported.push({ id: Date.now() + imported.length, type, title, amount: amt,
                    category: category || "Other", date });
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
$("exportBtn").addEventListener("click", exportCSV);
$("importFile").addEventListener("change", (e) => { importCSVFile(e.target.files[0]); e.target.value = ""; });
$("monthFilter").addEventListener("change", render);
$("categoryFilter").addEventListener("change", render);
$("date").value = new Date().toISOString().slice(0, 10);
$("monthFilter").value = thisMonth();
render();
