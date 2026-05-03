const MAP_METRIC_CONFIG = {
  life: { label: "Life Expectancy", suffix: " years" },
  economy: { label: "Economy Score", suffix: "/100" },
  health: { label: "Health Score", suffix: "/100" },
  social: { label: "Social Score", suffix: "/100" },
};

const DEFAULT_HEALTH_AGE_RANGE = "10-20";

const COUNTRY_ALIASES = {
  "united states of america": "united states",
  "united states": "united states of america",
  "russian federation": "russia",
  "democratic republic of the congo": "dem. rep. congo",
  "congo, democratic republic of the": "dem. rep. congo",
  congo: "republic of the congo",
  "cote d'ivoire": "ivory coast",
  "korea, republic of": "south korea",
  "korea, democratic people's republic of": "north korea",
  "united republic of tanzania": "tanzania",
  "viet nam": "vietnam",
  "iran, islamic republic of": "iran",
  "syrian arab republic": "syria",
  "lao people's democratic republic": "laos",
  "bolivia (plurinational state of)": "bolivia",
  "venezuela (bolivarian republic of)": "venezuela",
};

function normalizeCountryName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ");
}

function parseYearValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const year = Number(text);
  if (!Number.isInteger(year) || year < 1900) return null;
  return year;
}

function resolveCountryPayload(countryName, mapData) {
  const normalized = normalizeCountryName(countryName);
  if (mapData[normalized]) {
    return mapData[normalized];
  }

  const alias = COUNTRY_ALIASES[normalized];
  if (alias && mapData[normalizeCountryName(alias)]) {
    return mapData[normalizeCountryName(alias)];
  }

  return null;
}

function metricValueForCountry(countryPayload, metric, ageRange) {
  if (!countryPayload) return null;
  if (metric === "health") {
    return Number(countryPayload.health?.[ageRange] ?? NaN);
  }
  return Number(countryPayload[metric] ?? NaN);
}

function computeThresholds(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) {
    return { low: 0, medium: 0, high: 0 };
  }

  const lowIndex = Math.floor((sorted.length - 1) * 0.33);
  const highIndex = Math.floor((sorted.length - 1) * 0.66);

  return {
    low: sorted[lowIndex],
    medium: sorted[highIndex],
    high: sorted[sorted.length - 1],
  };
}

function colorFromValue(value, thresholds) {
  if (!Number.isFinite(value)) {
    return "#d6dde8";
  }
  if (value >= thresholds.medium) {
    return "#22a06b";
  }
  if (value >= thresholds.low) {
    return "#f6c945";
  }
  return "#df5a49";
}

function formatMetricValue(value, metric) {
  if (!Number.isFinite(value)) {
    return "No data";
  }
  const { suffix } = MAP_METRIC_CONFIG[metric];
  return `${value.toFixed(1)}${suffix}`;
}

function createLegendControl() {
  const control = L.control({ position: "bottomright" });

  control.onAdd = function onAdd() {
    const div = L.DomUtil.create("div", "map-legend");
    div.innerHTML = `
      <p class="map-legend-title">Legend</p>
      <div class="map-legend-item"><span class="map-legend-swatch" style="background:#22a06b"></span><span id="map-legend-high">High</span></div>
      <div class="map-legend-item"><span class="map-legend-swatch" style="background:#f6c945"></span><span id="map-legend-medium">Medium</span></div>
      <div class="map-legend-item"><span class="map-legend-swatch" style="background:#df5a49"></span><span id="map-legend-low">Low</span></div>
    `;
    return div;
  };

  return control;
}

