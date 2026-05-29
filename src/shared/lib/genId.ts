/**
 * Генерирует уникальный ID.
 * crypto.randomUUID() работает только в secure context (HTTPS).
 * На HTTP (деплой без TLS) используем fallback.
 */
export const genId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};
