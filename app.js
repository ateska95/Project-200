const JOURNEY_START = '2026-08-01';
const DB_NAME = 'project-200-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';
const STATE_KEY = 'current';
const EXERCISE_TYPES = ['Aikido-Lite', 'Aikido-Intense', 'Jog', 'Gym', 'Other'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drink'];

const DEFAULT_STATE = {
  version: 1,
  food: [],
  exercise: [],
  weights: [],
  settings: {
    startWeight: 222,
    goalWeight: 200
  }
};

let state = structuredClone(DEFAULT_STATE);
let deferredInstallPrompt = null;

const $ = id => document.getElementById(id);

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const todayString = localDateString();

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, includeYear = true) {
  const date = parseLocalDate(value);
  return date.toLocaleDateString(undefined, includeYear
    ? { month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' });
}

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadState() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function saveState() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function normalizeState(imported) {
  const normalized = structuredClone(DEFAULT_STATE);
  if (!imported || typeof imported !== 'object') return normalized;

  normalized.food = Array.isArray(imported.food)
    ? imported.food.filter(item => item && typeof item.date === 'string').map(item => ({
        id: item.id || makeId(),
        createdAt: Number(item.createdAt) || Date.now(),
        date: item.date,
        time: item.time || '',
        name: String(item.name || 'Food entry'),
        meal: MEAL_TYPES.includes(item.meal) ? item.meal : 'Snack',
        portion: ['Small', 'Standard', 'Large', 'Unsure'].includes(item.portion) ? item.portion : 'Standard',
        note: String(item.note || ''),
        unplanned: Boolean(item.unplanned)
      }))
    : [];

  normalized.exercise = Array.isArray(imported.exercise)
    ? imported.exercise.filter(item => item && typeof item.date === 'string').map(item => ({
        id: item.id || makeId(),
        createdAt: Number(item.createdAt) || Date.now(),
        date: item.date,
        exerciseType: EXERCISE_TYPES.includes(item.exerciseType) ? item.exerciseType : 'Other',
        duration: Math.max(1, Number(item.duration) || 1),
        period: ['Morning', 'Afternoon', 'Evening'].includes(item.period) ? item.period : 'Evening',
        note: String(item.note || '')
      }))
    : [];

  normalized.weights = Array.isArray(imported.weights)
    ? imported.weights.filter(item => item && typeof item.date === 'string' && Number.isFinite(Number(item.weight))).map(item => ({
        id: item.id || makeId(),
        createdAt: Number(item.createdAt) || Date.now(),
        date: item.date,
        weight: Number(item.weight),
        period: ['Morning', 'Afternoon', 'Evening'].includes(item.period) ? item.period : 'Morning'
      }))
    : [];

  const startWeight = Number(imported.settings?.startWeight);
  const goalWeight = Number(imported.settings?.goalWeight);
  if (Number.isFinite(startWeight) && Number.isFinite(goalWeight) && startWeight > goalWeight) {
    normalized.settings.startWeight = startWeight;
    normalized.settings.goalWeight = goalWeight;
  }

  return normalized;
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.toggle('hidden', screen.id !== screenId);
  });

  const dashboardActive = screenId === 'dashboard-screen';
  $('show-dashboard').classList.toggle('primary', dashboardActive);
  $('show-dashboard').classList.toggle('secondary', !dashboardActive);
  $('show-inputs').classList.toggle('primary', !dashboardActive);
  $('show-inputs').classList.toggle('secondary', dashboardActive);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showEntryPanel(panelId) {
  document.querySelectorAll('.entry-panel').forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== panelId);
  });
  document.querySelectorAll('.entry-selector').forEach(button => {
    button.classList.toggle('active', button.dataset.entryPanel === panelId);
  });
}

function journeyDayCount() {
  const start = parseLocalDate(JOURNEY_START);
  const today = parseLocalDate(todayString);
  return Math.max(1, Math.floor((today - start) / 86400000) + 1);
}

function withinJourney(entry) {
  return entry.date >= JOURNEY_START && entry.date <= todayString;
}

function journeyFood() { return state.food.filter(withinJourney); }
function journeyExercise() { return state.exercise.filter(withinJourney); }
function journeyWeights() { return state.weights.filter(withinJourney); }

function sortedWeights() {
  return [...journeyWeights()].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
}

function latestWeightEntry() {
  return sortedWeights()[0] || null;
}

