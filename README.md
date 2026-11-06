# ExpenseTracker

**Personal income & expense tracking that runs entirely in your browser.** No account, no server, no tracking — your data lives in `localStorage` on your own device.

![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-actively%20building-brightgreen?style=for-the-badge)

## Features

- ➕ Add income & expenses with category, date and amount
- ✏️ Edit any entry in place — click ✎, change it in the same form, save to update it (cancel leaves it untouched)
- 📊 Live balance, this-month income and this-month expenses cards
- 🔎 Filter history by month and category
- 📥 Export the filtered history to CSV and import entries back from a CSV file
- 📈 Spending-by-category bar chart (canvas, zero libraries)
- 💰 Monthly budgets per category with progress bars (over-budget and near-limit warnings)
- 🔁 Recurring entries (salary, bills) auto-added once each month on a chosen day
- 💾 Automatic persistence in `localStorage` — refresh-proof
- 🌑 Clean dark UI, mobile-friendly

## Run it

Open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Roadmap

CSV export/import → monthly budgets with progress bars → recurring entries → edit entries → multi-currency → yearly summary view. Full plan: [ROADMAP.md](ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).
