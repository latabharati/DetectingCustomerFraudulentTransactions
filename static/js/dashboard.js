const modelSelect = document.getElementById('modelSelect');
const streamToggle = document.getElementById('streamToggle');
const liveIndicator = document.getElementById('liveIndicator');
const liveLabel = document.getElementById('liveLabel');
const signalStrip = document.getElementById('signalStrip');
const ledgerBody = document.getElementById('ledgerBody');
const ledgerEmpty = document.getElementById('ledgerEmpty');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');

const statProcessed = document.getElementById('statProcessed');
const statFlagged = document.getElementById('statFlagged');
const statRate = document.getElementById('statRate');
const statAccuracy = document.getElementById('statAccuracy');

// Session Risk Chart
const sessionChart = document.getElementById('sessionChart');
const sessionChartEmpty = document.getElementById('sessionChartEmpty');

let eventSource = null;
let streaming = false;
let processed = 0;
let flagged = 0;
let matches = 0;

const MAX_LEDGER_ROWS = 40;
const MAX_SIGNAL_TICKS = 90;
const MAX_SESSION_BARS = 120;

function riskClass(prob, threshold) {
  if (prob >= threshold) return 'danger';
  if (prob >= threshold * 0.6) return 'warn';
  return 'safe';
}

function fmtMoney(v) {
  const n = Number(v);
  return isNaN(n) ? v : '$' + n.toFixed(2);
}

function addSignalTick(prob, threshold) {
  if (!signalStrip) {
    return;
  }

  const tick = document.createElement('div');

  const cls = riskClass(prob, threshold);
  tick.className = 'signal-tick' + (cls !== 'safe' ? ' ' + cls : '');

  const heightPct = Math.max(10, Math.min(100, prob * 100));
  tick.style.height = heightPct + '%';

  signalStrip.appendChild(tick);

  while (signalStrip.children.length > MAX_SIGNAL_TICKS) {
    signalStrip.removeChild(signalStrip.firstChild);
  }
}

function addSessionBar(result) {
  if (!sessionChart || !sessionChartEmpty) {
    return;
  }

  sessionChartEmpty.style.display = 'none';

  const bar = document.createElement('div');

  const cls = riskClass(result.probability, result.threshold);
  bar.className = 'session-bar' + (cls !== 'safe' ? ' ' + cls : '');

  const heightPct = Math.max(5, Math.min(100, result.probability * 100));
  bar.style.height = heightPct + '%';

  bar.title =
      `Transaction #${result.index}: ${(result.probability * 100).toFixed(1)}%`;

  sessionChart.appendChild(bar);

  while (sessionChart.children.length > MAX_SESSION_BARS) {
    sessionChart.removeChild(sessionChart.firstChild);
  }
}

function addLedgerRow(result) {
  ledgerEmpty.style.display = 'none';

  const cls = riskClass(result.probability, result.threshold);

  const row = document.createElement('div');
  row.className = 'ledger-row ' + cls;

  const d = result.display || {};

  const actualBadge = result.actual_label === 1
      ? '<span class="badge actual-fraud">FRAUD (actual)</span>'
      : '<span class="badge actual-legit">legit (actual)</span>';

  row.innerHTML = `
    <span class="ledger-cell-muted">#${result.index}</span>
    <span>${d.ProductCD || '—'} · ${fmtMoney(d.TransactionAmt)} · ${d.card4 || ''} ${d.card6 || ''}</span>
    <span class="ledger-prob">${(result.probability * 100).toFixed(1)}%</span>
    <span class="ledger-cell-muted">thr ${(result.threshold * 100).toFixed(0)}%</span>
    ${actualBadge}
  `;

  ledgerBody.prepend(row);

  while (ledgerBody.children.length > MAX_LEDGER_ROWS + 1) {
    ledgerBody.removeChild(ledgerBody.lastChild);
  }
}

function updateStats(result) {
  processed += 1;

  if (result.flagged) {
    flagged += 1;
  }

  if (result.actual_label !== null && result.flagged === (result.actual_label === 1)) {
    matches += 1;
  }

  statProcessed.textContent = processed;
  statFlagged.textContent = flagged;
  statRate.textContent = ((flagged / processed) * 100).toFixed(1) + '%';
  statAccuracy.textContent = ((matches / processed) * 100).toFixed(1) + '%';
}

