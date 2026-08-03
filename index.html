const JOURNEY_START = '2026-08-01';
const DB_NAME = 'project-200-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';
const STATE_KEY = 'current';
const EXERCISE_TYPES = ['Aikido-Lite', 'Aikido-Intense', 'Jog', 'Gym', 'Other'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drink'];

const DEFAULT_STATE = {
  version: 4,
  food: [],
  exercise: [],
  weights: [],
  japanFund: [],
  settings: {
    startWeight: 222,
    goalWeight: 200,
    fundStartingBalance: 500,
    fundGoalAmount: 10000,
    fundMonthlyTarget: 850,
    fundContributionStart: '2026-09-01',
    fundTargetDate: '2027-08-01'
  }
};

let state = structuredClone(DEFAULT_STATE);
let deferredInstallPrompt = null;
let foodWeekStart = '';
let exerciseWeekStart = '';
let fundWeekStart = '';

const $ = id => document.getElementById(id);

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const todayString = localDateString();

function parseLocalDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value, amount) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + amount);
  return localDateString(date);
}

function startOfWeek(value = todayString) {
  const date = parseLocalDate(value);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return localDateString(date);
}

function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function formatDate(value, includeYear = true) {
  return parseLocalDate(value).toLocaleDateString(undefined, includeYear
    ? { month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' });
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const startDate = parseLocalDate(weekStart);
  const endDate = parseLocalDate(weekEnd);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) {
    return `${startDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}–${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}–${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number(value) % 1 ? 2 : 0,
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function monthKey(value = todayString) {
  return String(value).slice(0, 7);
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

function fundSignedAmount(entry) {
  return entry.type === 'withdrawal' ? -entry.amount : entry.amount;
}

function fundBalance() {
  return state.settings.fundStartingBalance + state.japanFund.reduce((sum, entry) => sum + fundSignedAmount(entry), 0);
}

function fundNetForMonth(month) {
  return state.japanFund
    .filter(entry => monthKey(entry.date) === month)
    .reduce((sum, entry) => sum + fundSignedAmount(entry), 0);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
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
    transaction.oncomplete = () => { db.close(); resolve(); };
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

  normalized.japanFund = Array.isArray(imported.japanFund)
    ? imported.japanFund.filter(item => item && typeof item.date === 'string' && Number.isFinite(Number(item.amount))).map(item => ({
        id: item.id || makeId(),
        createdAt: Number(item.createdAt) || Date.now(),
        date: item.date,
        type: item.type === 'withdrawal' ? 'withdrawal' : 'deposit',
        amount: Math.abs(Number(item.amount)),
        note: String(item.note || '')
      }))
    : [];

  const startWeight = Number(imported.settings?.startWeight);
  const goalWeight = Number(imported.settings?.goalWeight);
  if (Number.isFinite(startWeight) && Number.isFinite(goalWeight) && startWeight > goalWeight) {
    normalized.settings.startWeight = startWeight;
    normalized.settings.goalWeight = goalWeight;
  }

  const numericSettings = [
    ['fundStartingBalance', 0, true],
    ['fundGoalAmount', 0, false],
    ['fundMonthlyTarget', 0, false]
  ];
  numericSettings.forEach(([key, floor, allowEqual]) => {
    const value = Number(imported.settings?.[key]);
    if (Number.isFinite(value) && (allowEqual ? value >= floor : value > floor)) normalized.settings[key] = value;
  });

  ['fundContributionStart', 'fundTargetDate'].forEach(key => {
    const value = String(imported.settings?.[key] || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) normalized.settings[key] = value;
  });

  return normalized;
}

function populateSettingsFields() {
  $('start-weight').value = state.settings.startWeight;
  $('goal-weight').value = state.settings.goalWeight;
  $('fund-starting-balance').value = state.settings.fundStartingBalance;
  $('fund-goal-amount').value = state.settings.fundGoalAmount;
  $('fund-monthly-target').value = state.settings.fundMonthlyTarget;
  $('fund-contribution-start').value = state.settings.fundContributionStart;
  $('fund-target-date').value = state.settings.fundTargetDate;
}

function showTab(tabName) {
  document.querySelectorAll('[data-screen]').forEach(screen => {
    screen.classList.toggle('hidden', screen.dataset.screen !== tabName);
  });
  document.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  try { localStorage.setItem('project-200-active-tab', tabName); } catch (_) {}
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sortedWeights() {
  return [...journeyWeights()].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

function latestWeightEntry() {
  const entries = sortedWeights();
  return entries.at(-1) || null;
}

function weightProgress(weight) {
  const start = state.settings.startWeight;
  const goal = state.settings.goalWeight;
  return Math.max(0, Math.min(100, ((start - weight) / (start - goal)) * 100));
}

function mealClass(meal) {
  return `meal-${String(meal).toLowerCase()}`;
}

function renderHeader() {
  $('journey-day-badge').textContent = `Day ${journeyDayCount()}`;
  $('journey-subtitle').textContent = `${formatDate(JOURNEY_START)} through ${formatDate(todayString)}`;
}

function nextFundGoalInfo() {
  const monthlyTarget = state.settings.fundMonthlyTarget;
  const contributionStart = state.settings.fundContributionStart;
  const targetDate = state.settings.fundTargetDate;
  if (!contributionStart || !targetDate) {
    return { label: 'Not set', detail: 'Set the Japan fund dates in settings.' };
  }

  const startMonth = monthKey(contributionStart);
  const targetMonth = monthKey(targetDate);
  const currentMonth = monthKey();

  if (todayString < contributionStart) {
    return {
      label: formatDate(contributionStart),
      detail: `First monthly goal: ${formatCurrency(monthlyTarget)}`
    };
  }

  if (currentMonth >= startMonth && currentMonth <= targetMonth) {
    const currentNet = fundNetForMonth(currentMonth);
    if (currentNet < monthlyTarget) {
      const due = Math.max(0, monthlyTarget - currentNet);
      return {
        label: parseLocalDate(`${currentMonth}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        detail: `${formatCurrency(due)} remaining for this month's target`
      };
    }
  }

  let pointer = parseLocalDate(`${currentMonth}-01`);
  pointer.setMonth(pointer.getMonth() + 1);
  while (monthKey(localDateString(pointer)) <= targetMonth) {
    const key = monthKey(localDateString(pointer));
    if (key >= startMonth) {
      return {
        label: formatDate(localDateString(pointer)),
        detail: `Next monthly goal: ${formatCurrency(monthlyTarget)}`
      };
    }
    pointer.setMonth(pointer.getMonth() + 1);
  }

  return {
    label: formatDate(targetDate),
    detail: fundBalance() >= state.settings.fundGoalAmount ? 'Savings goal reached.' : 'Trip target date reached.'
  };
}

