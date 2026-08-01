/**
 * Форма «credit-application» — кредитная заявка в шесть шагов на @reformer/renderer-json
 * и @kaspersky/hexa-ui.
 *
 * Схема приехала из примера на @reformer/ui-kit и переведена на имена моста (`Textbox`,
 * `TextboxMasked`, `Radio`, `Uploader`, `Wizard`) — layout при этом не менялся ни на узел.
 * Тезис демо от перевода не пострадал: JSON по-прежнему не знает, каким китом его отрисуют,
 * знает только реестр.
 *
 * Обязанности разведены так же, как в «registration» и «subscription»:
 * - [form.json]         — весь layout, включая шаги wizard'а (`componentProps.steps`);
 * - [form.types.ts]     — форма данных;
 * - [form.model.ts]     — initial-значения модели;
 * - [form.selectors.ts] — якоря схемы: ими адресуются и ноды в поведении, и шаги в валидации;
 * - [constants.ts]      — словари для `$dataSource(...)`;
 * - [compute.ts]        — чистые расчёты (ставка, платёж, возраст, доход);
 * - [api.ts]            — моки запросов, форма ответа `{ data, status }`;
 * - [validation.ts]     — правила по шагам + контракт `validateStep`/`validateAll`;
 * - [form.behavior.ts]  — реактивность модели (`createForm({ behavior })`);
 * - [components.tsx]    — витринные блоки шагов 3, 4 и 6;
 * - [ui.behavior.ts]    — render-behavior: загрузка, видимость, навигация, отправка.
 *
 * Сборка модели, формы и render-behavior — общая: `libs/reformer/useJsonForm`. Своего реестра у
 * страницы нет: и мост, и её витринные блоки со словарями живут в общем `libs/hexa-ui/registry.ts`,
 * который отдаёт `FormLayout`. Провайдер здесь один — контекст формы для витринных блоков: hexa-ui
 * `Wizard` не cdk'шный `FormWizard`, и `useFormWizard()` в нём не работает.
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
import { creditApplicationBehavior } from './form.behavior';
import { CreditFormProvider } from './form-context';
import rawJsonSchema from './form.json';
import { createInitialCreditApplication } from './form.model';
import type { CreditApplicationForm } from './form.types';
import { createCreditUiBehavior, type CreditFormStatus } from './ui.behavior';

const creditApplicationJsonSchema = asJsonFormSchema(rawJsonSchema);

/** Цвет строки статуса: отправка идёт — нейтрально, отказ — красным, приём — зелёным. */
const STATUS_CLASSNAME: Record<CreditFormStatus['kind'], string> = {
  pending: 'text-slate-600',
  success: 'text-emerald-700',
  error: 'text-red-700',
};

/**
 * Всё, что нужно форме, кроме её внешнего вида: модель, поведение рендера и статус отправки.
 *
 * Реестр здесь не собирается: он общий на проект (`hexaRegistry`) и приходит из `FormLayout`
 * через `JsonRendererProvider` — витринные блоки этой формы и её словари зарегистрированы там же.
 */
function useCreditApplicationForm() {
  // Своих kind'ов у заявки три: отправка идёт секунду, и нейтральный `pending` — часть статуса.
  const { status, setStatus } = useFormStatus<CreditFormStatus>();

  // `setStatus` (сеттер useState) стабилен, поэтому стабильна и фабрика — а значит, и
  // render-behavior: на новую функцию рендерер пересобрал бы дерево.
  const ui = useCallback<UiBehaviorFactory<CreditApplicationForm>>(
    ({ model, form }) => createCreditUiBehavior({ model, form, onStatus: setStatus }),
    [setStatus],
  );

  const { model, form, renderBehavior } = useJsonForm<CreditApplicationForm>({
    schema: creditApplicationJsonSchema,
    initial: createInitialCreditApplication,
    behavior: creditApplicationBehavior,
    ui,
  });

  return { model, form, renderBehavior, status };
}

export default function Form() {
  const { model, form, renderBehavior, status } = useCreditApplicationForm();

  return (
    <FormLayout>
      {/* Витринные блоки (итоги, предупреждения, копирование адреса) читают форму отсюда:
          hexa-ui `Wizard` — не cdk'шный `FormWizard`, и `useFormWizard()` внутри него не работает. */}
      <CreditFormProvider form={form}>
        <JsonFormRenderer<CreditApplicationForm>
          schema={creditApplicationJsonSchema}
          model={model}
          renderBehavior={renderBehavior}
          validateSchema={import.meta.env.DEV}
        />
      </CreditFormProvider>

      {/* Живой регион присутствует всегда: скринридер объявляет появившийся текст только
          если сам контейнер уже был в DOM к моменту вставки. */}
      <p
        role="status"
        aria-live="polite"
        className={`mt-4 min-h-6 text-sm ${status ? STATUS_CLASSNAME[status.kind] : ''}`}
      >
        {status?.text ?? ''}
      </p>
    </FormLayout>
  );
}