async function initMapPage() {
  const page = document.querySelector('[data-page="map"]');
  if (!page) return;

  const metricSelect = document.getElementById("map-metric-select");
  const yearSelect = document.getElementById("map-year-select");
  const applyButton = document.getElementById("map-apply-btn");
  const currentViewEl = document.getElementById("map-current-view");
  const rangeHintEl = document.getElementById("map-range-hint");
  const yearHintEl = document.getElementById("map-year-hint");
  const errorEl = document.getElementById("map-error");

  if (
    !metricSelect ||
    !yearSelect ||
    !applyButton ||
    !currentViewEl ||
    !rangeHintEl ||
    !yearHintEl ||
    !errorEl
  ) {
    return;
  }

  const map = L.map("world-map", {
    worldCopyJump: true,
    minZoom: 2,
  }).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  createLegendControl().addTo(map);

  const state = {
    mapData: {},
    geoLayer: null,
    baseGeojson: null,
    activeMetric: metricSelect.value,
    activeAgeRange: DEFAULT_HEALTH_AGE_RANGE,
    activeYear: null,
    availableYears: [],
    thresholds: { low: 0, medium: 0, high: 0 },
  };

  function setError(message) {
    errorEl.textContent = message || "";
  }

  function metricValues(metric, ageRange) {
    return Object.values(state.mapData)
      .map((entry) => metricValueForCountry(entry, metric, ageRange))
      .filter(Number.isFinite);
  }

  function updateSummary() {
    currentViewEl.textContent = MAP_METRIC_CONFIG[state.activeMetric].label;
    rangeHintEl.textContent =
      "Country values are grouped into low, medium, and high bands.";
    yearHintEl.textContent = `Year: ${state.activeYear ?? "--"}`;
  }

  function updateLegend() {
    const high = document.getElementById("map-legend-high");
    const medium = document.getElementById("map-legend-medium");
    const low = document.getElementById("map-legend-low");
    if (!high || !medium || !low) return;

    const suffix = MAP_METRIC_CONFIG[state.activeMetric].suffix;
    const lowLabel = Number.isFinite(state.thresholds.low)
      ? state.thresholds.low.toFixed(1)
      : "--";
    const mediumLabel = Number.isFinite(state.thresholds.medium)
      ? state.thresholds.medium.toFixed(1)
      : "--";

    high.textContent = `High (>= ${mediumLabel}${suffix})`;
    medium.textContent = `Medium (${lowLabel}${suffix} - ${mediumLabel}${suffix})`;
    low.textContent = `Low (< ${lowLabel}${suffix})`;
  }

  function styleFeature(feature) {
    const countryName =
      feature.properties?.name || feature.properties?.ADMIN || "";
    const payload = resolveCountryPayload(countryName, state.mapData);
    const value = metricValueForCountry(
      payload,
      state.activeMetric,
      state.activeAgeRange,
    );

    return {
      fillColor: colorFromValue(value, state.thresholds),
      weight: 1,
      opacity: 1,
      color: "#ffffff",
      fillOpacity: 0.82,
      className: "map-country-shape",
    };
  }

  function bindCountryInteractions(feature, layer) {
    const countryName =
      feature.properties?.name || feature.properties?.ADMIN || "Unknown";

    layer.on({
      mouseover: () => {
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.94,
          color: "#1c3f72",
        });
        layer.bringToFront();
      },
      mouseout: () => {
        if (state.geoLayer) {
          state.geoLayer.resetStyle(layer);
        }
      },
      click: () => {
        const params = new URLSearchParams();
        params.set("country", countryName);
        if (state.activeYear != null) {
          params.set("year", String(state.activeYear));
        }
        window.location.href = `predict.html?${params.toString()}`;
      },
    });

    const payload = resolveCountryPayload(countryName, state.mapData);
    const value = metricValueForCountry(
      payload,
      state.activeMetric,
      state.activeAgeRange,
    );
    const metricLabel = MAP_METRIC_CONFIG[state.activeMetric].label;

    layer.bindTooltip(
      [
        `<strong>${countryName}</strong>`,
        `${metricLabel}: ${formatMetricValue(value, state.activeMetric)}`,
      ].join("<br/>"),
      {
        className: "map-country-tooltip",
        sticky: true,
        direction: "top",
      },
    );
  }

  function rebuildLayer(geojson) {
    if (state.geoLayer) {
      state.geoLayer.remove();
    }

    state.geoLayer = L.geoJSON(geojson, {
      style: styleFeature,
      onEachFeature: bindCountryInteractions,
    }).addTo(map);
  }

  function refreshLayerStyles() {
    state.thresholds = computeThresholds(
      metricValues(state.activeMetric, state.activeAgeRange),
    );
    updateSummary();
    updateLegend();

    if (!state.geoLayer) return;

    state.geoLayer.setStyle(styleFeature);
    state.geoLayer.eachLayer((layer) => {
      const feature = layer.feature;
      layer.unbindTooltip();
      bindCountryInteractions(feature, layer);
    });
  }

  function normalizeYears(values) {
    if (!Array.isArray(values)) return [];
    return [
      ...new Set(
        values
          .map((year) => parseYearValue(year))
          .filter((year) => year != null),
      ),
    ].sort((a, b) => a - b);
  }

  function mergeAvailableYears(values) {
    const merged = normalizeYears([
      ...(state.availableYears || []),
      ...(values || []),
    ]);
    state.availableYears = merged;
    return merged;
  }

  function renderYearOptions(years, selectedYear) {
    const normalizedYears = normalizeYears(years);

    if (!normalizedYears.length) {
      yearSelect.innerHTML = '<option value="">Select year</option>';
      yearSelect.disabled = false;
      return;
    }

    yearSelect.disabled = false;
    yearSelect.innerHTML = [
      '<option value="">Select year</option>',
      ...normalizedYears.map(
        (year) => `<option value="${year}">${year}</option>`,
      ),
    ].join("");

    const chosenYear = parseYearValue(selectedYear);
    if (chosenYear != null && normalizedYears.includes(chosenYear)) {
      yearSelect.value = String(chosenYear);
      return;
    }

    if (
      state.activeYear != null &&
      normalizedYears.includes(state.activeYear)
    ) {
      yearSelect.value = String(state.activeYear);
      return;
    }

    yearSelect.value = "";
  }

  async function fetchYearCatalog() {
    try {
      const payload = await apiFetch("/map-years");
      const fetchedYears = mergeAvailableYears(payload?.years || []);
      const selectedYear = parseYearValue(payload?.selected_year);
      if (selectedYear != null) {
        mergeAvailableYears([selectedYear]);
      }
      renderYearOptions(fetchedYears, selectedYear);
      return true;
    } catch {
      renderYearOptions(state.availableYears, state.activeYear);
      return false;
    }
  }

  async function loadMapDataForYear(yearValue) {
    const parsedYear = parseYearValue(yearValue);
    const query =
      parsedYear != null ? `?year=${encodeURIComponent(parsedYear)}` : "";
    const payload = await apiFetch(`/map-data${query}`);

    state.mapData = {};
    Object.entries(payload?.data || {}).forEach(([country, values]) => {
      state.mapData[normalizeCountryName(country)] = values;
    });

    const payloadYears = mergeAvailableYears(payload?.years || []);
    const payloadSelectedYear = parseYearValue(payload?.selected_year);
    if (payloadSelectedYear != null) {
      mergeAvailableYears([payloadSelectedYear]);
    }

    renderYearOptions(payloadYears, payloadSelectedYear ?? parsedYear);

    state.activeYear = parseYearValue(
      payload?.selected_year ?? parsedYear ?? yearSelect.value,
    );
    if (state.activeYear != null) {
      yearSelect.value = String(state.activeYear);
    }

    state.thresholds = computeThresholds(
      metricValues(state.activeMetric, state.activeAgeRange),
    );

    if (!state.geoLayer) {
      rebuildLayer(state.baseGeojson);
    } else {
      refreshLayerStyles();
    }

    updateSummary();
    updateLegend();
    map.invalidateSize();

    return payload || null;
  }

  async function resolveAndApplyCurrentSettings() {
    const nextMetric = metricSelect.value;
    let nextYear = parseYearValue(yearSelect.value) ?? state.activeYear;

    if (nextYear == null) {
      const fallback = await loadMapDataForYear(null);
      nextYear =
        parseYearValue(yearSelect.value) ??
        parseYearValue(fallback?.selected_year) ??
        state.activeYear;
    }

    if (nextYear == null) {
      // If the dataset has no year dimension, keep map functional by applying
      // the selected metric on the current loaded map data.
      if (!state.availableYears.length) {
        state.activeMetric = nextMetric;
        refreshLayerStyles();
        map.invalidateSize();
        return;
      }

      throw new Error("Please select a dataset year before submitting.");
    }

    state.activeMetric = nextMetric;
    const yearChanged = state.activeYear !== nextYear;

    if (yearChanged) {
      await loadMapDataForYear(nextYear);
      return;
    }

    refreshLayerStyles();
    map.invalidateSize();
  }

  try {
    state.baseGeojson = await fetch("world.geojson").then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load world map boundaries.");
      }
      return response.json();
    });

    await fetchYearCatalog();
    const initialPayload = await loadMapDataForYear(yearSelect.value || null);

    if (!state.availableYears.length) {
      const fallbackYears = normalizeYears(initialPayload?.years || []);
      if (fallbackYears.length) {
        mergeAvailableYears(fallbackYears);
        renderYearOptions(
          state.availableYears,
          initialPayload?.selected_year ?? null,
        );
      }
    }

    // Do not show a blocking error here. Some datasets may not have a usable
    // year dimension, and the map can still render in no-year mode.

    yearSelect.addEventListener("change", async () => {
      try {
        setError("");
        const selectedYear = parseYearValue(yearSelect.value);
        if (selectedYear == null) {
          return;
        }

        applyButton.disabled = true;
        applyButton.textContent = "Loading...";
        await loadMapDataForYear(selectedYear);
      } catch (error) {
        setError(error.message || "Unable to load map data for selected year.");
      } finally {
        applyButton.disabled = false;
        applyButton.textContent = "Show on Map";
      }
    });

    applyButton.addEventListener("click", async () => {
      try {
        setError("");
        applyButton.disabled = true;
        applyButton.textContent = "Loading...";
        await resolveAndApplyCurrentSettings();
      } catch (error) {
        setError(
          error.message || "Unable to load map data for selected filters.",
        );
      } finally {
        applyButton.disabled = false;
        applyButton.textContent = "Show on Map";
      }
    });
  } catch (error) {
    setError(error.message || "Unable to load map data.");
  }
}

window.LifeVitalsMap = {
  init: initMapPage,
};