function weightProgress(weight) {
  const range = state.settings.startWeight - state.settings.goalWeight;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(1, (state.settings.startWeight - weight) / range));
}

function weightColor(weight) {
  const progress = weightProgress(weight);
  const hue = Math.round(progress * 120);
  return {
    solid: `hsl(${hue} 68% 43%)`,
    soft: `hsl(${hue} 70% 48% / 0.12)`,
    border: `hsl(${hue} 60% 40% / 0.65)`,
    progress
  };
}

function mealBadge(meal, count = null) {
  const text = count === null ? meal : `${meal} ${count}`;
  return `<span class="meal-badge meal-${meal.toLowerCase()}">${escapeHtml(text)}</span>`;
}

function updateMealPreview() {
  $('selected-meal-preview').innerHTML = `<span>Selected category:</span>${mealBadge($('meal-type').value)}`;
}

function renderJourneyDashboard() {
  const dayCount = journeyDayCount();
  const food = journeyFood();
  const exercise = journeyExercise();
  const latest = latestWeightEntry();
  const currentWeight = latest ? latest.weight : state.settings.startWeight;
  const change = state.settings.startWeight - currentWeight;
  const remaining = Math.max(0, currentWeight - state.settings.goalWeight);
  const progress = weightProgress(currentWeight);
  const totalMinutes = exercise.reduce((sum, item) => sum + item.duration, 0);
  const averageSession = exercise.length ? totalMinutes / exercise.length : null;
  const activeDateSet = new Set(exercise.map(item => item.date));
  const foodDateSet = new Set(food.map(item => item.date));
  const weeksElapsed = Math.max(1, dayCount / 7);
  const frequency = exercise.length / weeksElapsed;
  const unplanned = food.filter(item => item.unplanned).length;
  const unplannedPercent = food.length ? Math.round((unplanned / food.length) * 100) : 0;
  const colors = weightColor(currentWeight);

  $('journey-day-badge').textContent = `Day ${dayCount}`;
  $('journey-range').textContent = `${formatDate(JOURNEY_START)} through ${formatDate(todayString)}`;
  $('latest-weight').textContent = currentWeight.toFixed(1);
  $('latest-weight-detail').textContent = latest ? `${formatDate(latest.date, false)} · ${latest.period}` : 'Starting baseline';
  $('goal-gap').textContent = remaining.toFixed(1);
  $('journey-weight-change').textContent = change.toFixed(1);
  $('journey-session-count').textContent = exercise.length;
  $('journey-exercise-minutes').textContent = totalMinutes;
  $('active-days').textContent = activeDateSet.size;
  $('active-days-detail').textContent = `of ${dayCount} journey ${dayCount === 1 ? 'day' : 'days'}`;
  $('average-session').textContent = averageSession === null ? '—' : Math.round(averageSession);
  $('weekly-frequency').textContent = frequency.toFixed(1);

  $('latest-weight-card').style.background = colors.soft;
  $('latest-weight-card').style.borderColor = colors.border;
  $('latest-weight').style.color = colors.solid;

  $('progress-percent').textContent = `${Math.round(progress * 100)}%`;
  $('progress-bar').style.width = `${progress * 100}%`;
  $('progress-description').textContent = `${state.settings.startWeight.toFixed(1)} lb start · ${currentWeight.toFixed(1)} lb latest · ${state.settings.goalWeight.toFixed(1)} lb goal`;
  $('goal-scale-label').textContent = `${state.settings.goalWeight.toFixed(0)} lb · Goal`;
  $('start-scale-label').textContent = `${state.settings.startWeight.toFixed(0)} lb · Start`;
  $('midpoint-scale-label').textContent = `${((state.settings.startWeight + state.settings.goalWeight) / 2).toFixed(0)} lb`;
  $('weight-position').style.left = `${(1 - progress) * 100}%`;

  const activityData = EXERCISE_TYPES.map(type => {
    const sessions = exercise.filter(item => item.exerciseType === type);
    return {
      type,
      sessions: sessions.length,
      minutes: sessions.reduce((sum, item) => sum + item.duration, 0)
    };
  });

  const topActivity = [...activityData].sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions)[0];
  $('top-activity').textContent = topActivity?.minutes ? topActivity.type : '—';
  $('top-activity-detail').textContent = topActivity?.minutes
    ? `${topActivity.minutes} min · ${topActivity.sessions} ${topActivity.sessions === 1 ? 'session' : 'sessions'}`
    : 'No sessions';

  $('exercise-summary-text').textContent = exercise.length
    ? `${exercise.length} exercise ${exercise.length === 1 ? 'session has' : 'sessions have'} been recorded across ${activeDateSet.size} active ${activeDateSet.size === 1 ? 'day' : 'days'}, totaling ${totalMinutes} minutes.`
    : 'No exercise has been recorded yet.';

  const maxMinutes = Math.max(1, ...activityData.map(item => item.minutes));
  $('activity-breakdown').innerHTML = activityData.map(item => {
    const width = item.minutes ? Math.max(4, (item.minutes / maxMinutes) * 100) : 0;
    return `
      <div class="activity-row">
        <div class="activity-label">
          <strong>${escapeHtml(item.type)}</strong>
          <span class="muted">${item.minutes} min · ${item.sessions} ${item.sessions === 1 ? 'session' : 'sessions'}</span>
        </div>
        <div class="activity-track"><span class="activity-fill" style="width:${width}%;opacity:${item.minutes ? 1 : 0}"></span></div>
      </div>`;
  }).join('');

  const mealCounts = Object.fromEntries(MEAL_TYPES.map(meal => [meal, food.filter(item => item.meal === meal).length]));
  $('journey-food-count').textContent = food.length;
  $('journey-unplanned-count').textContent = unplanned;
  $('unplanned-rate').textContent = `${unplannedPercent}% of entries`;
  $('food-days-count').textContent = `${foodDateSet.size} ${foodDateSet.size === 1 ? 'day' : 'days'} logged`;
  $('meal-mix').innerHTML = MEAL_TYPES.map(meal => mealBadge(meal, mealCounts[meal])).join('');

  if (!latest && exercise.length === 0 && food.length === 0) {
    $('journey-summary').innerHTML = '<strong>Your Project 200 journey is ready to begin.</strong><span>Add your first weigh-in, meal, or exercise session.</span>';
  } else if (progress >= 1) {
    $('journey-summary').innerHTML = '<strong>You have reached your 200-pound goal.</strong><span>Continue tracking exercise and weight maintenance from here.</span>';
  } else {
    $('journey-summary').innerHTML = `<strong>Your latest weight is ${currentWeight.toFixed(1)} lb, with ${remaining.toFixed(1)} lb remaining to goal.</strong><span>You have recorded ${exercise.length} exercise ${exercise.length === 1 ? 'session' : 'sessions'} totaling ${totalMinutes} minutes since August 1.</span>`;
  }
}

