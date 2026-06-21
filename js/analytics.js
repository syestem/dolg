export const RUB_FORMATTER = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0
});

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export function formatMoney(value) {
  const number = Number(value) || 0;
  const sign = number < 0 ? "-" : "";
  return `${sign}${RUB_FORMATTER.format(Math.abs(Math.round(number)))} ₽`;
}

export function formatBalance(value) {
  const number = Number(value) || 0;
  if (number < 0) {
    return `Переплата ${formatMoney(Math.abs(number))}`;
  }

  return formatMoney(number);
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return DATE_FORMATTER.format(date);
}

export function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return DATE_TIME_FORMATTER.format(date);
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function toDateInputValue(value) {
  if (!value) {
    return todayInputValue();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return todayInputValue();
  }

  return date.toISOString().slice(0, 10);
}

export function getDebtEntries(state, debtId) {
  return state.entries.filter((entry) => entry.debtId === debtId);
}

export function getDebtStats(state, debt) {
  const entries = getDebtEntries(state, debt.id);
  const paid = entries
    .filter((entry) => entry.type === "payment")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const charged = entries
    .filter((entry) => entry.type === "charge")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const balance = Number(debt.initialAmount || 0) - paid + charged;
  const owed = Math.max(balance, 0);
  const initial = Number(debt.initialAmount || 0);
  const progress = initial <= 0 ? 0 : clamp(((initial - Math.max(balance, 0)) / initial) * 100, 0, 100);

  return {
    entries,
    paid,
    charged,
    balance,
    owed,
    progress,
    isOverpaid: balance < 0
  };
}

export function getSummary(state) {
  const debts = state.debts || [];
  const activeDebts = debts.filter((debt) => debt.status === "active");
  const closedDebts = debts.filter((debt) => debt.status === "closed");
  const activeBalance = activeDebts.reduce((sum, debt) => sum + getDebtStats(state, debt).owed, 0);
  const totalPaid = (state.entries || [])
    .filter((entry) => entry.type === "payment")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const currentMonthPaid = (state.entries || [])
    .filter((entry) => entry.type === "payment" && isCurrentMonth(entry.date))
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    activeBalance,
    totalPaid,
    currentMonthPaid,
    activeCount: activeDebts.length,
    closedCount: closedDebts.length
  };
}

export function getAnalyticsGroups(state, dimension) {
  const groups = new Map();

  for (const debt of state.debts || []) {
    const key = debt[dimension] || "Без значения";
    const stats = getDebtStats(state, debt);
    const current = groups.get(key) || {
      name: key,
      debtCount: 0,
      activeCount: 0,
      balance: 0,
      paid: 0,
      charged: 0,
      initial: 0
    };

    current.debtCount += 1;
    current.activeCount += debt.status === "active" ? 1 : 0;
    current.balance += debt.status === "active" ? stats.owed : 0;
    current.paid += stats.paid;
    current.charged += stats.charged;
    current.initial += Number(debt.initialAmount || 0);
    groups.set(key, current);
  }

  const rows = Array.from(groups.values()).sort((left, right) => right.balance - left.balance || right.paid - left.paid);
  const maxBalance = Math.max(1, ...rows.map((row) => row.balance));
  const maxPaid = Math.max(1, ...rows.map((row) => row.paid));

  return rows.map((row) => ({
    ...row,
    balancePercent: Math.round((row.balance / maxBalance) * 100),
    paidPercent: Math.round((row.paid / maxPaid) * 100)
  }));
}

function isCurrentMonth(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
