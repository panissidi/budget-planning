const state = {
  frequency: 'twice-monthly',
  paycheckAmount: 0,
  paycheckDate: '',
  paycheckNumber: 'first',
  expenses: [],
};

let loadedExpenseFrequency = null;

const FREQUENCY_OPTIONS = [
  [0, 'Every paycheck'],
  [1, '1 month'],
  ...Array.from({ length: 35 }, (_, i) => i + 2).map(n => [n, `${n} months`]),
];

const SUPPORTED_FREQUENCIES = ['daily', 'weekly', 'twice-monthly'];

function countFridaysInMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === 5) count++;
  }
  return count;
}

function paychecksPerMonthVal() {
  if (state.frequency === 'daily')  return 365 / 12;
  if (state.frequency === 'weekly') {
    if (state.paycheckDate) {
      const d = new Date(state.paycheckDate);
      return countFridaysInMonth(d.getFullYear(), d.getMonth());
    }
    return 4;
  }
  return 2;
}

function daysPerPaycheckVal() {
  if (state.frequency === 'daily')  return 1;
  if (state.frequency === 'weekly') return 7;
  return 365 / 24;
}

// --- Step 1: Pay frequency ---

const freqBtns         = document.querySelectorAll('.freq-btn');
const comingSoon       = document.getElementById('coming-soon');
const btnNextFrequency = document.getElementById('btn-next-frequency');

freqBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    freqBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.frequency = btn.dataset.freq;
    comingSoon.classList.toggle('hidden', SUPPORTED_FREQUENCIES.includes(state.frequency));
    saveState();
  });
});

btnNextFrequency.addEventListener('click', () => {
  if (!SUPPORTED_FREQUENCIES.includes(state.frequency)) {
    comingSoon.classList.remove('hidden');
    return;
  }
  renderResults();
  showStep('step-results');
});

const btnBackFrequency = document.getElementById('btn-back-frequency');
btnBackFrequency.addEventListener('click', () => {
  showStep('step-details');
});

// --- Step 2: Expenses ---

const expenseRows    = document.getElementById('expense-rows');
const btnAddExpense  = document.getElementById('btn-add-expense');
const btnNextExpenses = document.getElementById('btn-next-expenses');

function updateDateField(row, frequencyVal) {
  const dateInput = row.querySelector('.irr-date');
  if (frequencyVal === 0) {
    dateInput.type = 'text';
    dateInput.value = 'N/A';
    dateInput.disabled = true;
  } else {
    if (dateInput.type === 'text') {
      dateInput.type = 'date';
      dateInput.value = '';
    }
    dateInput.disabled = false;
  }
}

function createExpenseRow(container, initial = {}) {
  const options = FREQUENCY_OPTIONS.map(([v, l]) =>
    `<option value="${v}">${l}</option>`
  ).join('');

  const row = document.createElement('div');
  row.className = 'expense-row';
  row.innerHTML = `
    <input type="text" class="irr-name" placeholder="e.g. Car insurance" maxlength="60" />
    <div class="irr-amount-cell">
      <span>$</span>
      <input type="number" class="irr-amount" placeholder="0.00" min="0" step="0.01" />
    </div>
    <select class="irr-frequency">${options}</select>
    <input type="date" class="irr-date" />
    <button class="btn-remove-row" title="Remove">&#x2715;</button>
  `;
  if (initial.name)   row.querySelector('.irr-name').value   = initial.name;
  if (initial.amount) row.querySelector('.irr-amount').value = initial.amount;
  const freqVal = initial.frequencyMonths !== undefined ? initial.frequencyMonths : 0;
  if (initial.frequencyMonths !== undefined) row.querySelector('.irr-frequency').value = initial.frequencyMonths;
  if (initial.lastPaidDate && freqVal !== 0) row.querySelector('.irr-date').value = initial.lastPaidDate;
  updateDateField(row, freqVal);
  row.querySelector('.btn-remove-row').addEventListener('click', () => {
    if (container.children.length > 1) { row.remove(); saveState(); }
  });
  container.appendChild(row);
}

expenseRows.addEventListener('input', saveState);
expenseRows.addEventListener('change', e => {
  if (e.target.classList.contains('irr-frequency')) {
    updateDateField(e.target.closest('.expense-row'), parseInt(e.target.value));
  }
  saveState();
});

createExpenseRow(expenseRows);
loadedExpenseFrequency = state.frequency;

btnAddExpense.addEventListener('click', () => { createExpenseRow(expenseRows); saveState(); });

