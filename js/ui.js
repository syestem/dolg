import { formatAuditDetails, ENTITY_LABELS } from "./audit.js";
import {
  formatBalance,
  formatDate,
  formatDateTime,
  formatMoney,
  getAnalyticsGroups,
  getDebtEntries,
  getDebtStats,
  getSummary,
  todayInputValue,
  toDateInputValue
} from "./analytics.js";
import {
  addDebt,
  addDictionaryItem,
  addEntry,
  deleteDebt,
  deleteDictionaryItem,
  deleteEntry,
  exportState,
  getState,
  getSyncSettings,
  importStateFromJson,
  removeSyncToken,
  recordGithubAction,
  renameDictionaryItem,
  saveSyncSettings,
  setDebtStatus,
  subscribe,
  updateDebt,
  updateEntry
} from "./state.js";
import {
  fetchGithubData,
  getGithubRepositoryInfo,
  pushGithubData
} from "./github.js";

const ui = {
  tab: "debts",
  debtFilter: "active",
  selectedDebtId: "",
  auditEntity: "all",
  auditSearch: "",
  modal: null,
  toast: null,
  importMode: "replace",
  syncStatus: "",
  syncStatusType: "",
  largeText: false,
  paymentAnimation: null
};

let root;
let presentationFrame = 0;
let paymentAnimationTimer = 0;

export function initUI(element) {
  root = element;
  ui.largeText = localStorage.getItem("debt-tracker-large-text-v1") === "true";
  applyLargeTextPreference();
  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("change", handleChange);
  root.addEventListener("input", handleInput);
  subscribe(render);
  render();
}

