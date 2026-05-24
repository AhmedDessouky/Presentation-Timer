const STORAGE_KEY = "presentationTimerApp.v4";

const state = {
  mode: "manual",
  theme: "dark",
  soundEnabled: true,
  autoResetSequence: false,
  presenters: [],
  total: {
    type: "stopwatch",
    durationMs: 20 * 60 * 1000,
    elapsedMs: 0,
    running: false,
    lastStartedAt: null,
    alerted: false,
  },
  sequence: [],
  sequenceIndex: -1,
  editingPresenterId: null,
};

const els = {
  savedStatus: document.getElementById("savedStatus"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  modeHint: document.getElementById("modeHint"),
  modeTabs: document.querySelectorAll(".mode-tab"),
  presenterName: document.getElementById("presenterName"),
  presenterType: document.getElementById("presenterType"),
  presenterDurationLabel: document.getElementById("presenterDurationLabel"),
  presenterMinutes: document.getElementById("presenterMinutes"),
  presenterSeconds: document.getElementById("presenterSeconds"),
  addPresenterBtn: document.getElementById("addPresenterBtn"),
  totalType: document.getElementById("totalType"),
  totalMinutes: document.getElementById("totalMinutes"),
  totalSeconds: document.getElementById("totalSeconds"),
  soundEnabled: document.getElementById("soundEnabled"),
  testSoundBtn: document.getElementById("testSoundBtn"),
  totalDisplay: document.getElementById("totalDisplay"),
  totalStatus: document.getElementById("totalStatus"),
  editTotalBtn: document.getElementById("editTotalBtn"),
  pauseTotalBtn: document.getElementById("pauseTotalBtn"),
  startTotalBtn: document.getElementById("startTotalBtn"),
  resetTotalBtn: document.getElementById("resetTotalBtn"),
  resetAllBtn: document.getElementById("resetAllBtn"),
  timerGrid: document.getElementById("timerGrid"),
  emptyState: document.getElementById("emptyState"),
  presenterCount: document.getElementById("presenterCount"),
  pausePresentersBtn: document.getElementById("pausePresentersBtn"),
  clearPresentersBtn: document.getElementById("clearPresentersBtn"),
  sequenceInput: document.getElementById("sequenceInput"),
  autoResetSequence: document.getElementById("autoResetSequence"),
  loadSequenceBtn: document.getElementById("loadSequenceBtn"),
  sideNextSpeakerBtn: document.getElementById("sideNextSpeakerBtn"),
  mainNextSpeakerBtn: document.getElementById("mainNextSpeakerBtn"),
  mainSequenceTitle: document.getElementById("mainSequenceTitle"),
  mainSequenceText: document.getElementById("mainSequenceText"),
  sequenceStatus: document.getElementById("sequenceStatus"),
  summaryBtn: document.getElementById("summaryBtn"),
  summaryDialog: document.getElementById("summaryDialog"),
  summaryContent: document.getElementById("summaryContent"),
  closeSummaryBtn: document.getElementById("closeSummaryBtn"),
  closeSummaryFooterBtn: document.getElementById("closeSummaryFooterBtn"),
  copySummaryBtn: document.getElementById("copySummaryBtn"),
  editDialog: document.getElementById("editDialog"),
  editTitle: document.getElementById("editTitle"),
  editMinutes: document.getElementById("editMinutes"),
  editSeconds: document.getElementById("editSeconds"),
  editTargetMinutes: document.getElementById("editTargetMinutes"),
  editTargetSeconds: document.getElementById("editTargetSeconds"),
  editDurationLabel: document.getElementById("editDurationLabel"),
  closeEditBtn: document.getElementById("closeEditBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  saveEditBtn: document.getElementById("saveEditBtn"),
  editTotalDialog: document.getElementById("editTotalDialog"),
  mobilePauseTotalBtn: document.getElementById("mobilePauseTotalBtn"),
  mobileNextSpeakerBtn: document.getElementById("mobileNextSpeakerBtn"),
  mobileSummaryBtn: document.getElementById("mobileSummaryBtn"),
  editTotalLabel: document.getElementById("editTotalLabel"),
  editTotalMinutes: document.getElementById("editTotalMinutes"),
  editTotalSeconds: document.getElementById("editTotalSeconds"),
  closeEditTotalBtn: document.getElementById("closeEditTotalBtn"),
  cancelEditTotalBtn: document.getElementById("cancelEditTotalBtn"),
  saveEditTotalBtn: document.getElementById("saveEditTotalBtn"),
};

let audioContext = null;
let lastPresenterSignature = "";
let renderInterval = null;
let saveTimeout = null;

function now() {
  return Date.now();
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function activeElapsed(item) {
  if (!item.running) return item.elapsedMs;
  return item.elapsedMs + (now() - item.lastStartedAt);
}

function remainingFor(item) {
  return Math.max(0, item.durationMs - activeElapsed(item));
}

function toMs(minutesInput, secondsInput, fallbackMs = 60000) {
  const minutes = Math.max(0, Number(minutesInput || 0));
  const seconds = Math.max(0, Number(secondsInput || 0));
  const ms = ((minutes * 60) + seconds) * 1000;
  return ms > 0 ? ms : fallbackMs;
}

function splitMs(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

function clampSeconds(input) {
  const value = Math.max(0, Math.min(59, Number(input.value || 0)));
  input.value = value;
  return value;
}

function displayTime(ms, allowNegative = false) {
  let value = Math.floor(ms / 100);
  const negative = value < 0;
  if (negative && !allowNegative) value = 0;
  value = Math.abs(value);

  const tenths = value % 10;
  const totalSeconds = Math.floor(value / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const sign = negative ? "-" : "";
  if (hours > 0) {
    return `${sign}${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }
  return `${sign}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function getDisplayMs(item) {
  if (item.type === "timer") return remainingFor(item);
  return activeElapsed(item);
}

function displayedTotalMs() {
  const active = activeElapsed(state.total);
  return state.total.type === "timer"
    ? Math.max(0, state.total.durationMs - active)
    : active;
}

function presenterSignature() {
  return JSON.stringify(state.presenters.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    durationMs: p.durationMs,
    running: p.running,
    alerted: p.alerted,
    color: p.color,
  })));
}

function playTone() {
  if (!state.soundEnabled) return;

  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();

    const pattern = [
      { freq: 880, start: 0.00, duration: 0.16 },
      { freq: 1046, start: 0.20, duration: 0.18 },
      { freq: 1320, start: 0.42, duration: 0.30 },
    ];

    pattern.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = note.freq;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      const start = audioContext.currentTime + note.start;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.28, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.duration);

      oscillator.start(start);
      oscillator.stop(start + note.duration + 0.03);
    });
  } catch (error) {
    console.warn("Audio could not be played:", error);
  }
}