function setupSortableTable(headerEl, rowsContainer, getters) {
  let sortCol = null, sortDir = 1;
  headerEl.querySelectorAll('.sort-icon').forEach(i => i.textContent = ' ⇅');
  headerEl.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      sortDir = sortCol === col ? sortDir * -1 : 1;
      sortCol = col;
      headerEl.querySelectorAll('.sort-icon').forEach(i => i.textContent = ' ⇅');
      th.querySelector('.sort-icon').textContent = sortDir === 1 ? ' ↑' : ' ↓';
      const rows = Array.from(rowsContainer.children);
      rows.sort((a, b) => {
        const va = getters[col](a);
        const vb = getters[col](b);
        return typeof va === 'string' ? va.localeCompare(vb) * sortDir : (va - vb) * sortDir;
      });
      rows.forEach(r => rowsContainer.appendChild(r));
    });
  });
}

setupSortableTable(
  expenseRows.previousElementSibling,
  expenseRows,
  {
    name:      r => r.querySelector('.irr-name').value.toLowerCase(),
    amount:    r => parseFloat(r.querySelector('.irr-amount').value) || 0,
    frequency: r => parseInt(r.querySelector('.irr-frequency').value) || 0,
    lastpaid:  r => r.querySelector('.irr-date').value || '',
  }
);

btnNextExpenses.addEventListener('click', () => {
  state.expenses = collectExpenseRows(expenseRows);
  showStep('step-details');
});

function collectExpenseRows(container) {
  return Array.from(container.querySelectorAll('.expense-row')).map(row => {
    const frequencyMonths = parseInt(row.querySelector('.irr-frequency').value);
    return {
      name:            row.querySelector('.irr-name').value.trim(),
      amount:          parseFloat(row.querySelector('.irr-amount').value) || 0,
      frequencyMonths,
      lastPaidDate:    frequencyMonths === 0 ? '' : row.querySelector('.irr-date').value,
    };
  }).filter(e => e.name || e.amount > 0);
}

// --- Step 3: Paycheck details ---

const paycheckAmountInput = document.getElementById('paycheck-amount');
const paycheckDateInput   = document.getElementById('paycheck-date');
const toggleBtns          = document.querySelectorAll('.toggle-btn');
const btnBack             = document.getElementById('btn-back');
const btnNextDetails      = document.getElementById('btn-next-details');

paycheckDateInput.value = new Date().toISOString().split('T')[0];
state.paycheckDate = paycheckDateInput.value;

paycheckAmountInput.addEventListener('input', () => {
  state.paycheckAmount = parseFloat(paycheckAmountInput.value) || 0;
  saveState();
});

paycheckDateInput.addEventListener('change', () => {
  state.paycheckDate = paycheckDateInput.value;
  saveState();
});

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.paycheckNumber = btn.dataset.check;
    saveState();
  });
});

btnBack.addEventListener('click', () => showStep('step-expenses'));

btnNextDetails.addEventListener('click', () => {
  if (!state.paycheckAmount || state.paycheckAmount <= 0) {
    alert('Please enter your paycheck amount.');
    return;
  }
  if (!state.paycheckDate) {
    alert('Please enter the paycheck date.');
    return;
  }
  showStep('step-frequency');
});

// --- Step 4: Results ---

document.getElementById('btn-back-results').addEventListener('click', () => {
  showStep('step-frequency');
});