function resetStats() {
  processed = 0;
  flagged = 0;
  matches = 0;

  statProcessed.textContent = '0';
  statFlagged.textContent = '0';
  statRate.textContent = '0.0%';
  statAccuracy.textContent = '—';

  if (signalStrip) {
    signalStrip.innerHTML = '';
  }

  if (sessionChart) {
    sessionChart.innerHTML = '';
  }

  if (sessionChartEmpty) {
    sessionChartEmpty.style.display = 'block';
  }

  ledgerBody.querySelectorAll('.ledger-row').forEach(el => el.remove());
  ledgerEmpty.style.display = 'block';
}

function startStream() {
  resetStats();

  const model = modelSelect.value;
  const speed = speedRange.value;

  const url = `/api/stream?model=${encodeURIComponent(model)}&speed=${speed}&count=500`;

  eventSource = new EventSource(url);

  streaming = true;
  liveIndicator.classList.add('on');
  liveLabel.textContent = 'Live';
  streamToggle.textContent = 'Stop stream';

  eventSource.onmessage = (e) => {
    const result = JSON.parse(e.data);

    if (result.done || result.error) {
      stopStream();
      return;
    }

    addSignalTick(result.probability, result.threshold);
    addSessionBar(result);
    addLedgerRow(result);
    updateStats(result);
  };

  eventSource.onerror = () => {
    stopStream();
  };
}

function stopStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  streaming = false;
  liveIndicator.classList.remove('on');
  liveLabel.textContent = 'Idle';
  streamToggle.textContent = 'Start stream';
}

streamToggle.addEventListener('click', () => {
  if (streaming) {
    stopStream();
  } else {
    startStream();
  }
});

speedRange.addEventListener('input', () => {
  speedValue.textContent = `${speedRange.value}s / txn`;

  if (streaming) {
    stopStream();
    startStream();
  }
});

modelSelect.addEventListener('change', () => {
  if (streaming) {
    stopStream();
    startStream();
  }
});

// ------------------------------------------------------------------
// Manual entry form
// ------------------------------------------------------------------

const manualForm = document.getElementById('manualForm');
const loadRandomBtn = document.getElementById('loadRandomBtn');
const loadFraudBtn = document.getElementById('loadFraudBtn');
const loadLegitBtn = document.getElementById('loadLegitBtn');

const manualIndexLabel = document.getElementById('manualIndexLabel');
const manualResult = document.getElementById('manualResult');
const manualProb = document.getElementById('manualProb');
const manualVerdict = document.getElementById('manualVerdict');
const manualNote = document.getElementById('manualNote');

const manualShapBox = document.getElementById('manualShapBox');
const manualShapNote = document.getElementById('manualShapNote');
const manualShapList = document.getElementById('manualShapList');

let currentIndex = 0;

function setSelectedManualButton(button) {
  [loadRandomBtn, loadFraudBtn, loadLegitBtn].forEach(btn => {
    btn.classList.remove('selected');
  });

  button.classList.add('selected');
}

function clearManualShap() {
  if (!manualShapBox || !manualShapList || !manualShapNote) {
    return;
  }

  manualShapBox.classList.add('hidden');
  manualShapList.innerHTML = '';
  manualShapNote.textContent = '';
}

function renderManualShap(shapData) {
  if (!manualShapBox || !manualShapList || !manualShapNote) {
    return;
  }

  manualShapBox.classList.remove('hidden');
  manualShapList.innerHTML = '';

  if (!shapData) {
    clearManualShap();
    return;
  }

  if (!shapData.available) {
    manualShapNote.textContent =
        shapData.message || 'SHAP explanation is not available for this selected model.';
    return;
  }

  manualShapNote.textContent =
      `Explained directly with ${shapData.explained_with}. Positive values increase fraud risk; negative values decrease it.`;

  shapData.top_features.forEach(item => {
    const row = document.createElement('div');

    const directionClass = item.shap_value >= 0 ? 'danger' : 'safe';

    row.className = 'shap-row ' + directionClass;

    row.innerHTML = `
      <span class="shap-feature">${item.feature}</span>
      <span class="shap-value">${item.shap_value}</span>
      <span class="shap-direction">${item.direction}</span>
    `;

    manualShapList.appendChild(row);
  });
}