function startTotalIfNeeded() {
  if (!state.total.running) {
    if (state.total.type === "timer" && state.total.durationMs - activeElapsed(state.total) <= 0) {
      state.total.elapsedMs = 0;
      state.total.alerted = false;
    }
    state.total.running = true;
    state.total.lastStartedAt = now();
  }
}

function pauseTotal() {
  if (!state.total.running) return;
  state.total.elapsedMs = activeElapsed(state.total);
  state.total.running = false;
  state.total.lastStartedAt = null;
}

function pauseTotalAndPresenters() {
  pauseTotal();
  pauseAllPresenters();
  save();
  renderAll(true);
}

function addDeltaToTotal(deltaMs) {
  const wasRunning = state.total.running;
  const currentElapsed = activeElapsed(state.total);
  state.total.elapsedMs = Math.max(0, currentElapsed + deltaMs);

  if (state.total.type === "timer") {
    state.total.elapsedMs = Math.min(state.total.elapsedMs, state.total.durationMs);
    state.total.alerted = state.total.elapsedMs >= state.total.durationMs;
  }

  state.total.running = wasRunning && !(state.total.type === "timer" && state.total.elapsedMs >= state.total.durationMs);
  state.total.lastStartedAt = state.total.running ? now() : null;
}

function startPresenter(id) {
  const presenter = state.presenters.find(p => p.id === id);
  if (!presenter) return;

  if (state.mode === "semi" || state.mode === "sequence") {
    pauseAllPresenters(id);
  }

  if (!presenter.running) {
    if (presenter.type === "timer" && remainingFor(presenter) <= 0) {
      presenter.elapsedMs = 0;
      presenter.alerted = false;
    }

    presenter.running = true;
    presenter.lastStartedAt = now();
    startTotalIfNeeded();
  }

  save();
  renderAll(true);
}

function pausePresenter(id) {
  const presenter = state.presenters.find(p => p.id === id);
  if (!presenter || !presenter.running) return;

  presenter.elapsedMs = activeElapsed(presenter);
  presenter.running = false;
  presenter.lastStartedAt = null;

  save();
  renderAll(true);
}