function renderDailyLog() {
  const date = $('review-date').value;
  const entries = [
    ...state.food.filter(item => item.date === date).map(item => ({ ...item, recordType: 'Food' })),
    ...state.exercise.filter(item => item.date === date).map(item => ({ ...item, recordType: 'Exercise' })),
    ...state.weights.filter(item => item.date === date).map(item => ({ ...item, recordType: 'Weight' }))
  ].sort((a, b) => b.createdAt - a.createdAt);

  $('log-empty').hidden = entries.length > 0;
  $('daily-log').innerHTML = entries.map(entry => {
    if (entry.recordType === 'Food') {
      const colorMap = { Breakfast: '#8b5e3c', Lunch: '#82bce7', Dinner: '#dc83ad', Snack: '#d94a4a', Drink: '#1f4e79' };
      return `
        <article class="history-card food" style="border-left-color:${colorMap[entry.meal]}">
          <div class="history-main">
            <div class="history-title">${mealBadge(entry.meal)}<strong>${escapeHtml(entry.name)}</strong></div>
            <div class="history-meta"><span class="badge">${escapeHtml(entry.portion)}</span>${entry.unplanned ? '<span class="badge">Unplanned</span>' : ''}</div>
            ${entry.note ? `<p class="history-note">${escapeHtml(entry.note)}</p>` : ''}
            <p class="history-note">${escapeHtml(entry.time)}</p>
          </div>
          <button type="button" class="remove-button" data-kind="food" data-id="${entry.id}">Remove</button>
        </article>`;
    }

    if (entry.recordType === 'Exercise') {
      return `
        <article class="history-card">
          <div class="history-main">
            <div class="history-title"><span class="badge">Exercise</span><strong>${escapeHtml(entry.exerciseType)}</strong></div>
            <div class="history-meta"><span class="badge">${entry.duration} min</span><span class="badge">${escapeHtml(entry.period)}</span></div>
            ${entry.note ? `<p class="history-note">${escapeHtml(entry.note)}</p>` : ''}
          </div>
          <button type="button" class="remove-button" data-kind="exercise" data-id="${entry.id}">Remove</button>
        </article>`;
    }

    const colors = weightColor(entry.weight);
    return `
      <article class="history-card" style="background:${colors.soft};border-color:${colors.border}">
        <div class="weight-history-main">
          <span class="weight-color-strip" style="background:${colors.solid}"></span>
          <div>
            <strong style="color:${colors.solid}">${entry.weight.toFixed(1)} lb</strong>
            <p class="history-note">${escapeHtml(entry.period)} weigh-in</p>
          </div>
        </div>
        <button type="button" class="remove-button" data-kind="weight" data-id="${entry.id}">Remove</button>
      </article>`;
  }).join('');

  document.querySelectorAll('.remove-button').forEach(button => {
    button.addEventListener('click', async () => {
      const { kind, id } = button.dataset;
      if (kind === 'food') state.food = state.food.filter(item => item.id !== id);
      if (kind === 'exercise') state.exercise = state.exercise.filter(item => item.id !== id);
      if (kind === 'weight') state.weights = state.weights.filter(item => item.id !== id);
      await commitState();
    });
  });
}