function render() {
  const state = getState();
  const selectedDebt = state.debts.find((debt) => debt.id === ui.selectedDebtId) || state.debts[0] || null;
  if (!ui.selectedDebtId && selectedDebt) {
    ui.selectedDebtId = selectedDebt.id;
  }

  root.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}
      ${ui.tab === "debts" && state.debts.length ? renderMainOverview(state) : ""}
      ${renderTabs()}
      ${renderTabContent(state)}
    </div>
    ${renderModal(state)}
    ${renderToast()}
  `;
  schedulePresentationUpdates();
}

function schedulePresentationUpdates() {
  window.cancelAnimationFrame(presentationFrame);
  presentationFrame = window.requestAnimationFrame(() => {
    drawSparklines();
    animatePaymentFeedback();
  });
}

function drawSparklines() {
  root.querySelectorAll("[data-sparkline-points]").forEach((canvas) => {
    const points = canvas.dataset.sparklinePoints
      .split(",")
      .map(Number)
      .filter(Number.isFinite);

    if (points.length < 3) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    const padding = 6 * pixelRatio;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const step = (width - padding * 2) / (points.length - 1);

    context.clearRect(0, 0, width, height);
    context.lineWidth = 2 * pixelRatio;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = "#70d79b";
    context.beginPath();

    points.forEach((point, index) => {
      const x = padding + index * step;
      const y = padding + ((max - point) / range) * (height - padding * 2);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();

    const endPoint = points[points.length - 1];
    const endX = padding + (points.length - 1) * step;
    const endY = padding + ((max - endPoint) / range) * (height - padding * 2);
    context.fillStyle = "#b8f3cc";
    context.beginPath();
    context.arc(endX, endY, 3.5 * pixelRatio, 0, Math.PI * 2);
    context.fill();
  });
}

function animatePaymentFeedback() {
  const animation = ui.paymentAnimation;
  if (!animation || animation.started) {
    return;
  }

  const balance = root.querySelector(`[data-animated-balance="${animation.debtId}"]`);
  const progress = root.querySelector(`[data-animated-progress="${animation.debtId}"]`);
  if (!balance) {
    ui.paymentAnimation = null;
    return;
  }

  animation.started = true;
  const fromBalance = Number(balance.dataset.balanceFrom);
  const targetBalance = Number(balance.dataset.balanceTo);
  const targetProgress = Number(progress?.dataset.progressTarget);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (progress) {
    progress.style.setProperty("--progress", `${targetProgress}%`);
  }

  if (reducedMotion) {
    balance.textContent = formatBalance(targetBalance);
    finishPaymentAnimation();
    return;
  }

  balance.classList.add("balance-countdown");
  const startedAt = performance.now();
  const duration = 760;

  const tick = (now) => {
    const progressValue = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progressValue, 3);
    const current = fromBalance + (targetBalance - fromBalance) * eased;
    balance.textContent = formatBalance(Math.max(current, 0));

    if (progressValue < 1) {
      window.requestAnimationFrame(tick);
    } else {
      balance.textContent = formatBalance(targetBalance);
      finishPaymentAnimation();
    }
  };

  window.requestAnimationFrame(tick);
}

function finishPaymentAnimation() {
  window.clearTimeout(paymentAnimationTimer);
  paymentAnimationTimer = window.setTimeout(() => {
    ui.paymentAnimation = null;
    render();
  }, 1350);
}

function applyLargeTextPreference() {
  document.documentElement.classList.toggle("large-text", ui.largeText);
}

function renderHeader() {
  return `
    <header class="topbar">
      <div class="brand">
        <h1>Трекер долгов</h1>
        <p>Всё важное о долгах и платежах - сразу перед глазами.</p>
      </div>
      <div class="top-actions">
        <label class="large-text-toggle" title="Увеличить текст во всём приложении">
          <input type="checkbox" data-action="toggle-large-text" ${ui.largeText ? "checked" : ""}>
          <span>Крупный текст</span>
        </label>
        <button class="button ghost" type="button" data-action="export-json">Экспорт JSON</button>
        <button class="button ghost" type="button" data-action="open-import">Импорт JSON</button>
        <button class="button primary" type="button" data-action="open-debt">+ Новый долг</button>
      </div>
    </header>
  `;
}

function renderMainOverview(state) {
  const summary = getSummary(state);
  const progress = getOverviewProgress(summary);
  const recentEntries = getRecentEntries(state, 6);

  return `
    <section class="overview-hero" aria-label="Главная сводка">
      <div class="overview-copy">
        <span class="overview-eyebrow">Главное сейчас</span>
        <h2>Осталось выплатить</h2>
        <strong class="overview-amount">${formatMoney(summary.activeBalance)}</strong>
        <p>Уже погашено <b>${formatMoney(summary.paidToDebt)}</b></p>
        <div class="overview-notes">
          <span>${summary.activeCount ? `Активных долгов: ${summary.activeCount}` : "Все долги погашены"}</span>
          <span>За этот месяц: ${formatMoney(summary.currentMonthPaid)}</span>
        </div>
      </div>
      <div class="overview-progress" aria-label="Общий прогресс погашения ${progress}%">
        <strong>${progress}%</strong>
        <span>погашено</span>
        <div class="overview-progress-track" aria-hidden="true">
          <div class="overview-progress-fill" style="--progress: ${progress}%"></div>
        </div>
        <p>Погашено ${progress}% - осталось ${formatMoney(summary.activeBalance)}</p>
      </div>
    </section>
    ${renderRecentEntries(recentEntries)}
  `;
}

function renderTabs() {
  const tabs = [
    ["debts", "Долги"],
    ["analytics", "Аналитика"],
    ["audit", "Журнал аудита"],
    ["settings", "Настройки"]
  ];

  return `
    <nav class="tabs" aria-label="Разделы">
      ${tabs.map(([id, label]) => `
        <button class="tab-button ${ui.tab === id ? "active" : ""}" type="button" data-action="set-tab" data-tab="${id}">
          ${label}
        </button>
      `).join("")}
    </nav>
  `;
}

function renderTabContent(state) {
  if (ui.tab === "analytics") {
    return renderAnalytics(state);
  }

  if (ui.tab === "audit") {
    return renderAudit(state);
  }

  if (ui.tab === "settings") {
    return renderSettings(state);
  }

  return renderDebts(state);
}

function renderDebts(state) {
  const debts = filterDebts(state.debts);
  const selectedDebt = debts.find((debt) => debt.id === ui.selectedDebtId) || debts[0] || null;

  if (selectedDebt && ui.selectedDebtId !== selectedDebt.id) {
    ui.selectedDebtId = selectedDebt.id;
  }

  if (!state.debts.length) {
    return `
      <main class="tab-panel">
        <section class="empty-state">
          <h2>Начнём с первого долга</h2>
          <p>Добавьте сумму и банк - дальше всё будет видно здесь.</p>
          <button class="button primary" type="button" data-action="open-debt">+ Добавить первый долг</button>
        </section>
      </main>
    `;
  }

  return `
    <main class="tab-panel">
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="button ${ui.debtFilter === "active" ? "primary" : "ghost"}" type="button" data-action="set-debt-filter" data-filter="active">Активные</button>
          <button class="button ${ui.debtFilter === "closed" ? "primary" : "ghost"}" type="button" data-action="set-debt-filter" data-filter="closed">Закрытые</button>
          <button class="button ${ui.debtFilter === "all" ? "primary" : "ghost"}" type="button" data-action="set-debt-filter" data-filter="all">Все</button>
        </div>
        <button class="button primary" type="button" data-action="open-debt">+ Новый долг</button>
      </div>

      <section class="debt-layout">
        <div class="debt-list">
          ${debts.length ? debts.map((debt) => renderDebtCard(state, debt)).join("") : renderFilteredEmpty()}
        </div>
        ${renderEntryPanel(state, selectedDebt)}
      </section>
    </main>
  `;
}

function renderDebtCard(state, debt) {
  const stats = getDebtStats(state, debt);
  const selected = ui.selectedDebtId === debt.id ? "selected" : "";
  const isClosed = debt.status === "closed";
  const animation = ui.paymentAnimation?.debtId === debt.id ? ui.paymentAnimation : null;
  const progressStart = animation ? animation.fromProgress : stats.progress;
  const history = getSparklinePoints(state, debt);
  const balanceStart = animation ? animation.fromBalance : stats.balance;

  return `
    <article class="debt-card ${selected} ${isClosed ? "is-closed" : ""}" data-debt-card-id="${debt.id}">
      <div class="card-head">
        <div class="card-title">
          <h3 title="${escapeAttribute(debt.name)}">${escapeHtml(debt.name)}</h3>
          <div class="meta-line" title="${escapeAttribute(debt.holder)}">${escapeHtml(debt.holder)}</div>
        </div>
        ${isClosed ? '<span class="pill completed">✓ Погашено полностью</span>' : `<span class="pill active">${escapeHtml(debt.category)}</span>`}
      </div>

      <div class="debt-balance">
        <span>Сейчас осталось</span>
        <strong class="${stats.isOverpaid ? "balance-overpaid" : "balance-positive"}" data-animated-balance="${debt.id}" data-balance-from="${balanceStart}" data-balance-to="${stats.balance}">
          ${formatBalance(animation ? balanceStart : stats.balance)}
        </strong>
      </div>

      ${stats.isOverpaid ? `<span class="pill overpaid">Переплата ${formatMoney(stats.overpayment)}</span>` : ""}

      <div class="debt-progress-block">
        <div class="debt-progress-track" aria-label="Погашено ${Math.round(stats.progress)}%">
          <div class="debt-progress-fill" data-animated-progress="${debt.id}" data-progress-target="${Math.round(stats.progress)}" style="--progress: ${Math.round(progressStart)}%"></div>
          <strong>${Math.round(stats.progress)}%</strong>
        </div>
        <p>Осталось ${formatMoney(stats.owed)} из ${formatMoney(stats.totalOwed)}</p>
        <p class="paid-label">Погашено ${formatMoney(stats.paidToDebt)}</p>
      </div>

      ${history.length ? `<canvas class="debt-sparkline" width="320" height="60" data-sparkline-points="${history.join(",")}" aria-label="Как уменьшается остаток по долгу"></canvas>` : ""}
      ${animation ? '<span class="payment-feedback">↓ Платёж учтён</span>' : ""}
      ${debt.note ? `<p class="note">${escapeHtml(debt.note)}</p>` : ""}

      <div class="inline-actions">
        ${isClosed ? "" : `<button class="button small primary" type="button" data-action="open-entry" data-debt-id="${debt.id}">↓ Добавить платёж</button>`}
        <button class="button small ghost" type="button" data-action="select-debt" data-id="${debt.id}">Операции</button>
        <button class="button small ghost" type="button" data-action="open-debt" data-id="${debt.id}">Изменить</button>
        <button class="button small ghost" type="button" data-action="toggle-debt-status" data-id="${debt.id}">
          ${isClosed ? "Переоткрыть" : "Закрыть"}
        </button>
        <button class="button small danger" type="button" data-action="delete-debt" data-id="${debt.id}">Удалить</button>
      </div>
    </article>
  `;
}

function renderEntryPanel(state, debt) {
  if (!debt) {
    return "";
  }

  const entries = getDebtEntries(state, debt.id).sort((left, right) => new Date(right.date) - new Date(left.date));
  const stats = getDebtStats(state, debt);

  return `
    <aside class="panel sticky">
      <div class="panel-head">
        <div>
          <h2>${escapeHtml(debt.name)}</h2>
          <p class="muted">Остаток: ${formatBalance(stats.balance)}</p>
        </div>
        <button class="button primary" type="button" data-action="open-entry" data-debt-id="${debt.id}">↓ Добавить платёж</button>
      </div>

      <div class="entry-list">
        ${entries.length ? entries.map((entry) => renderEntryRow(entry)).join("") : `
          <div class="empty-state">
            <h2>Операций нет</h2>
            <p>Добавьте платеж или начисление для выбранного долга.</p>
          </div>
        `}
      </div>
    </aside>
  `;
}

function renderEntryRow(entry) {
  const label = entry.type === "payment" ? "Платёж" : "Начисление";
  const sign = entry.type === "payment" ? "−" : "+";
  return `
    <article class="entry-row">
      <div class="entry-head">
        <div>
          <strong>${label}</strong>
          <div class="muted">${formatDate(entry.date)}</div>
        </div>
        <strong class="entry-amount ${entry.type}">${sign}${formatMoney(entry.amount)}</strong>
      </div>
      ${entry.comment ? `<p class="entry-comment">${escapeHtml(entry.comment)}</p>` : ""}
      <div class="entry-actions">
        <button class="button small ghost" type="button" data-action="open-entry" data-id="${entry.id}" data-debt-id="${entry.debtId}">Редактировать</button>
        <button class="button small danger" type="button" data-action="delete-entry" data-id="${entry.id}">Удалить</button>
      </div>
    </article>
  `;
}

function renderRecentEntries(entries) {
  return `
    <section class="recent-operations" aria-label="Последние операции">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">Чтобы ничего не потерялось</span>
          <h2>Последние операции</h2>
        </div>
        <button class="button ghost" type="button" data-action="set-tab" data-tab="audit">Весь журнал</button>
      </div>
      ${entries.length ? `
        <div class="recent-operations-list">
          ${entries.map((item) => `
            <article class="recent-operation">
              <span class="operation-icon ${item.entry.type}">${item.entry.type === "payment" ? "↓" : "↑"}</span>
              <div class="recent-operation-copy">
                <strong>${escapeHtml(item.debt.name)}</strong>
                <span>${escapeHtml(item.debt.holder)} · ${formatHumanDate(item.entry.date)}</span>
              </div>
              <strong class="recent-operation-amount ${item.entry.type}">${item.entry.type === "payment" ? "−" : "+"}${formatMoney(item.entry.amount)}</strong>
            </article>
          `).join("")}
        </div>
      ` : `<p class="recent-empty">Первые платежи и начисления появятся здесь.</p>`}
    </section>
  `;
}

function getOverviewProgress(summary) {
  const total = summary.paidToDebt + summary.activeBalance;
  return total > 0 ? Math.round((summary.paidToDebt / total) * 100) : 0;
}

function getRecentEntries(state, limit) {
  const debtsById = new Map(state.debts.map((debt) => [debt.id, debt]));

  return [...state.entries]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .map((entry) => ({
      entry,
      debt: debtsById.get(entry.debtId)
    }))
    .filter((item) => item.debt)
    .slice(0, limit);
}

function getSparklinePoints(state, debt) {
  const entries = getDebtEntries(state, debt.id)
    .sort((left, right) => new Date(left.date) - new Date(right.date));

  if (entries.length < 2) {
    return [];
  }

  const visibleEntries = [];
  const points = [getDebtStats({ ...state, entries: visibleEntries }, debt).balance];

  for (const entry of entries) {
    visibleEntries.push(entry);
    points.push(getDebtStats({ ...state, entries: visibleEntries }, debt).balance);
  }

  return points;
}

function formatHumanDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const difference = Math.round((localToday - localDate) / 86400000);

  if (difference === 0) {
    return "сегодня";
  }

  if (difference === 1) {
    return "вчера";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function renderAnalytics(state) {
  return `
    <main class="tab-panel">
      <section class="analytics-grid">
        ${renderAnalyticsPanel("По категориям", getAnalyticsGroups(state, "category"))}
        ${renderAnalyticsPanel("По банкам/удержателям", getAnalyticsGroups(state, "holder"))}
      </section>
    </main>
  `;
}

function renderAnalyticsPanel(title, rows) {
  const hasOverpayment = rows.some((row) => row.overpayment > 0);

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>${title}</h2>
      </div>
      ${rows.length ? `
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Группа</th>
              <th>Активные</th>
              <th>Остаток</th>
              <th>Выплачено</th>
              ${hasOverpayment ? "<th>Переплата</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.name)}</td>
                <td>${row.activeCount}/${row.debtCount}</td>
                <td>
                  <div class="analytics-bar">
                    <strong>${formatMoney(row.balance)}</strong>
                    <span class="bar-track"><span class="bar-fill" style="--bar: ${row.balancePercent}%"></span></span>
                  </div>
                </td>
                <td>
                  <div class="analytics-bar">
                    <strong>${formatMoney(row.paid)}</strong>
                    <span class="bar-track"><span class="bar-fill paid" style="--bar: ${row.paidPercent}%"></span></span>
                  </div>
                </td>
                ${hasOverpayment ? `<td>${row.overpayment ? formatMoney(row.overpayment) : "—"}</td>` : ""}
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `
        <div class="empty-state">
          <h2>Данных нет</h2>
          <p>Аналитика появится после создания долгов.</p>
        </div>
      `}
    </section>
  `;
}

function renderAudit(state) {
  const query = ui.auditSearch.trim().toLocaleLowerCase("ru-RU");
  const rows = state.auditLog
    .filter((record) => ui.auditEntity === "all" || record.entityType === ui.auditEntity)
    .filter((record) => !query || auditSearchText(record).includes(query));

  return `
    <main class="tab-panel">
      <section class="toolbar">
        <div class="toolbar-group">
          <select class="filter-input" data-action="audit-filter" aria-label="Тип сущности">
            <option value="all" ${ui.auditEntity === "all" ? "selected" : ""}>Все сущности</option>
            ${Object.entries(ENTITY_LABELS).map(([value, label]) => `
              <option value="${value}" ${ui.auditEntity === value ? "selected" : ""}>${label}</option>
            `).join("")}
          </select>
          <input class="filter-input" type="search" placeholder="Поиск по журналу" value="${escapeAttribute(ui.auditSearch)}" data-action="audit-search">
        </div>
      </section>

      <section class="audit-list">
        ${rows.length ? rows.map((record) => renderAuditRow(record, query)).join("") : `
          <div class="empty-state">
            <h2>Записей нет</h2>
            <p>Попробуйте изменить фильтр или выполнить действие в приложении.</p>
          </div>
        `}
      </section>
    </main>
  `;
}

function renderAuditRow(record, query) {
  const details = formatAuditDetails(record.details);
  return `
    <article class="audit-row">
      <div class="audit-head">
        <div>
          <div class="audit-action">${highlight(record.action, query)}</div>
          <div class="audit-meta">${formatDateTime(record.timestamp)} · ${ENTITY_LABELS[record.entityType] || record.entityType}</div>
        </div>
        <span class="pill">${escapeHtml(record.entityId)}</span>
      </div>
      ${details ? `<pre class="audit-details">${highlight(details, query)}</pre>` : ""}
    </article>
  `;
}

function renderSettings(state) {
  const sync = getSyncSettings();
  const syncActionsDisabled = !sync.enabled || !sync.privacyAcknowledged;

  return `
    <main class="tab-panel">
      <section class="settings-grid">
        <div class="panel">
          <div class="panel-head">
            <h2>Справочники</h2>
          </div>
          <div class="settings-grid">
            ${renderDictionary("Категории", "categories", state.dictionaries.categories)}
            ${renderDictionary("Банки/удержатели", "holders", state.dictionaries.holders)}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h2>Бэкап</h2>
          </div>
          <div class="settings-actions">
            <button class="button ghost" type="button" data-action="export-json">Экспорт JSON</button>
            <button class="button ghost" type="button" data-action="open-import">Импорт JSON</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>GitHub-синхронизация</h2>
        </div>
        <div class="privacy-callout" role="note">
          <strong>Важно о приватности</strong>
          <p>Синхронизируйте только в приватный репозиторий. В публичном репозитории файл data.json с вашими долгами будет доступен всем. Секретность ссылки не защищает данные.</p>
        </div>
        <form data-form="sync-settings">
          <label class="checkbox-field">
            <input type="checkbox" name="enabled" data-action="sync-enabled" ${sync.enabled ? "checked" : ""}>
            <span>Включить синхронизацию</span>
          </label>
          <label class="checkbox-field privacy-confirmation">
            <input type="checkbox" name="privacyAcknowledged" data-action="sync-risk-ack" ${sync.privacyAcknowledged ? "checked" : ""}>
            <span>Я понимаю риск и использую приватный репозиторий</span>
          </label>
          <div class="field-grid">
            ${field("owner", "Owner", sync.owner)}
            ${field("repo", "Repo", sync.repo)}
            ${field("branch", "Branch", sync.branch || "main")}
            ${field("path", "Путь к data.json", sync.path || "data.json")}
          </div>
          <div class="field">
            <label for="sync-token">
              Personal Access Token
              <span class="field-hint">Используйте fine-grained PAT только для нужного репозитория: Contents read/write и короткий срок жизни.</span>
            </label>
            <input id="sync-token" name="token" type="password" autocomplete="off" value="${escapeAttribute(sync.token)}">
            <label class="checkbox-field token-visibility-toggle">
              <input type="checkbox" data-action="toggle-token-visibility">
              <span>Показать токен</span>
            </label>
          </div>
          <div class="settings-actions">
            <button class="button primary" type="submit">Сохранить настройки</button>
            <button class="button ghost" type="button" data-action="github-load" data-sync-action ${syncActionsDisabled ? "disabled" : ""}>Загрузить из GitHub</button>
            <button class="button ghost" type="button" data-action="github-save" data-sync-action ${syncActionsDisabled ? "disabled" : ""}>Сохранить в GitHub</button>
            <button class="button danger" type="button" data-action="remove-sync-token">Удалить токен из браузера</button>
          </div>
        </form>
        ${ui.syncStatus ? `<div class="sync-status ${ui.syncStatusType}">${escapeHtml(ui.syncStatus)}</div>` : ""}
      </section>
    </main>
  `;
}

function renderDictionary(title, kind, items) {
  return `
    <section>
      <h3>${title}</h3>
      <form class="toolbar" data-form="dictionary-add" data-kind="${kind}">
        <input class="filter-input" name="value" placeholder="Новое значение" aria-label="${title}">
        <button class="button small primary" type="submit">Добавить</button>
      </form>
      <div class="dict-list">
        ${items.map((item) => `
          <div class="dict-item">
            <span class="dict-name">${escapeHtml(item)}</span>
            <div class="dict-actions">
              <button class="button small ghost" type="button" data-action="rename-dictionary" data-kind="${kind}" data-value="${escapeAttribute(item)}">Переименовать</button>
              <button class="button small danger" type="button" data-action="delete-dictionary" data-kind="${kind}" data-value="${escapeAttribute(item)}">Удалить</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderModal(state) {
  if (!ui.modal) {
    return "";
  }

  if (ui.modal.type === "debt") {
    const debt = state.debts.find((item) => item.id === ui.modal.id);
    return modal(debt ? "Редактировать долг" : "Новый долг", renderDebtForm(state, debt));
  }

  if (ui.modal.type === "entry") {
    const entry = state.entries.find((item) => item.id === ui.modal.id);
    const debtId = ui.modal.debtId || entry?.debtId || ui.selectedDebtId;
    return modal(entry ? "Редактировать операцию" : "Новая операция", renderEntryForm(state, entry, debtId));
  }

  if (ui.modal.type === "confirmClose") {
    const debt = state.debts.find((item) => item.id === ui.modal.debtId);
    if (!debt) {
      return "";
    }
    return modal("Закрыть долг?", `
      <p class="muted">Остаток по долгу «${escapeHtml(debt.name)}» достиг нуля или ушел в переплату.</p>
      <div class="modal-actions">
        <button class="button ghost" type="button" data-action="close-modal">Оставить активным</button>
        <button class="button primary" type="button" data-action="confirm-close-debt" data-id="${debt.id}">Закрыть долг</button>
      </div>
    `);
  }

  if (ui.modal.type === "import") {
    return modal("Импорт JSON", `
      <div class="field">
        <label for="import-file">Файл состояния</label>
        <input id="import-file" type="file" accept="application/json,.json" data-action="import-file">
      </div>
      <div class="field">
        <label for="import-mode">Режим</label>
        <select id="import-mode" data-action="import-mode">
          <option value="replace" ${ui.importMode === "replace" ? "selected" : ""}>Заменить состояние</option>
          <option value="merge" ${ui.importMode === "merge" ? "selected" : ""}>Слить с текущим</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="button ghost" type="button" data-action="close-modal">Отмена</button>
      </div>
    `);
  }

  return "";
}

function renderDebtForm(state, debt) {
  const values = debt || {
    name: "",
    category: state.dictionaries.categories[0] || "",
    holder: state.dictionaries.holders[0] || "",
    initialAmount: "",
    note: "",
    status: "active"
  };

  return `
    <form data-form="debt" data-id="${debt?.id || ""}">
      <div class="field-grid">
        ${field("name", "Название долга", values.name, "text", true, "Например, кредит на ремонт")}
        ${field("initialAmount", "Сколько было взято, ₽", values.initialAmount, "number", true, "Например, 150 000")}
      </div>
      <div class="field-grid">
        ${selectWithNew("category", "Категория", values.category, state.dictionaries.categories, "newCategory", "Новая категория")}
        ${selectWithNew("holder", "Банк/удержатель", values.holder, state.dictionaries.holders, "newHolder", "Новый банк/удержатель")}
      </div>
      <div class="field-grid">
        <div class="field">
          <label for="debt-status">Статус</label>
          <select id="debt-status" name="status">
            <option value="active" ${values.status === "active" ? "selected" : ""}>Активный</option>
            <option value="closed" ${values.status === "closed" ? "selected" : ""}>Закрытый</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="debt-note">Заметка</label>
        <textarea id="debt-note" name="note" placeholder="Например, платить до 25 числа">${escapeHtml(values.note || "")}</textarea>
      </div>
      <div class="modal-actions">
        <button class="button ghost" type="button" data-action="close-modal">Отмена</button>
        <button class="button primary" type="submit">Сохранить</button>
      </div>
    </form>
  `;
}

function renderEntryForm(state, entry, debtId) {
  const values = entry || {
    debtId,
    type: "payment",
    amount: "",
    date: todayInputValue(),
    comment: ""
  };

  return `
    <form data-form="entry" data-id="${entry?.id || ""}">
      <div class="field-grid">
        <div class="field">
          <label for="entry-debt">Долг</label>
          <select id="entry-debt" name="debtId" required>
            ${state.debts.map((debt) => `
              <option value="${debt.id}" ${values.debtId === debt.id ? "selected" : ""}>${escapeHtml(debt.name)}</option>
            `).join("")}
          </select>
        </div>
        <div class="field">
          <label for="entry-type">Что произошло?</label>
          <select id="entry-type" name="type" required>
            <option value="payment" ${values.type === "payment" ? "selected" : ""}>Платёж - уменьшает долг</option>
            <option value="charge" ${values.type === "charge" ? "selected" : ""}>Начисление - увеличивает сумму</option>
          </select>
          <span class="field-hint">Платёж уменьшает долг. Начисление - это проценты или новый долг.</span>
        </div>
      </div>
      <div class="field-grid">
        ${field("amount", "Сумма, ₽", values.amount, "number", true, "Например, 10 000")}
        ${field("date", "Дата", toDateInputValue(values.date), "date", true)}
      </div>
      <div class="field">
        <label for="entry-comment">Комментарий</label>
        <textarea id="entry-comment" name="comment" placeholder="Например, платёж за июнь">${escapeHtml(values.comment || "")}</textarea>
      </div>
      <div class="modal-actions">
        <button class="button ghost" type="button" data-action="close-modal">Отмена</button>
        <button class="button primary" type="submit">Сохранить</button>
      </div>
    </form>
  `;
}

function modal(title, body) {
  return `
    <div class="modal-backdrop" role="presentation" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeAttribute(title)}">
        <h2>${title}</h2>
        ${body}
      </section>
    </div>
  `;
}

function renderToast() {
  if (!ui.toast) {
    return "";
  }

  return `
    <div class="toast-stack">
      <div class="toast ${ui.toast.type}">${escapeHtml(ui.toast.message)}</div>
    </div>
  `;
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;

  if (action === "set-tab") {
    ui.tab = target.dataset.tab;
    render();
  } else if (action === "set-debt-filter") {
    ui.debtFilter = target.dataset.filter;
    render();
  } else if (action === "select-debt") {
    ui.selectedDebtId = target.dataset.id;
    render();
  } else if (action === "open-debt") {
    ui.modal = { type: "debt", id: target.dataset.id || "" };
    render();
  } else if (action === "open-entry") {
    ui.modal = { type: "entry", id: target.dataset.id || "", debtId: target.dataset.debtId || "" };
    render();
  } else if (action === "close-modal") {
    ui.modal = null;
    render();
  } else if (action === "backdrop-close" && event.target === target) {
    ui.modal = null;
    render();
  } else if (action === "delete-debt") {
    confirmDeleteDebt(target.dataset.id);
  } else if (action === "toggle-debt-status") {
    toggleDebt(target.dataset.id);
  } else if (action === "delete-entry") {
    confirmDeleteEntry(target.dataset.id);
  } else if (action === "confirm-close-debt") {
    run(() => {
      setDebtStatus(target.dataset.id, "closed");
      ui.debtFilter = "closed";
      ui.modal = null;
      toast("Долг закрыт", "success");
    });
  } else if (action === "rename-dictionary") {
    renameDictionary(target.dataset.kind, target.dataset.value);
  } else if (action === "delete-dictionary") {
    removeDictionary(target.dataset.kind, target.dataset.value);
  } else if (action === "export-json") {
    exportJson();
  } else if (action === "open-import") {
    ui.modal = { type: "import" };
    render();
  } else if (action === "github-load") {
    loadFromGithub();
  } else if (action === "github-save") {
    saveToGithub();
  } else if (action === "remove-sync-token") {
    removeTokenFromBrowser();
  }
}

function handleSubmit(event) {
  const form = event.target.closest("form[data-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const type = form.dataset.form;

  if (type === "debt") {
    submitDebt(form);
  } else if (type === "entry") {
    submitEntry(form);
  } else if (type === "dictionary-add") {
    submitDictionary(form);
  } else if (type === "sync-settings") {
    submitSyncSettings(form);
  }
}

function handleChange(event) {
  const target = event.target;
  if (target.dataset.action === "audit-filter") {
    ui.auditEntity = target.value;
    render();
  } else if (target.dataset.action === "import-mode") {
    ui.importMode = target.value;
  } else if (target.dataset.action === "import-file") {
    importFile(target.files?.[0]);
  } else if (target.dataset.action === "sync-enabled" || target.dataset.action === "sync-risk-ack") {
    updateSyncActionAvailability(target.form);
  } else if (target.dataset.action === "toggle-token-visibility") {
    const tokenInput = target.form?.elements.token;
    if (tokenInput) {
      tokenInput.type = target.checked ? "text" : "password";
    }
  } else if (target.dataset.action === "toggle-large-text") {
    ui.largeText = target.checked;
    localStorage.setItem("debt-tracker-large-text-v1", String(ui.largeText));
    applyLargeTextPreference();
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.dataset.action === "audit-search") {
    ui.auditSearch = target.value;
    render();
  }
}

function submitDebt(form) {
  run(() => {
    const data = Object.fromEntries(new FormData(form).entries());
    data.category = data.newCategory || data.category;
    data.holder = data.newHolder || data.holder;
    const id = form.dataset.id;
    const debt = id ? updateDebt(id, data) : addDebt(data);
    ui.selectedDebtId = debt.id;
    ui.modal = null;
    toast(id ? "Долг обновлен" : "Долг создан", "success");
  });
}

function submitEntry(form) {
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const id = form.dataset.id;
    const debt = getState().debts.find((item) => item.id === data.debtId);
    const beforeStats = !id && data.type === "payment" && debt ? getDebtStats(getState(), debt) : null;
    const entry = id ? updateEntry(id, data) : addEntry(data);
    if (beforeStats && entry.type === "payment") {
      ui.paymentAnimation = {
        debtId: entry.debtId,
        fromBalance: beforeStats.balance,
        fromProgress: beforeStats.progress
      };
    }
    ui.selectedDebtId = entry.debtId;
    ui.modal = null;
    toast(id ? "Операция обновлена" : "Операция добавлена", "success");
    offerCloseIfNeeded(entry.debtId);
  } catch (error) {
    toast(error.message || "Операция не добавлена", "error");
  }
}

function submitDictionary(form) {
  run(() => {
    addDictionaryItem(form.dataset.kind, new FormData(form).get("value"));
    form.reset();
    toast("Справочник обновлен", "success");
  });
}

async function submitSyncSettings(form) {
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    data.enabled = Boolean(form.elements.enabled.checked);
    data.privacyAcknowledged = Boolean(form.elements.privacyAcknowledged.checked);
    const settings = saveSyncSettings(data);

    if (settings.enabled) {
      await inspectGithubRepositoryPrivacy(settings);
    } else {
      setSyncStatus("Настройки сохранены локально. Синхронизация выключена.");
    }

    toast("Настройки синхронизации сохранены", "success");
  } catch (error) {
    toast(error.message || "Не удалось сохранить настройки синхронизации", "error");
  }
}

function confirmDeleteDebt(id) {
  const debt = getState().debts.find((item) => item.id === id);
  if (!debt) {
    return;
  }

  if (confirm(`Удалить долг «${debt.name}» и все его операции?`)) {
    run(() => {
      deleteDebt(id);
      if (ui.selectedDebtId === id) {
        ui.selectedDebtId = getState().debts[0]?.id || "";
      }
      toast("Долг удален", "success");
    });
  }
}

function toggleDebt(id) {
  const debt = getState().debts.find((item) => item.id === id);
  if (!debt) {
    return;
  }

  const next = debt.status === "active" ? "closed" : "active";
  run(() => {
    setDebtStatus(id, next);
    ui.debtFilter = next === "closed" ? "closed" : "active";
    toast(next === "closed" ? "Долг закрыт" : "Долг переоткрыт", "success");
  });
}

function confirmDeleteEntry(id) {
  if (confirm("Удалить операцию?")) {
    run(() => {
      deleteEntry(id);
      toast("Операция удалена", "success");
    });
  }
}

function renameDictionary(kind, oldValue) {
  const value = prompt("Новое значение", oldValue);
  if (value === null) {
    return;
  }

  run(() => {
    renameDictionaryItem(kind, oldValue, value);
    toast("Справочник обновлен", "success");
  });
}

function removeDictionary(kind, value) {
  if (!confirm(`Удалить «${value}» из справочника?`)) {
    return;
  }

  run(() => {
    deleteDictionaryItem(kind, value);
    toast("Элемент справочника удален", "success");
  });
}

function offerCloseIfNeeded(debtId) {
  const state = getState();
  const debt = state.debts.find((item) => item.id === debtId);
  if (!debt || debt.status === "closed") {
    return;
  }

  const stats = getDebtStats(state, debt);
  if (stats.balance <= 0) {
    ui.modal = { type: "confirmClose", debtId };
    render();
  }
}

function exportJson() {
  const blob = new Blob([exportState()], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `debt-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("JSON экспортирован", "success");
}

