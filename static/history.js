/**
 * history.js — localStorage-backed prediction history for Study Behavior Analyzer
 */

(function () {
  "use strict";

  const STORAGE_KEY = "sba_history";
  const MAX_RUNS = 20;

  /* ── Write a new run (called from script.js after prediction) ──── */
  function saveRun(payload, result) {
    const runs = loadRuns();
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      inputs: {
        study_hours: payload.weekly_self_study_hours,
        attendance: payload.attendance_percentage,
        participation: payload.class_participation,
      },
      outputs: {
        score: result.score,
        productivity: result.productivity,
        cluster: result.cluster,
        reliability: result.confidence?.reliability,
        band: result.confidence?.band,
        alignment: result.comparison?.alignment,
      },
    };
    runs.unshift(entry);
    if (runs.length > MAX_RUNS) runs.pop();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    } catch (_) {
      /* storage full — silently skip */
    }
  }

  function loadRuns() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function clearRuns() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  /* ── History page rendering ────────────────────────────────────── */
  function initHistoryPage() {
    const listEl = document.getElementById("history-list");
    const emptyEl = document.getElementById("history-empty");
    const clearBtn = document.getElementById("clear-history-btn");
    const exportBtn = document.getElementById("export-history-btn");
    const countEl = document.getElementById("history-count");

    if (!listEl) return;

    function renderList() {
      const runs = loadRuns();

      if (countEl) countEl.textContent = runs.length;

      if (runs.length === 0) {
        listEl.innerHTML = "";
        if (emptyEl) emptyEl.classList.remove("hidden");
        return;
      }

      if (emptyEl) emptyEl.classList.add("hidden");

      listEl.innerHTML = runs
        .map((run) => {
          const date = new Date(run.timestamp);
          const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
          const score = run.outputs.score ?? "--";
          const prod = run.outputs.productivity ?? "--";
          const cluster = run.outputs.cluster ?? "--";
          const band = run.outputs.band ?? "--";
          const alignment = run.outputs.alignment ?? "--";
          const scoreClass =
            score >= 85 ? "score-elite" : score >= 70 ? "score-competitive" : "score-recovery";

          return `<article class="history-row glass-panel reveal">
            <div class="history-row-date">
              <span class="history-date">${dateStr}</span>
              <span class="history-time">${timeStr}</span>
            </div>
            <div class="history-row-score">
              <span class="history-score-val ${scoreClass}">${score}</span>
              <span class="history-score-label">/ 100</span>
            </div>
            <div class="history-row-meta">
              <span class="history-tag">${prod}</span>
              <span class="history-tag archetype-tag">${cluster}</span>
            </div>
            <div class="history-row-inputs">
              <span title="Study hours">${run.inputs.study_hours}h</span>
              <span title="Attendance">${run.inputs.attendance}%</span>
              <span title="Participation">${run.inputs.participation}/10</span>
            </div>
            <div class="history-row-conf">
              <span class="confidence-pill">${band}</span>
              <span class="alignment-pct">${alignment}% aligned</span>
            </div>
          </article>`;
        })
        .join("");

      /* Re-trigger reveal observer for new items */
      if (window.SBARevealObserver) {
        document.querySelectorAll(".history-row.reveal").forEach((el) => {
          if (!el.classList.contains("is-visible")) {
            window.SBARevealObserver.observe(el);
          }
        });
      }
    }

    clearBtn?.addEventListener("click", () => {
      if (confirm("Clear all saved runs?")) {
        clearRuns();
        renderList();
      }
    });

    exportBtn?.addEventListener("click", () => {
      const runs = loadRuns();
      const blob = new Blob([JSON.stringify(runs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sba-history-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    renderList();
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  window.SBAHistory = { saveRun, loadRuns, clearRuns, initHistoryPage };
})();
