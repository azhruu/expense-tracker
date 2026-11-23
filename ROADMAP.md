# ExpenseTracker — Build Roadmap

Each item lands as one complete, tested change.

- [x] Core app: add/delete entries, localStorage persistence
- [x] Summary cards (balance, monthly income, monthly expenses)
- [x] Month + category filters
- [x] Spending-by-category bar chart
- [x] Export entries to CSV (and import back)
- [x] Monthly budgets per category with progress bars
- [x] Recurring entries (salary, bills) auto-added each month
- [x] Edit an existing entry
- [x] Multi-currency support (PKR / USD / EUR)
- [x] Yearly summary view with monthly trend line chart
- [x] Search entries by title
- [x] Dark/light theme toggle
- [x] Sample-data button for first-time users
- [x] Print-friendly monthly report

## Polish (after the roadmap above)

- [x] Delete confirmation — deleting an entry asks first, so a stray click can't wipe a row
- [x] Sort history entries — newest / oldest first, or highest / lowest amount (amounts compare in PKR, so currencies sort fairly)
- [x] Delete confirmation for recurring entries — deleting a recurring entry asks first, like deleting a history entry
- [x] Edit-mode safety — deleting the entry you're editing exits edit mode, so the form can't stay stuck on "Save changes" with nowhere to save to
- [x] CSV import skips duplicates — re-importing a file never adds an entry that's already there (same type, title, amount, currency, category and date)
- [x] Clear all entries — one button wipes the whole tracker for a fresh start, with a confirmation first so a stray click can't empty it (and it exits edit mode if the entry being edited is wiped)
- [x] Budget warning when adding an entry — an expense that takes its category to 80%+ of its monthly budget (or over it) warns under the form, with the new total, so the overspend is caught at the moment of adding
- [x] Edit a recurring entry — click ✎ on a recurring row to change its title, amount, currency, category or day in the same form (cancel leaves it untouched); deleting the recurring entry being edited exits edit mode, like deleting the entry being edited
- [x] Duplicate an entry — a ⧉ button on each history row copies it with a fresh id and today's date, so weekly repeats don't need retyping
- [x] Reset filters — a ↺ button clears search, month, category and sort back to the defaults (empty search, current month, all categories, newest first) in one click
- [x] Filtered-history summary — a line under the filters totals exactly the rows on screen (count, income, expenses and net), so a filtered month, category or search has its own totals instead of only the this-month cards