async function importFile(file) {
  if (!file) {
    return;
  }

  if (!confirm(ui.importMode === "replace" ? "Заменить текущее состояние данными из файла?" : "Слить данные файла с текущим состоянием?")) {
    return;
  }

  try {
    const text = await file.text();
    importStateFromJson(text, ui.importMode, "Импорт JSON");
    ui.modal = null;
    toast("JSON импортирован", "success");
  } catch (error) {
    toast(error.message || "Не удалось импортировать JSON", "error");
  }
}

async function loadFromGithub() {
  try {
    const settings = requireSyncAuthorization();
    if (!confirm("Загрузить состояние из GitHub и заменить локальные данные?")) {
      return;
    }

    ui.syncStatus = "Загрузка из GitHub...";
    ui.syncStatusType = "";
    render();
    const { data } = await fetchGithubData(settings);
    importStateFromJson(data, "replace", "GitHub");
    recordGithubAction("Данные загружены из GitHub", [
      { field: "mode", label: "Режим", before: "локальное состояние", after: "замена из GitHub" }
    ]);
    setSyncStatus("Данные загружены из GitHub.", "good");
    toast("Синхронизация выполнена", "success");
  } catch (error) {
    setSyncStatus(error.message || "Ошибка загрузки из GitHub", "bad");
    toast(ui.syncStatus, "error");
  }
}

