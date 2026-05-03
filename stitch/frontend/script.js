const API_BASE_FALLBACKS = (() => {
  const stored = localStorage.getItem("lifevitals_api_base");
  const bases = [stored, "http://127.0.0.1:8000", "http://localhost:8000","https://life-vitals-intelligence.onrender.com"];

  if (window.location.port === "5500") {
    bases.unshift(
      `${window.location.protocol}//${window.location.hostname}:8000`,
    );
  }

  return [...new Set(bases.filter(Boolean))];
})();
const TOKEN_KEY = "lifevitals_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function normalizeApiErrorMessage(payload) {
  if (typeof payload === "string") {
    return payload;
  }

  const detail = payload?.detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const location = Array.isArray(item.loc)
          ? item.loc.filter((piece) => piece !== "body").join(".")
          : "";
        const message = String(item.msg || "Invalid input");
        return location ? `${location}: ${message}` : message;
      })
      .filter(Boolean);

    if (parts.length) {
      return parts.join(" | ");
    }
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return "Request failed";
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let lastError = null;

  for (const base of API_BASE_FALLBACKS) {
    try {
      const response = await fetch(`${base}${path}`, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message = normalizeApiErrorMessage(payload);
        if (response.status === 401) {
          clearToken();
          if (!window.location.pathname.endsWith("login.html")) {
            window.location.href = "login.html?reason=session-expired";
          }
        }
        throw new Error(message);
      }

      localStorage.setItem("lifevitals_api_base", base);
      return payload;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError?.message ||
      `Unable to reach the backend. Checked: ${API_BASE_FALLBACKS.join(", ")}`,
  );
}

function showToast(message) {
  let toast = document.getElementById("global-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "global-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2200);
}

function withLoading(button, loadingText, callback) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;

  return callback().finally(() => {
    button.disabled = false;
    button.textContent = original;
  });
}

function redirectIfUnauthenticated() {
  const page = document.body.dataset.page;
  const publicPages = ["landing", "login", "signup"];
  if (!publicPages.includes(page) && !getToken()) {
    window.location.href = "login.html";
  }
}

async function validateSavedSession() {
  const page = document.body.dataset.page;
  const publicPages = ["landing", "login", "signup"];
  if (publicPages.includes(page)) return;

  const token = getToken();
  if (!token) return;

  try {
    await apiFetch("/profile");
  } catch (error) {
    clearToken();
    if (!window.location.pathname.endsWith("login.html")) {
      window.location.href = "login.html?reason=session-expired";
    }
  }
}

function attachLogout() {
  document.querySelectorAll("[data-logout]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      clearToken();
      window.location.href = "login.html";
    });
  });
}

function markActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page) link.classList.add("active");
  });
}

function updateProgress(step, total) {
  const bar = document.getElementById("signup-progress");
  if (bar) {
    bar.style.width = `${(step / total) * 100}%`;
  }
}

function computeBmi(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w) return "";
  return (w / (h * h)).toFixed(1);
}

async function initSignup() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  const steps = Array.from(document.querySelectorAll("[data-step]"));
  const total = steps.length;
  let step = 1;

  function renderStep() {
    steps.forEach((section) => {
      section.classList.toggle("hidden", Number(section.dataset.step) !== step);
    });
    updateProgress(step, total);
    document.getElementById("step-indicator").textContent =
      `Step ${step} of ${total}`;
    document.getElementById("prev-step").classList.toggle("hidden", step === 1);
    document
      .getElementById("next-step")
      .classList.toggle("hidden", step === total);
    document
      .getElementById("submit-signup")
      .classList.toggle("hidden", step !== total);
  }

  document.getElementById("next-step").addEventListener("click", () => {
    const currentFields = steps[step - 1].querySelectorAll("input, select");
    const valid = Array.from(currentFields).every((f) => f.reportValidity());
    if (!valid) return;

    if (step === 1) {
      const pwd = document.getElementById("password").value;
      const cpwd = document.getElementById("confirm_password").value;
      if (pwd !== cpwd) {
        document.getElementById("signup-error").textContent =
          "Passwords do not match.";
        return;
      }
      document.getElementById("signup-error").textContent = "";
    }

    step = Math.min(total, step + 1);
    renderStep();
  });

  document.getElementById("prev-step").addEventListener("click", () => {
    step = Math.max(1, step - 1);
    renderStep();
  });

  ["height_cm", "weight_kg"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      document.getElementById("bmi_preview").value = computeBmi(
        document.getElementById("height_cm").value,
        document.getElementById("weight_kg").value,
      );
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById("submit-signup");
    const payload = {
      full_name: document.getElementById("full_name").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
      age: Number(document.getElementById("age").value),
      gender: document.getElementById("gender").value,
      country: document.getElementById("country").value,
      height_cm: Number(document.getElementById("height_cm").value),
      weight_kg: Number(document.getElementById("weight_kg").value),
      smoking_status: document.getElementById("smoking_status").value,
      alcohol_consumption: document.getElementById("alcohol_consumption").value,
      physical_activity: document.getElementById("physical_activity").value,
      education_level: document.getElementById("education_level").value,
      occupation: document.getElementById("occupation").value,
      income_range: document.getElementById("income_range").value,
      user_role: document.getElementById("user_role").value,
    };

    await withLoading(submitBtn, "Creating account...", async () => {
      try {
        const data = await apiFetch("/signup", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToken(data.access_token);
        showToast("Account created successfully");
        window.location.href = "dashboard.html";
      } catch (error) {
        document.getElementById("signup-error").textContent = error.message;
      }
    });
  });

  renderStep();
}

async function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("login-btn");

    await withLoading(button, "Signing in...", async () => {
      try {
        const payload = {
          email: document.getElementById("login_email").value,
          password: document.getElementById("login_password").value,
        };
        const data = await apiFetch("/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToken(data.access_token);
        showToast("Welcome back");
        window.location.href = "dashboard.html";
      } catch (error) {
        document.getElementById("login-error").textContent = error.message;
      }
    });
  });
}

async function fetchProfile() {
  return apiFetch("/profile");
}

async function fetchHistory() {
  return apiFetch("/history");
}

async function initDashboard() {
  if (window.LifeVitalsDashboard?.init) {
    await window.LifeVitalsDashboard.init();
    return;
  }

  const nameEl = document.getElementById("welcome-name");
  if (!nameEl) return;

  try {
    const [profile, history] = await Promise.all([
      fetchProfile(),
      fetchHistory(),
    ]);
    nameEl.textContent = profile.full_name;

    const lifeHistory = history.filter(
      (item) => getHistoryModule(item) === "life",
    );
    const last = lifeHistory[0];
    document.getElementById("last-prediction").textContent = last
      ? `${last.predicted_life_expectancy.toFixed(1)} years`
      : "No predictions yet";
    document.getElementById("last-confidence").textContent = last
      ? `${last.confidence_score.toFixed(1)}%`
      : "--";
    document.getElementById("prediction-count").textContent = String(
      lifeHistory.length,
    );
  } catch (error) {
    showToast(error.message);
  }
}

function setFieldValue(id, value) {
  const field = document.getElementById(id);
  if (!field) return;
  if ("value" in field) {
    field.value = value;
  } else {
    field.textContent = value;
  }
}

function getNumericValue(id) {
  return Number(document.getElementById(id)?.value || 0);
}

function normalizeScore(value, minimum, maximum) {
  if (maximum === minimum) return 0;
  return Math.max(
    0,
    Math.min(100, ((value - minimum) / (maximum - minimum)) * 100),
  );
}

function getHistoryModule(item) {
  return String(item?.input_payload?.module || "life").toLowerCase();
}

