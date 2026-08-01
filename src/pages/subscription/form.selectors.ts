/**
 * Якоря схемы «subscription» — `selector`'ы нод из `form.json`, по которым к дереву обращается
 * поведение.
 *
 * Зачем список: `schema.node("wizrd")` — валидный TypeScript и молчаливый no-op (нода не нашлась,
 * правило просто не навесилось). Здесь адреса собраны в один кортеж, `ui.behavior.ts` берёт их
 * только отсюда, `form.validation.ts` — из того же union'а, и опечатка становится ошибкой
 * компиляции. На дисциплине остаётся ровно одно: список должен совпадать с `form.json` —
 * правим их вместе.
 */

export const FORM_SELECTORS = [
  "wizard",
  // Шаги визарда: этими же ключами адресуются правила в form.validation.ts.
  "plan-step",
  "contacts-step",
  "confirm-step",
  // Поля.
  "plan",
  "billing",
  "contact-name",
  "email",
  "company",
  "promo",
  // Условная секция (см. hideWhen в ui.behavior.ts).
  "promo-card",
] as const;

/** Union якорей — им сужается `schema.node(...)` в поведении и ключи шагов в валидации. */
export type FormSelector = (typeof FORM_SELECTORS)[number];
