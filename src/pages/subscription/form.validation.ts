/**
 * Схема валидации формы «subscription» — правила над МОДЕЛЬЮ (не в JSON-схеме формы).
 * Docs: @reformer/core/validation.
 *
 * Форма многошаговая, поэтому правила разложены по шагам: `validateStep` гоняет схему своего шага
 * на «Далее», `validateAll` — их композицию перед «Готово». Обе функции инъектируются в wizard
 * через ui.ts — в JSON рантайм-колбэки не выразить.
 */
import type { FormModel, FormProxy } from "@reformer/core";
import {
  apply,
  defineValidationSchema,
  validate,
  validateModel,
  type ValidationSchema,
} from "@reformer/core/validation";
import { email, minLength, required } from "@reformer/core/validators";
import type { FormShape } from "./form.model";

const planStep = defineValidationSchema<FormShape>(({ model }) => {
  validate(model.$.plan, [required({ message: "Выберите тариф из списка" })]);
  validate(model.$.billing, [
    required({ message: "Выберите периодичность оплаты" }),
  ]);
});

const contactsStep = defineValidationSchema<FormShape>(({ model }) => {
  validate(model.$.contactName, [
    required({ message: "Укажите имя" }),
    minLength(2),
  ]);
  validate(model.$.email, [required(), email()]);
  validate(model.$.company, [required({ message: "Укажите компанию" })]);
});

/** Индекс = номер шага − 1. Последний шаг — сводка, своих правил не несёт. */
const STEP_SCHEMAS: readonly ValidationSchema<FormShape>[] = [
  planStep,
  contactsStep,
];

// Схемы — стабильные module-level const: `validateModel` отменяет устаревший прогон по
// идентичности схемы, инлайн-стрелка каждый раз давала бы новый прогон без дедупликации.
const fullSchema = defineValidationSchema<FormShape>(() =>
  apply(planStep, contactsStep),
);
const emptySchema: ValidationSchema<FormShape> = () => {};

/**
 * Контракт, который читает wizard: `validateStep(step)` на «Далее», `validateAll()` перед «Готово».
 * Обе возвращают `false` → переход не состоится.
 */
export function makeValidationConfig(
  model: FormModel<FormShape>,
  form: FormProxy<FormShape>,
) {
  return {
    validateStep: async (step: number): Promise<boolean> => {
      // Без touched поле с ошибкой её не покажет (`shouldShowError = invalid && (touched || dirty)`),
      // и переход молча заблокировался бы без единой подсветки.
      form.markAsTouched();
      return validateModel(model, STEP_SCHEMAS[step - 1] ?? emptySchema);
    },
    validateAll: (): Promise<boolean> => validateModel(model, fullSchema),
  };
}