async function saveToGithub() {
  try {
    const settings = requireSyncAuthorization();
    const repositoryPrivacy = await inspectGithubRepositoryPrivacy(settings);
    render();

    const confirmationMessage = repositoryPrivacy === "public"
      ? "Внимание: GitHub сообщает, что репозиторий публичный. Файл data.json с вашими долгами будет доступен всем. Продолжить сохранение?"
      : "Сохранить текущее состояние в GitHub data.json?";
    if (!confirm(confirmationMessage)) {
      return;
    }

    ui.syncStatus = "Сохранение в GitHub...";
    ui.syncStatusType = "";
    render();
    await pushGithubData(settings, getState());
    recordGithubAction("Данные сохранены в GitHub", [
      { field: "path", label: "Путь", before: "локальное состояние", after: settings.path }
    ]);
    setSyncStatus("Данные сохранены в GitHub.", "good");
    toast("Данные сохранены в GitHub", "success");
  } catch (error) {
    setSyncStatus(error.message || "Ошибка сохранения в GitHub", "bad");
    toast(ui.syncStatus, "error");
  }
}

function removeTokenFromBrowser() {
  if (!confirm("Удалить сохраненный токен GitHub только из этого браузера?")) {
    return;
  }

  run(() => {
    const hadToken = removeSyncToken();
    setSyncStatus(hadToken ? "Токен удален из браузера." : "Сохраненного токена в браузере не было.");
    toast(hadToken ? "Токен удален из браузера" : "Сохраненного токена нет", "success");
  });
}

