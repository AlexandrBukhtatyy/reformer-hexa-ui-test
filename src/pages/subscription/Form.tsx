/**
 * Форма «subscription» — многошаговая заявка на @reformer/renderer-json + @kaspersky/hexa-ui.
 * Демонстрация реестра: Wizard/Step, Card, SectionMessage, Radio, Text, Heading, Textbox.
 *
 * Обязанности разведены так же, как в форме «registration»:
 * - [form.json]          — весь layout, включая шаги wizard'а (`componentProps.steps`);
 * - [form.model.ts]      — тип данных и initial-значения;
 * - [form.selectors.ts]  — якоря схемы: ими адресуются и ноды в поведении, и шаги в валидации;
 * - [form.validation.ts] — правила по шагам + контракт `validateStep`/`validateAll`;
 * - [form.behavior.ts]   — реактивность модели (`createForm({ behavior })`);
 * - [ui.behavior.ts]     — render-behavior: инъекция валидации и обработчиков в узел `wizard`.
 *
 * Сборка модели, формы и render-behavior — общая: `libs/reformer/useJsonForm`.
 *
 * Отличие от «registration»: кнопок отправки здесь нет — навигацией, валидацией шага и submit'ом
 * управляет сам wizard, страница лишь отдаёт ему обработчики и показывает статус.
 */

import { useCallback } from 'react';
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
import { createFormUiBehavior } from './ui.behavior';

const subscriptionJsonSchema = asJsonFormSchema(rawJsonSchema);

/**
 * Всё, что нужно форме, кроме её внешнего вида: модель, обработчики wizard'а и статус отправки.
 */
function useSubscriptionForm() {
  const { status, setStatus, run } = useFormStatus();

  // Обработчики замыкаются на `model`/`form` ИЗ АРГУМЕНТА фабрики, а не на результат `useJsonForm`:
  // так у фабрики нет зависимостей, кроме стабильных `run` и `setStatus`, и render-behavior не
  // пересобирается ни на одном рендере.
  const ui = useCallback<UiBehaviorFactory<FormShape>>(
    ({ model, form }) =>
      createFormUiBehavior({
        model,
        form,
        onFinish: () => {
          // Валидацию шага и всей формы wizard уже прогнал — здесь осталась бы отправка на сервер.
          // `run` держит guard «одна отправка за раз».
          void run(() =>
            setStatus({ kind: 'success', text: `Заявка отправлена: ${model.summary}` }),
          );
        },
        onInvalid: () => {
          setStatus({ kind: 'error', text: 'Проверьте выделенные поля на предыдущих шагах' });
        },
        onCancel: () => {
          // Значения принадлежат модели, UI-состояние — форме: чистим порознь.
          model.reset();
          form.clearErrors();
          form.markAsUntouched();
          setStatus(null);
        },
      }),
    [run, setStatus],
  );

  const { model, renderBehavior } = useJsonForm<FormShape>({
    schema: subscriptionJsonSchema,
    initial: initialFormModel,
    behavior: formBehavior,
    ui,
  });

  return { model, renderBehavior, status };
}

export default function Form() {
  const { model, renderBehavior, status } = useSubscriptionForm();

  return (
    <FormLayout>
      <JsonFormRenderer<FormShape>
        schema={subscriptionJsonSchema}
        model={model}
        renderBehavior={renderBehavior}
        validateSchema={import.meta.env.DEV}
      />

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
