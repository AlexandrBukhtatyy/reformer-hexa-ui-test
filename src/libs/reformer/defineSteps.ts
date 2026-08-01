/**
 * Пошаговая валидация визарда: шаг адресуется SELECTOR'ом своей ноды, а не порядковым номером.
 *
 * Индексная адресация (`STEP_SCHEMAS[step - 1] ?? emptySchema`) молчит на любом расхождении со
 * схемой: шаг, вставленный в середину `form.json`, сдвигает все последующие правила на один вперёд,
 * а шаг без правил проходит как валидный — «Далее» пускает дальше, ошибок нет, всё «работает».
 * Здесь связь именная: ключ записи — тот же selector, что стоит у ноды `$component(Step)` в схеме,
 * а страница сужает ключи до своего списка якорей (`form.selectors.ts`), поэтому опечатка и
 * переименование в схеме становятся ошибкой компиляции.
 *
 * Вторая деталь, которую каждый конфиг обязан был помнить сам, — `form.markAsTouched()`. Без него
 * поле с ошибкой её не покажет (`shouldShowError = invalid && (touched || dirty)` в `HexaField`),
 * и переход молча заблокируется без единой подсветки: снаружи это «кнопка не работает». Теперь
 * маркировка внутри, и забыть её негде.
 *
 * Привязка двухфазная — сначала схемы (на модуле страницы), потом модель и форма. Так вышло не для
 * красоты: `validateModel` отменяет устаревший прогон по ИДЕНТИЧНОСТИ пары (model, schema), поэтому
 * композиция всей формы обязана быть стабильной ссылкой, а модель у каждого инстанса своя.
 */

import type { FormModel, FormProxy } from '@reformer/core';
import {
  apply,
  defineValidationSchema,
  validateModel,
  type ValidationSchema,
} from '@reformer/core/validation';

/**
 * Как визард называет шаг: `selector` его ноды плюс 1-based `number`. Номер — не дубль адреса,
 * а fallback: у шага в схеме selector'а может и не быть.
 */
export interface WizardStepRef {
  selector?: string;
  number: number;
}

/** Пара, которую нода визарда ждёт в пропах (`patchProps({ validateStep, validateAll })`). */
export interface WizardValidation {
  /** «Далее»: правила своего шага. `false` — переход не состоится. */
  validateStep: (step: WizardStepRef) => Promise<boolean>;
  /** «Готово»: все шаги + правила уровня формы. */
  validateAll: () => Promise<boolean>;
}

/** Вторая фаза привязки: схемы уже связаны, осталась модель конкретного инстанса страницы. */
export type WizardValidationFactory<T> = (
  model: FormModel<T>,
  form: FormProxy<T>,
) => WizardValidation;

export interface StepsConfig<T, S extends string> {
  /**
   * Правила шагов: ключ — `selector` ноды `$component(Step)` из `form.json`. Тип-параметр `S`
   * задаётся страницей (union её якорей), поэтому ключ вне схемы не скомпилируется.
   */
  steps: Readonly<Partial<Record<S, ValidationSchema<T>>>>;
  /**
   * Правила уровня всей формы (cross-field и warning'и, не принадлежащие ни одному шагу) —
   * попадают только в `validateAll`.
   */
  extras?: ValidationSchema<T>;
}

/**
 * Явное «у этого шага правил нет» — для сводок и подтверждений.
 *
 * Пропущенный ключ и шаг без правил раньше выглядели одинаково (оба «валидны»); теперь первое
 * заметно (в dev — предупреждение), а второе объявлено намеренно.
 */
export const noStepRules = (): void => {};

/**
 * Собирает конфиг валидации визарда из правил по шагам.
 *
 * @example
 * ```ts
 * export const makeValidationConfig = defineSteps<FormShape, FormSelector>({
 *   steps: { 'plan-step': planStep, 'contacts-step': contactsStep, 'confirm-step': noStepRules },
 * });
 * ```
 */
export function defineSteps<T, S extends string>({
  steps,
  extras,
}: StepsConfig<T, S>): WizardValidationFactory<T> {
  // Порядок ключей объекта — порядок объявления: по нему адресуются шаги БЕЗ selector'а.
  const declared = Object.entries(steps).filter(
    (entry): entry is [string, ValidationSchema<T>] => entry[1] !== undefined,
  );
  const bySelector = new Map<string, ValidationSchema<T>>(declared);
  const inOrder = declared.map(([, schema]) => schema);

  // Схемы живут столько же, сколько модуль страницы (см. про идентичность в шапке файла):
  // пересборка на каждый вызов лишала бы `validateModel` дедупликации прогонов.
  const fullSchema = defineValidationSchema<T>(() =>
    apply<T>(...inOrder, ...(extras ? [extras] : [])),
  );
  /** Шаг вне записи: гасит ранее показанные ошибки и не блокирует переход. */
  const emptySchema: ValidationSchema<T> = () => {};

  const schemaFor = ({
    selector,
    number,
  }: WizardStepRef): ValidationSchema<T> | undefined =>
    selector === undefined ? inOrder[number - 1] : bySelector.get(selector);

  return (model, form) => ({
    validateStep: async (step) => {
      const schema = schemaFor(step);

      // Тот самый молчаливый случай: шаг есть в схеме, правил под него нет. Блокировать переход
      // нельзя (ошибок-то не показать), поэтому «валиден» — но в dev об этом слышно.
      if (!schema && import.meta.env.DEV) {
        const address = step.selector ? `"${step.selector}"` : `#${step.number}`;
        console.warn(
          `[defineSteps] Шаг ${address} не объявлен: правила не прогонятся, ` +
            'и «Далее» пропустит его как валидный. Добавьте selector шага в ' +
            'defineSteps({ steps }) — хотя бы с noStepRules.',
        );
      }

      // Без touched поле с ошибкой её не покажет, и переход заблокировался бы без подсветки.
      form.markAsTouched();
      return validateModel(model, schema ?? emptySchema);
    },
    validateAll: async () => {
      // Правила `extras` висят на вычисляемых полях (age/monthlyPayment/…), которых пользователь
      // руками не трогал, — без markAsTouched их ошибки остались бы невидимыми.
      form.markAsTouched();
      return validateModel(model, fullSchema);
    },
  });
}