function requireSyncAuthorization() {
  const settings = getSyncSettings();
  if (!settings.enabled || !settings.privacyAcknowledged) {
    throw new Error("Включите синхронизацию и подтвердите использование приватного репозитория");
  }

  return settings;
}

async function inspectGithubRepositoryPrivacy(settings) {
  try {
    const repository = await getGithubRepositoryInfo(settings);
    if (repository.private) {
      setSyncStatus("GitHub подтвердил: репозиторий приватный.", "good");
      return "private";
    }

    setSyncStatus("Внимание: GitHub сообщает, что репозиторий публичный. Не сохраняйте в него data.json с личными долгами.", "bad");
    return "public";
  } catch {
    setSyncStatus("Не удалось определить видимость репозитория. Синхронизация остается доступной.", "");
    return "unknown";
  }
}

function setSyncStatus(message, type = "") {
  ui.syncStatus = message;
  ui.syncStatusType = type;
}

function updateSyncActionAvailability(form) {
  if (!form) {
    return;
  }

  const enabled = Boolean(form.elements.enabled?.checked);
  const acknowledged = Boolean(form.elements.privacyAcknowledged?.checked);
  const savedSettings = getSyncSettings();
  const savedAuthorization = savedSettings.enabled && savedSettings.privacyAcknowledged;
  form.querySelectorAll("[data-sync-action]").forEach((button) => {
    button.disabled = !enabled || !acknowledged || !savedAuthorization;
  });
}

