let overallGaugeChart = null;
let healthAgeChart = null;
let socialRadarChart = null;
let projectionLineChart = null;

function analyticsError(message) {
  const el = document.getElementById("analytics-error");
  if (!el) return;
  el.textContent = message || "";
}

function scoreToRiskBadgeClass(risk) {
  const value = String(risk || "").toLowerCase();
  if (value === "low") return "low";
  if (value === "medium") return "medium";
  return "high";
}

function toTitleCase(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return "--";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildFallbackEconomyInput(profile, history) {
  const latestEconomy = history.find(
    (item) =>
      String(item?.input_payload?.module || "").toLowerCase() === "economy",
  );
  if (latestEconomy?.input_payload) {
    const p = latestEconomy.input_payload;
    return {
      gdp: Number(p.gdp || 15000),
      income_level: p.income_level || "middle",
      unemployment_rate: Number(p.unemployment_rate || 6),
      population: Number(p.population || 5_000_000),
    };
  }

  const income = String(profile?.income_range || "middle").toLowerCase();
  const normalizedIncome = income.includes("high")
    ? "high"
    : income.includes("upper")
      ? "upper-middle"
      : income.includes("lower")
        ? "lower-middle"
        : income.includes("low")
          ? "low"
          : "middle";

  return {
    gdp: 17000,
    income_level: normalizedIncome,
    unemployment_rate: 5.8,
    population: 7_500_000,
  };
}

function buildFallbackHealthInput(profile, history) {
  const latestHealth = history.find(
    (item) =>
      String(item?.input_payload?.module || "").toLowerCase() === "health",
  );
  if (latestHealth?.input_payload) {
    const p = latestHealth.input_payload;
    return {
      bmi: Number(p.bmi || 24),
      disease_rate: Number(p.disease_rate || 18),
      nutrition_level: p.nutrition_level || "good",
      vaccination_coverage: Number(p.vaccination_coverage || 82),
    };
  }

  const h = Number(profile?.height_cm || 170) / 100;
  const w = Number(profile?.weight_kg || 70);
  const bmi = h > 0 ? Number((w / (h * h)).toFixed(1)) : 24;

  return {
    bmi,
    disease_rate: 15,
    nutrition_level: "good",
    vaccination_coverage: 84,
  };
}

function buildFallbackSocialInput(history) {
  const latestSocial = history.find(
    (item) =>
      String(item?.input_payload?.module || "").toLowerCase() === "social",
  );
  if (latestSocial?.input_payload) {
    const p = latestSocial.input_payload;
    return {
      education_index: Number(p.education_index || 0.7),
      sanitation_access_percent: Number(p.sanitation_access_percent || 85),
      clean_water_access_percent: Number(p.clean_water_access_percent || 88),
      air_pollution_pm25: Number(p.air_pollution_pm25 || 20),
    };
  }

  return {
    education_index: 0.72,
    sanitation_access_percent: 86,
    clean_water_access_percent: 90,
    air_pollution_pm25: 19,
  };
}

function renderOverallGauge(score) {
  const canvas = document.getElementById("overall-gauge-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (overallGaugeChart) overallGaugeChart.destroy();

  overallGaugeChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Score", "Remaining"],
      datasets: [
        {
          data: [score, Math.max(0, 100 - score)],
          backgroundColor: ["#ffffff", "rgba(255,255,255,0.22)"],
          borderWidth: 0,
          cutout: "72%",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  });
}

function renderHealthChart(groups) {
  const canvas = document.getElementById("health-age-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (healthAgeChart) healthAgeChart.destroy();

  healthAgeChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: groups.map((g) => g.group),
      datasets: [
        {
          label: "Health Score",
          data: groups.map((g) => g.score),
          backgroundColor: ["#77b6ff", "#2e7dd7", "#0b4ea2"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100 },
      },
    },
  });
}

function renderSocialChart(dimensions) {
  const canvas = document.getElementById("social-radar-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (socialRadarChart) socialRadarChart.destroy();

  const labels = Object.keys(dimensions || {});
  const values = Object.values(dimensions || {});

  socialRadarChart = new Chart(canvas, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Social Dimensions",
          data: values,
          backgroundColor: "rgba(46, 125, 215, 0.2)",
          borderColor: "#2e7dd7",
          pointBackgroundColor: "#0b4ea2",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
}

function renderProjectionChart(points) {
  const canvas = document.getElementById("projection-line-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (projectionLineChart) projectionLineChart.destroy();

  const labels = points.map((p) => String(p.year));
  const values = points.map((p) => p.value);

  projectionLineChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Life Expectancy",
          data: values,
          borderColor: "#0b4ea2",
          backgroundColor: "rgba(46, 125, 215, 0.16)",
          tension: 0.3,
          fill: true,
          pointRadius: points.map((p) => (p.type === "future" ? 4 : 2)),
          pointBackgroundColor: points.map((p) =>
            p.type === "future" ? "#f7a928" : "#2e7dd7",
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false, suggestedMin: 45, suggestedMax: 90 },
      },
    },
  });
}