function updateAll() {
  renderJourneyDashboard();
  renderDailyLog();
}

async function commitState(messageElement = null, message = '') {
  try {
    await saveState();
    updateAll();
    if (messageElement) messageElement.textContent = message;
  } catch (error) {
    console.error(error);
    if (messageElement) messageElement.textContent = 'The entry could not be saved on this device.';
  }
}

async function addFood() {
  const input = $('food-name');
  const name = input.value.trim();
  if (!name) {
    $('food-message').textContent = 'Enter the food or drink first.';
    input.focus();
    return;
  }

  state.food.push({
    id: makeId(),
    createdAt: Date.now(),
    date: $('food-date').value || todayString,
    time: currentTime(),
    name,
    meal: $('meal-type').value,
    portion: $('portion-size').value,
    note: $('food-note').value.trim(),
    unplanned: $('unplanned-food').checked
  });

  $('review-date').value = $('food-date').value;
  input.value = '';
  $('food-note').value = '';
  $('unplanned-food').checked = false;
  $('portion-size').value = 'Standard';
  await commitState($('food-message'), 'Food entry saved.');
}

async function addExercise() {
  const input = $('exercise-duration');
  const duration = Number(input.value);
  if (!Number.isFinite(duration) || duration < 1) {
    $('exercise-message').textContent = 'Enter the approximate number of minutes.';
    input.focus();
    return;
  }

  state.exercise.push({
    id: makeId(),
    createdAt: Date.now(),
    date: $('exercise-date').value || todayString,
    exerciseType: $('exercise-type').value,
    duration,
    period: $('exercise-period').value,
    note: $('exercise-note').value.trim()
  });

  $('review-date').value = $('exercise-date').value;
  input.value = '';
  $('exercise-note').value = '';
  await commitState($('exercise-message'), 'Exercise entry saved.');
}

async function addWeight() {
  const weight = Number($('weight-value').value);
  if (!Number.isFinite(weight) || weight < 80 || weight > 500) {
    $('weight-message').textContent = 'Enter a valid weight in pounds.';
    $('weight-value').focus();
    return;
  }

  state.weights.push({
    id: makeId(),
    createdAt: Date.now(),
    date: $('weight-date').value || todayString,
    weight,
    period: $('weight-period').value
  });

  $('review-date').value = $('weight-date').value;
  $('weight-value').value = '';
  await commitState($('weight-message'), 'Weigh-in saved.');
}

async function saveSettings() {
  const start = Number($('start-weight').value);
  const goal = Number($('goal-weight').value);
  if (!Number.isFinite(start) || !Number.isFinite(goal) || start <= goal) {
    $('settings-message').textContent = 'Starting weight must be greater than goal weight.';
    return;
  }
  state.settings.startWeight = start;
  state.settings.goalWeight = goal;
  await commitState($('settings-message'), 'Goal settings saved.');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const rows = [['Date', 'Clock Time', 'Record Type', 'Name', 'Category', 'Portion or Duration', 'Time of Day', 'Unplanned', 'Weight', 'Note']];
  state.food.forEach(entry => rows.push([entry.date, entry.time, 'Food', entry.name, entry.meal, entry.portion, '', entry.unplanned ? 'Yes' : 'No', '', entry.note]));
  state.exercise.forEach(entry => rows.push([entry.date, '', 'Exercise', entry.exerciseType, entry.exerciseType, `${entry.duration} minutes`, entry.period, '', '', entry.note]));
  state.weights.forEach(entry => rows.push([entry.date, '', 'Weight', '', '', '', entry.period, '', entry.weight, '']));
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadFile(`project-200-data-${todayString}.csv`, csv, 'text/csv;charset=utf-8');
}