function renderResults() {
  const container = document.getElementById('results-content');
  container.innerHTML = '';
  let totalDeductions = 0;

  const grossRow = document.createElement('div');
  grossRow.className = 'results-gross';
  grossRow.innerHTML = `<span>Paycheck amount</span><span>${fmt(state.paycheckAmount)}</span>`;
  container.appendChild(grossRow);

  const expenses = state.expenses.filter(e => e.amount > 0);
  if (expenses.length) {
    const everyExpenses     = expenses.filter(e => e.frequencyMonths === 0);
    const monthlyExpenses   = expenses.filter(e => e.frequencyMonths === 1);
    const irregularExpenses = expenses.filter(e => e.frequencyMonths >= 2);

    if (everyExpenses.length) {
      totalDeductions += everyExpenses.reduce((s, e) => s + e.amount, 0);
      container.appendChild(buildSection(
        'Every paycheck expenses',
        everyExpenses.map(e => ({ name: e.name || 'Unnamed', detail: '', amount: e.amount }))
      ));
    }

    if (monthlyExpenses.length) {
      let lines;
      if (state.frequency === 'twice-monthly') {
        lines = monthlyExpenses.map(e => {
          const elapsed = e.lastPaidDate
            ? Math.min(2, Math.max(1, countPaychecksSince(e.lastPaidDate, state.paycheckDate)))
            : 1;
          return {
            name:   e.name || 'Unnamed',
            detail: elapsed === 1 ? `${fmt(e.amount)} ÷ 2` : 'full monthly',
            amount: elapsed === 1 ? e.amount / 2 : e.amount,
          };
        });
      } else {
        const ppm = paychecksPerMonthVal();
        const divisorLabel = Number.isInteger(ppm) ? String(ppm) : ppm.toFixed(2);
        lines = monthlyExpenses.map(e => {
          const elapsed = e.lastPaidDate
            ? Math.min(ppm, Math.max(1, paychecksElapsed(e.lastPaidDate, state.paycheckDate)))
            : 1;
          return {
            name:   e.name || 'Unnamed',
            detail: `${fmt(e.amount)} × ${elapsed} ÷ ${divisorLabel}`,
            amount: e.amount * elapsed / ppm,
          };
        });
      }
      totalDeductions += lines.reduce((s, l) => s + l.amount, 0);
      container.appendChild(buildSection('Monthly expenses', lines));
    }

    if (irregularExpenses.length) {
      const lines = irregularExpenses.map(e => {
        if (state.frequency === 'twice-monthly') {
          const paychecksToPayIt = e.frequencyMonths * 2;
          const perPaycheck = e.amount / paychecksToPayIt;
          const elapsed = e.lastPaidDate
            ? Math.max(1, countPaychecksSince(e.lastPaidDate, state.paycheckDate))
            : 1;
          return {
            name:   e.name || 'Unnamed',
            detail: `${fmt(e.amount)} ÷ ${paychecksToPayIt} × ${elapsed}`,
            amount: perPaycheck * elapsed,
          };
        }
        const elapsed = e.lastPaidDate
          ? Math.max(1, paychecksElapsed(e.lastPaidDate, state.paycheckDate))
          : 1;
        return {
          name:   e.name || 'Unnamed',
          detail: `${fmt(e.amount)} × ${elapsed} paycheck${elapsed !== 1 ? 's' : ''}`,
          amount: e.amount * elapsed,
        };
      });
      totalDeductions += lines.reduce((s, l) => s + l.amount, 0);
      container.appendChild(buildSection('All other expenses', lines));
    }
  }

  const totalRow = document.createElement('div');
  totalRow.className = 'results-total';
  totalRow.innerHTML = `<span>Total deductions</span><span>-${fmt(totalDeductions)}</span>`;
  container.appendChild(totalRow);

  const remaining = state.paycheckAmount - totalDeductions;
  const remainingDiv = document.createElement('div');
  remainingDiv.className = 'results-remaining' + (remaining < 0 ? ' negative' : '');
  remainingDiv.innerHTML = `
    <span class="results-remaining-label">Remaining</span>
    <span class="results-remaining-amount">${remaining < 0 ? '-' : ''}${fmt(Math.abs(remaining))}</span>
  `;
  container.appendChild(remainingDiv);
}

function buildSection(title, lines) {
  const section = document.createElement('div');
  section.className = 'results-section';

  const titleEl = document.createElement('div');
  titleEl.className = 'results-section-title';
  titleEl.textContent = title;
  section.appendChild(titleEl);

  lines.forEach(line => {
    const row = document.createElement('div');
    row.className = 'results-line';
    row.innerHTML = `
      <div>
        <span class="results-line-name">${line.name}</span>
        ${line.detail ? `<span class="results-line-detail"> (${line.detail})</span>` : ''}
      </div>
      <span class="results-line-amount">-${fmt(line.amount)}</span>
    `;
    section.appendChild(row);
  });

  return section;
}

// --- Local storage ---

function saveState() {
  let data;
  try { data = JSON.parse(localStorage.getItem('budgetPlanner')) || {}; } catch { data = {}; }

  data.frequency      = state.frequency;
  data.paycheckAmount = parseFloat(paycheckAmountInput.value) || 0;
  data.paycheckDate   = paycheckDateInput.value;
  data.paycheckNumber = state.paycheckNumber;

  if (loadedExpenseFrequency === state.frequency) {
    if (!data.expensesByFrequency) data.expensesByFrequency = {};
    data.expensesByFrequency[state.frequency] = {
      expenses: collectExpenseRows(expenseRows),
    };
  }

  localStorage.setItem('budgetPlanner', JSON.stringify(data));
}

