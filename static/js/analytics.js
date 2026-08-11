const data = window.ANALYTICS_DATA;

const palette = {
  accent: '#FF5A6E',
  safe: '#34C77B',
  warn: '#F5B94D',
  muted: '#8A93B8',
  grid: 'rgba(138,147,184,0.15)',
};

Chart.defaults.color = palette.muted;
Chart.defaults.font.family = "'Inter', sans-serif";

// ---------- Dataset distribution ----------
new Chart(document.getElementById('distributionChart'), {
  type: 'doughnut',
  data: {
    labels: ['Legitimate', 'Fraud'],
    datasets: [{
      data: [data.legit_count, data.fraud_count],
      backgroundColor: [palette.safe, palette.accent],
      borderWidth: 0,
    }],
  },
  options: {
    plugins: { legend: { position: 'bottom' } },
    cutout: '62%',
  },
});

// ---------- Model performance: PR-AUC (bar) ----------
const modelNames = Object.keys(data.metrics);
const prValues = modelNames.map(m => data.metrics[m].pr_auc);

new Chart(document.getElementById('prChart'), {
  type: 'bar',
  data: {
    labels: modelNames,
    datasets: [{
      label: 'PR-AUC',
      data: prValues,
      backgroundColor: modelNames.map(m => m === data.best_model ? palette.accent : 'rgba(255,90,110,0.35)'),
      borderRadius: 6,
    }],
  },
  options: {
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 1, grid: { color: palette.grid } },
      x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, minRotation: 20 } },
    },
  },
});
// ---------- Precision / Recall / F1 comparison (grouped bar) ----------
new Chart(document.getElementById('metricsChart'), {
  type: 'bar',
  data: {
    labels: modelNames,
    datasets: [
      { label: 'Precision', data: modelNames.map(m => data.metrics[m].precision), backgroundColor: palette.accent },
      { label: 'Recall', data: modelNames.map(m => data.metrics[m].recall), backgroundColor: palette.safe },
      { label: 'F1', data: modelNames.map(m => data.metrics[m].f1), backgroundColor: palette.warn },
    ],
  },
  options: {
    plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } },
    scales: {
      y: { beginAtZero: true, max: 1, grid: { color: palette.grid } },
      x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, minRotation: 20 } },
    },
  },
});
