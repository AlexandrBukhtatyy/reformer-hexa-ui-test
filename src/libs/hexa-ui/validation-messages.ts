/**
 * Тексты ошибок валидации: точка i18n для всех форм приложения.
 */

import type { ValidationErrorResolver } from '@reformer/cdk';

/**
 * Тексты по кодам валидаторов. Валидаторы из `@reformer/core/validators` без явного `message`
 * кладут в ошибку пустую строку либо `'invalid'` — без таблицы поле показало бы пользователю
 * именно это.
 */
const VALIDATION_MESSAGES: Record<string, (params?: Record<string, unknown>) => string> = {
  required: () => 'Обязательное поле',
  email: () => 'Введите корректный email',
  minLength: (p) => `Минимум ${p?.minLength} символов`,
  maxLength: (p) => `Максимум ${p?.maxLength} символов`,
};

/**
 * Явный текст из схемы валидации (`required({ message: 'Укажите имя' })`) важнее таблицы, поэтому
 * готовый `createMessageResolver` не подходит: он ключуется по коду и такой текст бы перетёр.
 */
export const resolveValidationMessage: ValidationErrorResolver = (error) => {
  const explicit = error.message && error.message !== 'invalid' ? error.message : undefined;
  return explicit ?? VALIDATION_MESSAGES[error.code]?.(error.params) ?? error.code;
};