function parseServerDate(value) {
  if (typeof value !== "string") return new Date(value);
  const hasTimezone = /z$|[+-]\d{2}:?\d{2}$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

function formatHistoryDateTime(value) {
  const dt = parseServerDate(value);
  if (Number.isNaN(dt.getTime())) return "--";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(dt);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mapStatusBadgeClass(status, module) {
  const value = String(status || "").toLowerCase();
  if (["normal", "advanced", "low", "good"].includes(value)) {
    return "normal";
  }
  if (["moderate", "stable", "medium"].includes(value)) {
    return "moderate";
  }
  if (["critical", "developing", "high", "poor"].includes(value)) {
    return "critical";
  }
  if (module === "life") return "moderate";
  return "normal";
}

function formatHistoryPrediction(item, module) {
  if (module === "life") {
    return `${item.predicted_life_expectancy.toFixed(1)} years`;
  }
  return `${item.predicted_life_expectancy.toFixed(1)} / 100`;
}

function formatHistoryConfidence(item) {
  return `${item.confidence_score.toFixed(1)}%`;
}

function compactHistoryInsight(text) {
  const raw = String(text || "").trim();
  if (!raw) return "--";

  const firstLine = raw.split("\n")[0].trim();
  const firstSentence = firstLine.split(".")[0].trim();
  const candidate = firstSentence || firstLine;

  if (candidate.length <= 110) return candidate;
  return `${candidate.slice(0, 107).trim()}...`;
}

function isHistoryItemInFilter(item, filterKey) {
  if (filterKey === "all") return true;

  const itemDate = parseServerDate(item.created_at);
  if (Number.isNaN(itemDate.getTime())) return false;

  const now = new Date();
  const diffMs = now.getTime() - itemDate.getTime();
  if (diffMs < 0) return false;

  if (filterKey === "5min") return diffMs <= 5 * 60 * 1000;
  if (filterKey === "1hour") return diffMs <= 60 * 60 * 1000;

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (filterKey === "last7") return diffDays >= 0 && diffDays <= 7;
  if (filterKey === "last30") return diffDays >= 0 && diffDays <= 30;
  return true;
}

const FEATURE_IMPORTANCE_GUIDE = {
  "Life Expectancy": {
    Mortality:
      "Adult mortality is a direct signal of survival risk in the population.",
    Infant:
      "Infant deaths often reflect maternal care quality and early-life health systems.",
    Alcohol:
      "High alcohol burden increases chronic disease risk and can reduce life expectancy.",
    GDP: "GDP indicates healthcare access, nutrition quality, and public health resources.",
    BMI: "BMI outside a healthy range is linked to long-term metabolic and cardiovascular risk.",
    Schooling:
      "More schooling is associated with health awareness and better use of preventive care.",
    "HIV/AIDS":
      "Higher HIV/AIDS burden can significantly reduce longevity without strong treatment coverage.",
  },
  Economy: {
    GDP: "GDP reflects the economic capacity to support services and infrastructure.",
    Income:
      "Income level captures household purchasing power and financial resilience.",
    Employment:
      "Employment stability directly affects consumption, welfare, and growth momentum.",
    Urban:
      "Urbanization can improve access to jobs and public services when managed well.",
    Population:
      "Population pressure can strain resources if growth outpaces infrastructure.",
  },
  Health: {
    BMI: "BMI highlights nutrition balance and lifestyle-related health risk.",
    Nutrition:
      "Nutrition quality supports immunity, recovery, and long-term health outcomes.",
    Disease:
      "Disease burden is a direct indicator of health-system stress and risk exposure.",
    Vaccination:
      "Vaccination coverage reduces preventable illness and community-level outbreaks.",
    "Age Fit":
      "Age-group suitability helps interpret risk because health vulnerability changes with age.",
  },
  Social: {
    Education:
      "Education improves awareness, employability, and informed health behaviors.",
    Sanitation:
      "Sanitation access lowers infectious disease spread and improves public health safety.",
    Water:
      "Reliable clean water is fundamental for disease prevention and daily wellbeing.",
    Pollution:
      "Air pollution strongly affects respiratory and cardiovascular health outcomes.",
    Density:
      "High density can increase pressure on housing, transport, and social services.",
  },
};

function formatFeatureInputValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) >= 1000) return value.toLocaleString();
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value ?? "--");
}

function getFeatureContributionMessage(score) {
  if (score >= 75) {
    return "This feature strongly supports the current prediction.";
  }
  if (score >= 55) {
    return "This feature has a moderate influence on the current prediction.";
  }
  return "This feature is currently a limiting factor for the current prediction.";
}

function resetFeatureImportancePanel(tabKey) {
  const metaEl = document.getElementById("feature-importance-meta");
  const listEl = document.getElementById("feature-importance-list");
  if (!metaEl || !listEl) return;

  metaEl.textContent = `Run ${tabKey} prediction to view feature importance and explanation for your entered inputs.`;
  listEl.innerHTML = "";
}

function renderAnalysisCharts(
  tabKey,
  metrics,
  radarValues,
  featureInputs = {},
  outcomeText = "",
) {
  const metaEl = document.getElementById("feature-importance-meta");
  const listEl = document.getElementById("feature-importance-list");
  if (!metaEl || !listEl) return;

  const metricLine = (metrics || [])
    .map((metric) => `${metric.label}: ${Number(metric.value).toFixed(1)}`)
    .join(" | ");
  metaEl.textContent = metricLine
    ? `${tabKey} summary -> ${metricLine}`
    : `${tabKey} feature importance and explanation.`;

  const guide = FEATURE_IMPORTANCE_GUIDE[tabKey] || {};
  const factors = (radarValues?.labels || [])
    .map((label, index) => ({
      label,
      value: Number(radarValues?.values?.[index] || 0),
      inputValue: featureInputs[label],
      why:
        guide[label] ||
        `${label} influences the model outcome by shaping the risk and resilience profile.`,
    }))
    .sort((a, b) => b.value - a.value);

  listEl.innerHTML = factors
    .map((factor) => {
      const importanceTag =
        factor.value >= 75
          ? "High"
          : factor.value >= 55
            ? "Medium"
            : "Emerging";

      return `<article class="feature-item">
        <div class="feature-item-top">
          <span class="feature-name">${escapeHtml(factor.label)}</span>
          <span class="feature-importance-badge">${importanceTag} (${factor.value.toFixed(0)}%)</span>
        </div>
        <p class="feature-why">${escapeHtml(
          `Entered value: ${formatFeatureInputValue(factor.inputValue)}. ${factor.why} ${getFeatureContributionMessage(factor.value)}${outcomeText ? ` Result context: ${outcomeText}.` : ""}`,
        )}</p>
      </article>`;
    })
    .join("");
}

function showTab(tabKey) {
  document.querySelectorAll("[data-tab-button]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tabButton === tabKey);
  });
  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabKey);
  });
}

function setResultVisibility(resultId, visible) {
  const element = document.getElementById(resultId);
  if (element) element.classList.toggle("hidden", !visible);
}

function setError(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message || "";
}

function clearAnalysisErrors() {
  ["life-error", "economy-error", "health-error", "social-error"].forEach(
    (id) => setError(id, ""),
  );
}

function buildPolicyGuidance(moduleKey, payload, data) {
  if (moduleKey === "life") {
    const status = String(data.status || "").toLowerCase();
    const summary =
      status === "critical"
        ? "Current status is critical. Life expectancy pressure is high and immediate system-level action is needed."
        : status === "moderate"
          ? "Current status is moderate. Outcomes are manageable but still need targeted improvement policies."
          : "Current status is normal. Maintain strong public health systems while addressing emerging risks.";

    const recs = [
      payload.adult_mortality > 180
        ? "Prioritize adult mortality reduction through chronic care outreach and emergency response access."
        : "Sustain primary healthcare access to keep adult mortality under control.",
      payload.infant_deaths > 20
        ? "Expand maternal and infant care programs to lower early-life mortality."
        : "Protect maternal-child health funding to preserve low infant death rates.",
      payload.schooling < 10
        ? "Invest in education continuity programs; higher schooling strongly improves long-term health outcomes."
        : "Use schools and colleges for preventive-health campaigns and screening awareness.",
    ];

    return { summary, recommendations: recs };
  }

  if (moduleKey === "economy") {
    const status = String(data.status || "").toLowerCase();
    const summary =
      status === "developing"
        ? "Economic status is developing. Policy focus should be on jobs, stable income, and essential services."
        : status === "stable"
          ? "Economic status is stable. Strategic reforms can move the system toward stronger resilience."
          : "Economic status is advanced. Keep growth inclusive and protect against inequality and unemployment shocks.";

    const recs = [
      payload.gdp < 10000
        ? "Increase infrastructure and productivity investments to strengthen GDP growth."
        : "Channel GDP gains into health, education, and social protection for balanced development.",
      payload.income_composition_of_resources < 0.55
        ? "Strengthen inclusive-income and social protection policies to improve income composition quality."
        : "Maintain inclusive growth programs so income composition remains resilient.",
      payload.total_expenditure < 6
        ? "Increase public expenditure on core services, especially health and education."
        : "Protect efficient public spending and keep investment focused on high-impact sectors.",
    ];

    return { summary, recommendations: recs };
  }

  if (moduleKey === "health") {
    const risk = String(data.risk_level || "").toLowerCase();
    const summary =
      risk === "high"
        ? "Health risk is high. Public systems should prioritize urgent prevention and treatment coverage."
        : risk === "medium"
          ? "Health risk is medium. Preventive care and lifestyle interventions should be scaled now."
          : "Health risk is low. Maintain monitoring and prevention programs to prevent future deterioration.";

    const recs = [
      payload.adult_mortality > 180
        ? "Prioritize adult mortality reduction through chronic-care outreach and emergency response access."
        : "Sustain primary healthcare access to keep adult mortality under control.",
      payload.under_five_deaths > 20 || payload.infant_deaths > 20
        ? "Expand maternal and child-care programs to lower infant and under-five deaths."
        : "Maintain strong maternal-child services to preserve low early-life mortality.",
      (payload.hepatitis_b + payload.polio + payload.diphtheria) / 3 < 80
        ? "Expand immunization coverage through local campaigns and follow-up systems."
        : "Maintain high immunization coverage with stable supply and community outreach.",
    ];

    return { summary, recommendations: recs };
  }

  const category = String(data.category || "").toLowerCase();
  const summary =
    category === "poor"
      ? "Social status is poor. Community infrastructure and environmental quality need urgent policy attention."
      : category === "moderate"
        ? "Social status is moderate. Focused investments can substantially improve population wellbeing."
        : "Social status is good. Keep improving environmental quality and access equity across communities.";

  const recs = [
    payload.schooling < 10
      ? "Increase schooling retention and education quality programs to improve social resilience."
      : "Sustain education investments and keep school completion rates high.",
    payload.income_composition_of_resources < 0.55
      ? "Strengthen social-resource equity and income-support systems for vulnerable groups."
      : "Maintain strong social-protection coverage and equitable income policies.",
    payload.alcohol > 5
      ? "Expand alcohol-risk reduction programs and preventive counseling in high-risk communities."
      : "Continue preventive-health campaigns to keep alcohol-related social burden low.",
  ];

  return { summary, recommendations: recs };
}