function field(name, label, value = "", type = "text", required = false, placeholder = "") {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeAttribute(value)}" placeholder="${escapeAttribute(placeholder)}" ${required ? "required" : ""} ${type === "number" ? "min=\"1\" step=\"1\"" : ""}>
    </div>
  `;
}

function selectWithNew(name, label, value, options, newName, newLabel) {
  return `
    <div class="field-row">
      <div class="field">
        <label for="${name}">${label}</label>
        <select id="${name}" name="${name}">
          ${options.map((option) => `
            <option value="${escapeAttribute(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>
          `).join("")}
        </select>
      </div>
      ${field(newName, newLabel, "", "text", false, `Или введите ${newLabel.toLocaleLowerCase("ru-RU")}`)}
    </div>
  `;
}

function filterDebts(debts) {
  if (ui.debtFilter === "all") {
    return debts;
  }

  return debts.filter((debt) => debt.status === ui.debtFilter);
}

function renderFilteredEmpty() {
  return `
    <section class="empty-state">
      <h2>Здесь пусто</h2>
      <p>В выбранном фильтре долгов нет.</p>
    </section>
  `;
}

function auditSearchText(record) {
  return [
    record.action,
    record.entityType,
    record.entityId,
    formatAuditDetails(record.details)
  ].join(" ").toLocaleLowerCase("ru-RU");
}

function highlight(text, query) {
  const escaped = escapeHtml(text);
  if (!query) {
    return escaped;
  }

  const safeQuery = escapeRegExp(escapeHtml(query));
  return escaped.replace(new RegExp(`(${safeQuery})`, "giu"), "<mark>$1</mark>");
}

function run(callback) {
  try {
    callback();
  } catch (error) {
    toast(error.message || "Действие не выполнено", "error");
  }
}

function toast(message, type = "success") {
  ui.toast = { message, type };
  render();
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    ui.toast = null;
    render();
  }, 3600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