function loadExpenseRows(frequency) {
  let data;
  try { data = JSON.parse(localStorage.getItem('budgetPlanner')) || {}; } catch { data = {}; }
  const bucket = (data.expensesByFrequency || {})[frequency] || {};

  expenseRows.innerHTML = '';

  if (bucket.expenses?.length > 0) {
    bucket.expenses.forEach(e => createExpenseRow(expenseRows, e));
  } else {
    createExpenseRow(expenseRows);
  }

  loadedExpenseFrequency = frequency;
}

function loadState() {
  let data;
  try { data = JSON.parse(localStorage.getItem('budgetPlanner')); } catch { return; }
  if (!data) return;

  if (data.frequency) {
    state.frequency = data.frequency;
    freqBtns.forEach(b => b.classList.toggle('active', b.dataset.freq === data.frequency));
    comingSoon.classList.toggle('hidden', SUPPORTED_FREQUENCIES.includes(data.frequency));
  }

  if (data.paycheckAmount) {
    state.paycheckAmount = data.paycheckAmount;
    paycheckAmountInput.value = data.paycheckAmount;
  }
  if (data.paycheckDate) {
    state.paycheckDate = data.paycheckDate;
    paycheckDateInput.value = data.paycheckDate;
  }
  if (data.paycheckNumber) {
    state.paycheckNumber = data.paycheckNumber;
    toggleBtns.forEach(b => b.classList.toggle('active', b.dataset.check === data.paycheckNumber));
  }

  // Migrate flat legacy structure (pre per-frequency)
  if (!data.expensesByFrequency && (data.everyPaycheckExpenses?.length || data.monthlyExpenses?.length || data.irregularExpenses?.length)) {
    const freq = state.frequency;
    const merged = [
      ...(data.everyPaycheckExpenses || []).map(e => ({ ...e, frequencyMonths: 0, lastPaidDate: '' })),
      ...(data.monthlyExpenses || []).map(e => ({ ...e, frequencyMonths: 1, lastPaidDate: '' })),
      ...(data.irregularExpenses || []),
    ];
    data.expensesByFrequency = { [freq]: { expenses: merged } };
    localStorage.setItem('budgetPlanner', JSON.stringify(data));
  }

  // Migrate per-frequency three-array schema to unified expenses array
  if (data.expensesByFrequency) {
    let migrated = false;
    for (const [freq, bucket] of Object.entries(data.expensesByFrequency)) {
      if (!bucket.expenses && (bucket.everyPaycheckExpenses || bucket.monthlyExpenses || bucket.irregularExpenses)) {
        data.expensesByFrequency[freq] = {
          expenses: [
            ...(bucket.everyPaycheckExpenses || []).map(e => ({ ...e, frequencyMonths: 0, lastPaidDate: '' })),
            ...(bucket.monthlyExpenses || []).map(e => ({ ...e, frequencyMonths: 1, lastPaidDate: '' })),
            ...(bucket.irregularExpenses || []),
          ],
        };
        migrated = true;
      }
    }
    if (migrated) localStorage.setItem('budgetPlanner', JSON.stringify(data));
  }

  loadExpenseRows(state.frequency);
}

// --- Calculations ---

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function lastWeekdayOnOrBefore(year, month, day) {
  const date = new Date(year, month, day);
  const dow = date.getDay();
  if (dow === 0) return new Date(year, month, day - 2);
  if (dow === 6) return new Date(year, month, day - 1);
  return date;
}

function twiceMonthlyPaycheckDates(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return [
    lastWeekdayOnOrBefore(year, month, 15),
    lastWeekdayOnOrBefore(year, month, lastDay),
  ];
}

function countPaychecksSince(lastPaidStr, currentPaycheckStr) {
  const lastPaid = parseLocalDate(lastPaidStr);
  const current  = parseLocalDate(currentPaycheckStr);
  let count = 0;
  let year  = lastPaid.getFullYear();
  let month = lastPaid.getMonth();
  const endYear  = current.getFullYear();
  const endMonth = current.getMonth();
  while (year < endYear || (year === endYear && month <= endMonth)) {
    for (const d of twiceMonthlyPaycheckDates(year, month)) {
      if (d > lastPaid && d <= current) count++;
    }
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return count;
}

function paychecksElapsed(lastPaidDate, currentPaycheckDate) {
  const days = (new Date(currentPaycheckDate) - new Date(lastPaidDate)) / 86400000;
  return Math.floor(days / daysPerPaycheckVal()) + 1;
}

function fmt(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// --- Helpers ---

function showStep(stepId) {
  document.querySelectorAll('[id^="step-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(stepId).classList.remove('hidden');
  if (stepId === 'step-details') {
    document.getElementById('paycheck-number-group').classList.toggle('hidden', state.frequency !== 'twice-monthly');
  }
}

// Restore saved data on page load
loadState();