function renderDashboard() {
  const food = journeyFood();
  const exercise = journeyExercise();
  const latest = latestWeightEntry();
  const currentWeight = latest?.weight ?? state.settings.startWeight;
  const progress = weightProgress(currentWeight);
  const unplanned = food.filter(entry => entry.unplanned).length;
  const exerciseMinutes = exercise.reduce((sum, entry) => sum + entry.duration, 0);

  $('dashboard-current-weight').textContent = currentWeight.toFixed(1);
  $('dashboard-weight-context').textContent = latest
    ? `${formatDate(latest.date)} · ${(currentWeight - state.settings.startWeight).toFixed(1)} lb from start`
    : 'Starting baseline';
  $('dashboard-progress-percent').textContent = `${Math.round(progress)}%`;
  $('dashboard-progress-fill').style.width = `${progress}%`;
  $('dashboard-progress-marker').style.left = `${Math.max(1, Math.min(99, progress))}%`;
  $('dashboard-start-label').textContent = `${state.settings.startWeight} lb start`;
  $('dashboard-current-label').textContent = `${currentWeight.toFixed(1)} lb now`;
  $('dashboard-goal-label').textContent = `${state.settings.goalWeight} lb goal`;

  $('dashboard-food-total').textContent = food.length;
  $('dashboard-unplanned-total').textContent = unplanned;
  $('dashboard-unplanned-rate').textContent = `${food.length ? Math.round((unplanned / food.length) * 100) : 0}% of food entries`;
  $('dashboard-exercise-total').textContent = exercise.length;
  $('dashboard-exercise-time').textContent = `${exerciseMinutes.toLocaleString()} total minutes`;
}

