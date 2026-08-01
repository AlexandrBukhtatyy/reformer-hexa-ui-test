/**
 * Модель формы «subscription» — тип данных (источник истины) и начальные значения.
 * Импортируется схемами валидации/поведения/UI. Docs: @reformer/core (FormModel<T>).
 */

export interface FormShape {
  /** Радио-группа на первом шаге. */
  plan: string;
  billing: string;
  contactName: string;
  email: string;
  company: string;
  /** Виден только при годовой оплате (правило в ui.behavior.ts). */
  promo: string;
  /** Пример вычисляемого поля (заполняется behavior.ts, показывается на шаге «Подтверждение»). */
  summary: string;
}

/** Начальные значения — для createForm/useFormControl. */
export const initialFormModel: FormShape = {
  plan: '',
  billing: 'monthly',
  contactName: '',
  email: '',
  company: '',
  promo: '',
  summary: '',
};

/**
 * Подписи вариантов для вычисляемой сводки. Дублируют `options` из form.json намеренно:
 * layout (что видит пользователь в Radio) живёт в схеме, а поведение — в TS; тянуть одно
 * из другого нечем — JSON не импортирует модули, TS не читает схему.
 */
export const PLAN_LABELS: Record<string, string> = {
  basic: 'Базовый',
  team: 'Командный',
  enterprise: 'Корпоративный',
};

export const BILLING_LABELS: Record<string, string> = {
  monthly: 'ежемесячно',
  yearly: 'раз в год',
};
