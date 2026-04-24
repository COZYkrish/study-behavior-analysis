let barChart;
let pieChart;
let trendChart;

const PRODUCTIVITY_META = {
  High: { sub: "Top performer corridor", color: "#61f2c7" },
  Medium: { sub: "Competitive operating band", color: "#6fe7ff" },
  Low: { sub: "Recovery and rebuild mode", color: "#ff7d8f" },
};

const CLUSTER_META = {
  "Consistent Learner": "Stable weekly effort with strong classroom follow-through.",
  "Night Owl": "Long study bursts with softer attendance discipline.",
  "Last-Minute Crammer": "Compressed effort pattern that relies on late acceleration.",
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {
  initializeRangeValues();
  initializeRevealObserver();
  initializeCounters();
  initializeTiltCards();
  initializeParallax();
  initializePredictionFlow();
  initializeScrollProgress();
  initializeHamburger();
  initializeHeroSphere();
  initHistoryPageIfPresent();
});

function initializeScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${pct}%`;
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function initializeHamburger() {
  const hamburger = document.getElementById("hamburger");
  const drawer = document.getElementById("mobile-drawer");
  if (!hamburger || !drawer) return;
  hamburger.addEventListener("click", () => {
    const open = hamburger.classList.toggle("open");
    drawer.classList.toggle("open", open);
    hamburger.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
  });
  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("open");
      drawer.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
    });
  });
}

function initializeHeroSphere() {
  if (window.SBAScene?.initHeroSphere) {
    window.SBAScene.initHeroSphere("hero-sphere");
  }
  if (window.SBAScene?.initNodeNetwork) {
    window.SBAScene.initNodeNetwork("node-network-canvas");
  }
}

function initHistoryPageIfPresent() {
  if (window.SBAHistory?.initHistoryPage) {
    window.SBAHistory.initHistoryPage();
  }
}

function initializeRangeValues() {
  bindRangeValue("study_hours", "study_hours_val", " h");
  bindRangeValue("attendance", "attendance_val", " %");
  bindRangeValue("participation", "participation_val", " / 10");
}

function bindRangeValue(inputId, outputId, suffix) {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);
  if (!input || !output) return;

  const render = () => {
    output.textContent = `${parseFloat(input.value).toFixed(1)}${suffix}`;
  };

  render();
  input.addEventListener("input", render);
}

function initializeRevealObserver() {
  const revealNodes = document.querySelectorAll(".reveal");
  if (!revealNodes.length) return;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealNodes.forEach((node) => observer.observe(node));

  /* Expose globally so history.js can add new items */
  window.SBARevealObserver = observer;
}

function initializeCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    counters.forEach((counter) => applyCounterValue(counter, Number.parseFloat(counter.dataset.count || "0")));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  counters.forEach((counter) => observer.observe(counter));
}

function applyCounterValue(node, value) {
  const suffix = node.dataset.suffix || "";
  const isInteger = Number.isInteger(value);
  node.textContent = `${isInteger ? Math.round(value) : value.toFixed(1)}${suffix}`;
}

function animateCounter(node) {
  const target = Number.parseFloat(node.dataset.count || "0");
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    applyCounterValue(node, target * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function initializeTiltCards() {
  if (prefersReducedMotion) return;

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 14;
      const rotateX = (0.5 - y) * 12;
      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function initializeParallax() {
  if (prefersReducedMotion) return;

  const layers = document.querySelectorAll("[data-parallax]");
  if (!layers.length) return;

  const onScroll = () => {
    const scrollY = window.scrollY;
    layers.forEach((layer) => {
      const depth = Number.parseFloat(layer.dataset.depth || "0.1");
      layer.style.transform = `translate3d(0, ${scrollY * depth}px, 0)`;
    });
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initializePredictionFlow() {
  const form = document.getElementById("predict-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const btnText = document.getElementById("btn-text");
    const btnSpinner = document.getElementById("btn-spinner");
    btnText?.classList.add("hidden");
    btnSpinner?.classList.remove("hidden");

    const payload = getPayload();

    try {
      const [prediction, trend] = await Promise.all([
        postJson("/predict", payload),
        postJson("/trend", payload),
      ]);

      renderResults(prediction, payload, trend);
    } catch (error) {
      showError(error.message || "Request failed.");
    } finally {
      btnText?.classList.remove("hidden");
      btnSpinner?.classList.add("hidden");
    }
  });
}

function getPayload() {
  return {
    weekly_self_study_hours: parseFloat(document.getElementById("study_hours").value),
    attendance_percentage: parseFloat(document.getElementById("attendance").value),
    class_participation: parseFloat(document.getElementById("participation").value),
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(formatApiError(data.error));
  }

  return data;
}

function formatApiError(error) {
  if (!error) return "Request failed.";
  if (error.fields) {
    const detail = Object.entries(error.fields)
      .map(([field, message]) => `${field}: ${message}`)
      .join(" | ");
    return `${error.message} ${detail}`;
  }
  return error.message || "Request failed.";
}

function showError(message) {
  const banner = document.getElementById("error-banner");
  if (!banner) {
    window.alert(message);
    return;
  }
  banner.textContent = message;
  banner.classList.remove("hidden");
}

function clearError() {
  const banner = document.getElementById("error-banner");
  banner?.classList.add("hidden");
}

function renderResults(data, payload, trend) {
  document.getElementById("placeholder")?.classList.add("hidden");
  document.getElementById("results-section")?.classList.remove("hidden");

  /* Save this run to history */
  if (window.SBAHistory?.saveRun) {
    window.SBAHistory.saveRun(payload, data);
  }

  animateNumber("result-score", data.score, 1);
  animateScoreRing(data.score);
  setText("result-narrative", data.narrative);

  const prodMeta = PRODUCTIVITY_META[data.productivity] || {};
  const productivityNode = document.getElementById("result-productivity");
  if (productivityNode) {
    productivityNode.textContent = data.productivity;
    productivityNode.style.color = prodMeta.color || "#6fe7ff";
  }
  setText("prod-sub", prodMeta.sub || "");

  setText("result-cluster", data.cluster);
  setText("cluster-desc", data.cluster_profile?.description || CLUSTER_META[data.cluster] || "");

  setText("result-confidence", `${data.confidence.band} / ${data.confidence.reliability}%`);
  setText("confidence-summary", data.confidence.summary);

  renderSuggestionList(data.suggestions || []);
  renderFingerprint(data.fingerprint || []);
  renderComparison(data.comparison || {});
  renderSummaryPills(data.study_profile || {});
  renderInsightCards(data.insights || []);
  setText("trend-summary", trend.summary?.headline || "");

  buildBarChart(payload, data.score);
  buildPieChart(data.cluster_dist || {});
  buildTrendChart(trend.points || [], payload.weekly_self_study_hours, trend.optimal_point);

  document.getElementById("results-section")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function animateNumber(id, target, decimals) {
  const node = document.getElementById(id);
  if (!node) return;
  if (prefersReducedMotion) {
    node.textContent = target.toFixed(decimals);
    return;
  }

  const start = performance.now();
  const duration = 900;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = (target * eased).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function renderSuggestionList(items) {
  const list = document.getElementById("suggestion-list");
  if (!list) return;
  list.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderFingerprint(items) {
  const grid = document.getElementById("fingerprint-grid");
  if (!grid) return;

  const COLORS = [
    { bar: "#6fe7ff", glow: "rgba(111,231,255,0.25)" },
    { bar: "#4ca5ff", glow: "rgba(76,165,255,0.25)" },
    { bar: "#61f2c7", glow: "rgba(97,242,199,0.25)" },
    { bar: "#ffd36f", glow: "rgba(255,211,111,0.25)" },
  ];

  grid.innerHTML = items.map((item, i) => {
    const col = COLORS[i % COLORS.length];
    const pct = Math.min(Math.max(item.value, 0), 100);
    return `
      <article class="fingerprint-cell">
        <strong style="color:${col.bar}">${escapeHtml(String(item.value))}${escapeHtml(item.unit || "")}</strong>
        <span>${escapeHtml(item.label)}</span>
        <div class="fp-bar-track">
          <div class="fp-bar-fill" data-pct="${pct}" style="background:${col.bar}; box-shadow: 0 0 10px ${col.glow}; width:0%"></div>
        </div>
      </article>
    `;
  }).join("");

  /* Animate bars in on next frame so CSS transition triggers */
  requestAnimationFrame(() => {
    grid.querySelectorAll(".fp-bar-fill").forEach((bar) => {
      bar.style.width = `${bar.dataset.pct}%`;
    });
  });
}

function renderComparison(comparison) {
  const pct = comparison.alignment || 0;
  setText("comparison-headline", `${pct}% aligned`);
  setText("comparison-subtext", comparison.headline || "");

  /* Animate alignment gauge arc */
  const gauge = document.getElementById("alignment-gauge");
  if (gauge) {
    const color = pct >= 67 ? "#61f2c7" : pct >= 34 ? "#6fe7ff" : "#ffd36f";
    gauge.setAttribute("aria-valuenow", String(pct));
    const arc = gauge.querySelector("#gauge-arc");
    const label = document.getElementById("gauge-center-text");
    if (arc) {
      const total = 173;
      const offset = total - (pct / 100) * total;
      arc.style.stroke = color;
      arc.style.strokeDashoffset = String(total);
      requestAnimationFrame(() => {
        arc.style.transition = prefersReducedMotion ? "none" : "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)";
        arc.style.strokeDashoffset = String(offset);
      });
    }
    if (label) {
      label.style.color = color;
      label.textContent = `${pct}%`;
    }
  }

  const list = document.getElementById("comparison-list");
  if (!list) return;
  const details = comparison.detail || [];
  list.innerHTML = details.map((item) => {
    const inBand = item.includes("inside");
    const icon = inBand ? "✦" : "◦";
    const cls  = inBand ? "style='color:var(--emerald)'" : "";
    return `<li ${cls}>${icon} ${escapeHtml(item)}</li>`;
  }).join("");
}

function renderSummaryPills(summary) {
  const container = document.getElementById("profile-summary");
  if (!container) return;
  container.innerHTML = Object.entries(summary).map(([key, value]) => `
    <article class="summary-pill">
      <strong>${escapeHtml(startCase(key))}</strong>
      <span>${escapeHtml(String(value))}</span>
    </article>
  `).join("");
}

function renderInsightCards(items) {
  const container = document.getElementById("insight-cards");
  if (!container) return;
  const ICONS = ["◈", "⬡", "◉"];
  container.innerHTML = items.map((item, i) => `
    <article class="insight-tile">
      <div class="insight-tile-icon">${ICONS[i % ICONS.length]}</div>
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.title)}</span>
      <p class="muted-copy">${escapeHtml(item.description)}</p>
    </article>
  `).join("");
}

/* Score ring animation */
function animateScoreRing(score) {
  const panel = document.querySelector(".score-panel");
  if (!panel) return;
  const pct = Math.min(Math.max(score, 0), 100);
  const color = score >= 85 ? "#61f2c7" : score >= 70 ? "#6fe7ff" : "#ffd36f";
  panel.style.setProperty("--ring-pct", String(pct));
  panel.style.setProperty("--ring-color", color);
  panel.classList.add("has-ring");
}

if (window.Chart) {
  Chart.defaults.color = "#8caabd";
  Chart.defaults.borderColor = "rgba(111, 231, 255, 0.08)";
  Chart.defaults.font.family = "'Space Grotesk', sans-serif";
}

function buildBarChart(payload, score) {
  if (!window.Chart) return;
  const ctx = document.getElementById("barChart")?.getContext("2d");
  if (!ctx) return;
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Study Hours", "Attendance", "Participation x10", "Predicted Score"],
      datasets: [{
        data: [
          payload.weekly_self_study_hours,
          payload.attendance_percentage,
          payload.class_participation * 10,
          score,
        ],
        borderRadius: 10,
        backgroundColor: ["#6fe7ff", "#4ca5ff", "#61f2c7", "#c6d9e6"],
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, max: 100 },
      },
    },
  });
}

function buildPieChart(dist) {
  if (!window.Chart) return;
  const ctx = document.getElementById("pieChart")?.getContext("2d");
  if (!ctx) return;
  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(dist),
      datasets: [{
        data: Object.values(dist),
        backgroundColor: ["#6fe7ff", "#4ca5ff", "#61f2c7"],
        borderWidth: 0,
      }],
    },
    options: {
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, padding: 18 },
        },
      },
    },
  });
}

function buildTrendChart(points, userHour, optimalPoint) {
  if (!window.Chart) return;
  const ctx = document.getElementById("trendChart")?.getContext("2d");
  if (!ctx) return;
  if (trendChart) trendChart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, "rgba(111, 231, 255, 0.38)");
  gradient.addColorStop(1, "rgba(111, 231, 255, 0.02)");

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map((point) => `${point.study_hours}h`),
      datasets: [{
        data: points.map((point) => point.score),
        borderColor: "#6fe7ff",
        backgroundColor: gradient,
        fill: true,
        borderWidth: 2.4,
        pointRadius: 0,
        tension: 0.32,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Score ${context.parsed.y.toFixed(1)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { min: 0, max: 100 },
      },
    },
    plugins: [{
      id: "markers",
      afterDatasetsDraw(chart) {
        const datasetMeta = chart.getDatasetMeta(0);
        const markerCtx = chart.ctx;
        const userIndex = points.findIndex((point) => point.study_hours >= userHour);
        const optimalIndex = points.findIndex((point) => point.study_hours === optimalPoint?.study_hours);

        drawPointMarker(markerCtx, datasetMeta, userIndex, "#61f2c7");
        drawPointMarker(markerCtx, datasetMeta, optimalIndex, "#ffd36f");
      },
    }],
  });
}

function drawPointMarker(ctx, meta, index, color) {
  if (index < 0 || !meta?.data?.[index]) return;
  const point = meta.data[index];
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.fill();
  ctx.restore();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function startCase(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