function renderPolicyGuidance(moduleKey, payload, data) {
  const statusEl = document.getElementById(`${moduleKey}-policy-status`);
  const listEl = document.getElementById(`${moduleKey}-policy-recs`);
  if (!statusEl || !listEl) return;

  const guidance = buildPolicyGuidance(moduleKey, payload, data);
  statusEl.textContent = guidance.summary;
  listEl.innerHTML = guidance.recommendations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

const PREDICT_STATE_KEY = "lifevitals_predict_state";
const PREDICT_RESULT_KEY = "lifevitals_predict_result";
const PREDICT_ACTIVE_TAB_KEY = "lifevitals_predict_active_tab";
const MODULE_RESULT_KEYS = {
  economy: "lifevitals_predict_result_economy",
  health: "lifevitals_predict_result_health",
  social: "lifevitals_predict_result_social",
};

function getPredictForms() {
  return [
    document.getElementById("life-form"),
    document.getElementById("economy-form"),
    document.getElementById("health-form"),
    document.getElementById("social-form"),
  ].filter(Boolean);
}

function loadPredictState() {
  try {
    return JSON.parse(sessionStorage.getItem(PREDICT_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePredictState() {
  const state = {};
  for (const form of getPredictForms()) {
    for (const field of form.querySelectorAll("input, select, textarea")) {
      if (!field.id) continue;
      state[field.id] = field.value;
    }
  }
  sessionStorage.setItem(PREDICT_STATE_KEY, JSON.stringify(state));
}

function restorePredictState() {
  const state = loadPredictState();
  for (const form of getPredictForms()) {
    for (const field of form.querySelectorAll("input, select, textarea")) {
      if (!field.id || !(field.id in state)) continue;
      field.value = state[field.id];
    }
  }
}

function saveLifePredictionResult(payload, data) {
  sessionStorage.setItem(PREDICT_RESULT_KEY, JSON.stringify({ payload, data }));
}

function loadLifePredictionResult() {
  try {
    return JSON.parse(sessionStorage.getItem(PREDICT_RESULT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveModulePredictionResult(module, payload, data) {
  const key = MODULE_RESULT_KEYS[module];
  if (!key) return;
  sessionStorage.setItem(key, JSON.stringify({ payload, data }));
}

function loadModulePredictionResult(module) {
  const key = MODULE_RESULT_KEYS[module];
  if (!key) return null;
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function renderLifePredictionResult(payload, data) {
  setResultVisibility("life-result", true);
  setFieldValue("life-prediction", `${data.prediction.toFixed(1)} years`);
  setFieldValue("life-confidence", `${data.confidence_score.toFixed(1)}%`);
  setFieldValue("life-status", data.status);
  document.getElementById("life-insight").textContent = data.clinical_insight;

  renderAnalysisCharts(
    "Life Expectancy",
    [
      { label: "Prediction", value: data.prediction },
      { label: "Confidence", value: data.confidence_score },
    ],
    {
      labels: [
        "Mortality",
        "Infant",
        "Alcohol",
        "GDP",
        "BMI",
        "Schooling",
        "HIV/AIDS",
      ],
      values: [
        normalizeScore(100 - payload.adult_mortality, 0, 100),
        normalizeScore(100 - payload.infant_deaths, 0, 100),
        normalizeScore(10 - payload.alcohol, 0, 10),
        normalizeScore(payload.gdp, 0, 40000),
        normalizeScore(30 - Math.abs(payload.bmi - 22), 0, 30),
        normalizeScore(payload.schooling, 0, 18),
        normalizeScore(10 - payload.hiv_aids, 0, 10),
      ],
    },
    {
      Mortality: payload.adult_mortality,
      Infant: payload.infant_deaths,
      Alcohol: payload.alcohol,
      GDP: payload.gdp,
      BMI: payload.bmi,
      Schooling: payload.schooling,
      "HIV/AIDS": payload.hiv_aids,
    },
    `Predicted life expectancy ${data.prediction.toFixed(1)} years with ${data.status} status`,
  );
  renderPolicyGuidance("life", payload, data);
}

function renderEconomyPredictionResult(payload, data) {
  setResultVisibility("economy-result", true);
  setFieldValue("economy-status", data.status);
  document.getElementById("economy-insight").textContent = data.insight;

  renderAnalysisCharts(
    "Economy",
    [{ label: "Economic Score", value: data.score }],
    {
      labels: ["GDP", "Income Composition", "% Expenditure", "Population"],
      values: [
        normalizeScore(payload.gdp, 0, 70000),
        normalizeScore(payload.income_composition_of_resources, 0, 1),
        normalizeScore(payload.percentage_expenditure, 0, 500),
        normalizeScore(2_000_000_000 - payload.population, 0, 2_000_000_000),
      ],
    },
    {
      GDP: payload.gdp,
      "Income Composition": payload.income_composition_of_resources,
      "% Expenditure": payload.percentage_expenditure,
      Population: payload.population,
    },
    `Economic score ${data.score.toFixed(1)} with ${data.status} status`,
  );
  renderPolicyGuidance("economy", payload, data);
}

function renderHealthPredictionResult(payload, data) {
  setResultVisibility("health-result", true);
  setFieldValue("health-score", `${data.score.toFixed(1)}/100`);
  setFieldValue("health-risk", data.risk_level);
  document.getElementById("health-insight").textContent = data.insight;

  renderAnalysisCharts(
    "Health",
    [{ label: "Health Score", value: data.score }],
    {
      labels: [
        "Adult Mortality",
        "Infant Deaths",
        "BMI",
        "HIV/AIDS",
        "Hepatitis B",
        "Polio",
        "Diphtheria",
        "Under-five Deaths",
      ],
      values: [
        normalizeScore(400 - payload.adult_mortality, 0, 400),
        normalizeScore(150 - payload.infant_deaths, 0, 150),
        normalizeScore(30 - Math.abs(payload.bmi - 22), 0, 30),
        normalizeScore(10 - payload.hiv_aids, 0, 10),
        normalizeScore(payload.hepatitis_b, 0, 100),
        normalizeScore(payload.polio, 0, 100),
        normalizeScore(payload.diphtheria, 0, 100),
        normalizeScore(200 - payload.under_five_deaths, 0, 200),
      ],
    },
    {
      "Adult Mortality": payload.adult_mortality,
      "Infant Deaths": payload.infant_deaths,
      BMI: payload.bmi,
      "HIV/AIDS": payload.hiv_aids,
      "Hepatitis B": `${payload.hepatitis_b}%`,
      Polio: `${payload.polio}%`,
      Diphtheria: `${payload.diphtheria}%`,
      "Under-five Deaths": payload.under_five_deaths,
    },
    `Health score ${data.score.toFixed(1)} with ${data.risk_level} risk`,
  );
  renderPolicyGuidance("health", payload, data);
}

function renderSocialPredictionResult(payload, data) {
  setResultVisibility("social-result", true);
  setFieldValue("social-score", `${data.score.toFixed(1)}/100`);
  setFieldValue("social-category", data.category);
  document.getElementById("social-insight").textContent = data.insight;

  renderAnalysisCharts(
    "Social",
    [{ label: "Social Score", value: data.score }],
    {
      labels: [
        "Schooling",
        "Income Composition",
        "Alcohol",
        "Status",
        "Population",
      ],
      values: [
        normalizeScore(payload.schooling, 0, 20),
        normalizeScore(payload.income_composition_of_resources, 0, 1),
        normalizeScore(15 - payload.alcohol, 0, 15),
        normalizeScore(
          payload.status.toLowerCase() === "developed" ? 90 : 60,
          0,
          100,
        ),
        normalizeScore(2_000_000_000 - payload.population, 0, 2_000_000_000),
      ],
    },
    {
      Schooling: payload.schooling,
      "Income Composition": payload.income_composition_of_resources,
      Alcohol: payload.alcohol,
      Status: payload.status,
      Population: payload.population,
    },
    `Social score ${data.score.toFixed(1)} with ${data.category} category`,
  );
  renderPolicyGuidance("social", payload, data);
}

async function initPredict() {
  if (document.body.dataset.predictInitDone === "true") return;
  document.body.dataset.predictInitDone = "true";

  [
    PREDICT_RESULT_KEY,
    MODULE_RESULT_KEYS.economy,
    MODULE_RESULT_KEYS.health,
    MODULE_RESULT_KEYS.social,
  ].forEach((key) => localStorage.removeItem(key));

  const tabButtons = Array.from(document.querySelectorAll("[data-tab-button]"));
  const predictPage = document.querySelector('[data-page="predict"]');
  if (!predictPage || !tabButtons.length) return;

  const savedTab = sessionStorage.getItem(PREDICT_ACTIVE_TAB_KEY);
  let activeTab = ["life", "economy", "health", "social"].includes(savedTab)
    ? savedTab
    : "life";

  restorePredictState();

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tabButton;
      sessionStorage.setItem(PREDICT_ACTIVE_TAB_KEY, activeTab);
      showTab(activeTab);
      clearAnalysisErrors();
      resetFeatureImportancePanel(activeTab);
    });
  });

  showTab(activeTab);
  resetFeatureImportancePanel(activeTab);

  ["life-result", "economy-result", "health-result", "social-result"].forEach(
    (resultId) => setResultVisibility(resultId, false),
  );

  const lifeForm = document.getElementById("life-form");
  const economyForm = document.getElementById("economy-form");
  const healthForm = document.getElementById("health-form");
  const socialForm = document.getElementById("social-form");
  const shownResultState = {
    life: false,
    economy: false,
    health: false,
    social: false,
  };

  const lifeFields = {
    year: "life-year",
    adultMortality: "life-adult-mortality",
    infantDeaths: "life-infant-deaths",
    alcohol: "life-alcohol",
    gdp: "life-gdp",
    bmi: "life-bmi",
    schooling: "life-schooling",
    hivAids: "life-hiv-aids",
  };

  // Allow pre-filling from URL params (e.g., from map page)
  let FORCED_PREDICT_YEAR = null;
  let FORCED_PREDICT_COUNTRY = null;
  try {
    const params = new URLSearchParams(window.location.search);
    const pYear = params.get("year");
    const pCountry = params.get("country");
    if (pYear && !isNaN(Number(pYear))) {
      FORCED_PREDICT_YEAR = Number(pYear);
      setFieldValue("life-year", FORCED_PREDICT_YEAR);
    }
    if (pCountry) {
      FORCED_PREDICT_COUNTRY = decodeURIComponent(pCountry);
      showToast(`Selected country: ${FORCED_PREDICT_COUNTRY}`);
    }
  } catch (e) {
    /* ignore */
  }

  document
    .getElementById("life-autofill-btn")
    ?.addEventListener("click", async () => {
      try {
        const profile = await fetchProfile();
        const bmi = computeBmi(profile.height_cm, profile.weight_kg);
        setFieldValue("life-year", new Date().getFullYear());
        setFieldValue("life-bmi", bmi || 22);
        setFieldValue(
          "life-schooling",
          profile.education_level?.toLowerCase().includes("graduate") ? 16 : 12,
        );
        setFieldValue("life-gdp", 20000);
        setFieldValue("life-adult-mortality", 120);
        setFieldValue("life-infant-deaths", 15);
        setFieldValue("life-alcohol", 4.2);
        setFieldValue("life-hiv-aids", 0.5);
        showToast("Life expectancy inputs autofilled");
      } catch (error) {
        setError("life-error", error.message);
      }
    });

  document
    .getElementById("economy-autofill-btn")
    ?.addEventListener("click", async () => {
      try {
        setFieldValue("economy-gdp", 24000);
        setFieldValue("economy-income-composition", 0.68);
        setFieldValue("economy-percentage-expenditure", 220);
        setFieldValue("economy-population", 1_250_000);
        setFieldValue("economy-total-expenditure", 6.8);
        showToast("Economy inputs autofilled");
      } catch (error) {
        setError("economy-error", error.message);
      }
    });

  document
    .getElementById("health-autofill-btn")
    ?.addEventListener("click", async () => {
      try {
        const profile = await fetchProfile();
        const bmi = computeBmi(profile.height_cm, profile.weight_kg);

        setFieldValue("health-bmi", bmi || 23.4);
        setFieldValue("health-adult-mortality", 135);
        setFieldValue("health-infant-deaths", 12);
        setFieldValue("health-hiv-aids", 0.4);
        setFieldValue("health-hepatitis-b", 88);
        setFieldValue("health-polio", 90);
        setFieldValue("health-diphtheria", 89);
        setFieldValue("health-under-five-deaths", 16);
        showToast("Health inputs autofilled");
      } catch (error) {
        setError("health-error", error.message);
      }
    });

  document
    .getElementById("social-autofill-btn")
    ?.addEventListener("click", async () => {
      try {
        const profile = await fetchProfile();
        const educationLevel = profile.education_level?.toLowerCase() || "";
        const schooling = educationLevel.includes("graduate")
          ? 16
          : educationLevel.includes("college")
            ? 14
            : 11;

        setFieldValue("social-schooling", schooling);
        setFieldValue("social-income-composition", 0.66);
        setFieldValue("social-alcohol", 3.5);
        setFieldValue("social-status", "Developing");
        setFieldValue("social-population", 1_250_000);
        showToast("Social inputs autofilled");
      } catch (error) {
        setError("social-error", error.message);
      }
    });

  lifeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = document.getElementById("life-submit");
    const payload = {
      year: getNumericValue(lifeFields.year),
      country: FORCED_PREDICT_COUNTRY ?? undefined,
      adult_mortality: getNumericValue(lifeFields.adultMortality),
      infant_deaths: getNumericValue(lifeFields.infantDeaths),
      alcohol: getNumericValue(lifeFields.alcohol),
      gdp: getNumericValue(lifeFields.gdp),
      bmi: getNumericValue(lifeFields.bmi),
      schooling: getNumericValue(lifeFields.schooling),
      hiv_aids: getNumericValue(lifeFields.hivAids),
    };

    setError("life-error", "");
    await withLoading(submitButton, "Predicting...", async () => {
      try {
        const data = await apiFetch("/predict-life", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        renderLifePredictionResult(payload, data);
        shownResultState.life = true;
        saveLifePredictionResult(payload, data);
      } catch (error) {
        setError("life-error", error.message);
      }
    });
  });

  economyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = document.getElementById("economy-submit");
    const payload = {
      year: FORCED_PREDICT_YEAR ?? new Date().getFullYear(),
      country: FORCED_PREDICT_COUNTRY ?? undefined,
      gdp: getNumericValue("economy-gdp"),
      income_composition_of_resources: getNumericValue(
        "economy-income-composition",
      ),
      percentage_expenditure: getNumericValue("economy-percentage-expenditure"),
      total_expenditure: getNumericValue("economy-total-expenditure"),
      population: getNumericValue("economy-population"),
    };

    setError("economy-error", "");
    await withLoading(submitButton, "Analyzing...", async () => {
      try {
        const data = await apiFetch("/predict-economy", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        renderEconomyPredictionResult(payload, data);
        shownResultState.economy = true;
        saveModulePredictionResult("economy", payload, data);
      } catch (error) {
        setError("economy-error", error.message);
      }
    });
  });

  healthForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = document.getElementById("health-submit");
    const payload = {
      year: FORCED_PREDICT_YEAR ?? new Date().getFullYear(),
      country: FORCED_PREDICT_COUNTRY ?? undefined,
      adult_mortality: getNumericValue("health-adult-mortality"),
      infant_deaths: getNumericValue("health-infant-deaths"),
      bmi: getNumericValue("health-bmi"),
      hiv_aids: getNumericValue("health-hiv-aids"),
      hepatitis_b: getNumericValue("health-hepatitis-b"),
      polio: getNumericValue("health-polio"),
      diphtheria: getNumericValue("health-diphtheria"),
      under_five_deaths: getNumericValue("health-under-five-deaths"),
    };

    setError("health-error", "");
    await withLoading(submitButton, "Analyzing...", async () => {
      try {
        const data = await apiFetch("/predict-health", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        renderHealthPredictionResult(payload, data);
        shownResultState.health = true;
        saveModulePredictionResult("health", payload, data);
      } catch (error) {
        setError("health-error", error.message);
      }
    });
  });

  socialForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = document.getElementById("social-submit");
    const payload = {
      year: FORCED_PREDICT_YEAR ?? new Date().getFullYear(),
      country: FORCED_PREDICT_COUNTRY ?? undefined,
      schooling: getNumericValue("social-schooling"),
      income_composition_of_resources: getNumericValue(
        "social-income-composition",
      ),
      alcohol: getNumericValue("social-alcohol"),
      status: document.getElementById("social-status").value,
      population: getNumericValue("social-population"),
    };

    setError("social-error", "");
    await withLoading(submitButton, "Analyzing...", async () => {
      try {
        const data = await apiFetch("/predict-social", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        renderSocialPredictionResult(payload, data);
        shownResultState.social = true;
        saveModulePredictionResult("social", payload, data);
      } catch (error) {
        setError("social-error", error.message);
      }
    });
  });

  if (!document.getElementById("life-year")?.value) {
    setFieldValue("life-year", new Date().getFullYear());
  }
  if (!document.getElementById("economy-income-composition")?.value) {
    setFieldValue("economy-income-composition", 0.65);
  }
  if (!document.getElementById("social-status")?.value) {
    setFieldValue("social-status", "Developing");
  }
  if (!document.getElementById("social-schooling")?.value) {
    setFieldValue("social-schooling", 12);
  }

  for (const form of getPredictForms()) {
    form.addEventListener("input", savePredictState);
    form.addEventListener("change", savePredictState);
  }

  lifeForm?.addEventListener("input", () => {
    if (shownResultState.life) setResultVisibility("life-result", true);
  });
  economyForm?.addEventListener("input", () => {
    if (shownResultState.economy) setResultVisibility("economy-result", true);
  });
  healthForm?.addEventListener("input", () => {
    if (shownResultState.health) setResultVisibility("health-result", true);
  });
  socialForm?.addEventListener("input", () => {
    if (shownResultState.social) setResultVisibility("social-result", true);
  });

  const savedLifeResult = loadLifePredictionResult();
  if (savedLifeResult?.payload && savedLifeResult?.data) {
    renderLifePredictionResult(savedLifeResult.payload, savedLifeResult.data);
    shownResultState.life = true;
  }

  for (const module of ["economy", "health", "social"]) {
    const savedResult = loadModulePredictionResult(module);
    if (!savedResult?.payload || !savedResult?.data) continue;
    if (module === "economy") {
      renderEconomyPredictionResult(savedResult.payload, savedResult.data);
      shownResultState.economy = true;
    } else if (module === "health") {
      renderHealthPredictionResult(savedResult.payload, savedResult.data);
      shownResultState.health = true;
    } else if (module === "social") {
      renderSocialPredictionResult(savedResult.payload, savedResult.data);
      shownResultState.social = true;
    }
  }

  savePredictState();
}

async function initHistory() {
  const moduleBodies = {
    life: document.getElementById("history-life-body"),
    economy: document.getElementById("history-economy-body"),
    health: document.getElementById("history-health-body"),
    social: document.getElementById("history-social-body"),
  };
  const historyDetailModal = document.getElementById("history-detail-modal");
  const historyDetailTitle = document.getElementById("history-detail-title");
  const historyDetailBody = document.getElementById("history-detail-body");

  if (
    !moduleBodies.life ||
    !moduleBodies.economy ||
    !moduleBodies.health ||
    !moduleBodies.social ||
    !historyDetailModal ||
    !historyDetailBody
  ) {
    return;
  }

  const filterButtons = Array.from(
    document.querySelectorAll("[data-history-filter]"),
  );
  let activeFilter = "all";
  let fullHistory = [];

  const setActiveFilterButton = (filterKey) => {
    filterButtons.forEach((button) => {
      const isActive = button.dataset.historyFilter === filterKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  const prettifyKey = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const moduleMeta = {
    life: {
      title: "Life Expectancy",
      predictionLabel: "Predicted Life Expectancy",
      valueLabel: "years",
      detailLabel: "Life Expectancy Full Description",
      inputLabel: "Clinical Insight",
    },
    economy: {
      title: "Economy",
      predictionLabel: "Economic Score",
      valueLabel: "/ 100",
      detailLabel: "Economy Full Description",
      inputLabel: "Economic Insight",
    },
    health: {
      title: "Health",
      predictionLabel: "Health Score",
      valueLabel: "/ 100",
      detailLabel: "Health Full Description",
      inputLabel: "Health Insight",
    },
    social: {
      title: "Social",
      predictionLabel: "Social Score",
      valueLabel: "/ 100",
      detailLabel: "Social Full Description",
      inputLabel: "Social Insight",
    },
  };

  const getModuleMeta = (module) => moduleMeta[module] || moduleMeta.life;

  const closeHistoryDetailModal = () => {
    historyDetailModal.classList.add("hidden");
  };

  const openHistoryDetailModal = (item) => {
    const module = getHistoryModule(item);
    const meta = getModuleMeta(module);
    const inputPayload = item?.input_payload || {};
    const inputRows = Object.entries(inputPayload)
      .filter(([key]) => key !== "module")
      .map(
        ([key, value]) =>
          `<li><strong>${escapeHtml(prettifyKey(key))}:</strong> ${escapeHtml(String(value))}</li>`,
      )
      .join("");

    const statusClass = mapStatusBadgeClass(item.status, module);
    const predictionValue = formatHistoryPrediction(item, module);

    if (historyDetailTitle) {
      historyDetailTitle.textContent = `${meta.title} Full Description`;
    }

    historyDetailBody.innerHTML = `
      <div class="history-detail-grid">
        <div class="history-detail-item"><strong>ID</strong><span>${item.id}</span></div>
        <div class="history-detail-item"><strong>Date & Time</strong><span>${escapeHtml(formatHistoryDateTime(item.created_at))}</span></div>
        <div class="history-detail-item"><strong>Prediction</strong><span>${escapeHtml(predictionValue)}</span></div>
        <div class="history-detail-item"><strong>Confidence</strong><span>${escapeHtml(formatHistoryConfidence(item))}</span></div>
        <div class="history-detail-item"><strong>Status</strong><span class="badge ${statusClass}">${escapeHtml(String(item.status || "--"))}</span></div>
        <div class="history-detail-item"><strong>Module</strong><span>${escapeHtml(meta.title)}</span></div>
      </div>
      <div>
        <h4 style="margin:0 0 6px;">${escapeHtml(meta.inputLabel)}</h4>
        <div class="history-detail-insight">${escapeHtml(item.clinical_insight || "--")}</div>
      </div>
      <div>
        <h4 style="margin:0 0 6px;">Input Values</h4>
        <ul class="history-detail-inputs">${inputRows || "<li>No input data available.</li>"}</ul>
      </div>
    `;

    historyDetailModal.classList.remove("hidden");
    attachHistoryDownloadButton(item);
  };

  // Inject a download button into the history-detail modal body when opened
  const attachHistoryDownloadButton = (item) => {
    const downloadBtnId = "history-download-btn";
    const existing = document.getElementById(downloadBtnId);
    if (existing) existing.remove();

    const btn = document.createElement("button");
    btn.id = downloadBtnId;
    btn.type = "button";
    btn.className = "btn btn-primary";
    btn.textContent = "Download Report (PDF)";
    btn.addEventListener("click", () => {
      const meta = getModuleMeta(getHistoryModule(item));
      const inputPayload = item.input_payload || {};
      const rows = Object.entries(inputPayload)
        .filter(([k]) => k !== "module")
        .map(([k, v]) => ({ label: prettifyKey(k), value: String(v) }));

      const reportItems = [
        { label: "ID", value: String(item.id) },
        { label: "Date", value: formatHistoryDateTime(item.created_at) },
        { label: "Module", value: meta.title },
        {
          label: meta.predictionLabel,
          value: formatHistoryPrediction(item, getHistoryModule(item)),
        },
        { label: "Confidence", value: formatHistoryConfidence(item) },
        { label: "Status", value: String(item.status || "--") },
        { label: "Clinical Insight", value: item.clinical_insight || "--" },
        ...rows,
      ];

      createReportPDF(`${meta.title} - Prediction ${item.id}`, reportItems);
    });

    const header = historyDetailModal.querySelector(".history-modal-header");
    if (header) header.appendChild(btn);
  };

  const renderHistoryByFilter = () => {
    const history = fullHistory.filter((item) =>
      isHistoryItemInFilter(item, activeFilter),
    );

    const grouped = {
      life: [],
      economy: [],
      health: [],
      social: [],
    };

    history.forEach((item) => {
      const module = getHistoryModule(item);
      if (grouped[module]) {
        grouped[module].push(item);
      } else {
        grouped.life.push(item);
      }
    });

    ["life", "economy", "health", "social"].forEach((module) => {
      const rows = grouped[module];
      const body = moduleBodies[module];
      const colSpan = 7;
      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="${colSpan}">No ${module} predictions for selected filter.</td></tr>`;
        return;
      }

      body.innerHTML = rows
        .map((item) => {
          const statusClass = mapStatusBadgeClass(item.status, module);
          const statusText = escapeHtml(item.status);
          const insight = escapeHtml(
            compactHistoryInsight(item.clinical_insight),
          );
          return `<tr>
            <td>${item.id}</td>
            <td>${formatHistoryDateTime(item.created_at)}</td>
            <td>${formatHistoryPrediction(item, module)}</td>
            <td>${formatHistoryConfidence(item)}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td class="history-insight">${insight}</td>
            <td>
              <div class="history-actions">
                    <button class="btn btn-secondary history-action-btn" type="button" data-history-action="view" data-history-id="${item.id}">Full Description</button>
                    <button class="btn btn-primary history-action-btn" type="button" data-history-action="download" data-history-id="${item.id}">Download</button>
                    <button class="btn history-action-btn history-action-btn-danger" type="button" data-history-action="delete" data-history-id="${item.id}">Delete</button>
              </div>
            </td>
          </tr>`;
        })
        .join("");
    });
  };

  Object.values(moduleBodies).forEach((body) => {
    body.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-history-action]");
      if (!actionButton) return;

      const predictionId = Number(actionButton.dataset.historyId);
      if (!predictionId) return;

      const item = fullHistory.find((entry) => entry.id === predictionId);
      if (!item) return;

      const action = actionButton.dataset.historyAction;
      if (action === "view") {
        openHistoryDetailModal(item);
        return;
      }

      if (action === "download") {
        try {
          const meta = getModuleMeta(getHistoryModule(item));
          const inputPayload = item.input_payload || {};
          const rows = Object.entries(inputPayload)
            .filter(([key]) => key !== "module")
            .map(([key, value]) => ({
              label: prettifyKey(key),
              value: String(value),
            }));

          const reportItems = [
            { label: "ID", value: String(item.id) },
            { label: "Date", value: formatHistoryDateTime(item.created_at) },
            { label: "Module", value: meta.title },
            {
              label: meta.predictionLabel,
              value: formatHistoryPrediction(item, getHistoryModule(item)),
            },
            { label: "Confidence", value: formatHistoryConfidence(item) },
            { label: "Status", value: String(item.status || "--") },
            { label: "Clinical Insight", value: item.clinical_insight || "--" },
            ...rows,
          ];

          createReportPDF(`${meta.title} - Prediction ${item.id}`, reportItems);
        } catch (err) {
          showToast("Unable to create report: " + err.message);
        }
        return;
      }

      if (action === "delete") {
        const confirmed = window.confirm(
          "Delete this history record? This action cannot be undone.",
        );
        if (!confirmed) return;

        try {
          await apiFetch(`/history/${predictionId}`, { method: "DELETE" });
          fullHistory = fullHistory.filter(
            (entry) => entry.id !== predictionId,
          );
          renderHistoryByFilter();
          showToast("History deleted successfully");
        } catch (error) {
          showToast(error.message);
        }
      }
    });
  });

  historyDetailModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-history-close-modal]")) {
      closeHistoryDetailModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !historyDetailModal.classList.contains("hidden")
    ) {
      closeHistoryDetailModal();
    }
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.historyFilter || "all";
      setActiveFilterButton(activeFilter);
      renderHistoryByFilter();
    });
  });

  try {
    fullHistory = await fetchHistory();
    setActiveFilterButton(activeFilter);
    renderHistoryByFilter();
  } catch (error) {
    showToast(error.message);
  }
}

async function initAnalytics() {
  const trendCanvas = document.getElementById("trend-chart");
  if (!trendCanvas || typeof Chart === "undefined") return;

  try {
    const history = await fetchHistory();
    const lifeHistory = history.filter(
      (item) => getHistoryModule(item) === "life",
    );
    if (!lifeHistory.length) return;

    const labels = lifeHistory
      .slice()
      .reverse()
      .map((item) => formatHistoryDateTime(item.created_at));
    const expectancy = lifeHistory
      .slice()
      .reverse()
      .map((item) => item.predicted_life_expectancy);
    const bmi = lifeHistory
      .slice()
      .reverse()
      .map((item) => item.input_payload.bmi);
    const schooling = lifeHistory
      .slice()
      .reverse()
      .map((item) => item.input_payload.schooling);

    new Chart(trendCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Life Expectancy",
            data: expectancy,
            borderColor: "#0b4ea2",
            backgroundColor: "rgba(11,78,162,0.18)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
    });

    new Chart(document.getElementById("bmi-schooling-chart"), {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "BMI vs Schooling",
            data: bmi.map((b, i) => ({ x: schooling[i], y: b })),
            pointBackgroundColor: "#2e7dd7",
          },
        ],
      },
      options: {
        scales: {
          x: { title: { display: true, text: "Schooling (Years)" } },
          y: { title: { display: true, text: "BMI" } },
        },
      },
    });

    const forecast = expectancy.slice(-1)[0] || 72;
    const forecastData = Array.from({ length: 6 }, (_, i) =>
      Number((forecast + i * 0.35).toFixed(1)),
    );
    new Chart(document.getElementById("forecast-chart"), {
      type: "bar",
      data: {
        labels: ["Y+1", "Y+2", "Y+3", "Y+4", "Y+5", "Y+6"],
        datasets: [
          {
            label: "Forecast",
            data: forecastData,
            backgroundColor: "rgba(46,125,215,0.8)",
          },
        ],
      },
    });
  } catch (error) {
    showToast(error.message);
  }
}

async function initProfile() {
  const form = document.getElementById("profile-form");
  if (!form) return;

  try {
    const profile = await fetchProfile();
    Object.keys(profile).forEach((key) => {
      const field = document.getElementById(`profile_${key}`);
      if (field) field.value = profile[key];
    });
  } catch (error) {
    showToast(error.message);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("save-profile-btn");

    const payload = {
      full_name: document.getElementById("profile_full_name").value,
      age: Number(document.getElementById("profile_age").value),
      gender: document.getElementById("profile_gender").value,
      country: document.getElementById("profile_country").value,
      height_cm: Number(document.getElementById("profile_height_cm").value),
      weight_kg: Number(document.getElementById("profile_weight_kg").value),
      smoking_status: document.getElementById("profile_smoking_status").value,
      alcohol_consumption: document.getElementById(
        "profile_alcohol_consumption",
      ).value,
      physical_activity: document.getElementById("profile_physical_activity")
        .value,
      education_level: document.getElementById("profile_education_level").value,
      occupation: document.getElementById("profile_occupation").value,
      income_range: document.getElementById("profile_income_range").value,
      user_role: document.getElementById("profile_user_role").value,
    };

    await withLoading(button, "Saving...", async () => {
      try {
        await apiFetch("/profile", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("Profile saved");
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

async function initMap() {
  if (window.LifeVitalsMap?.init) {
    await window.LifeVitalsMap.init();
  }
}

function initLanding() {
  const purposeButtons = Array.from(
    document.querySelectorAll("[data-purpose]"),
  );
  const destinationCards = Array.from(
    document.querySelectorAll("[data-destination-card]"),
  );
  const landingSearch = document.getElementById("landing-search");
  const landingSearchHint = document.getElementById("landing-search-hint");
  const landingPurposeMessage = document.getElementById(
    "landing-purpose-message",
  );
  const landingTipsList = document.getElementById("landing-tips-list");
  const landingEmptyState = document.getElementById("landing-empty-state");
  const landingExploreBtn = document.getElementById("landing-explore-btn");
  const landingGetStarted = document.getElementById("landing-get-started");

  const spotlightFields = {
    name: document.getElementById("landing-spotlight-name"),
    copy: document.getElementById("landing-spotlight-copy"),
    life: document.getElementById("landing-spotlight-life"),
    safety: document.getElementById("landing-spotlight-safety"),
  };

  const sampleFields = {
    country: document.getElementById("landing-sample-country"),
    emoji: document.getElementById("landing-sample-emoji"),
    life: document.getElementById("landing-sample-life"),
    safety: document.getElementById("landing-sample-safety"),
    copy: document.getElementById("landing-sample-copy"),
    recommendation: document.getElementById("landing-sample-recommendation"),
  };

  if (
    !purposeButtons.length ||
    !destinationCards.length ||
    !landingSearch ||
    !landingPurposeMessage ||
    !landingTipsList
  ) {
    return;
  }

  const purposeContent = {
    tourism: {
      message:
        "Tourism mode: understand expected life expectancy, safety, and travel considerations to plan trips responsibly.",
      tips: [
        "Check local entry rules and healthcare access before travelling.",
        "Prioritize destinations with strong emergency and medical services for peace of mind.",
        "Consider life-expectancy context alongside safety and transport when choosing regions to visit.",
      ],
    },
    job: {
      message:
        "Job mode: evaluate economic opportunity, living conditions and life-expectancy factors for career moves.",
      tips: [
        "Compare salaries, healthcare access, and cost of living together.",
        "Check work visa routes and long-term social supports for settling.",
        "Factor expected life span and public services into long-term career decisions.",
      ],
    },
    settlement: {
      message:
        "Settlement mode: examine life expectancy, healthcare, and social conditions before planning a long-term move.",
      tips: [
        "Prioritize robust healthcare and social protections for longer stays.",
        "Assess schooling, housing, and community support as part of wellbeing planning.",
        "Use life-expectancy insights to compare long-term living prospects across countries.",
      ],
    },
    investment: {
      message:
        "Investment mode: weigh economic strength together with social and health indicators that affect workforce and stability.",
      tips: [
        "Study economic growth alongside population health and public services.",
        "Consider how life-expectancy and social conditions influence long-term workforce resilience.",
        "Use destination cards to scan risk, opportunity, and long-term livability factors.",
      ],
    },
  };

  let activePurpose = "tourism";
  let activeCard = destinationCards[0] || null;

  const renderTips = (tips) => {
    landingTipsList.innerHTML = (tips || [])
      .map((tip) => `<li>${escapeHtml(tip)}</li>`)
      .join("");
  };

  const applyPurpose = (purpose) => {
    activePurpose = purpose;
    purposeButtons.forEach((button) => {
      const isActive = button.dataset.purpose === purpose;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    const content = purposeContent[purpose] || purposeContent.tourism;
    landingPurposeMessage.textContent = content.message;
    renderTips(content.tips);
  };

  const applyCard = (card) => {
    if (!card) return;

    activeCard = card;
    destinationCards.forEach((item) => {
      item.classList.toggle("active", item === card);
    });

    const safetyClass = card.dataset.safetyClass || "safe";
    const safetyText = card.dataset.safety || "Safe";
    const headlineSafety = safetyText === "Safe" ? "High" : safetyText;
    const recommendation =
      activePurpose === "tourism"
        ? card.dataset.tip ||
          card.dataset.copy ||
          "A strong destination choice."
        : card.dataset.copy || "A strong destination choice.";

    if (spotlightFields.name)
      spotlightFields.name.textContent = card.dataset.name || "Country";
    if (spotlightFields.copy)
      spotlightFields.copy.textContent = card.dataset.copy || "";
    if (spotlightFields.life)
      spotlightFields.life.textContent = card.dataset.life || "--";
    if (spotlightFields.safety) {
      spotlightFields.safety.className = `badge ${safetyClass}`;
      spotlightFields.safety.textContent = safetyText;
    }

    if (sampleFields.country)
      sampleFields.country.textContent = card.dataset.name || "Country";
    if (sampleFields.emoji)
      sampleFields.emoji.textContent = card.dataset.emoji || "🌍";
    if (sampleFields.life)
      sampleFields.life.textContent = card.dataset.life || "--";
    if (sampleFields.safety) {
      sampleFields.safety.className = `badge ${safetyClass}`;
      sampleFields.safety.textContent = headlineSafety;
    }
    if (sampleFields.copy)
      sampleFields.copy.textContent = card.dataset.copy || "";
    if (sampleFields.recommendation)
      sampleFields.recommendation.textContent = recommendation;
  };

  const filterDestinations = (query) => {
    const value = query.trim().toLowerCase();
    let visibleCards = destinationCards;

    if (value) {
      visibleCards = destinationCards.filter((card) => {
        const haystack = [
          card.dataset.name,
          card.dataset.copy,
          card.dataset.tip,
          card.dataset.safety,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(value);
      });
    }

    destinationCards.forEach((card) => {
      const isVisible = !value || visibleCards.includes(card);
      card.classList.toggle("hidden", !isVisible);
    });

    if (landingEmptyState) {
      landingEmptyState.classList.toggle("hidden", visibleCards.length > 0);
    }

    if (landingSearchHint) {
      landingSearchHint.textContent = value
        ? `${visibleCards.length} destination${visibleCards.length === 1 ? "" : "s"} match your search.`
        : "Try Japan, Canada, Portugal, or New Zealand.";
    }

    const selectedVisible =
      visibleCards.find((card) => card.classList.contains("active")) ||
      visibleCards[0];
    if (selectedVisible) {
      applyCard(selectedVisible);
    }
  };

  purposeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyPurpose(button.dataset.purpose || "tourism");
      if (activeCard) applyCard(activeCard);
    });
  });

  destinationCards.forEach((card) => {
    card.addEventListener("click", () => applyCard(card));
  });

  landingSearch.addEventListener("input", () => {
    filterDestinations(landingSearch.value);
  });

  landingExploreBtn?.addEventListener("click", () => {
    document.getElementById("landing-destinations")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    landingSearch.focus();
  });

  landingGetStarted?.addEventListener("click", () => {
    window.location.href = getToken() ? "dashboard.html" : "signup.html";
  });

  applyPurpose(activePurpose);
  applyCard(activeCard);
  filterDestinations(landingSearch.value);
}

function applyTheme(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme === "light");
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "Light" : "Dark";
}

function initTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = document.body.classList.contains("theme-dark")
        ? "dark"
        : "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
}

async function initFeedback() {
  const feedbackForm = document.getElementById("feedback-form");
  const contactForm = document.getElementById("contact-form");
  const experienceForm = document.getElementById("experience-form");
  const successMsg = document.getElementById("feedback-success");

  if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("feedback-error");
      errorEl.style.display = "none";

      const data = {
        overall_rating: parseInt(
          document.getElementById("feedback_overall_rating").value,
        ),
        ease_of_use: parseInt(
          document.getElementById("feedback_ease_of_use").value,
        ),
        features_used: document.getElementById("feedback_features_used").value,
        comments: document.getElementById("feedback_comments").value,
      };

      try {
        const response = await apiFetch("/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          feedbackForm.reset();
          successMsg.style.display = "block";
          setTimeout(() => {
            successMsg.style.display = "none";
          }, 5000);
        } else {
          const err = await response.json();
          errorEl.textContent = err.detail || "Failed to submit feedback";
          errorEl.style.display = "block";
        }
      } catch (error) {
        errorEl.textContent = "Error submitting feedback: " + error.message;
        errorEl.style.display = "block";
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("contact-error");
      errorEl.style.display = "none";

      // Validate email
      const email = document.getElementById("contact_email").value;
      if (!email.includes("@")) {
        errorEl.textContent = "Please enter a valid email address";
        errorEl.style.display = "block";
        return;
      }

      const data = {
        name: document.getElementById("contact_name").value,
        email: email,
        subject: document.getElementById("contact_subject").value,
        message: document.getElementById("contact_message").value,
      };

      try {
        const response = await apiFetch("/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          contactForm.reset();
          successMsg.style.display = "block";
          setTimeout(() => {
            successMsg.style.display = "none";
          }, 5000);
        } else {
          const err = await response.json();
          errorEl.textContent = err.detail || "Failed to send message";
          errorEl.style.display = "block";
        }
      } catch (error) {
        errorEl.textContent = "Error sending message: " + error.message;
        errorEl.style.display = "block";
      }
    });
  }

  if (experienceForm) {
    experienceForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("experience-error");
      errorEl.style.display = "none";

      const data = {
        country_visited: document.getElementById("experience_country_visited")
          .value,
        visit_duration: parseInt(
          document.getElementById("experience_visit_duration").value,
        ),
        healthcare: parseInt(
          document.getElementById("experience_healthcare").value,
        ),
        nutrition: parseInt(
          document.getElementById("experience_nutrition").value,
        ),
        environment: parseInt(
          document.getElementById("experience_environment").value,
        ),
        safety: parseInt(document.getElementById("experience_safety").value),
        education: parseInt(
          document.getElementById("experience_education").value,
        ),
        physical_activity: parseInt(
          document.getElementById("experience_physical_activity").value,
        ),
        overall_experience: parseInt(
          document.getElementById("experience_overall").value,
        ),
        comments: document.getElementById("experience_comments").value,
      };

      try {
        const response = await apiFetch("/experience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          experienceForm.reset();
          successMsg.style.display = "block";
          setTimeout(() => {
            successMsg.style.display = "none";
          }, 5000);
        } else {
          const err = await response.json();
          errorEl.textContent =
            err.detail || "Failed to submit experience rating";
          errorEl.style.display = "block";
        }
      } catch (error) {
        errorEl.textContent = "Error submitting experience: " + error.message;
        errorEl.style.display = "block";
      }
    });
  }
}

async function bootstrap() {
  redirectIfUnauthenticated();
  attachLogout();
  markActiveNav();
  initTheme();
  await validateSavedSession();

  const page = document.body.dataset.page;
  if (page === "landing") initLanding();
  if (page === "signup") initSignup();
  if (page === "login") initLogin();
  if (page === "dashboard") initDashboard();
  if (page === "predict") initPredict();
  if (page === "history") initHistory();
  if (page === "analytics") initAnalytics();
  if (page === "map") initMap();
  if (page === "profile") initProfile();
  if (page === "feedback") initFeedback();
}

// --- PDF generation and report helpers ---
function prettifyLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ensureJsPDFLoaded() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve();
      else reject(new Error("jsPDF failed to load"));
    };
    s.onerror = (e) => reject(new Error("Failed to load jsPDF"));
    document.head.appendChild(s);
  });
}

async function createReportPDF(title, items = []) {
  try {
    await ensureJsPDFLoaded();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const left = 14;
    let y = 18;

    doc.setFontSize(14);
    doc.text(title, left, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, y);
    y += 8;

    for (const item of items) {
      const label = `${item.label}: `;
      const value = String(item.value ?? "--");
      const lines = doc.splitTextToSize(label + value, 180);
      y += 4;
      doc.text(lines, left, y);
      y += lines.length * 6;
      if (y > 270) {
        doc.addPage();
        y = 18;
      }
    }

    const safeTitle =
      title.replace(/[^a-z0-9\-\_ ]+/gi, "").slice(0, 60) || "report";
    doc.save(`${safeTitle}.pdf`);
  } catch (error) {
    showToast("Unable to create PDF: " + error.message);
  }
}

function buildReportItemsFromPayload(payload) {
  return Object.entries(payload || {}).map(([k, v]) => ({
    label: prettifyLabel(k),
    value: String(v),
  }));
}

async function downloadPredictReport() {
  const activeTab =
    sessionStorage.getItem(PREDICT_ACTIVE_TAB_KEY) ||
    document.querySelector("[data-tab-button].active")?.dataset.tabButton ||
    "life";
  let saved = null;
  if (activeTab === "life") saved = loadLifePredictionResult();
  else saved = loadModulePredictionResult(activeTab);

  if (saved?.payload && saved?.data) {
    const items = [
      { label: "Module", value: prettifyLabel(activeTab) },
      {
        label: "Result",
        value:
          activeTab === "life"
            ? `${saved.data.prediction.toFixed(1)} years`
            : saved.data.score
              ? String(saved.data.score)
              : "--",
      },
      {
        label: "Confidence / Status",
        value: saved.data.confidence_score
          ? `${saved.data.confidence_score}% / ${saved.data.status || "--"}`
          : saved.data.status || "--",
      },
      {
        label: "Clinical Insight",
        value: saved.data.clinical_insight || saved.data.insight || "--",
      },
      ...buildReportItemsFromPayload(saved.payload),
    ];
    createReportPDF(`${prettifyLabel(activeTab)} Prediction Report`, items);
    return;
  }

  // fallback: try reading DOM
  const items = [{ label: "Module", value: prettifyLabel(activeTab) }];
  if (activeTab === "life") {
    items.push({
      label: "Predicted Life Expectancy",
      value: document.getElementById("life-prediction")?.textContent || "--",
    });
    items.push({
      label: "Confidence",
      value: document.getElementById("life-confidence")?.textContent || "--",
    });
    items.push({
      label: "Status",
      value: document.getElementById("life-status")?.textContent || "--",
    });
    items.push({
      label: "Insight",
      value: document.getElementById("life-insight")?.textContent || "--",
    });
  } else if (activeTab === "economy") {
    items.push({
      label: "Economic Score",
      value: document.getElementById("economy-score")?.textContent || "--",
    });
    items.push({
      label: "Status",
      value: document.getElementById("economy-status")?.textContent || "--",
    });
    items.push({
      label: "Insight",
      value: document.getElementById("economy-insight")?.textContent || "--",
    });
  } else if (activeTab === "health") {
    items.push({
      label: "Health Score",
      value: document.getElementById("health-score")?.textContent || "--",
    });
    items.push({
      label: "Risk",
      value: document.getElementById("health-risk")?.textContent || "--",
    });
    items.push({
      label: "Insight",
      value: document.getElementById("health-insight")?.textContent || "--",
    });
  } else if (activeTab === "social") {
    items.push({
      label: "Social Score",
      value: document.getElementById("social-score")?.textContent || "--",
    });
    items.push({
      label: "Category",
      value: document.getElementById("social-category")?.textContent || "--",
    });
    items.push({
      label: "Insight",
      value: document.getElementById("social-insight")?.textContent || "--",
    });
  }

  createReportPDF(`${prettifyLabel(activeTab)} Prediction Report`, items);
}

function downloadDashboardReport() {
  const items = [
    {
      label: "Overall Wellness Score",
      value:
        document.getElementById("overall-wellness-score")?.textContent ||
        document.getElementById("overall-score-value")?.textContent ||
        "--",
    },
    {
      label: "Status",
      value:
        document.getElementById("overall-wellness-status")?.textContent ||
        document.getElementById("overall-status")?.textContent ||
        "--",
    },
    {
      label: "Last Prediction",
      value: document.getElementById("last-prediction")?.textContent || "--",
    },
    {
      label: "Confidence",
      value: document.getElementById("last-confidence")?.textContent || "--",
    },
    {
      label: "Total Predictions",
      value: document.getElementById("prediction-count")?.textContent || "--",
    },
    {
      label: "AI Insight",
      value:
        document.getElementById("dashboard-ai-insight")?.textContent || "--",
    },
  ];
  createReportPDF("Dashboard Summary Report", items);
}

function downloadAnalyticsReport() {
  const items = [
    {
      label: "Overall Score",
      value:
        document.getElementById("overall-score-value")?.textContent || "--",
    },
    {
      label: "Status",
      value: document.getElementById("overall-status")?.textContent || "--",
    },
    {
      label: "Note",
      value: document.getElementById("overall-note")?.textContent || "--",
    },
    {
      label: "Economy Score",
      value: document.getElementById("economy-score")?.textContent || "--",
    },
    {
      label: "Social Score",
      value: document.getElementById("social-score")?.textContent || "--",
    },
  ];
  createReportPDF("Analytics Report", items);
}

// Download buttons are provided only within the History page rows and modal.

document.addEventListener("DOMContentLoaded", bootstrap);