function togglePresenter(id) {
  const presenter = state.presenters.find(p => p.id === id);
  if (!presenter) return;

  if (presenter.running) {
    pausePresenter(id);
  } else {
    startPresenter(id);
  }
}

function pauseAllPresenters(exceptId = null) {
  state.presenters.forEach(p => {
    if (p.id === exceptId) return;
    if (p.running) {
      p.elapsedMs = activeElapsed(p);
      p.running = false;
      p.lastStartedAt = null;
    }
  });
}

function resetPresenter(id) {
  const presenter = state.presenters.find(p => p.id === id);
  if (!presenter) return;

  presenter.elapsedMs = 0;
  presenter.running = false;
  presenter.lastStartedAt = null;
  presenter.alerted = false;

  save();
  renderAll(true);
}

function deletePresenter(id) {
  state.presenters = state.presenters.filter(p => p.id !== id);
  state.sequence = state.sequence.filter(name =>
    state.presenters.some(p => p.name.toLowerCase() === name.toLowerCase())
  );
  pauseAllPresenters();
  save();
  renderAll(true);
}

function addPresenter() {
  const name = els.presenterName.value.trim();
  const type = els.presenterType.value;
  const durationMs = toMs(els.presenterMinutes.value, els.presenterSeconds.value, 5 * 60 * 1000);

  if (!name) {
    alert("Please enter a presenter name.");
    return;
  }

  state.presenters.push({
    id: uid(),
    name,
    type,
    durationMs,
    elapsedMs: 0,
    running: false,
    lastStartedAt: null,
    alerted: false,
    color: "#7c5cff",
  });

  els.presenterName.value = "";
  save();
  renderAll(true);
}