function renderRiskPanel(risk) {
  const riskBadge = document.getElementById("risk-badge");
  const riskSummary = document.getElementById("risk-summary");
  const recommendationList = document.getElementById("recommendation-list");

  if (!riskBadge || !riskSummary || !recommendationList) return;

  const riskValue = toTitleCase(risk.risk);
  riskBadge.className = `badge ${scoreToRiskBadgeClass(riskValue)}`;
  riskBadge.textContent = riskValue;
  riskSummary.textContent = risk.summary || "";

  recommendationList.innerHTML = (risk.recommendations || [])
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function renderAnalytics(data) {
  const overall = data.overall;
  const economy = data.economy;
  const health = data.health;
  const social = data.social;
  const projection = data.projection;
  const risk = data.risk;

  document.getElementById("overall-score-value").textContent =
    `${overall.overall_score.toFixed(1)}/100`;
  document.getElementById("overall-status").textContent =
    `Status: ${overall.status}`;
  document.getElementById("overall-note").textContent =
    "Combined from life expectancy, health condition, and social development scores.";

  document.getElementById("economy-score").textContent =
    `${economy.score.toFixed(1)}/100`;
  document.getElementById("economy-label").textContent = `(${economy.label})`;
  document.getElementById("economy-note").textContent =
    economy.explanation || "";

  const meter = document.getElementById("economy-meter-fill");
  if (meter) meter.style.width = `${economy.score}%`;

  document.getElementById("social-score").textContent =
    `${social.score.toFixed(1)}/100`;
  document.getElementById("social-category").textContent =
    `(${social.category})`;
  document.getElementById("social-note").textContent = social.explanation || "";

  const groupSummary = document.getElementById("health-group-summary");
  if (groupSummary) {
    groupSummary.innerHTML = (health.groups || [])
      .map((g) => `${g.group}: ${g.score.toFixed(1)} (${g.risk_level} risk)`)
      .map((text) => `<span>${text}</span>`)
      .join("");
  }

  document.getElementById("projection-year").textContent = String(
    projection.predicted_year || 2035,
  );
  document.getElementById("projection-value").textContent = Number(
    projection.predicted_value || 0,
  ).toFixed(1);

  renderOverallGauge(overall.overall_score);
  renderHealthChart(health.groups || []);
  renderSocialChart(social.dimensions || {});
  renderProjectionChart(projection.points || []);
  renderRiskPanel(risk);
}

async function initModernAnalytics() {
  if (document.body.dataset.page !== "analytics") return;

  analyticsError("");

  try {
    const [profile, history] = await Promise.all([
      fetchProfile(),
      fetchHistory(),
    ]);

    const economyInput = buildFallbackEconomyInput(profile, history);
    const healthInput = buildFallbackHealthInput(profile, history);
    const socialInput = buildFallbackSocialInput(history);

    const overall = await apiFetch("/analytics/overall");
    const economy = await apiFetch("/analytics/economy", {
      method: "POST",
      body: JSON.stringify(economyInput),
    });
    const health = await apiFetch("/analytics/health", {
      method: "POST",
      body: JSON.stringify(healthInput),
    });
    const social = await apiFetch("/analytics/social", {
      method: "POST",
      body: JSON.stringify(socialInput),
    });
    const projection = await apiFetch("/analytics/projection");
    const risk = await apiFetch("/analytics/risk", {
      method: "POST",
      body: JSON.stringify({
        overall_score: overall.overall_score,
        economy_score: economy.score,
        health_score: health.average_score,
        social_score: social.score,
      }),
    });

    renderAnalytics({
      overall,
      economy,
      health,
      social,
      projection,
      risk,
    });
  } catch (error) {
    analyticsError(error.message || "Unable to load analytics right now.");
  }
}

document.addEventListener("DOMContentLoaded", initModernAnalytics);
