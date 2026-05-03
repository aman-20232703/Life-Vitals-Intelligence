const DASHBOARD_TARGET_KEY = "lifevitals_dashboard_target_life_expectancy";

function getStoredTarget() {
  const value = Number(localStorage.getItem(DASHBOARD_TARGET_KEY));
  return Number.isFinite(value) && value > 0 ? value : 75;
}

function setStoredTarget(value) {
  localStorage.setItem(DASHBOARD_TARGET_KEY, String(value));
}

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  const number = Number(value);
  return `${number.toFixed(1)}${suffix}`;
}

function clamp(value, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, value));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHtml(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function badgeClass(severity) {
  const value = String(severity || "").toLowerCase();
  if (value === "danger") return "danger";
  if (value === "warning") return "warning";
  return "good";
}

function wellnessClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "poor") return "danger";
  if (value === "average") return "warning";
  if (value === "unavailable") return "warning";
  return "good";
}

function comparisonClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("below")) return "danger";
  if (value.includes("on")) return "warning";
  if (value === "unavailable") return "warning";
  return "good";
}

function renderAlertList(alerts) {
  const el = document.getElementById("dashboard-alert-list");
  if (!el) return;

  el.innerHTML = (alerts || [])
    .map(
      (
        alert,
      ) => `<li class="dashboard-alert-item ${badgeClass(alert.severity)}">
        <span class="dashboard-alert-dot"></span>
        <span>${alert.text}</span>
      </li>`,
    )
    .join("");
}

function renderFactorList(factors) {
  const el = document.getElementById("dashboard-factor-list");
  if (!el) return;

  el.innerHTML = (factors || [])
    .map(
      (factor) => `<article class="dashboard-factor-card">
        <div class="dashboard-factor-head">
          <span class="dashboard-factor-name">${factor.label}</span>
          <span class="dashboard-factor-direction ${factor.direction === "↑" ? "up" : "down"}">${factor.direction}</span>
        </div>
        <p class="dashboard-factor-reason">${factor.reason}</p>
      </article>`,
    )
    .join("");
}

function renderChange(change) {
  const valueEl = document.getElementById("dashboard-change-value");
  const reasonEl = document.getElementById("dashboard-change-reasons");
  if (!valueEl || !reasonEl) return;

  const delta = Number(change?.delta_years || 0);
  const positive = delta > 0;
  const neutral = Math.abs(delta) <= 0.05;
  valueEl.textContent =
    change?.label ||
    (neutral
      ? "No major change"
      : `${positive ? "+" : ""}${delta.toFixed(1)} years`);
  valueEl.className = `dashboard-change-value ${neutral ? "neutral" : positive ? "positive" : "negative"}`;
  reasonEl.innerHTML = (change?.reasons || [])
    .map((reason) => `<li>${reason}</li>`)
    .join("");
}

function renderRecommendations(recommendations) {
  const el = document.getElementById("dashboard-recommendation-list");
  if (!el) return;

  el.innerHTML = (recommendations || [])
    .map((recommendation) => `<li>${recommendation}</li>`)
    .join("");
}

function renderQuickComparison(comparison) {
  setText("dashboard-comparison-status", comparison?.status || "--");
  setText("dashboard-comparison-text", comparison?.text || "--");
  setText(
    "dashboard-comparison-values",
    `You: ${formatValue(comparison?.user_prediction)} years | Global average: ${formatValue(comparison?.global_average)} years`,
  );
}

function updateGoalTracker(latestPrediction) {
  const targetInput = document.getElementById("dashboard-target-input");
  const progressBar = document.getElementById("dashboard-goal-progress");
  const currentEl = document.getElementById("dashboard-goal-current");
  const targetEl = document.getElementById("dashboard-goal-target");
  const percentEl = document.getElementById("dashboard-goal-percent");

  if (!targetInput || !progressBar || !currentEl || !targetEl || !percentEl)
    return;

  const target = Number(targetInput.value || getStoredTarget());
  const hasPrediction = Number.isFinite(Number(latestPrediction));
  const current = hasPrediction ? Number(latestPrediction) : null;
  const percent =
    hasPrediction && target > 0 ? clamp((current / target) * 100) : 0;

  currentEl.textContent = `${formatValue(current)} years`;
  targetEl.textContent = `${formatValue(target)} years`;
  percentEl.textContent = hasPrediction
    ? `${percent.toFixed(0)}% achieved`
    : "--";
  progressBar.style.width = `${clamp(percent)}%`;
}

