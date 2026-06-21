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
  recordGithubAction,
  renameDictionaryItem,
  saveSyncSettings,
  setDebtStatus,
  subscribe,
  updateDebt,
  updateEntry
} from "./state.js";
import { fetchGithubData, pushGithubData } from "./github.js";

const ui = {
  tab: "debts",
  debtFilter: "active",
  selectedDebtId: "",
  auditEntity: "all",
  auditSearch: "",
  modal: null,
  toast: null,
  importMode: "replace",
  syncStatus: ""
};

let root;

export function initUI(element) {
  root = element;
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
      ${renderSummary(state)}
      ${renderTabs()}
      ${renderTabContent(state)}
    </div>
    ${renderModal(state)}
    ${renderToast()}
  `;
}

function renderHeader() {
  return `
    <header class="topbar">
      <div class="brand">
        <h1>Трекер долгов</h1>
        <p>Личный журнал долгов, платежей и начислений с локальным хранением и JSON-бэкапом.</p>
      </div>
      <div class="top-actions">
        <button class="button ghost" type="button" data-action="export-json">Экспорт JSON</button>
        <button class="button ghost" type="button" data-action="open-import">Импорт JSON</button>
        <button class="button primary" type="button" data-action="open-debt">Новый долг</button>
      </div>
    </header>
  `;
}

function renderSummary(state) {
  const summary = getSummary(state);
  return `
    <section class="summary-grid" aria-label="Сводка">
      <article class="metric-card">
        <span>Общий остаток активных</span>
        <strong>${formatMoney(summary.activeBalance)}</strong>
      </article>
      <article class="metric-card">
        <span>Суммарно выплачено</span>
        <strong>${formatMoney(summary.totalPaid)}</strong>
      </article>
      <article class="metric-card">
        <span>Активных долгов</span>
        <strong>${summary.activeCount}</strong>
      </article>
      <article class="metric-card">
        <span>Закрытых долгов</span>
        <strong>${summary.closedCount}</strong>
      </article>
      <article class="metric-card">
        <span>Выплачено за месяц</span>
        <strong>${formatMoney(summary.currentMonthPaid)}</strong>
      </article>
    </section>
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
          <h2>Долгов пока нет</h2>
          <p>Создайте первый долг, затем добавляйте платежи и начисления. Сводка, аналитика и аудит появятся автоматически.</p>
          <button class="button primary" type="button" data-action="open-debt">Создать долг</button>
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
        <button class="button primary" type="button" data-action="open-debt">Новый долг</button>
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
  const statusClass = debt.status === "closed" ? "closed" : "active";
  const statusLabel = debt.status === "closed" ? "Закрыт" : "Активен";

  return `
    <article class="debt-card ${selected}">
      <div class="card-head">
        <div class="card-title">
          <h3>${escapeHtml(debt.name)}</h3>
          <div class="meta-line">${escapeHtml(debt.category)} · ${escapeHtml(debt.holder)}</div>
        </div>
        <span class="pill ${statusClass}">${statusLabel}</span>
      </div>

      <div class="amount-grid">
        <div>
          <span>Начальная сумма</span>
          <strong>${formatMoney(debt.initialAmount)}</strong>
        </div>
        <div>
          <span>Текущий остаток</span>
          <strong class="${stats.isOverpaid ? "balance-overpaid" : "balance-positive"}">${formatBalance(stats.balance)}</strong>
        </div>
      </div>

      <div class="progress-block">
        <div class="progress-label">
          <span>Погашено</span>
          <strong>${Math.round(stats.progress)}%</strong>
        </div>
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" style="--progress: ${Math.round(stats.progress)}%"></div>
        </div>
      </div>

      ${debt.note ? `<p class="note">${escapeHtml(debt.note)}</p>` : ""}

      <div class="inline-actions">
        <button class="button small" type="button" data-action="select-debt" data-id="${debt.id}">Операции</button>
        <button class="button small ghost" type="button" data-action="open-debt" data-id="${debt.id}">Редактировать</button>
        <button class="button small ghost" type="button" data-action="toggle-debt-status" data-id="${debt.id}">
          ${debt.status === "active" ? "Закрыть" : "Переоткрыть"}
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
        <button class="button primary" type="button" data-action="open-entry" data-debt-id="${debt.id}">Новая операция</button>
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
  const label = entry.type === "payment" ? "Платеж" : "Начисление";
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
        <form data-form="sync-settings">
          <label class="checkbox-field">
            <input type="checkbox" name="enabled" ${sync.enabled ? "checked" : ""}>
            <span>Включить синхронизацию</span>
          </label>
          <div class="field-grid">
            ${field("owner", "Owner", sync.owner)}
            ${field("repo", "Repo", sync.repo)}
            ${field("branch", "Branch", sync.branch || "main")}
            ${field("path", "Путь к data.json", sync.path || "data.json")}
          </div>
          <div class="field">
            <label for="sync-token">Personal Access Token</label>
            <input id="sync-token" name="token" type="password" autocomplete="off" value="${escapeAttribute(sync.token)}">
          </div>
          <div class="settings-actions">
            <button class="button primary" type="submit">Сохранить настройки</button>
            <button class="button ghost" type="button" data-action="github-load">Загрузить из GitHub</button>
            <button class="button ghost" type="button" data-action="github-save">Сохранить в GitHub</button>
          </div>
        </form>
        ${ui.syncStatus ? `<div class="sync-status">${escapeHtml(ui.syncStatus)}</div>` : ""}
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
        ${field("name", "Название", values.name, "text", true)}
        ${field("initialAmount", "Начальная сумма, ₽", values.initialAmount, "number", true)}
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
        <textarea id="debt-note" name="note">${escapeHtml(values.note || "")}</textarea>
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
          <label for="entry-type">Тип</label>
          <select id="entry-type" name="type" required>
            <option value="payment" ${values.type === "payment" ? "selected" : ""}>Платеж</option>
            <option value="charge" ${values.type === "charge" ? "selected" : ""}>Начисление</option>
          </select>
        </div>
      </div>
      <div class="field-grid">
        ${field("amount", "Сумма, ₽", values.amount, "number", true)}
        ${field("date", "Дата", toDateInputValue(values.date), "date", true)}
      </div>
      <div class="field">
        <label for="entry-comment">Комментарий</label>
        <textarea id="entry-comment" name="comment">${escapeHtml(values.comment || "")}</textarea>
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
  run(() => {
    const data = Object.fromEntries(new FormData(form).entries());
    const id = form.dataset.id;
    const entry = id ? updateEntry(id, data) : addEntry(data);
    ui.selectedDebtId = entry.debtId;
    ui.modal = null;
    toast(id ? "Операция обновлена" : "Операция добавлена", "success");
    offerCloseIfNeeded(entry.debtId);
  });
}

function submitDictionary(form) {
  run(() => {
    addDictionaryItem(form.dataset.kind, new FormData(form).get("value"));
    form.reset();
    toast("Справочник обновлен", "success");
  });
}

function submitSyncSettings(form) {
  run(() => {
    const data = Object.fromEntries(new FormData(form).entries());
    data.enabled = Boolean(form.elements.enabled.checked);
    saveSyncSettings(data);
    ui.syncStatus = "Настройки сохранены локально.";
    toast("Настройки синхронизации сохранены", "success");
  });
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
  if (!confirm("Загрузить состояние из GitHub и заменить локальные данные?")) {
    return;
  }

  try {
    ui.syncStatus = "Загрузка из GitHub...";
    render();
    const { data } = await fetchGithubData(getSyncSettings());
    importStateFromJson(data, "replace", "GitHub");
    recordGithubAction("Данные загружены из GitHub", [
      { field: "mode", label: "Режим", before: "локальное состояние", after: "замена из GitHub" }
    ]);
    ui.syncStatus = "Данные загружены из GitHub.";
    toast("Синхронизация выполнена", "success");
  } catch (error) {
    ui.syncStatus = error.message || "Ошибка загрузки из GitHub";
    toast(ui.syncStatus, "error");
    render();
  }
}

async function saveToGithub() {
  if (!confirm("Сохранить текущее состояние в GitHub data.json?")) {
    return;
  }

  try {
    ui.syncStatus = "Сохранение в GitHub...";
    render();
    await pushGithubData(getSyncSettings(), getState());
    recordGithubAction("Данные сохранены в GitHub", [
      { field: "path", label: "Путь", before: "локальное состояние", after: getSyncSettings().path }
    ]);
    ui.syncStatus = "Данные сохранены в GitHub.";
    toast("Данные сохранены в GitHub", "success");
  } catch (error) {
    ui.syncStatus = error.message || "Ошибка сохранения в GitHub";
    toast(ui.syncStatus, "error");
    render();
  }
}

function field(name, label, value = "", type = "text", required = false) {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeAttribute(value)}" ${required ? "required" : ""} ${type === "number" ? "min=\"1\" step=\"1\"" : ""}>
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
      ${field(newName, newLabel)}
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
