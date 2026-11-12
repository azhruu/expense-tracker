# ExpenseTracker

**Personal income & expense tracking that runs entirely in your browser.** No account, no server, no tracking — your data lives in `localStorage` on your own device.

![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-actively%20building-brightgreen?style=for-the-badge)

## Features

- ➕ Add income & expenses with category, date and amount
- ✏️ Edit any entry in place — click ✎, change it in the same form, save to update it (cancel leaves it untouched)
- 📊 Live balance, this-month income and this-month expenses cards
- 🔎 Filter history by month and category, and search entries by title (live, case-insensitive)
- 💱 Multi-currency support (PKR / USD / EUR) — enter amounts in any of the three currencies, switch the display currency, and all totals, budgets and the chart convert at fixed reference rates; CSV export/import carries the currency column
- 📥 Export the filtered history to CSV and import entries back from a CSV file
- 📈 Spending-by-category bar chart (canvas, zero libraries)
- 📅 Yearly summary view — pick a year, see yearly income/expense/net totals and a monthly income-vs-expenses trend line chart (canvas, zero libraries), with best and worst months called out
- 💰 Monthly budgets per category with progress bars (over-budget and near-limit warnings)
- 🔁 Recurring entries (salary, bills) auto-added once each month on a chosen day
- 📊 Try sample data — one click loads a realistic month of demo entries (salary, groceries, bills…) so first-time users can see the cards, charts and yearly view at work; “Remove sample data” clears just those entries, never your own
- 🖨 Print-friendly monthly report — one click builds a clean printable summary of the selected month (totals, spending by category, budget status and the full entry list); the app itself stays hidden on paper
- 💾 Automatic persistence in `localStorage` — refresh-proof
- 🌑 Dark/light theme toggle — header button switches the whole UI (including chart colours), saved in `localStorage`, and follows your OS preference on first visit
- 🌑 Clean dark UI, mobile-friendly

## Run it

Open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Roadmap

CSV export/import → monthly budgets with progress bars → recurring entries → edit entries → multi-currency → yearly summary view → search entries → dark/light theme toggle → sample data → print-friendly monthly report. Full plan: [ROADMAP.md](ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).
