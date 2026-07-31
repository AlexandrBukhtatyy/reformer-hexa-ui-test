/**
 * Форма «subscription» — многошаговая заявка на @reformer/renderer-json + @kaspersky/hexa-ui.
 * Демонстрация реестра: Wizard/Step, Card, SectionMessage, Radio, Text, Heading, Textbox.
 *
 * Обязанности разведены так же, как в форме «registration»:
 * - [form.json]      — весь layout, включая шаги wizard'а (`componentProps.steps`);
 * - [model.ts]       — тип данных и initial-значения;
 * - [validation.ts]  — правила по шагам + контракт `validateStep`/`validateAll`;
 * - [behavior.ts]    — реактивность модели (`createForm({ behavior })`);
 * - [ui.ts]          — render-behavior: инъекция валидации и обработчиков в узел `wizard`.
 *
 * Отличие от «registration»: кнопок отправки здесь нет — навигацией, валидацией шага и submit'ом
 * управляет сам wizard, страница лишь отдаёт ему обработчики и показывает статус.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { createForm, createModel } from '@reformer/core';
import { JsonFormRenderer, convertJsonToM1Tree, type JsonFormSchema } from '@reformer/renderer-json';
import { FormLayout } from '../../layouts/FormLayout';
import { hexaRegistry } from '../../libs/hexa-ui';
import rawJsonSchema from './form.json';
import { formBehavior } from './behavior';
import { initialFormModel, type FormShape } from './model';
import { createFormUiBehavior } from './ui';

// Операторы в чистом JSON типизируются как `string` — приведение и есть сценарий
// «схема пришла строкой с сервера».
const subscriptionJsonSchema = rawJsonSchema as unknown as JsonFormSchema;

interface FormStatus {
  kind: 'success' | 'error';
  text: string;
}

/**
 * Всё, что нужно форме, кроме её внешнего вида: модель, обработчики wizard'а и статус отправки.
 */
function useSubscriptionForm() {
  // Один раз: пересборка создала бы новую модель, и форма теряла бы введённое на каждый рендер.
  const { model, form } = useMemo(() => {
    const model = createModel<FormShape>({ ...initialFormModel });
    // Форма строится из ТОЙ ЖЕ JSON-схемы: конвертер биндит листья к сигналам модели.
    // Листья шагов лежат в `componentProps.steps`, но обход схемы находит и их.
    const form = createForm<FormShape>({
      model,
      schema: convertJsonToM1Tree(subscriptionJsonSchema, hexaRegistry, model),
      behavior: formBehavior,
    });

    return { model, form };
  }, []);

  const [status, setStatus] = useState<FormStatus | null>(null);
  // Флаг в ref: два клика в одном кадре придут из одного рендера, где state ещё не обновился.
  const submittingRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      // Валидацию шага и всей формы wizard уже прогнал — здесь осталась бы отправка на сервер.
      setStatus({ kind: 'success', text: `Заявка отправлена: ${model.summary}` });
    } finally {
      submittingRef.current = false;
    }
  }, [model]);

  const handleInvalid = useCallback(() => {
    setStatus({ kind: 'error', text: 'Проверьте выделенные поля на предыдущих шагах' });
  }, []);

  const handleCancel = useCallback(() => {
    // Значения принадлежат модели, UI-состояние — форме: чистим порознь.
    model.reset();
    form.clearErrors();
    form.markAsUntouched();
    setStatus(null);
  }, [model, form]);

  // Стабильная ссылка обязательна: новый renderBehavior на каждый рендер пересобирал бы схему.
  const uiBehavior = useMemo(
    () =>
      createFormUiBehavior({
        model,
        form,
        onFinish: handleFinish,
        onInvalid: handleInvalid,
        onCancel: handleCancel,
      }),
    [model, form, handleFinish, handleInvalid, handleCancel],
  );

  return { model, status, uiBehavior };
}

export default function Form() {
  const { model, status, uiBehavior } = useSubscriptionForm();

  return (
    <FormLayout model={model}>
      <JsonFormRenderer<FormShape>
        schema={subscriptionJsonSchema}
        renderBehavior={uiBehavior}
        validate={import.meta.env.DEV}
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