async function initDashboardPage() {
  const dashboardPage = document.querySelector('[data-page="dashboard"]');
  if (!dashboardPage) return;

  const targetInput = document.getElementById("dashboard-target-input");
  const targetSave = document.getElementById("dashboard-target-save");

  if (targetInput) {
    targetInput.value = String(getStoredTarget());
  }

  if (targetSave && targetInput) {
    targetSave.addEventListener("click", () => {
      const value = Number(targetInput.value);
      if (!Number.isFinite(value) || value < 35 || value > 95) {
        showToast("Please enter a target between 35 and 95 years.");
        return;
      }
      setStoredTarget(value);
      updateGoalTracker(
        Number(document.getElementById("last-prediction")?.dataset.value || 0),
      );
      showToast("Target saved");
    });
  }

  try {
    const [summary, insights, comparison, recommendations] = await Promise.all([
      apiFetch("/dashboard/summary"),
      apiFetch("/dashboard/insights"),
      apiFetch("/dashboard/comparison"),
      apiFetch("/dashboard/recommendations"),
    ]);

    setText("welcome-name", summary.user_name || "Clinician");
    setText(
      "overall-wellness-score",
      `${formatValue(summary.overall_score)}/100`,
    );
    const wellnessStatusEl = document.getElementById("overall-wellness-status");
    if (wellnessStatusEl) {
      wellnessStatusEl.textContent = summary.status || "--";
      wellnessStatusEl.className = `dashboard-status-badge ${wellnessClass(summary.status)}`;
    }
    setText(
      "dashboard-summary-note",
      `Combines life expectancy, health, and social patterns into one decision-support score.`,
    );

    const lastPrediction =
      summary.last_prediction == null ? null : Number(summary.last_prediction);
    const confidence =
      summary.confidence_score == null
        ? null
        : Number(summary.confidence_score);
    const totalPredictions = Number(summary.total_predictions || 0);

    const lastPredictionEl = document.getElementById("last-prediction");
    if (lastPredictionEl) {
      lastPredictionEl.textContent = `${formatValue(lastPrediction)} years`;
      lastPredictionEl.dataset.value =
        lastPrediction == null ? "" : String(lastPrediction);
    }
    setText("last-confidence", `${formatValue(confidence)}%`);
    setText("prediction-count", String(totalPredictions));

    setText("dashboard-ai-insight", insights.today_insight || "--");
    renderFactorList(insights.top_factors || []);
    renderAlertList(insights.alerts || []);
    renderChange(insights.change || {});
    renderQuickComparison(comparison || {});
    renderRecommendations(recommendations.recommendations || []);
    setText(
      "dashboard-recommendation-summary",
      recommendations.summary ||
        "Actionable guidance based on the latest risk pattern.",
    );

    const trendEl = document.getElementById("dashboard-trend-text");
    if (trendEl) {
      trendEl.textContent = summary.status || "--";
      trendEl.className = `dashboard-mini-tag ${wellnessClass(summary.status)}`;
    }

    const moduleScores = summary.module_scores || {};
    setText(
      "dashboard-mini-summary",
      `Life ${formatValue(moduleScores.life)} | Health ${formatValue(moduleScores.health)} | Social ${formatValue(moduleScores.social)}`,
    );

    updateGoalTracker(lastPrediction);
  } catch (error) {
    const errorEl = document.getElementById("dashboard-error");
    if (errorEl)
      errorEl.textContent = error.message || "Unable to load dashboard data.";
  }
}

window.LifeVitalsDashboard = {
  init: initDashboardPage,
};