function renderJapanFund() {
  const balance = fundBalance();
  const goal = state.settings.fundGoalAmount;
  const remaining = Math.max(0, goal - balance);
  const percent = goal > 0 ? Math.max(0, Math.min(100, (balance / goal) * 100)) : 0;
  const currentMonth = monthKey();
  const thisMonth = fundNetForMonth(currentMonth);
  const contributionStartMonth = monthKey(state.settings.fundContributionStart);
  const targetMonth = monthKey(state.settings.fundTargetDate);
  const reminderActive = currentMonth >= contributionStartMonth && currentMonth <= targetMonth && thisMonth < state.settings.fundMonthlyTarget;
  const due = Math.max(0, state.settings.fundMonthlyTarget - thisMonth);
  const depositsTotal = state.japanFund.filter(entry => entry.type !== 'withdrawal').reduce((sum, entry) => sum + entry.amount, 0);
  const spentTotal = state.japanFund.filter(entry => entry.type === 'withdrawal').reduce((sum, entry) => sum + entry.amount, 0);
  const nextGoal = nextFundGoalInfo();

  $('fund-balance').textContent = formatCurrency(balance);
  $('fund-balance-card').textContent = formatCurrency(balance);
  $('fund-progress-percent').textContent = `${Math.round(percent)}%`;
  $('fund-progress-bar').style.width = `${percent}%`;
  $('fund-remaining').textContent = formatCurrency(remaining);
  $('fund-monthly-saved').textContent = formatCurrency(thisMonth);
  $('fund-plan-description').textContent = `${formatCurrency(state.settings.fundMonthlyTarget)} per month toward a ${formatCurrency(goal)} trip`;
  $('fund-total-deposits').textContent = formatCurrency(depositsTotal);
  $('fund-total-spent').textContent = formatCurrency(spentTotal);
  $('fund-next-goal-date').textContent = nextGoal.label;
  $('fund-next-goal-status').textContent = nextGoal.detail;

  $('fund-reminder').classList.toggle('hidden', !reminderActive);
  if (reminderActive) {
    $('fund-reminder-title').textContent = `${parseLocalDate(`${currentMonth}-01`).toLocaleDateString(undefined, { month: 'long' })} contribution due`;
    $('fund-reminder-text').textContent = `${formatCurrency(due)} remains for this month’s target.`;
  }

  const history = [...state.japanFund].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 10);
  $('fund-history').innerHTML = history.length
    ? history.map(entry => {
        const signed = fundSignedAmount(entry);
        return `<div class="compact-row">
          <div class="compact-row-main">
            <strong class="${signed >= 0 ? 'positive' : 'negative'}">${signed >= 0 ? '+' : '−'}${formatCurrency(Math.abs(signed))}</strong>
            <span class="compact-row-meta">${formatDate(entry.date, false)} · ${entry.type === 'withdrawal' ? 'Trip purchase' : 'Deposit'}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</span>
          </div>
          <button class="remove-button" type="button" data-remove-type="fund" data-remove-id="${escapeHtml(entry.id)}">Remove</button>
        </div>`;
      }).join('')
    : '<p class="muted">No deposits or trip purchases recorded yet.</p>';
}

function renderFoodWeek() {
  const dates = weekDates(foodWeekStart);
  const entries = state.food.filter(entry => dates.includes(entry.date));
  const unplanned = entries.filter(entry => entry.unplanned).length;
  $('food-week-label').textContent = formatWeekRange(foodWeekStart);
  $('food-week-total').textContent = entries.length;
  $('food-week-unplanned').textContent = unplanned;

  $('food-week-grid').innerHTML = dates.map(date => {
    const dateEntries = entries
      .filter(entry => entry.date === date)
      .sort((a, b) => a.createdAt - b.createdAt);
    const parsed = parseLocalDate(date);
    const entriesHtml = dateEntries.length
      ? dateEntries.map(entry => `<article class="food-mini-entry ${mealClass(entry.meal)} ${entry.unplanned ? 'unplanned' : ''}">
          <strong>${escapeHtml(entry.name)}</strong>
          <span class="mini-meta">${escapeHtml(entry.meal)} · ${escapeHtml(entry.portion)}${entry.unplanned ? ' · Unplanned' : ''}</span>
          <button class="mini-remove" type="button" aria-label="Remove ${escapeHtml(entry.name)}" data-remove-type="food" data-remove-id="${escapeHtml(entry.id)}">×</button>
        </article>`).join('')
      : '<p class="day-empty">No entries</p>';

    return `<section class="day-card ${date === todayString ? 'today' : ''}">
      <div class="day-card-header">
        <div><div class="day-name">${parsed.toLocaleDateString(undefined, { weekday: 'short' })}</div><div class="day-number">${parsed.getDate()}</div></div>
        <span class="day-count">${dateEntries.length || ''}</span>
      </div>
      ${entriesHtml}
    </section>`;
  }).join('');
}

