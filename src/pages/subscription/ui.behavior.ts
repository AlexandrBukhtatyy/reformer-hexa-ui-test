/**
 * Поведение UI формы «subscription» — декларативные правила над деревом рендера по selector'ам из
 * form.json. Docs: @reformer/renderer-react render-behavior.
 *
 * Здесь же живёт вся связка wizard'а с рантаймом: JSON статичен и рантайм-сущности (валидацию,
 * обработчики) носить не умеет, поэтому они приезжают сюда фабрикой и вешаются на узел `wizard`.
 */
import type { FormModel, FormProxy } from "@reformer/core";
import {
  hideWhen,
  onComponentEvent,
  onInit,
  type RenderBehaviorFn,
} from "@reformer/renderer-react";
import type { FormShape } from "./form.model";
import { makeValidationConfig } from "./form.validation";

export interface FormUiBehaviorDeps {
  model: FormModel<FormShape>;
  form: FormProxy<FormShape>;
  /** «Готово» на последнем шаге: валидацию wizard к этому моменту уже прогнал. */
  onFinish: () => void;
  /** Форма не прошла `validateAll` — wizard просто не пустит дальше, сказать об этом некому. */
  onInvalid: () => void;
  /** «Отмена» в футере wizard'а. */
  onCancel: () => void;
}

export function createFormUiBehavior({
  model,
  form,
  onFinish,
  onInvalid,
  onCancel,
}: FormUiBehaviorDeps): RenderBehaviorFn<FormShape> {
  return (schema) => {
    const wizard = schema.node("wizard");
    const { validateStep, validateAll } = makeValidationConfig(model, form);

    // onInit — единственный хук, чьи пропы попадают уже в первый рендер.
    onInit(wizard, () => {
      wizard.patchProps({
        validateStep,
        // Провал validateAll оставляет пользователя на последнем шаге, а подсвеченные поля
        // остались на предыдущих — без текста это выглядит как «кнопка не работает».
        validateAll: async () => {
          const valid = await validateAll();
          if (!valid) onInvalid();
          return valid;
        },
      });
    });

    // Проп-события компонента: обработчик получает ровно те же аргументы, что и исходный проп.
    onComponentEvent(wizard, "onFinish", onFinish);
    // Кнопка «Отмена» появляется в футере только вместе с обработчиком.
    onComponentEvent(wizard, "onCancel", onCancel);

    // Условная секция — реактивно по сигналу формы (сигнал читается целиком).
    hideWhen(
      schema.node("promo-card"),
      () => form.billing.value.value !== "yearly",
    );
  };
}
