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
 * Провайдеры и мост к hexa-ui — в `layouts/FormLayout` и `libs/hexa-ui`: страница про них не знает.
 * Вся сборка и поведение — в `useRegistrationForm`; компонент остаётся чистым представлением.
 */

import { useMemo, useRef, useState } from 'react';
import { createForm, createModel, useFormControlValue, type FieldNode } from '@reformer/core';
import { validateModel } from '@reformer/core/validation';
import { Button } from '@kaspersky/hexa-ui';
import { JsonFormRenderer, convertJsonToM1Tree, type JsonFormSchema } from '@reformer/renderer-json';
import { FormLayout } from '../../layouts/FormLayout';
import { hexaRegistry } from '../../libs/hexa-ui';
import rawJsonSchema from './form.json';
import { formBehavior } from './behavior';
import { initialFormModel, type FormShape } from './model';
import { formUiBehavior } from './ui';
import { formValidation } from './validation';

// Операторы в чистом JSON типизируются как `string` — приведение и есть сценарий
// «схема пришла строкой с сервера».
const registrationJsonSchema = rawJsonSchema as unknown as JsonFormSchema;

interface FormStatus {
  kind: 'success' | 'error';
  text: string;
}

/**
 * Всё, что нужно форме, кроме её внешнего вида: модель, ноды, состояние отправки и обработчики.
 * Компонент вызывает хук и только раскладывает результат по разметке.
 */
function useRegistrationForm() {
  // Один раз: пересборка создала бы новую модель, и форма теряла бы введённое на каждый рендер.
  const { model, form } = useMemo(() => {
    const model = createModel<FormShape>({ ...initialFormModel });
    // Форма строится из ТОЙ ЖЕ JSON-схемы: конвертер биндит листья к сигналам модели.
    // Без этого вызова рендерер не найдёт ноду для сигнала и не отрисует поля.
    const form = createForm<FormShape>({
      model,
      schema: convertJsonToM1Tree(registrationJsonSchema, hexaRegistry, model),
      behavior: formBehavior,
    });

    return { model, form };
  }, []);

  const [status, setStatus] = useState<FormStatus | null>(null);
  const [pending, setPending] = useState(false);
  // Флаг дублируется в ref: два клика в одном кадре придут из одного рендера, где `pending`
  // ещё false, — на одном state такую пару не отсечь.
  const pendingRef = useRef(false);

  const submit = async (): Promise<void> => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);

    try {
      // Без touched ноды не показывают ошибки — невалидные поля молча не отправились бы.
      form.markAsTouched();
      const valid = await validateModel(model, formValidation);
      setStatus(
        valid
          ? { kind: 'success', text: 'Форма отправлена' }
          : { kind: 'error', text: 'Проверьте выделенные поля' },
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const reset = (): void => {
    // Тот же guard, что у submit: иначе хвост незавершённой отправки поставил бы статус
    // уже после очистки, и на пустой форме повисло бы «Проверьте выделенные поля».
    if (pendingRef.current) return;
    // Значения принадлежат модели, UI-состояние — форме: чистим порознь.
    model.reset();
    form.clearErrors();
    form.markAsUntouched();
    setStatus(null);
  };

  return { model, greetingField: form.greeting, status, pending, submit, reset };
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
  const { model, greetingField, status, pending, submit, reset } = useRegistrationForm();

  return (
    <FormLayout>
      <JsonFormRenderer<FormShape>
        schema={registrationJsonSchema}
        model={model}
        renderBehavior={formUiBehavior}
        validateSchema={import.meta.env.DEV}
      />

      <Greeting control={greetingField} />

      <div className="flex gap-4 mt-4">
        <Button
          text="Отправить"
          mode="primary"
          loading={pending}
          disabled={pending}
          onClick={() => void submit()}
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