async function populateFieldOptions() {
  try {
    const res = await fetch('/api/field_options');
    const options = await res.json();

    Object.entries(options).forEach(([field, choices]) => {
      const el = manualForm.querySelector(`select[data-field="${field}"]`);

      if (!el) {
        return;
      }

      el.innerHTML = '';

      choices.forEach(choice => {
        const opt = document.createElement('option');
        opt.value = choice;
        opt.textContent = choice;
        el.appendChild(opt);
      });
    });
  } catch (error) {
    console.error('Could not load field options:', error);
  }
}

function applyTransactionToForm(data) {
  currentIndex = data.index;

  manualIndexLabel.textContent =
      `Transaction #${data.index} (actual: ${data.actual_label === 1 ? 'fraud' : 'legit'})`;

  Object.entries(data.display).forEach(([key, value]) => {
    const el = manualForm.querySelector(`[data-field="${key}"]`);

    if (!el) {
      return;
    }

    if (el.tagName === 'SELECT') {
      if (!el.querySelector(`option[value="${value}"]`)) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        el.appendChild(opt);
      }

      el.value = value;
    } else {
      el.value = value;
    }
  });

  manualResult.classList.add('hidden');
  clearManualShap();
}

async function loadTransaction(index) {
  try {
    const res = await fetch(`/api/transaction/${index}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || 'Could not load transaction.');
      return;
    }

    applyTransactionToForm(data);
  } catch (error) {
    alert('Could not load transaction.');
    console.error(error);
  }
}

async function loadExample(label) {
  try {
    const res = await fetch(`/api/transaction/example/${label}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      alert(data.error || `No ${label} examples found.`);
      return;
    }

    applyTransactionToForm(data);
  } catch (error) {
    alert(`Could not load ${label} example.`);
    console.error(error);
  }
}

loadFraudBtn.addEventListener('click', () => {
  setSelectedManualButton(loadFraudBtn);
  loadExample('fraud');
});

loadLegitBtn.addEventListener('click', () => {
  setSelectedManualButton(loadLegitBtn);
  loadExample('legit');
});

loadRandomBtn.addEventListener('click', () => {
  setSelectedManualButton(loadRandomBtn);

  const randomIndex = Math.floor(Math.random() * 100000);
  loadTransaction(randomIndex);
});

manualForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const overrides = {};

  new FormData(manualForm).forEach((value, key) => {
    overrides[key] = value;
  });

  manualResult.classList.remove('hidden');
  manualProb.textContent = '—';
  manualVerdict.textContent = 'Scoring...';
  manualVerdict.className = 'verdict-pill';
  manualNote.textContent = 'Sending transaction to model...';
  clearManualShap();

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelSelect.value,
        index: currentIndex,
        overrides: overrides
      }),
    });

    const result = await res.json();

    if (!res.ok || result.error) {
      manualProb.textContent = '—';
      manualVerdict.textContent = 'Error';
      manualVerdict.className = 'verdict-pill danger';
      manualNote.textContent = result.error || 'Prediction failed.';
      clearManualShap();
      return;
    }

    manualProb.textContent = (result.probability * 100).toFixed(1) + '%';

    const flagged = result.flagged;

    manualVerdict.textContent = flagged ? 'Flagged as fraud' : 'Looks legitimate';
    manualVerdict.className = 'verdict-pill ' + (flagged ? 'danger' : 'safe');

    let outcomeText = '';

    if (result.actual_label === 1 && result.flagged) {
      outcomeText = 'Correct fraud detection';
    } else if (result.actual_label === 0 && !result.flagged) {
      outcomeText = 'Correct legitimate prediction';
    } else if (result.actual_label === 1 && !result.flagged) {
      outcomeText = 'False negative — fraud missed by the model';
    } else if (result.actual_label === 0 && result.flagged) {
      outcomeText = 'False positive — legitimate transaction flagged';
    }

    manualNote.textContent =
        `Model: ${result.model} · Threshold: ${(result.threshold * 100).toFixed(0)}% · Actual label: ${result.actual_label === 1 ? 'fraud' : 'legit'} · ${outcomeText}`;

    renderManualShap(result.shap);
  } catch (error) {
    manualProb.textContent = '—';
    manualVerdict.textContent = 'Error';
    manualVerdict.className = 'verdict-pill danger';
    manualNote.textContent = 'Prediction request failed. Check Flask terminal for errors.';
    clearManualShap();
    console.error(error);
  }
});

// Load field option lists, then an initial transaction so the form is not empty
populateFieldOptions().then(() => {
  loadTransaction(0);
});