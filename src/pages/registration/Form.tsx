/**
 * Форма «registration» на @reformer/renderer-json + @kaspersky/hexa-ui.
 *
 * Обязанности разведены по соседним файлам:
 * - [form.json]      — весь layout (может прийти строкой с сервера);
 * - [model.ts]       — тип данных и initial-значения;
 * - [validation.ts]  — правила значений (в JSON-DSL валидаторов нет), гоняются `validateModel`;
 * - [behavior.ts]    — реактивность модели (`createForm({ behavior })`);
 * - [ui.ts]          — render-behavior поверх дерева рендера (hideWhen/patchProps/onInit).
 *
 * Сборка (модель + форма + render-behavior) и статус отправки — общие для всех форм проекта:
 * `libs/reformer/useJsonForm`. Провайдеры и мост к hexa-ui — в `layouts/FormLayout` и
 * `libs/hexa-ui`: страница про них не знает. Своё здесь — только обработчики и разметка.
 */

import { useFormControlValue, type FieldNode } from '@reformer/core';
import { validateModel } from '@reformer/core/validation';
import { Button } from '@kaspersky/hexa-ui';
import { JsonFormRenderer } from '@reformer/renderer-json';
import { FormLayout } from '../../layouts/FormLayout';
import {
  asJsonFormSchema,
  useFormStatus,
  useJsonForm,
  type UiBehaviorFactory,
} from '../../libs/reformer/useJsonForm';
import rawJsonSchema from './form.json';
import { formBehavior } from './form.behavior';
import { initialFormModel, type FormShape } from './form.model';
import { formUiBehavior } from './ui.behavior';
import { formValidation } from './form.validation';

const registrationJsonSchema = asJsonFormSchema(rawJsonSchema);

// Render-behavior этой формы статичен — на модель он не замыкается. Обёртку в фабрику держим
// модульной константой: инлайн-стрелка была бы новой ссылкой на каждый рендер, а на новый
// render-behavior рендерер пересобирает дерево.
const registrationUi: UiBehaviorFactory<FormShape> = () => formUiBehavior;

/**
 * Всё, что нужно форме, кроме её внешнего вида: модель, ноды, состояние отправки и обработчики.
 * Компонент вызывает хук и только раскладывает результат по разметке.
 */
function useRegistrationForm() {
  const { model, form, renderBehavior } = useJsonForm<FormShape>({
    schema: registrationJsonSchema,
    initial: initialFormModel,
    behavior: formBehavior,
    ui: registrationUi,
  });

  const { status, setStatus, pending, run } = useFormStatus();

  const submit = (): void => {
    void run(async () => {
      // Без touched ноды не показывают ошибки — невалидные поля молча не отправились бы.
      form.markAsTouched();
      const valid = await validateModel(model, formValidation);
      setStatus(
        valid
          ? { kind: 'success', text: 'Форма отправлена' }
          : { kind: 'error', text: 'Проверьте выделенные поля' },
      );
    });
  };

  const reset = (): void => {
    // Тот же guard, что у submit (он внутри `run`): иначе хвост незавершённой отправки поставил бы
    // статус уже после очистки, и на пустой форме повисло бы «Проверьте выделенные поля».
    void run(() => {
      // Значения принадлежат модели, UI-состояние — форме: чистим порознь.
      model.reset();
      form.clearErrors();
      form.markAsUntouched();
      setStatus(null);
    });
  };

  return { model, renderBehavior, greetingField: form.greeting, status, pending, submit, reset };
}

/**
 * Отдельный компонент — чтобы пересчёт greeting (а он идёт на каждый символ в «Имя»)
 * перерисовывал только эту строку, а не всю страницу вместе с полями формы.
 */
function Greeting({ control }: { control: FieldNode<string> }) {
  const greeting = useFormControlValue(control);

  return greeting ? <p>{greeting}</p> : null;
}

export default function Form() {
  const { model, renderBehavior, greetingField, status, pending, submit, reset } =
    useRegistrationForm();

  return (
    <FormLayout>
      <JsonFormRenderer<FormShape>
        schema={registrationJsonSchema}
        model={model}
        renderBehavior={renderBehavior}
        validateSchema={import.meta.env.DEV}
      />

      <Greeting control={greetingField} />

      <div className="flex gap-4 mt-4">
        <Button
          text="Отправить"
          mode="primary"
          loading={pending}
          disabled={pending}
          onClick={submit}
        />
        <Button text="Очистить" mode="secondary" disabled={pending} onClick={reset} />
      </div>

      {/* Живой регион присутствует всегда: скринридер объявляет появившийся текст только
          если сам контейнер уже был в DOM к моменту вставки. */}
      <p
        role="status"
        aria-live="polite"
        className={`mt-4 min-h-6 text-sm ${
          status?.kind === 'error' ? 'text-red-700' : 'text-emerald-700'
        }`}
      >
        {status?.text ?? ''}
      </p>
    </FormLayout>
  );
}
