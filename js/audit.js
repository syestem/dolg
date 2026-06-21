export const ENTITY_LABELS = {
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
  repo: "Репозиторий",
  enabled: "Синхронизация",
  privacyAcknowledged: "Подтверждение риска",
  token: "Токен"
};

const STATUS_LABELS = {
  active: "Активный",
  closed: "Закрытый"
};

const TYPE_LABELS = {
  payment: "Платеж",
  charge: "Начисление"
};

export function createAuditRecord({ id, timestamp, action, entityType, entityId, details }) {
  return {
    id,
    timestamp,
    action,
    entityType,
    entityId,
    details: normalizeDetails(details)
  };
}

export function describeChanges(before, after, fields = Object.keys(after || {})) {
  return fields
    .filter((field) => !sameValue(before?.[field], after?.[field]))
    .map((field) => ({
      field,
      label: FIELD_LABELS[field] || field,
      before: prepareValue(field, before?.[field]),
      after: prepareValue(field, after?.[field])
    }));
}

export function describeCreated(entity, fields = Object.keys(entity || {})) {
  return fields
    .filter((field) => entity?.[field] !== undefined && entity?.[field] !== "")
    .map((field) => ({
      field,
      label: FIELD_LABELS[field] || field,
      before: "не было",
      after: prepareValue(field, entity[field])
    }));
}

export function describeDeleted(entity, fields = Object.keys(entity || {})) {
  return fields
    .filter((field) => entity?.[field] !== undefined && entity?.[field] !== "")
    .map((field) => ({
      field,
      label: FIELD_LABELS[field] || field,
      before: prepareValue(field, entity[field]),
      after: "удалено"
    }));
}

export function formatAuditDetails(details) {
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