function renderFundWeek() {
  const dates = weekDates(fundWeekStart);
  const entries = state.japanFund.filter(entry => dates.includes(entry.date));
  const deposits = entries.filter(entry => entry.type !== 'withdrawal').reduce((sum, entry) => sum + entry.amount, 0);
  const purchases = entries.filter(entry => entry.type === 'withdrawal').reduce((sum, entry) => sum + entry.amount, 0);
  $('fund-week-label').textContent = formatWeekRange(fundWeekStart);
  $('fund-week-total').textContent = entries.length;
  $('fund-week-deposit-total').textContent = formatCurrency(deposits);
  $('fund-week-withdraw-total').textContent = formatCurrency(purchases);

  $('fund-week-grid').innerHTML = dates.map(date => {
    const dateEntries = entries
      .filter(entry => entry.date === date)
      .sort((a, b) => a.createdAt - b.createdAt);
    const parsed = parseLocalDate(date);
    const entriesHtml = dateEntries.length
      ? dateEntries.map(entry => {
          const signed = fundSignedAmount(entry);
          return `<article class="fund-mini-entry ${entry.type}">
            <strong>${signed >= 0 ? '+' : '−'}${formatCurrency(Math.abs(signed))}</strong>
            <span class="mini-meta">${entry.type === 'withdrawal' ? 'Trip purchase' : 'Deposit'}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</span>
            <button class="mini-remove" type="button" aria-label="Remove cash activity" data-remove-type="fund" data-remove-id="${escapeHtml(entry.id)}">×</button>
          </article>`;
        }).join('')
      : '<p class="day-empty">No entries</p>';

    return `<section class="day-card ${date === todayString ? 'today' : ''}">
      <div class="day-card-header">
        <div><div class="day-name">${parsed.toLocaleDateString(undefined, { weekday: 'short' })}</div><div class="day-number">${parsed.getDate()}</div></div>
        <span class="day-count">${dateEntries.length || ''}</span>
      </div>
      ${entriesHtml}
    </section>`;
  }).join('');
}

function renderWeightSection() {
  const entries = sortedWeights();
  const latest = entries.at(-1);
  const currentWeight = latest?.weight ?? state.settings.startWeight;
  const change = currentWeight - state.settings.startWeight;
  const gap = currentWeight - state.settings.goalWeight;

  $('weight-latest-stat').textContent = currentWeight.toFixed(1);
  $('weight-change-stat').textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
  $('weight-goal-gap-stat').textContent = Math.max(0, gap).toFixed(1);
  $('weight-chart-range').textContent = `${formatDate(JOURNEY_START)} through ${formatDate(todayString)}`;
  $('weight-chart-empty').classList.toggle('hidden', entries.length > 0);
  $('weight-chart-wrap').classList.toggle('hidden', entries.length === 0);
  $('weight-history-details').classList.toggle('hidden', entries.length === 0);

  if (!entries.length) {
    $('weight-chart').innerHTML = '';
    $('weight-history').innerHTML = '';
    return;
  }

  renderWeightChart(entries);
  $('weight-history').innerHTML = [...entries].reverse().map(entry => `<div class="compact-row">
    <div class="compact-row-main">
      <strong>${entry.weight.toFixed(1)} lb</strong>
      <span class="compact-row-meta">${formatDate(entry.date)} · ${escapeHtml(entry.period)}</span>
    </div>
    <button class="remove-button" type="button" data-remove-type="weight" data-remove-id="${escapeHtml(entry.id)}">Remove</button>
  </div>`).join('');
}