function setMode(mode) {
  if (mode === "sequence" && blockSequenceIfDuplicateNames()) {
    return;
  }

  state.mode = mode;
  pauseAllPresenters();

  document.body.classList.toggle("sequence-mode", mode === "sequence");

  const hints = {
    manual: "Manual: start and pause any presenter yourself.",
    semi: "Semi Auto: clicking a presenter starts them and pauses the currently running presenter.",
    sequence: "Sequence Mode: load an order, then press Next Speaker to move through the list.",
  };
  els.modeHint.textContent = hints[mode];

  els.modeTabs.forEach(tab => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  save();
  renderAll(true);
}


function getDuplicatePresenterNames() {
  const counts = {};
  state.presenters.forEach(p => {
    const key = p.name.trim().toLowerCase();
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.keys(counts)
    .filter(key => counts[key] > 1)
    .map(key => state.presenters.find(p => p.name.trim().toLowerCase() === key).name);
}

function blockSequenceIfDuplicateNames() {
  const duplicates = getDuplicatePresenterNames();
  if (!duplicates.length) return false;

  alert(
    "Sequence mode cannot run because more than one timer/stopwatch has the same presenter name:\n\n" +
    duplicates.join(", ") +
    "\n\nPlease rename or remove duplicate presenter timers before using sequence mode."
  );

  return true;
}


function resetPresenterTimersForSequence() {
  state.presenters.forEach(p => {
    p.elapsedMs = 0;
    p.running = false;
    p.lastStartedAt = null;
    p.alerted = false;
  });

  state.total.elapsedMs = 0;
  state.total.running = false;
  state.total.lastStartedAt = null;
  state.total.alerted = false;
}

function loadSequence() {
  if (blockSequenceIfDuplicateNames()) {
    return;
  }

  const rawNames = els.sequenceInput.value
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  if (!rawNames.length) {
    alert("Add at least one presenter name to the sequence.");
    return;
  }

  const missing = rawNames.filter(name =>
    !state.presenters.some(p => p.name.toLowerCase() === name.toLowerCase())
  );

  if (missing.length) {
    alert("These names are not added as presenters yet:\n\n" + missing.join(", "));
    return;
  }

  state.sequence = rawNames;
  state.sequenceIndex = -1;

  if (state.autoResetSequence) {
    resetPresenterTimersForSequence();
  }

  save();
  renderAll(true);
}

function nextSpeaker() {
  if (blockSequenceIfDuplicateNames()) {
    return;
  }

  if (state.mode !== "sequence") {
    setMode("sequence");
  }

  if (!state.sequence.length) {
    loadSequence();
    if (!state.sequence.length) return;
  }

  if (state.sequenceIndex === -1 && state.autoResetSequence) {
    resetPresenterTimersForSequence();
  }

  state.sequenceIndex += 1;

  if (state.sequenceIndex >= state.sequence.length) {
    pauseAllPresenters();
    pauseTotal();
    save();
    renderAll(true);
    alert("Sequence finished. Total timer stopped.");
    return;
  }

  const speakerName = state.sequence[state.sequenceIndex];
  const presenter = state.presenters.find(p => p.name.toLowerCase() === speakerName.toLowerCase());

  if (presenter) {
    startPresenter(presenter.id);
  }

  save();
  renderAll(true);
}

function resetTotal() {
  pauseTotal();
  state.total.elapsedMs = 0;
  state.total.alerted = false;
  save();
  renderAll(true);
}

function resetAll() {
  const sure = confirm("Reset all times? Presenter names will remain.");
  if (!sure) return;

  pauseTotal();
  state.total.elapsedMs = 0;
  state.total.alerted = false;
  state.presenters.forEach(p => {
    p.elapsedMs = 0;
    p.running = false;
    p.lastStartedAt = null;
    p.alerted = false;
  });
  state.sequenceIndex = -1;

  save();
  renderAll(true);
}

function clearPresenters() {
  const sure = confirm("Remove all presenters?");
  if (!sure) return;

  state.presenters = [];
  state.sequence = [];
  state.sequenceIndex = -1;
  els.sequenceInput.value = "";

  save();
  renderAll(true);
}

function changeTotalType() {
  state.total.type = els.totalType.value;
  state.total.durationMs = toMs(els.totalMinutes.value, els.totalSeconds.value, 20 * 60 * 1000);
  state.total.elapsedMs = 0;
  state.total.running = false;
  state.total.lastStartedAt = null;
  state.total.alerted = false;
  save();
  renderAll(true);
}

function timerProgress(item) {
  const duration = Math.max(1000, item.durationMs || 1000);
  return Math.min(100, (activeElapsed(item) / duration) * 100);
}

function renderTheme() {
  document.body.classList.toggle("light-mode", state.theme === "light");
  els.themeToggleBtn.textContent = state.theme === "light" ? "Dark Mode" : "Light Mode";
}

function renderTotal() {
  els.totalDisplay.textContent = displayTime(displayedTotalMs());
  els.totalStatus.textContent = state.total.running ? "Running" : "Paused";
  els.totalStatus.classList.toggle("running", state.total.running);

  const split = splitMs(state.total.durationMs);
  if (document.activeElement !== els.totalMinutes) els.totalMinutes.value = split.minutes;
  if (document.activeElement !== els.totalSeconds) els.totalSeconds.value = split.seconds;
  els.totalType.value = state.total.type;
  els.soundEnabled.checked = state.soundEnabled;
  if (els.autoResetSequence) els.autoResetSequence.checked = state.autoResetSequence;
}

function renderSequenceStatus() {
  if (!state.sequence.length) {
    els.sequenceStatus.textContent = "No sequence loaded.";
    els.mainSequenceTitle.textContent = "Ready for sequence mode";
    els.mainSequenceText.textContent = "Load your speaking order, then press Next Speaker here during the presentation.";
    return;
  }

  const current = state.sequence[state.sequenceIndex] || "None yet";
  const next = state.sequence[state.sequenceIndex + 1] || "Finished";

  els.sequenceStatus.textContent =
    `Loaded ${state.sequence.length} turns. Current: ${current}. Next: ${next}.`;

  els.mainSequenceTitle.textContent = `Current: ${current}`;
  els.mainSequenceText.textContent = `Next: ${next} · Turn ${Math.max(0, state.sequenceIndex + 1)} of ${state.sequence.length}`;
}

function renderPresenterCards(force = false) {
  const signature = presenterSignature();
  if (!force && signature === lastPresenterSignature) {
    updateLivePresenterValues();
    return;
  }

  lastPresenterSignature = signature;
  els.timerGrid.innerHTML = "";

  els.presenterCount.textContent =
    `${state.presenters.length} presenter${state.presenters.length === 1 ? "" : "s"} added`;

  els.emptyState.style.display = state.presenters.length ? "none" : "block";

  state.presenters.forEach(p => {
    const card = document.createElement("article");
    const color = p.color || "#7c5cff";
    const displayMs = getDisplayMs(p);
    const progress = timerProgress(p);
    const isFinished = p.type === "timer" && displayMs <= 0;
    const isWarning = p.type === "timer" && displayMs <= p.durationMs * 0.2 && displayMs > 0;

    card.className = "timer-card";
    card.dataset.id = p.id;
    card.style.setProperty("--timer-color", color);
    card.classList.toggle("running", p.running);
    card.classList.toggle("warning", isWarning);
    card.classList.toggle("finished", isFinished);

    card.innerHTML = `
      <div class="card-head">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="card-buttons">
          <span class="color-picker-wrap" title="Change color">
            <button class="icon-btn color" title="Change color" data-action="color" data-id="${p.id}">🎨</button>
            <input class="hidden-color-input" type="color" value="${color}" data-color-input="${p.id}" aria-label="Change ${escapeHtml(p.name)} color" />
          </span>
          <button class="icon-btn edit" title="Edit" data-action="edit" data-id="${p.id}">✎</button>
          <button class="icon-btn" title="Reset" data-action="reset" data-id="${p.id}">↺</button>
          <button class="icon-btn" title="Delete" data-action="delete" data-id="${p.id}">×</button>
        </div>
      </div>

      <div class="timer-time" data-live-time="${p.id}">${displayTime(displayMs)}</div>
      <div class="timer-info" data-live-info="${p.id}">
        ${p.type === "timer" ? "Countdown timer" : "Stopwatch"}
        · ${p.running ? "Running" : "Paused"}
      </div>
      <div class="timer-target-line">Target: ${displayTime(p.durationMs)}</div>

      <div class="progress-wrap">
        <div class="progress" data-live-progress="${p.id}" style="width:${progress}%"></div>
      </div>

      <div class="timer-actions">
        <button class="btn success" data-action="start" data-id="${p.id}">Start</button>
        <button class="btn" data-action="pause" data-id="${p.id}">Pause</button>
      </div>
    `;

    els.timerGrid.appendChild(card);
  });
}

function updateLivePresenterValues() {
  els.presenterCount.textContent =
    `${state.presenters.length} presenter${state.presenters.length === 1 ? "" : "s"} added`;

  state.presenters.forEach(p => {
    const displayMs = getDisplayMs(p);
    const timeEl = document.querySelector(`[data-live-time="${p.id}"]`);
    const infoEl = document.querySelector(`[data-live-info="${p.id}"]`);
    const progressEl = document.querySelector(`[data-live-progress="${p.id}"]`);
    const card = document.querySelector(`.timer-card[data-id="${p.id}"]`);

    if (timeEl) timeEl.textContent = displayTime(displayMs);
    if (infoEl) {
      infoEl.textContent = `${p.type === "timer" ? "Countdown timer" : "Stopwatch"} · ${p.running ? "Running" : "Paused"}`;
    }
    if (progressEl) progressEl.style.width = `${timerProgress(p)}%`;
    if (card) {
      card.classList.toggle("running", p.running);
      card.classList.toggle("warning", p.type === "timer" && displayMs <= p.durationMs * 0.2 && displayMs > 0);
      card.classList.toggle("finished", p.type === "timer" && displayMs <= 0);
    }
  });
}


function renderMobileLiveBar() {
  if (!els.mobileNextSpeakerBtn) return;

  const isSequence = state.mode === "sequence";
  els.mobileNextSpeakerBtn.disabled = !isSequence;
  els.mobileNextSpeakerBtn.textContent = isSequence ? "Next" : "Next";
  els.mobilePauseTotalBtn.textContent = state.total.running ? "Pause" : "Paused";
}

function renderAll(forceCards = false) {
  renderTheme();
  renderTotal();
  renderSequenceStatus();
  renderPresenterCards(forceCards);
  updatePresenterDurationLabel();
  renderMobileLiveBar();

  document.body.classList.toggle("sequence-mode", state.mode === "sequence");
  els.modeTabs.forEach(tab => {
    tab.classList.toggle("active", tab.dataset.mode === state.mode);
  });

  const hints = {
    manual: "Manual: start and pause any presenter yourself.",
    semi: "Semi Auto: clicking a presenter starts them and pauses the currently running presenter.",
    sequence: "Sequence Mode: load an order, then press Next Speaker to move through the list.",
  };
  els.modeHint.textContent = hints[state.mode];
}

function updatePresenterDurationLabel() {
  if (els.presenterType.value === "stopwatch") {
    els.presenterDurationLabel.textContent = "Target time";
  } else {
    els.presenterDurationLabel.textContent = "Timer length";
  }
}

function makeSummaryRows() {
  return state.presenters.map(p => {
    const elapsed = activeElapsed(p);
    const target = p.durationMs;
    const diff = target - elapsed;

    let result = "Exactly on time";
    let resultClass = "neutral";

    if (diff > 0) {
      result = `${displayTime(diff)} saved`;
      resultClass = "saved";
    } else if (diff < 0) {
      result = `${displayTime(Math.abs(diff))} over`;
      resultClass = "over";
    }

    return {
      name: p.name,
      type: p.type,
      talked: displayTime(elapsed),
      target: displayTime(target),
      result,
      resultClass,
    };
  });
}

function showSummary() {
  const rows = makeSummaryRows();

  if (!rows.length) {
    els.summaryContent.innerHTML = `<p class="hint">No presenters have been added yet.</p>`;
  } else {
    const totalTalked = state.presenters.reduce((sum, p) => sum + activeElapsed(p), 0);
    const totalPresentation = activeElapsed(state.total);

    els.summaryContent.innerHTML = `
      <div class="summary-mini">
        <p class="hint">Total presentation time: <strong>${displayTime(totalPresentation)}</strong></p>
        <p class="hint">Combined presenter speaking time: <strong>${displayTime(totalTalked)}</strong></p>
      </div>

      <table class="summary-table">
        <thead>
          <tr>
            <th>Presenter</th>
            <th>Type</th>
            <th>Talked</th>
            <th>Target</th>
            <th>Saved / Over</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${row.type === "timer" ? "Timer" : "Stopwatch"}</td>
              <td>${row.talked}</td>
              <td>${row.target}</td>
              <td class="${row.resultClass}">${row.result}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  els.summaryDialog.showModal();
}

function copySummary() {
  const rows = makeSummaryRows();
  const lines = [
    "Presentation Timer Summary",
    `Total presentation time: ${displayTime(activeElapsed(state.total))}`,
    "",
    ...rows.map(row => `${row.name}: talked ${row.talked}, target ${row.target}, ${row.result}`)
  ];

  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    els.copySummaryBtn.textContent = "Copied";
    setTimeout(() => els.copySummaryBtn.textContent = "Copy Summary", 1200);
  });
}

function openEditDialog(id) {
  const presenter = state.presenters.find(p => p.id === id);
  if (!presenter) return;

  if (presenter.running) {
    presenter.elapsedMs = activeElapsed(presenter);
    presenter.running = false;
    presenter.lastStartedAt = null;
  }

  state.editingPresenterId = id;

  const elapsed = splitMs(presenter.elapsedMs);
  const target = splitMs(presenter.durationMs);

  els.editTitle.textContent = `Edit ${presenter.name}`;
  els.editMinutes.value = elapsed.minutes;
  els.editSeconds.value = elapsed.seconds;
  els.editTargetMinutes.value = target.minutes;
  els.editTargetSeconds.value = target.seconds;
  els.editDurationLabel.textContent = presenter.type === "stopwatch" ? "Target time" : "Timer length";

  save();
  renderAll(true);
  els.editDialog.showModal();
}

function closeEditDialog() {
  state.editingPresenterId = null;
  els.editDialog.close();
}

function saveEditDialog() {
  const presenter = state.presenters.find(p => p.id === state.editingPresenterId);
  if (!presenter) {
    closeEditDialog();
    return;
  }

  const oldElapsedMs = presenter.elapsedMs;
  const elapsedMs = toMs(els.editMinutes.value, els.editSeconds.value, 0);
  const durationMs = toMs(els.editTargetMinutes.value, els.editTargetSeconds.value, presenter.durationMs || 60000);
  const deltaMs = elapsedMs - oldElapsedMs;

  presenter.elapsedMs = elapsedMs;
  presenter.durationMs = durationMs;
  presenter.running = false;
  presenter.lastStartedAt = null;
  presenter.alerted = presenter.type === "timer" && elapsedMs >= durationMs;

  addDeltaToTotal(deltaMs);

  save();
  closeEditDialog();
  renderAll(true);
}

function openEditTotalDialog() {
  const valueMs = displayedTotalMs();
  const split = splitMs(valueMs);

  els.editTotalLabel.textContent = state.total.type === "timer"
    ? "Displayed remaining total time"
    : "Displayed elapsed total time";

  els.editTotalMinutes.value = split.minutes;
  els.editTotalSeconds.value = split.seconds;

  pauseTotal();
  save();
  renderAll(true);
  els.editTotalDialog.showModal();
}

function closeEditTotalDialog() {
  els.editTotalDialog.close();
}

function saveEditTotalDialog() {
  const newDisplayMs = toMs(els.editTotalMinutes.value, els.editTotalSeconds.value, 0);

  state.total.running = false;
  state.total.lastStartedAt = null;

  if (state.total.type === "timer") {
    const remaining = Math.min(newDisplayMs, state.total.durationMs);
    state.total.elapsedMs = Math.max(0, state.total.durationMs - remaining);
    state.total.alerted = remaining <= 0;
  } else {
    state.total.elapsedMs = newDisplayMs;
    state.total.alerted = false;
  }

  save();
  closeEditTotalDialog();
  renderAll(true);
}

function chooseColor(id) {
  const input = document.querySelector(`[data-color-input="${id}"]`);
  if (input) input.click();
}

function updateColor(id, color) {
  const presenter = state.presenters.find(p => p.id === id);
  if (!presenter) return;

  presenter.color = color;

  const card = document.querySelector(`.timer-card[data-id="${id}"]`);
  if (card) {
    card.style.setProperty("--timer-color", color);
  }

  save();
  lastPresenterSignature = "";
  renderAll(true);
}

function save() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const clean = JSON.parse(JSON.stringify(state));
    const t = now();

    if (clean.total.running) {
      clean.total.elapsedMs = state.total.elapsedMs + (t - state.total.lastStartedAt);
      clean.total.running = false;
      clean.total.lastStartedAt = null;
    }

    clean.presenters.forEach((p, index) => {
      if (state.presenters[index]?.running) {
        p.elapsedMs = state.presenters[index].elapsedMs + (t - state.presenters[index].lastStartedAt);
        p.running = false;
        p.lastStartedAt = null;
      }
    });

    clean.editingPresenterId = null;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    els.savedStatus.textContent = "Saved locally";
  }, 60);
}

function saveImmediate() {
  clearTimeout(saveTimeout);
  const clean = JSON.parse(JSON.stringify(state));
  const t = now();

  if (clean.total.running) {
    clean.total.elapsedMs = state.total.elapsedMs + (t - state.total.lastStartedAt);
    clean.total.running = false;
    clean.total.lastStartedAt = null;
  }

  clean.presenters.forEach((p, index) => {
    if (state.presenters[index]?.running) {
      p.elapsedMs = state.presenters[index].elapsedMs + (t - state.presenters[index].lastStartedAt);
      p.running = false;
      p.lastStartedAt = null;
    }
  });

  clean.editingPresenterId = null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

function load() {
  const saved = localStorage.getItem(STORAGE_KEY)
    || localStorage.getItem("presentationTimerApp.v3")
    || localStorage.getItem("presentationTimerApp.v2")
    || localStorage.getItem("presentationTimerApp.v1");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.theme = parsed.theme || "dark";
    state.soundEnabled = parsed.soundEnabled ?? true;
    state.autoResetSequence = parsed.autoResetSequence ?? false;
    state.editingPresenterId = null;
    state.total = {
      ...state.total,
      ...(parsed.total || {}),
      alerted: parsed.total?.alerted ?? false,
    };

    state.presenters = (parsed.presenters || []).map(p => ({
      ...p,
      durationMs: p.durationMs || 5 * 60 * 1000,
      alerted: p.alerted ?? false,
      color: p.color || "#7c5cff",
    }));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  els.themeToggleBtn.addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    saveImmediate();
    renderAll(true);
  });

  if (els.mobilePauseTotalBtn) {
    els.mobilePauseTotalBtn.addEventListener("click", pauseTotalAndPresenters);
  }

  if (els.mobileNextSpeakerBtn) {
    els.mobileNextSpeakerBtn.addEventListener("click", nextSpeaker);
  }

  if (els.mobileSummaryBtn) {
    els.mobileSummaryBtn.addEventListener("click", showSummary);
  }

  els.modeTabs.forEach(tab => {
    tab.addEventListener("click", () => setMode(tab.dataset.mode));
  });

  els.addPresenterBtn.addEventListener("click", addPresenter);

  els.presenterName.addEventListener("keydown", event => {
    if (event.key === "Enter") addPresenter();
  });

  els.presenterType.addEventListener("change", updatePresenterDurationLabel);

  els.totalType.addEventListener("change", changeTotalType);
  els.totalMinutes.addEventListener("change", changeTotalType);
  els.totalSeconds.addEventListener("change", () => {
    clampSeconds(els.totalSeconds);
    changeTotalType();
  });

  els.presenterSeconds.addEventListener("change", () => clampSeconds(els.presenterSeconds));
  els.editSeconds.addEventListener("change", () => clampSeconds(els.editSeconds));
  els.editTargetSeconds.addEventListener("change", () => clampSeconds(els.editTargetSeconds));
  els.editTotalSeconds.addEventListener("change", () => clampSeconds(els.editTotalSeconds));

  els.soundEnabled.addEventListener("change", () => {
    state.soundEnabled = els.soundEnabled.checked;
    save();
  });

  if (els.autoResetSequence) {
    els.autoResetSequence.addEventListener("change", () => {
      state.autoResetSequence = els.autoResetSequence.checked;
      save();
    });
  }

  els.testSoundBtn.addEventListener("click", playTone);

  els.pauseTotalBtn.addEventListener("click", pauseTotalAndPresenters);

  els.startTotalBtn.addEventListener("click", () => {
    if (!state.total.running) {
      startTotalIfNeeded();
      save();
      renderAll(true);
    }
  });

  els.editTotalBtn.addEventListener("click", openEditTotalDialog);
  els.resetTotalBtn.addEventListener("click", resetTotal);
  els.resetAllBtn.addEventListener("click", resetAll);
  els.pausePresentersBtn.addEventListener("click", () => {
    pauseAllPresenters();
    save();
    renderAll(true);
  });

  els.clearPresentersBtn.addEventListener("click", clearPresenters);
  els.loadSequenceBtn.addEventListener("click", loadSequence);
  els.sideNextSpeakerBtn.addEventListener("click", nextSpeaker);
  els.mainNextSpeakerBtn.addEventListener("click", nextSpeaker);

  els.summaryBtn.addEventListener("click", showSummary);
  els.closeSummaryBtn.addEventListener("click", () => els.summaryDialog.close());
  els.closeSummaryFooterBtn.addEventListener("click", () => els.summaryDialog.close());
  els.copySummaryBtn.addEventListener("click", copySummary);

  els.closeEditBtn.addEventListener("click", closeEditDialog);
  els.cancelEditBtn.addEventListener("click", closeEditDialog);
  els.saveEditBtn.addEventListener("click", saveEditDialog);

  els.closeEditTotalBtn.addEventListener("click", closeEditTotalDialog);
  els.cancelEditTotalBtn.addEventListener("click", closeEditTotalDialog);
  els.saveEditTotalBtn.addEventListener("click", saveEditTotalDialog);

  els.timerGrid.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) {
      const card = event.target.closest(".timer-card");
      if (card && state.mode === "semi") togglePresenter(card.dataset.id);
      return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "start") startPresenter(id);
    if (action === "pause") pausePresenter(id);
    if (action === "reset") resetPresenter(id);
    if (action === "delete") deletePresenter(id);
    if (action === "edit") openEditDialog(id);
    if (action === "color") chooseColor(id);
  });

  els.timerGrid.addEventListener("input", event => {
    const input = event.target.closest("[data-color-input]");
    if (!input) return;
    updateColor(input.dataset.colorInput, input.value);
  });

  els.timerGrid.addEventListener("change", event => {
    const input = event.target.closest("[data-color-input]");
    if (!input) return;
    updateColor(input.dataset.colorInput, input.value);
  });
}

function checkTimerAlerts() {
  if (state.total.type === "timer" && state.total.running) {
    const remaining = state.total.durationMs - activeElapsed(state.total);
    if (remaining <= 0 && !state.total.alerted) {
      state.total.alerted = true;
      state.total.elapsedMs = state.total.durationMs;
      state.total.running = false;
      state.total.lastStartedAt = null;
      pauseAllPresenters();
      playTone();
      save();
      renderAll(true);
    }
  }

  state.presenters.forEach(p => {
    if (p.type === "timer" && p.running) {
      const remaining = p.durationMs - activeElapsed(p);
      if (remaining <= 0 && !p.alerted) {
        p.alerted = true;
        p.elapsedMs = p.durationMs;
        p.running = false;
        p.lastStartedAt = null;
        playTone();
        save();
        renderAll(true);
      }
    }
  });
}

function startRenderLoop() {
  if (renderInterval) clearInterval(renderInterval);
  renderInterval = setInterval(() => {
    checkTimerAlerts();
    renderTotal();
    updateLivePresenterValues();
    renderSequenceStatus();
    renderMobileLiveBar();
  }, 100);
}

window.addEventListener("beforeunload", saveImmediate);

load();
bindEvents();
renderAll(true);
startRenderLoop();
