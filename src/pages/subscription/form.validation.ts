/**
 * Схема валидации формы «subscription» — правила над МОДЕЛЬЮ (не в JSON-схеме формы).
 * Docs: @reformer/core/validation.
 *
 * Форма многошаговая, поэтому правила разложены по шагам: `validateStep` гоняет схему своего шага
 * на «Далее», `validateAll` — их композицию перед «Готово». Обе функции инъектируются в wizard
 * через ui.behavior.ts — в JSON рантайм-колбэки не выразить.
 *
 * Шаг адресуется `selector`'ом своей ноды из form.json (см. defineSteps), а не порядковым номером:
 * по номеру вставка шага в середину схемы молча сдвинула бы все правила на один вперёд.
 */
import { defineValidationSchema, validate } from "@reformer/core/validation";
import { email, minLength, required } from "@reformer/core/validators";
import { defineSteps, noStepRules } from "../../libs/reformer/defineSteps";
import type { FormShape } from "./form.model";
import type { FormSelector } from "./form.selectors";

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

/**
 * Контракт, который читает wizard: `validateStep(step)` на «Далее», `validateAll()` перед «Готово».
 * Обе возвращают `false` → переход не состоится.
 *
 * Последний шаг — сводка, своих правил не несёт, и это сказано ЯВНО: пропущенный ключ и шаг без
 * правил раньше выглядели одинаково — валидными.
 */
export const makeValidationConfig = defineSteps<FormShape, FormSelector>({
  steps: {
    "plan-step": planStep,
    "contacts-step": contactsStep,
    "confirm-step": noStepRules,
  },
});
