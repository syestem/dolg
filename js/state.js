import {
  createAuditRecord,
  describeChanges,
  describeCreated,
  describeDeleted
} from "./audit.js";

const STORAGE_KEY = "debt-tracker-state-v1";
const SYNC_SETTINGS_KEY = "debt-tracker-github-sync-v1";

const DEFAULT_DICTIONARIES = {
  categories: ["Кредитная карта", "Потребительский кредит", "Рассрочка", "Займ"],
  holders: ["Сбербанк", "Т-Банк", "Альфа-Банк"]
};

let state = loadState();
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveNow() {
  saveState();
  notify();
}

export function getSyncSettings() {
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

export function saveSyncSettings(settings) {
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

export function exportState() {
  return JSON.stringify(state, null, 2);
}

export function addDebt(input) {
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

export function updateDebt(id, input) {
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

export function deleteDebt(id) {
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

export function setDebtStatus(id, status) {
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

export function addEntry(input) {
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

export function updateEntry(id, input) {
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

export function deleteEntry(id) {
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

export function addDictionaryItem(kind, value) {
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

export function renameDictionaryItem(kind, oldValue, newValue) {
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

export function deleteDictionaryItem(kind, value) {
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

export function importStateFromJson(raw, mode = "replace", source = "Импорт JSON") {
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

export function recordGithubAction(action, details = []) {
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