async function clearSelectedDay() {
  const selected = $('review-date').value;
  if (!window.confirm(`Remove all entries for ${formatDate(selected)}?`)) return;
  state.food = state.food.filter(entry => entry.date !== selected);
  state.exercise = state.exercise.filter(entry => entry.date !== selected);
  state.weights = state.weights.filter(entry => entry.date !== selected);
  await commitState($('data-message'), 'Selected day cleared.');
}

async function clearAllData() {
  if (!window.confirm('Clear every food, exercise, and weight entry? This cannot be undone unless you have a backup.')) return;
  state = structuredClone(DEFAULT_STATE);
  $('start-weight').value = state.settings.startWeight;
  $('goal-weight').value = state.settings.goalWeight;
  await commitState($('data-message'), 'All tracked data was cleared.');
}

async function importBackup(file) {
  const text = await file.text();
  const imported = JSON.parse(text);
  state = normalizeState(imported);
  $('start-weight').value = state.settings.startWeight;
  $('goal-weight').value = state.settings.goalWeight;
  await commitState($('data-message'), 'Backup imported successfully.');
}

function setupInstallFlow() {
  const installButton = $('install-app');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) installButton.classList.add('hidden');

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.remove('hidden');
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installButton.classList.add('hidden');
  });
}

function bindEvents() {
  $('show-dashboard').addEventListener('click', () => showScreen('dashboard-screen'));
  $('show-inputs').addEventListener('click', () => showScreen('input-screen'));
  $('dashboard-add-entry').addEventListener('click', () => showScreen('input-screen'));
  $('input-back-dashboard').addEventListener('click', () => showScreen('dashboard-screen'));
  $('entry-finished').addEventListener('click', () => showScreen('dashboard-screen'));

  document.querySelectorAll('.entry-selector').forEach(button => {
    button.addEventListener('click', () => showEntryPanel(button.dataset.entryPanel));
  });

  $('add-food').addEventListener('click', addFood);
  $('add-exercise').addEventListener('click', addExercise);
  $('add-weight').addEventListener('click', addWeight);
  $('save-settings').addEventListener('click', saveSettings);
  $('export-csv').addEventListener('click', exportCsv);
  $('export-backup').addEventListener('click', () => downloadFile(`project-200-backup-${todayString}.json`, JSON.stringify(state, null, 2), 'application/json'));
  $('clear-day').addEventListener('click', clearSelectedDay);
  $('clear-all').addEventListener('click', clearAllData);
  $('meal-type').addEventListener('change', updateMealPreview);
  $('review-date').addEventListener('change', renderDailyLog);

  $('import-backup').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(file);
    } catch (error) {
      console.error(error);
      $('data-message').textContent = 'That file could not be imported as a Project 200 backup.';
    }
    event.target.value = '';
  });

  $('food-name').addEventListener('keydown', event => { if (event.key === 'Enter') addFood(); });
  $('exercise-duration').addEventListener('keydown', event => { if (event.key === 'Enter') addExercise(); });
  $('weight-value').addEventListener('keydown', event => { if (event.key === 'Enter') addWeight(); });
}

async function initialize() {
  $('food-date').value = todayString;
  $('exercise-date').value = todayString;
  $('weight-date').value = todayString;
  $('review-date').value = todayString;

  try {
    const saved = await loadState();
    state = normalizeState(saved || DEFAULT_STATE);
  } catch (error) {
    console.error('Could not load local data:', error);
    state = structuredClone(DEFAULT_STATE);
    $('data-message').textContent = 'Local storage could not be opened. Entries may not persist.';
  }

  $('start-weight').value = state.settings.startWeight;
  $('goal-weight').value = state.settings.goalWeight;

  bindEvents();
  setupInstallFlow();
  showScreen('dashboard-screen');
  showEntryPanel('food-entry-panel');
  updateMealPreview();
  updateAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(error => console.error('Service worker registration failed:', error));
  }
}

initialize();