function renderWeightChart(entries) {
  const svg = $('weight-chart');
  const width = 800;
  const height = 320;
  const margin = { top: 28, right: 30, bottom: 48, left: 58 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const displayEntries = entries.map(entry => ({ ...entry, timestamp: parseLocalDate(entry.date).getTime() }));
  const minTime = Math.min(parseLocalDate(JOURNEY_START).getTime(), ...displayEntries.map(entry => entry.timestamp));
  const maxTimeRaw = Math.max(...displayEntries.map(entry => entry.timestamp));
  const maxTime = maxTimeRaw === minTime ? minTime + 86400000 : maxTimeRaw;
  const values = [...displayEntries.map(entry => entry.weight), state.settings.startWeight, state.settings.goalWeight];
  const minWeight = Math.floor(Math.min(...values) - 2);
  const maxWeight = Math.ceil(Math.max(...values) + 2);
  const weightRange = Math.max(1, maxWeight - minWeight);

  const x = timestamp => margin.left + ((timestamp - minTime) / (maxTime - minTime)) * chartWidth;
  const y = weight => margin.top + ((maxWeight - weight) / weightRange) * chartHeight;
  const points = displayEntries.map(entry => `${x(entry.timestamp).toFixed(1)},${y(entry.weight).toFixed(1)}`).join(' ');
  const areaPoints = `${x(displayEntries[0].timestamp).toFixed(1)},${(margin.top + chartHeight).toFixed(1)} ${points} ${x(displayEntries.at(-1).timestamp).toFixed(1)},${(margin.top + chartHeight).toFixed(1)}`;

  const gridTicks = 4;
  const grid = Array.from({ length: gridTicks + 1 }, (_, index) => {
    const weight = maxWeight - (weightRange * index / gridTicks);
    const py = y(weight);
    return `<line class="chart-grid-line" x1="${margin.left}" y1="${py}" x2="${width - margin.right}" y2="${py}"></line>
      <text class="chart-axis-label" x="${margin.left - 10}" y="${py + 4}" text-anchor="end">${weight.toFixed(0)}</text>`;
  }).join('');

  const dateLabels = [
    { date: new Date(minTime), px: margin.left, anchor: 'start' },
    { date: new Date(maxTime), px: width - margin.right, anchor: 'end' }
  ].map(item => `<text class="chart-axis-label" x="${item.px}" y="${height - 16}" text-anchor="${item.anchor}">${item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>`).join('');

  const circles = displayEntries.map((entry, index) => `<circle class="chart-point ${index === displayEntries.length - 1 ? 'latest' : ''}" cx="${x(entry.timestamp)}" cy="${y(entry.weight)}" r="6">
    <title>${formatDate(entry.date)}: ${entry.weight.toFixed(1)} lb</title>
  </circle>`).join('');

  svg.innerHTML = `${grid}
    <line class="chart-goal-line" x1="${margin.left}" y1="${y(state.settings.goalWeight)}" x2="${width - margin.right}" y2="${y(state.settings.goalWeight)}"></line>
    <text class="chart-axis-label" x="${width - margin.right}" y="${y(state.settings.goalWeight) - 8}" text-anchor="end">Goal ${state.settings.goalWeight} lb</text>
    <polygon class="chart-area" points="${areaPoints}"></polygon>
    <polyline class="chart-line" points="${points}"></polyline>
    ${circles}
    ${dateLabels}`;
}

function renderExerciseWeek() {
  const dates = weekDates(exerciseWeekStart);
  const entries = state.exercise.filter(entry => dates.includes(entry.date));
  const totals = dates.map(date => entries.filter(entry => entry.date === date).reduce((sum, entry) => sum + entry.duration, 0));
  const maxMinutes = Math.max(1, ...totals);
  const totalMinutes = totals.reduce((sum, value) => sum + value, 0);

  $('exercise-week-label').textContent = formatWeekRange(exerciseWeekStart);
  $('exercise-week-sessions').textContent = entries.length;
  $('exercise-week-minutes').textContent = totalMinutes;
  $('exercise-week-chart').innerHTML = dates.map((date, index) => {
    const parsed = parseLocalDate(date);
    const minutes = totals[index];
    const barHeight = minutes ? Math.max(5, (minutes / maxMinutes) * 100) : 2;
    return `<div class="exercise-day-column ${date === todayString ? 'today' : ''}">
      <div class="exercise-bar-space"><div class="exercise-bar" style="height:${barHeight}%" title="${minutes} minutes"></div></div>
      <strong class="exercise-minutes">${minutes ? `${minutes}m` : '—'}</strong>
      <span class="exercise-day-label">${parsed.toLocaleDateString(undefined, { weekday: 'short' })}<br>${parsed.getDate()}</span>
    </div>`;
  }).join('');

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  $('exercise-week-list').innerHTML = sorted.length
    ? sorted.map(entry => `<div class="compact-row">
        <div class="compact-row-main">
          <strong>${escapeHtml(entry.exerciseType)} · ${entry.duration} min</strong>
          <span class="compact-row-meta">${formatDate(entry.date, false)} · ${escapeHtml(entry.period)}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</span>
        </div>
        <button class="remove-button" type="button" data-remove-type="exercise" data-remove-id="${escapeHtml(entry.id)}">Remove</button>
      </div>`).join('')
    : '<p class="muted">No exercise recorded this week.</p>';
}

function renderExerciseProgram() {
  const entries = journeyExercise();
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
  const activeDays = new Set(entries.map(entry => entry.date)).size;
  const average = entries.length ? Math.round(totalMinutes / entries.length) : 0;
  $('exercise-program-count').textContent = entries.length;
  $('exercise-program-minutes').textContent = totalMinutes.toLocaleString();
  $('exercise-program-days').textContent = activeDays;
  $('exercise-program-average').textContent = average;

  const typeTotals = EXERCISE_TYPES.map(type => {
    const typeEntries = entries.filter(entry => entry.exerciseType === type);
    return {
      type,
      sessions: typeEntries.length,
      minutes: typeEntries.reduce((sum, entry) => sum + entry.duration, 0)
    };
  }).filter(item => item.sessions > 0).sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(1, ...typeTotals.map(item => item.minutes));
  $('exercise-type-breakdown').innerHTML = typeTotals.length
    ? typeTotals.map(item => `<div class="breakdown-row">
        <div class="breakdown-label"><strong>${escapeHtml(item.type)}</strong><span>${item.sessions} sessions · ${item.minutes} min</span></div>
        <div class="breakdown-track"><div class="breakdown-fill" style="width:${(item.minutes / max) * 100}%"></div></div>
      </div>`).join('')
    : '<p class="muted">Activity breakdown will appear after your first session.</p>';
}

function renderAll() {
  renderHeader();
  renderDashboard();
  renderJapanFund();
  renderFoodWeek();
  renderFundWeek();
  renderWeightSection();
  renderExerciseWeek();
  renderExerciseProgram();
}

async function commitState(messageElement = null, message = '') {
  try {
    await saveState();
    renderAll();
    if (messageElement) {
      messageElement.textContent = message;
      window.setTimeout(() => { if (messageElement.textContent === message) messageElement.textContent = ''; }, 3000);
    }
  } catch (error) {
    console.error(error);
    if (messageElement) messageElement.textContent = 'Could not save. Please try again.';
  }
}

async function addFood() {
  const name = $('food-name').value.trim();
  if (!name) {
    $('food-message').textContent = 'Enter the food or drink.';
    $('food-name').focus();
    return;
  }
  const date = $('food-date').value || todayString;
  state.food.push({
    id: makeId(),
    createdAt: Date.now(),
    date,
    time: currentTime(),
    name,
    meal: $('meal-type').value,
    portion: $('portion-size').value,
    note: $('food-note').value.trim(),
    unplanned: $('food-unplanned').checked
  });
  foodWeekStart = startOfWeek(date);
  $('food-name').value = '';
  $('food-note').value = '';
  $('food-unplanned').checked = false;
  await commitState($('food-message'), 'Food entry saved.');
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
  $('weight-value').value = '';
  await commitState($('weight-message'), 'Weigh-in saved.');
}

async function addExercise() {
  const duration = Number($('exercise-duration').value);
  if (!Number.isFinite(duration) || duration < 1 || duration > 600) {
    $('exercise-message').textContent = 'Enter exercise minutes between 1 and 600.';
    $('exercise-duration').focus();
    return;
  }
  const date = $('exercise-date').value || todayString;
  state.exercise.push({
    id: makeId(),
    createdAt: Date.now(),
    date,
    exerciseType: $('exercise-type').value,
    duration,
    period: $('exercise-period').value,
    note: $('exercise-note').value.trim()
  });
  exerciseWeekStart = startOfWeek(date);
  $('exercise-duration').value = '';
  $('exercise-note').value = '';
  await commitState($('exercise-message'), 'Exercise saved.');
}

async function addFundEntry() {
  const amount = Number($('fund-entry-amount').value);
  if (!Number.isFinite(amount) || amount <= 0) {
    $('fund-entry-message').textContent = 'Enter a positive dollar amount.';
    $('fund-entry-amount').focus();
    return;
  }
  const date = $('fund-entry-date').value || todayString;
  state.japanFund.push({
    id: makeId(),
    createdAt: Date.now(),
    date,
    type: $('fund-entry-type').value === 'withdrawal' ? 'withdrawal' : 'deposit',
    amount,
    note: $('fund-entry-note').value.trim()
  });
  fundWeekStart = startOfWeek(date);
  $('fund-entry-amount').value = '';
  $('fund-entry-note').value = '';
  await commitState($('fund-entry-message'), 'Cash activity saved.');
}

async function removeEntry(type, id) {
  const collectionMap = { food: 'food', weight: 'weights', exercise: 'exercise', fund: 'japanFund' };
  const collection = collectionMap[type];
  if (!collection) return;
  state[collection] = state[collection].filter(entry => entry.id !== id);
  await commitState();
}

async function saveWeightSettings() {
  const start = Number($('start-weight').value);
  const goal = Number($('goal-weight').value);
  if (!Number.isFinite(start) || !Number.isFinite(goal) || start <= goal) {
    $('weight-settings-message').textContent = 'Starting weight must be greater than goal weight.';
    return;
  }
  state.settings.startWeight = start;
  state.settings.goalWeight = goal;
  await commitState($('weight-settings-message'), 'Weight goal saved.');
}

async function saveFundSettings() {
  const startingBalance = Number($('fund-starting-balance').value);
  const goalAmount = Number($('fund-goal-amount').value);
  const monthlyTarget = Number($('fund-monthly-target').value);
  const contributionStart = $('fund-contribution-start').value;
  const targetDate = $('fund-target-date').value;
  if (!Number.isFinite(startingBalance) || startingBalance < 0 || !Number.isFinite(goalAmount) || goalAmount <= 0 || !Number.isFinite(monthlyTarget) || monthlyTarget <= 0) {
    $('fund-settings-message').textContent = 'Enter valid fund amounts.';
    return;
  }
  if (!contributionStart || !targetDate || contributionStart > targetDate) {
    $('fund-settings-message').textContent = 'Check the reminder and target dates.';
    return;
  }
  Object.assign(state.settings, { fundStartingBalance: startingBalance, fundGoalAmount: goalAmount, fundMonthlyTarget: monthlyTarget, fundContributionStart: contributionStart, fundTargetDate: targetDate });
  await commitState($('fund-settings-message'), 'Fund plan saved.');
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
  const rows = [['Date', 'Clock Time', 'Record Type', 'Name', 'Category', 'Portion, Duration, or Amount', 'Time of Day', 'Unplanned', 'Weight', 'Note']];
  state.food.forEach(entry => rows.push([entry.date, entry.time, 'Food', entry.name, entry.meal, entry.portion, '', entry.unplanned ? 'Yes' : 'No', '', entry.note]));
  state.exercise.forEach(entry => rows.push([entry.date, '', 'Exercise', entry.exerciseType, entry.exerciseType, `${entry.duration} minutes`, entry.period, '', '', entry.note]));
  state.weights.forEach(entry => rows.push([entry.date, '', 'Weight', '', '', '', entry.period, '', entry.weight, '']));
  state.japanFund.forEach(entry => rows.push([entry.date, '', 'Japan Fund', entry.type === 'withdrawal' ? 'Trip purchase' : 'Deposit', 'Japan 2027', fundSignedAmount(entry).toFixed(2), '', '', '', entry.note]));
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadFile(`project-200-data-${todayString}.csv`, csv, 'text/csv;charset=utf-8');
}

async function importBackup(file) {
  const text = await file.text();
  state = normalizeState(JSON.parse(text));
  populateSettingsFields();
  await commitState($('data-message'), 'Backup imported successfully.');
}

async function clearAllData() {
  if (!window.confirm('Clear every Project 200 entry? This cannot be undone without a backup.')) return;
  state = structuredClone(DEFAULT_STATE);
  populateSettingsFields();
  await commitState($('data-message'), 'All tracked data was cleared.');
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
  window.addEventListener('appinstalled', () => installButton.classList.add('hidden'));
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => showTab(button.dataset.tab)));
  $('add-food').addEventListener('click', addFood);
  $('add-weight').addEventListener('click', addWeight);
  $('add-exercise').addEventListener('click', addExercise);
  $('add-fund-entry').addEventListener('click', addFundEntry);
  $('save-weight-settings').addEventListener('click', saveWeightSettings);
  $('save-fund-settings').addEventListener('click', saveFundSettings);

  $('food-prev-week').addEventListener('click', () => { foodWeekStart = addDays(foodWeekStart, -7); renderFoodWeek(); });
  $('food-next-week').addEventListener('click', () => { foodWeekStart = addDays(foodWeekStart, 7); renderFoodWeek(); });
  $('food-current-week').addEventListener('click', () => { foodWeekStart = startOfWeek(); renderFoodWeek(); });
  $('exercise-prev-week').addEventListener('click', () => { exerciseWeekStart = addDays(exerciseWeekStart, -7); renderExerciseWeek(); });
  $('exercise-next-week').addEventListener('click', () => { exerciseWeekStart = addDays(exerciseWeekStart, 7); renderExerciseWeek(); });
  $('exercise-current-week').addEventListener('click', () => { exerciseWeekStart = startOfWeek(); renderExerciseWeek(); });
  $('fund-prev-week').addEventListener('click', () => { fundWeekStart = addDays(fundWeekStart, -7); renderFundWeek(); });
  $('fund-next-week').addEventListener('click', () => { fundWeekStart = addDays(fundWeekStart, 7); renderFundWeek(); });
  $('fund-current-week').addEventListener('click', () => { fundWeekStart = startOfWeek(); renderFundWeek(); });

  $('fund-reminder-add').addEventListener('click', () => {
    const due = Math.max(0, state.settings.fundMonthlyTarget - fundNetForMonth(monthKey()));
    showTab('japan');
    $('fund-entry-type').value = 'deposit';
    $('fund-entry-date').value = todayString;
    $('fund-entry-amount').value = (due || state.settings.fundMonthlyTarget).toFixed(2).replace(/\.00$/, '');
    window.setTimeout(() => $('fund-entry-amount').focus(), 100);
  });

  document.body.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-type][data-remove-id]');
    if (!button) return;
    removeEntry(button.dataset.removeType, button.dataset.removeId);
  });

  $('export-backup').addEventListener('click', () => downloadFile(`project-200-backup-${todayString}.json`, JSON.stringify(state, null, 2), 'application/json'));
  $('export-csv').addEventListener('click', exportCsv);
  $('clear-all').addEventListener('click', clearAllData);
  $('import-backup').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(file);
    } catch (error) {
      console.error(error);
      $('data-message').textContent = 'That file could not be imported.';
    }
    event.target.value = '';
  });

  $('food-name').addEventListener('keydown', event => { if (event.key === 'Enter') addFood(); });
  $('weight-value').addEventListener('keydown', event => { if (event.key === 'Enter') addWeight(); });
  $('exercise-duration').addEventListener('keydown', event => { if (event.key === 'Enter') addExercise(); });
  $('fund-entry-amount').addEventListener('keydown', event => { if (event.key === 'Enter') addFundEntry(); });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    registration.update();
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

async function initialize() {
  foodWeekStart = startOfWeek();
  exerciseWeekStart = startOfWeek();
  fundWeekStart = startOfWeek();
  $('food-date').value = todayString;
  $('weight-date').value = todayString;
  $('exercise-date').value = todayString;
  $('fund-entry-date').value = todayString;

  try {
    const saved = await loadState();
    state = normalizeState(saved || DEFAULT_STATE);
  } catch (error) {
    console.error('Could not load local data:', error);
    state = structuredClone(DEFAULT_STATE);
    $('data-message').textContent = 'Local storage could not be opened. Entries may not persist.';
  }

  populateSettingsFields();
  bindEvents();
  setupInstallFlow();
  renderAll();

  let initialTab = 'dashboard';
  try {
    const savedTab = localStorage.getItem('project-200-active-tab');
    if (['dashboard', 'food', 'weight', 'exercise', 'japan'].includes(savedTab)) initialTab = savedTab;
  } catch (_) {}
  showTab(initialTab);
  registerServiceWorker();
}

initialize();
