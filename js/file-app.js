/* Generated file:// fallback. Source files are the ES modules in /js. */
(() => {
  "use strict";

  // js/audit.js
  const ENTITY_LABELS = {
    debt: "Долг",
    entry: "Операция",
    category: "Категория",
    holder: "Банк/удержатель",
    import: "Импорт",
    github: "GitHub",
    sync: "Синхронизация"
  };
  
  const FIELD_LABELS = {
    name: "Название",
    category: "Категория",
    holder: "Банк/удержатель",
    initialAmount: "Начальная сумма",
    createdAt: "Дата создания",
    note: "Заметка",
    status: "Статус",
    debtId: "Долг",
    type: "Тип",
    amount: "Сумма",
    date: "Дата",
    comment: "Комментарий",
    value: "Значение",
    mode: "Режим",
    path: "Путь",
    repo: "Репозиторий"
  };
  
  const STATUS_LABELS = {
    active: "Активный",
    closed: "Закрытый"
  };
  
  const TYPE_LABELS = {
    payment: "Платеж",
    charge: "Начисление"
  };
  
  function createAuditRecord({ id, timestamp, action, entityType, entityId, details }) {
    return {
      id,
      timestamp,
      action,
      entityType,
      entityId,
      details: normalizeDetails(details)
    };
  }
  
  function describeChanges(before, after, fields = Object.keys(after || {})) {
    return fields
      .filter((field) => !sameValue(before?.[field], after?.[field]))
      .map((field) => ({
        field,
        label: FIELD_LABELS[field] || field,
        before: prepareValue(field, before?.[field]),
        after: prepareValue(field, after?.[field])
      }));
  }
  
  function describeCreated(entity, fields = Object.keys(entity || {})) {
    return fields
      .filter((field) => entity?.[field] !== undefined && entity?.[field] !== "")
      .map((field) => ({
        field,
        label: FIELD_LABELS[field] || field,
        before: "не было",
        after: prepareValue(field, entity[field])
      }));
  }
  
  function describeDeleted(entity, fields = Object.keys(entity || {})) {
    return fields
      .filter((field) => entity?.[field] !== undefined && entity?.[field] !== "")
      .map((field) => ({
        field,
        label: FIELD_LABELS[field] || field,
        before: prepareValue(field, entity[field]),
        after: "удалено"
      }));
  }
  
  function formatAuditDetails(details) {
    if (!details) {
      return "";
    }
  
    if (typeof details === "string") {
      return details;
    }
  
    if (Array.isArray(details)) {
      return details
        .map((item) => `${item.label || item.field}: ${stringifyDetail(item.before)} → ${stringifyDetail(item.after)}`)
        .join("\n");
    }
  
    return Object.entries(details)
      .map(([key, value]) => `${FIELD_LABELS[key] || key}: ${stringifyDetail(value)}`)
      .join("\n");
  }
  
  function normalizeDetails(details) {
    if (Array.isArray(details) || typeof details === "string") {
      return details;
    }
  
    if (!details || typeof details !== "object") {
      return "";
    }
  
    return Object.entries(details).map(([field, value]) => ({
      field,
      label: FIELD_LABELS[field] || field,
      before: "не было",
      after: prepareValue(field, value)
    }));
  }
  
  function prepareValue(field, value) {
    if (value === undefined || value === null || value === "") {
      return "пусто";
    }
  
    if (field === "status") {
      return STATUS_LABELS[value] || value;
    }
  
    if (field === "type") {
      return TYPE_LABELS[value] || value;
    }
  
    if (field === "initialAmount" || field === "amount") {
      return Number(value).toLocaleString("ru-RU") + " ₽";
    }
  
    return value;
  }
  
  function stringifyDetail(value) {
    if (value === undefined || value === null || value === "") {
      return "пусто";
    }
  
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
  
    return String(value);
  }
  
  function sameValue(left, right) {
    return JSON.stringify(left ?? "") === JSON.stringify(right ?? "");
  }
  

  // js/analytics.js
  const RUB_FORMATTER = new Intl.NumberFormat("ru-RU", {
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
  
  function formatMoney(value) {
    const number = Number(value) || 0;
    const sign = number < 0 ? "-" : "";
    return `${sign}${RUB_FORMATTER.format(Math.abs(Math.round(number)))} ₽`;
  }
  
  function formatBalance(value) {
    const number = Number(value) || 0;
    if (number < 0) {
      return `Переплата ${formatMoney(Math.abs(number))}`;
    }
  
    return formatMoney(number);
  }
  
  function formatDate(value) {
    if (!value) {
      return "";
    }
  
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
  
    return DATE_FORMATTER.format(date);
  }
  
  function formatDateTime(value) {
    if (!value) {
      return "";
    }
  
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
  
    return DATE_TIME_FORMATTER.format(date);
  }
  
  function todayInputValue() {
    return new Date().toISOString().slice(0, 10);
  }
  
  function toDateInputValue(value) {
    if (!value) {
      return todayInputValue();
    }
  
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return todayInputValue();
    }
  
    return date.toISOString().slice(0, 10);
  }
  
  function getDebtEntries(state, debtId) {
    return state.entries.filter((entry) => entry.debtId === debtId);
  }
  
  function getDebtStats(state, debt) {
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
  
  function getSummary(state) {
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
  
  function getAnalyticsGroups(state, dimension) {
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
  

  // js/state.js
  
  const STORAGE_KEY = "debt-tracker-state-v1";
  const SYNC_SETTINGS_KEY = "debt-tracker-github-sync-v1";
  
  const DEFAULT_DICTIONARIES = {
    categories: ["Кредитная карта", "Потребительский кредит", "Рассрочка", "Займ"],
    holders: ["Сбербанк", "Т-Банк", "Альфа-Банк"]
  };
  
  let state = loadState();
  const listeners = new Set();
  
  function getState() {
    return state;
  }
  
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  
  function saveNow() {
    saveState();
    notify();
  }
  
  function getSyncSettings() {
    try {
      const raw = localStorage.getItem(SYNC_SETTINGS_KEY);
      if (!raw) {
        return defaultSyncSettings();
      }
  
      return {
        ...defaultSyncSettings(),
        ...JSON.parse(raw)
      };
    } catch {
      return defaultSyncSettings();
    }
  }
  
  function saveSyncSettings(settings) {
    const clean = {
      enabled: Boolean(settings.enabled),
      owner: cleanText(settings.owner),
      repo: cleanText(settings.repo),
      branch: cleanText(settings.branch) || "main",
      path: cleanText(settings.path) || "data.json",
      token: cleanText(settings.token)
    };
  
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(clean));
    pushAudit("Настройки GitHub-синхронизации изменены", "github", "settings", [
      { field: "repo", label: "Репозиторий", before: "прежние настройки", after: `${clean.owner}/${clean.repo}` },
      { field: "path", label: "Путь", before: "прежний путь", after: clean.path },
      { field: "enabled", label: "Синхронизация", before: "прежний режим", after: clean.enabled ? "включена" : "выключена" }
    ]);
    commit();
    return clean;
  }
  
  function exportState() {
    return JSON.stringify(state, null, 2);
  }
  
  function addDebt(input) {
    const debt = normalizeDebtInput(input);
    ensureDictionaryValue("categories", debt.category, "category");
    ensureDictionaryValue("holders", debt.holder, "holder");
  
    state.debts.unshift(debt);
    pushAudit("Создан долг", "debt", debt.id, describeCreated(debt, [
      "name",
      "category",
      "holder",
      "initialAmount",
      "createdAt",
      "note",
      "status"
    ]));
    commit();
    return debt;
  }
  
  function updateDebt(id, input) {
    const debt = findById(state.debts, id, "Долг не найден");
    const before = { ...debt };
    const next = normalizeDebtInput({ ...debt, ...input }, id, debt.createdAt);
  
    ensureDictionaryValue("categories", next.category, "category");
    ensureDictionaryValue("holders", next.holder, "holder");
    Object.assign(debt, next);
  
    const details = describeChanges(before, debt, [
      "name",
      "category",
      "holder",
      "initialAmount",
      "note",
      "status"
    ]);
  
    if (details.length) {
      pushAudit("Изменен долг", "debt", debt.id, details);
      commit();
    }
  
    return debt;
  }
  
  function deleteDebt(id) {
    const debtIndex = state.debts.findIndex((debt) => debt.id === id);
    if (debtIndex === -1) {
      throw new Error("Долг не найден");
    }
  
    const [debt] = state.debts.splice(debtIndex, 1);
    const removedEntries = state.entries.filter((entry) => entry.debtId === id);
    state.entries = state.entries.filter((entry) => entry.debtId !== id);
    pushAudit("Удален долг", "debt", id, [
      ...describeDeleted(debt, ["name", "category", "holder", "initialAmount", "status"]),
      { field: "entries", label: "Удалено операций", before: removedEntries.length, after: 0 }
    ]);
    commit();
  }
  
  function setDebtStatus(id, status) {
    if (!["active", "closed"].includes(status)) {
      throw new Error("Неизвестный статус долга");
    }
  
    const debt = findById(state.debts, id, "Долг не найден");
    if (debt.status === status) {
      return debt;
    }
  
    const before = { ...debt };
    debt.status = status;
    pushAudit(status === "closed" ? "Долг закрыт" : "Долг переоткрыт", "debt", id, describeChanges(before, debt, ["status"]));
    commit();
    return debt;
  }
  
  function addEntry(input) {
    const entry = normalizeEntryInput(input);
    findById(state.debts, entry.debtId, "Долг для операции не найден");
    state.entries.unshift(entry);
    pushAudit("Добавлена операция", "entry", entry.id, describeCreated(entry, [
      "debtId",
      "type",
      "amount",
      "date",
      "comment"
    ]));
    commit();
    return entry;
  }
  
  function updateEntry(id, input) {
    const entry = findById(state.entries, id, "Операция не найдена");
    const before = { ...entry };
    const next = normalizeEntryInput({ ...entry, ...input }, id);
    findById(state.debts, next.debtId, "Долг для операции не найден");
    Object.assign(entry, next);
  
    const details = describeChanges(before, entry, ["debtId", "type", "amount", "date", "comment"]);
    if (details.length) {
      pushAudit("Изменена операция", "entry", entry.id, details);
      commit();
    }
  
    return entry;
  }
  
  function deleteEntry(id) {
    const index = state.entries.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new Error("Операция не найдена");
    }
  
    const [entry] = state.entries.splice(index, 1);
    pushAudit("Удалена операция", "entry", id, describeDeleted(entry, [
      "debtId",
      "type",
      "amount",
      "date",
      "comment"
    ]));
    commit();
  }
  
  function addDictionaryItem(kind, value) {
    const list = getDictionary(kind);
    const clean = requireText(value, kind === "categories" ? "Категория" : "Банк/удержатель");
    if (containsValue(list, clean)) {
      throw new Error("Такое значение уже есть в справочнике");
    }
  
    list.push(clean);
    list.sort((a, b) => a.localeCompare(b, "ru"));
    pushAudit("Добавлен элемент справочника", dictionaryEntityType(kind), clean, [
      { field: "value", label: "Значение", before: "не было", after: clean }
    ]);
    commit();
    return clean;
  }
  
  function renameDictionaryItem(kind, oldValue, newValue) {
    const list = getDictionary(kind);
    const oldClean = requireText(oldValue, "Текущее значение");
    const nextClean = requireText(newValue, "Новое значение");
    const index = list.findIndex((item) => sameText(item, oldClean));
    if (index === -1) {
      throw new Error("Элемент справочника не найден");
    }
  
    if (!sameText(oldClean, nextClean) && containsValue(list, nextClean)) {
      throw new Error("Такое значение уже есть в справочнике");
    }
  
    list[index] = nextClean;
    list.sort((a, b) => a.localeCompare(b, "ru"));
  
    const field = kind === "categories" ? "category" : "holder";
    for (const debt of state.debts) {
      if (sameText(debt[field], oldClean)) {
        debt[field] = nextClean;
      }
    }
  
    pushAudit("Переименован элемент справочника", dictionaryEntityType(kind), nextClean, [
      { field: "value", label: "Значение", before: oldClean, after: nextClean }
    ]);
    commit();
    return nextClean;
  }
  
  function deleteDictionaryItem(kind, value) {
    const list = getDictionary(kind);
    const clean = requireText(value, "Значение");
    const field = kind === "categories" ? "category" : "holder";
    const usedBy = state.debts.filter((debt) => sameText(debt[field], clean));
  
    if (usedBy.length) {
      throw new Error(`Нельзя удалить: значение используется в долгах (${usedBy.length}).`);
    }
  
    const index = list.findIndex((item) => sameText(item, clean));
    if (index === -1) {
      throw new Error("Элемент справочника не найден");
    }
  
    list.splice(index, 1);
    pushAudit("Удален элемент справочника", dictionaryEntityType(kind), clean, [
      { field: "value", label: "Значение", before: clean, after: "удалено" }
    ]);
    commit();
  }
  
  function importStateFromJson(raw, mode = "replace", source = "Импорт JSON") {
    const imported = normalizeImportedState(typeof raw === "string" ? JSON.parse(raw) : raw);
  
    if (mode === "replace") {
      state = imported;
      pushAudit(`${source}: состояние заменено`, "import", "replace", [
        { field: "mode", label: "Режим", before: "локальное состояние", after: "замена" },
        { field: "debts", label: "Долгов", before: "старое значение", after: state.debts.length },
        { field: "entries", label: "Операций", before: "старое значение", after: state.entries.length }
      ]);
    } else if (mode === "merge") {
      const beforeDebts = state.debts.length;
      const beforeEntries = state.entries.length;
      state = mergeStates(state, imported);
      pushAudit(`${source}: состояние слито`, "import", "merge", [
        { field: "mode", label: "Режим", before: "локальное состояние", after: "слияние" },
        { field: "debts", label: "Долгов", before: beforeDebts, after: state.debts.length },
        { field: "entries", label: "Операций", before: beforeEntries, after: state.entries.length }
      ]);
    } else {
      throw new Error("Неизвестный режим импорта");
    }
  
    commit();
    return state;
  }
  
  function recordGithubAction(action, details = []) {
    pushAudit(action, "github", "github-sync", details);
    commit();
  }
  
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createEmptyState();
      }
  
      return normalizeImportedState(JSON.parse(raw));
    } catch {
      return createEmptyState();
    }
  }
  
  function createEmptyState() {
    return {
      version: 1,
      debts: [],
      entries: [],
      dictionaries: structuredCloneSafe(DEFAULT_DICTIONARIES),
      auditLog: []
    };
  }
  
  function defaultSyncSettings() {
    return {
      enabled: false,
      owner: "",
      repo: "",
      branch: "main",
      path: "data.json",
      token: ""
    };
  }
  
  function normalizeImportedState(input) {
    if (!input || typeof input !== "object") {
      throw new Error("JSON не похож на состояние приложения");
    }
  
    const normalized = {
      version: 1,
      debts: Array.isArray(input.debts) ? input.debts.map(normalizeDebtFromImport) : [],
      entries: Array.isArray(input.entries) ? input.entries.map(normalizeEntryFromImport) : [],
      dictionaries: normalizeDictionaries(input.dictionaries),
      auditLog: Array.isArray(input.auditLog) ? input.auditLog.map(normalizeAuditFromImport) : []
    };
  
    const debtIds = new Set(normalized.debts.map((debt) => debt.id));
    normalized.entries = normalized.entries.filter((entry) => debtIds.has(entry.debtId));
    normalized.debts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    normalized.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    normalized.auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
    return normalized;
  }
  
  function normalizeDebtFromImport(debt) {
    return {
      id: cleanText(debt.id) || uuid(),
      name: requireText(debt.name, "Название долга"),
      category: requireText(debt.category, "Категория"),
      holder: requireText(debt.holder, "Банк/удержатель"),
      initialAmount: positiveNumber(debt.initialAmount, "Начальная сумма"),
      createdAt: normalizeIsoDate(debt.createdAt, "Дата создания"),
      note: cleanText(debt.note),
      status: debt.status === "closed" ? "closed" : "active"
    };
  }
  
  function normalizeEntryFromImport(entry) {
    return {
      id: cleanText(entry.id) || uuid(),
      debtId: requireText(entry.debtId, "Долг операции"),
      type: entry.type === "charge" ? "charge" : "payment",
      amount: positiveNumber(entry.amount, "Сумма операции"),
      date: normalizeIsoDate(entry.date, "Дата операции"),
      comment: cleanText(entry.comment)
    };
  }
  
  function normalizeAuditFromImport(record) {
    return {
      id: cleanText(record.id) || uuid(),
      timestamp: normalizeIsoDate(record.timestamp, "Дата аудита"),
      action: cleanText(record.action) || "Импортированная запись",
      entityType: cleanText(record.entityType) || "import",
      entityId: cleanText(record.entityId) || "unknown",
      details: record.details || ""
    };
  }
  
  function normalizeDictionaries(dictionaries = {}) {
    return {
      categories: normalizeDictionaryList(dictionaries.categories, DEFAULT_DICTIONARIES.categories),
      holders: normalizeDictionaryList(dictionaries.holders, DEFAULT_DICTIONARIES.holders)
    };
  }
  
  function normalizeDictionaryList(list, fallback) {
    const source = Array.isArray(list) ? list : fallback;
    return Array.from(new Set(source.map(cleanText).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  }
  
  function normalizeDebtInput(input, id = uuid(), createdAt = new Date().toISOString()) {
    return {
      id,
      name: requireText(input.name, "Название долга"),
      category: requireText(input.category, "Категория"),
      holder: requireText(input.holder, "Банк/удержатель"),
      initialAmount: positiveNumber(input.initialAmount, "Начальная сумма"),
      createdAt: normalizeIsoDate(createdAt, "Дата создания"),
      note: cleanText(input.note),
      status: input.status === "closed" ? "closed" : "active"
    };
  }
  
  function normalizeEntryInput(input, id = uuid()) {
    return {
      id,
      debtId: requireText(input.debtId, "Долг"),
      type: input.type === "charge" ? "charge" : "payment",
      amount: positiveNumber(input.amount, "Сумма"),
      date: normalizeIsoDate(input.date, "Дата"),
      comment: cleanText(input.comment)
    };
  }
  
  function mergeStates(current, imported) {
    const merged = normalizeImportedState(current);
    upsertById(merged.debts, imported.debts);
    upsertById(merged.entries, imported.entries);
    upsertById(merged.auditLog, imported.auditLog);
    merged.dictionaries.categories = mergeLists(merged.dictionaries.categories, imported.dictionaries.categories);
    merged.dictionaries.holders = mergeLists(merged.dictionaries.holders, imported.dictionaries.holders);
    return normalizeImportedState(merged);
  }
  
  function upsertById(target, incoming) {
    for (const item of incoming) {
      const index = target.findIndex((existing) => existing.id === item.id);
      if (index === -1) {
        target.push(item);
      } else {
        target[index] = item;
      }
    }
  }
  
  function mergeLists(left, right) {
    return Array.from(new Set([...(left || []), ...(right || [])].map(cleanText).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  }
  
  function ensureDictionaryValue(kind, value, entityType) {
    const list = getDictionary(kind);
    const clean = requireText(value, "Значение справочника");
    if (!containsValue(list, clean)) {
      list.push(clean);
      list.sort((a, b) => a.localeCompare(b, "ru"));
      pushAudit("Добавлен элемент справочника из формы долга", entityType, clean, [
        { field: "value", label: "Значение", before: "не было", after: clean }
      ]);
    }
  }
  
  function getDictionary(kind) {
    if (!["categories", "holders"].includes(kind)) {
      throw new Error("Неизвестный справочник");
    }
  
    state.dictionaries ||= structuredCloneSafe(DEFAULT_DICTIONARIES);
    state.dictionaries[kind] ||= [];
    return state.dictionaries[kind];
  }
  
  function dictionaryEntityType(kind) {
    return kind === "categories" ? "category" : "holder";
  }
  
  function pushAudit(action, entityType, entityId, details) {
    state.auditLog.unshift(createAuditRecord({
      id: uuid(),
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      details
    }));
  }
  
  function commit() {
    saveState();
    notify();
  }
  
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  
  function notify() {
    for (const listener of listeners) {
      listener(state);
    }
  }
  
  function findById(list, id, errorMessage) {
    const item = list.find((entry) => entry.id === id);
    if (!item) {
      throw new Error(errorMessage);
    }
  
    return item;
  }
  
  function positiveNumber(value, label) {
    const number = Number(String(value).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(`${label}: введите положительное число`);
    }
  
    return Math.round(number);
  }
  
  function normalizeIsoDate(value, label) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`${label}: неверная дата`);
    }
  
    return date.toISOString();
  }
  
  function requireText(value, label) {
    const clean = cleanText(value);
    if (!clean) {
      throw new Error(`${label}: заполните поле`);
    }
  
    return clean;
  }
  
  function cleanText(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }
  
  function sameText(left, right) {
    return cleanText(left).toLocaleLowerCase("ru-RU") === cleanText(right).toLocaleLowerCase("ru-RU");
  }
  
  function containsValue(list, value) {
    return list.some((item) => sameText(item, value));
  }
  
  function uuid() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  
  function structuredCloneSafe(value) {
    if (globalThis.structuredClone) {
      return globalThis.structuredClone(value);
    }
  
    return JSON.parse(JSON.stringify(value));
  }
  

  // js/github.js
  async function fetchGithubData(settings) {
    const clean = validateSettings(settings, { requireToken: false });
    const response = await fetch(contentsUrl(clean), {
      headers: headers(clean.token)
    });
  
    if (!response.ok) {
      throw new Error(await githubError(response, "Не удалось загрузить data.json из GitHub"));
    }
  
    const payload = await response.json();
    if (!payload.content) {
      throw new Error("GitHub вернул пустой файл");
    }
  
    return {
      data: JSON.parse(decodeBase64(payload.content)),
      sha: payload.sha
    };
  }
  
  async function pushGithubData(settings, state) {
    const clean = validateSettings(settings, { requireToken: true });
    let sha = "";
  
    try {
      const current = await fetchGithubData(clean);
      sha = current.sha;
    } catch (error) {
      if (!String(error.message).includes("404")) {
        throw error;
      }
    }
  
    const body = {
      message: `Update ${clean.path} from debt tracker`,
      content: encodeBase64(JSON.stringify(state, null, 2)),
      branch: clean.branch
    };
  
    if (sha) {
      body.sha = sha;
    }
  
    const response = await fetch(contentsUrl(clean), {
      method: "PUT",
      headers: {
        ...headers(clean.token),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  
    if (!response.ok) {
      throw new Error(await githubError(response, "Не удалось сохранить data.json в GitHub"));
    }
  
    return response.json();
  }
  
  function validateSettings(settings, options = {}) {
    const clean = {
      owner: String(settings.owner || "").trim(),
      repo: String(settings.repo || "").trim(),
      branch: String(settings.branch || "main").trim(),
      path: String(settings.path || "data.json").trim().replace(/^\/+/, ""),
      token: String(settings.token || "").trim()
    };
  
    if (!clean.owner || !clean.repo || !clean.branch || !clean.path) {
      throw new Error("Заполните owner, repo, branch и путь к файлу");
    }
  
    if (options.requireToken && !clean.token) {
      throw new Error("Для записи в GitHub нужен Personal Access Token");
    }
  
    return clean;
  }
  
  function contentsUrl(settings) {
    const path = settings.path.split("/").map(encodeURIComponent).join("/");
    const owner = encodeURIComponent(settings.owner);
    const repo = encodeURIComponent(settings.repo);
    const branch = encodeURIComponent(settings.branch);
    return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  }
  
  function headers(token) {
    const base = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  
    if (token) {
      base.Authorization = `Bearer ${token}`;
    }
  
    return base;
  }
  
  async function githubError(response, fallback) {
    try {
      const data = await response.json();
      const message = data.message ? `${fallback}: ${data.message}` : fallback;
      return `${message} (${response.status})`;
    } catch {
      return `${fallback} (${response.status})`;
    }
  }
  
  function decodeBase64(value) {
    const binary = atob(String(value).replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  
  function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  

  // js/ui.js
  
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
  
  function initUI(element) {
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
  

  // js/main.js
  
  const appRoot = document.querySelector("#app");
  
  if (!appRoot) {
    throw new Error("Корневой элемент приложения не найден");
  }
  
  initUI(appRoot);
  

})();
