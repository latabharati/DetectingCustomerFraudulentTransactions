# Fraud Watch — Real-Time Fraud Detection Dashboard

A multi-page Flask app that serves your trained IEEE-CIS fraud detection models:

- **Home** (`/`) — overview, quick stats, links to the rest.
- **Detect Fraud** (`/detect`) — the live stream (replays the held-out test set with real-time
  predictions) plus a manual entry form to test individual transactions, across a dropdown of
  every model you trained.
- **Analytics** (`/analytics`) — dataset distribution, ROC-AUC comparison, precision/recall/F1
  comparison, and a full metrics table — all computed live at startup from your actual models.
- **About** (`/about`) — project context, model list, and limitations.

## 1. Export your trained models from the notebook

Open `DissertationFraudDetection.ipynb`, scroll to the very end (after Stacking and SHAP), and add
`NOTEBOOK_EXPORT_CELL.py`'s contents as a new cell. Run it.

This creates two folders next to your notebook:
```
fraud_app_export/
  artifacts/   -> all 9 models, scalers, frequency maps, metadata.json
  data/        -> the test set (capped at 3,000 rows by default -- see STREAM_SAMPLE_SIZE
                   in the export cell -- to keep startup fast and light on RAM)
```

Copy the **contents** of both folders into this app's `artifacts/` and `data/` folders
(replacing the placeholder `.txt` files). Don't overwrite these two folders if you re-download
this app later — only `app.py`, `templates/`, and `static/` change between versions.

## 2. Install dependencies

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
python3 -m pip install -r requirements.txt
```

If you don't need the Autoencoder in the dropdown, you can skip installing `tensorflow` — the
app detects this and just omits it from the model list rather than crashing.

## 3. Run it

```bash
python3 app.py
```

Open **http://127.0.0.1:5000** in your browser. Startup precomputes analytics (scoring every
model against the whole loaded test set once) — with the default 3,000-row export, this should
take a few seconds, not minutes.

## What each page does

- **Signal strip** (top of Detect Fraud) — an ECG-style live view of every transaction's fraud
  score as it streams in; taller/red = higher risk.
- **Start stream** — replays your test set in chronological order, scoring each transaction with
  the selected model roughly once every `speed` seconds (adjustable).
- **Transaction ledger** — scrolling list of scored transactions, color-coded by risk, showing
  probability, threshold, and the actual ground-truth label.
- **Session stats** — running count of transactions processed, flagged, and label-match rate.
- **Manual check** — loads a real transaction as a starting template (random, or a guaranteed
  known fraud/legit example via the two dedicated buttons), lets you override a few interpretable
  fields, and scores the result with whichever model is selected.
- **Analytics** — dataset distribution (doughnut), ROC-AUC per model (bar, best model highlighted
  in coral), precision/recall/F1 comparison (grouped bar), and a full metrics table. All computed
  once at startup — no separate export step needed.

## Switching models

The dropdown on the Detect Fraud page controls both the live stream and the manual form.
Switching models while streaming automatically restarts the stream with the newly selected model.

## Notes / limitations

- This is a **research demo**, not a production system: no authentication, the "stream" is a
  replay of historical labeled data (not a live payment feed), and requests aren't rate-limited
  or logged for audit purposes.
- Manual entry overrides only a curated subset of columns (the human-interpretable ones). All
  other columns keep the values from whichever real transaction you loaded as a template.
- If a category you type into a select field wasn't seen during training, the app scores it with
  frequency 0 for that field — the same fallback your notebook's own frequency-encoding step uses
  for unseen categories in validation/test, so behavior stays consistent between notebook and app.
- Analytics metrics are computed against whatever test-set sample is in `data/` (3,000 rows by
  default) — not necessarily the full test set your notebook evaluated on, so exact numbers may
  differ slightly from your notebook's own comparison table. Increase `STREAM_SAMPLE_SIZE` in the
  export cell (or set it to `None` for the full set) if you want them to match exactly, keeping in
  mind the earlier tradeoff between file size / load time and completeness.
