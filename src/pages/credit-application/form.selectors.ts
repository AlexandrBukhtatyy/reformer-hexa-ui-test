/**
 * Якоря схемы кредитной заявки — `selector`'ы нод из `form.json`, по которым к дереву обращается
 * поведение.
 *
 * Зачем список: `schema.node("wizrd")` — валидный TypeScript и молчаливый no-op (нода не нашлась,
 * правило просто не навесилось), а `hideWhen` на несуществующей ноде оставляет секцию видимой без
 * единой жалобы. Здесь адреса собраны в один кортеж, `ui.behavior.ts` берёт их только отсюда,
 * `validation.ts` — из того же union'а, и опечатка становится ошибкой компиляции. На дисциплине
 * остаётся ровно одно: список должен совпадать с `form.json` — правим их вместе.
 */

export const CREDIT_SELECTORS = [
  // Корень: загрузка заявки и справочников.
  "data-boundary",
  "wizard",
  // Шаги визарда: этими же ключами адресуются правила в validation.ts.
  "loan-step",
  "personal-step",
  "contacts-step",
  "employment-step",
  "additional-step",
  "confirm-step",
  // Условные секции (см. hideWhen в ui.behavior.ts).
  "mortgage-section",
  "car-section",
  "residence-address-section",
  "employer-section",
  "business-section",
  "income-section",
  "unemployed-warning",
  "properties-array",
  "existing-loans-array",
  "co-borrowers-array",
] as const;

/** Union якорей — им сужается `schema.node(...)` в поведении и ключи шагов в валидации. */
export type CreditSelector = (typeof CREDIT_SELECTORS)[number];
