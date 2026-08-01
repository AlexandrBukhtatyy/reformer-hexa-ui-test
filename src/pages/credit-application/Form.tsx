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
 * - [types.ts]          — форма данных;
 * - [model.ts]          — initial-значения модели;
 * - [constants.ts]      — словари для `$dataSource(...)`;
 * - [compute.ts]        — чистые расчёты (ставка, платёж, возраст, доход);
 * - [api.ts]            — моки запросов, форма ответа `{ data, status }`;
 * - [validation.ts]     — правила по шагам + контракт `validateStep`/`validateAll`;
 * - [form.behavior.ts]  — реактивность модели (`createForm({ behavior })`);
 * - [components.tsx]    — витринные блоки шагов 3, 4 и 6;
 * - [ui.behavior.ts]    — render-behavior: загрузка, видимость, навигация, отправка.
 *
 * Своего реестра у страницы нет: и мост, и её витринные блоки со словарями живут в общем
 * `libs/hexa-ui/registry.ts`, который отдаёт `FormLayout`. Провайдер здесь один — контекст формы
 * для витринных блоков: hexa-ui `Wizard` не cdk'шный `FormWizard`, и `useFormWizard()` в нём не работает.
 */

import { useMemo, useState } from 'react';
import { createForm } from '@reformer/core';
import {
  JsonFormRenderer,
  convertJsonToM1Tree,
  type JsonFormSchema,
} from '@reformer/renderer-json';
import { FormLayout } from '../../layouts/FormLayout';
import { hexaRegistry } from '../../libs/hexa-ui';
import { creditApplicationBehavior } from './form.behavior';
import { CreditFormProvider } from './form-context';
import rawJsonSchema from './form.json';
import { createCreditApplicationModel } from './form.model';
import type { CreditApplicationForm } from './form.types';
import { createCreditUiBehavior, type CreditFormStatus } from './ui.behavior';

// Операторы в чистом JSON типизируются как `string` — приведение и есть сценарий
// «схема пришла строкой с сервера».
const creditApplicationJsonSchema = rawJsonSchema as unknown as JsonFormSchema;

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
  // Один раз: пересборка создала бы новую модель, и форма теряла бы введённое.
  const { model, form } = useMemo(() => {
    const model = createCreditApplicationModel();
    // Форма строится из ТОЙ ЖЕ JSON-схемы: конвертер биндит листья к сигналам модели.
    // Листья шагов лежат в `componentProps.steps`, но обход схемы находит и их.
    const form = createForm<CreditApplicationForm>({
      model,
      schema: convertJsonToM1Tree(creditApplicationJsonSchema, hexaRegistry, model),
      behavior: creditApplicationBehavior,
    });

    return { model, form };
  }, []);

  const [status, setStatus] = useState<CreditFormStatus | null>(null);

  // Стабильная ссылка обязательна: новый renderBehavior на каждый рендер пересобирал бы схему.
  // `setStatus` из useState стабилен, поэтому в зависимостях его нет.
  const uiBehavior = useMemo(
    () => createCreditUiBehavior({ model, form, onStatus: setStatus }),
    [model, form],
  );

  return { model, form, status, uiBehavior };
}

export default function Form() {
  const { model, form, status, uiBehavior } = useCreditApplicationForm();

  return (
    <FormLayout>
      {/* Витринные блоки (итоги, предупреждения, копирование адреса) читают форму отсюда:
          hexa-ui `Wizard` — не cdk'шный `FormWizard`, и `useFormWizard()` внутри него не работает. */}
      <CreditFormProvider form={form}>
        <JsonFormRenderer<CreditApplicationForm>
          schema={creditApplicationJsonSchema}
          model={model}
          renderBehavior={uiBehavior}
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
