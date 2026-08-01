/**
 * Форма «credit-application» — кредитная заявка в шесть шагов на @reformer/renderer-json
 * и @kaspersky/hexa-ui.
 *
 * Главный тезис демо: JSON-схема скопирована из примера на @reformer/ui-kit БАЙТ В БАЙТ,
 * подменён только реестр. Поэтому в `form.json` живут ui-kit'овские имена (`Input`, `FormArray`,
 * `RendererFormWizard`), а реестр отдаёт на них компоненты hexa-ui.
 *
 * Обязанности разведены так же, как в «registration» и «subscription»:
 * - [form.json]      — весь layout, включая шаги wizard'а (`componentProps.steps`);
 * - [types.ts]       — форма данных;
 * - [model.ts]       — initial-значения модели;
 * - [constants.ts]   — словари для `$dataSource(...)`;
 * - [compute.ts]     — чистые расчёты (ставка, платёж, возраст, доход);
 * - [api.ts]         — моки запросов, форма ответа `{ data, status }`;
 * - [validation.ts]  — правила по шагам + контракт `validateStep`/`validateAll`;
 * - [behavior.ts]    — реактивность модели (`createForm({ behavior })`);
 * - [components.tsx] — витринные блоки шагов 3, 4 и 6;
 * - [registry.ts]    — мост hexa-ui + витринные компоненты + `$dataSource`;
 * - [ui.ts]          — render-behavior: загрузка, видимость, навигация, отправка.
 *
 * Провайдеров здесь два поверх общего `FormLayout`: собственный `JsonRendererProvider` с реестром
 * страницы (в общий реестр её словари не выносим) и контекст формы для витринных компонентов —
 * hexa-ui `Wizard` не cdk'шный `FormWizard`, и `useFormWizard()` внутри него не работает.
 */

import { useMemo, useState } from 'react';
import { createForm } from '@reformer/core';
import {
  JsonFormRenderer,
  JsonRendererProvider,
  convertJsonToM1Tree,
  type JsonFormSchema,
  type JsonRendererSettings,
} from '@reformer/renderer-json';
import { FormLayout } from '../../layouts/FormLayout';
import { resolveFieldAdapter } from '../../libs/hexa-ui';
import { creditApplicationBehavior } from './form.behavior';
import { CreditFormProvider } from './form-context';
import rawJsonSchema from './form.json';
import { createCreditApplicationModel } from './model';
import { createCreditRegistry } from './registry';
import type { CreditApplicationForm } from './types';
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
 * Всё, что нужно форме, кроме её внешнего вида: реестр, модель, поведение рендера и статус отправки.
 */
function useCreditApplicationForm() {
  // Один раз: реестр обязан быть стабильным по ссылке — иначе на каждый рендер получались бы
  // новые типы компонентов, и React ремонтировал бы всё поддерево формы.
  const registry = useMemo(() => createCreditRegistry(), []);

  // Тоже один раз: пересборка создала бы новую модель, и форма теряла бы введённое.
  const { model, form } = useMemo(() => {
    const model = createCreditApplicationModel();
    // Форма строится из ТОЙ ЖЕ JSON-схемы: конвертер биндит листья к сигналам модели.
    // Листья шагов лежат в `componentProps.steps`, но обход схемы находит и их.
    const form = createForm<CreditApplicationForm>({
      model,
      schema: convertJsonToM1Tree(creditApplicationJsonSchema, registry, model),
      behavior: creditApplicationBehavior,
    });

    return { model, form };
  }, [registry]);

  const [status, setStatus] = useState<CreditFormStatus | null>(null);

  // Стабильная ссылка обязательна: новый renderBehavior на каждый рендер пересобирал бы схему.
  // `setStatus` из useState стабилен, поэтому в зависимостях его нет.
  const uiBehavior = useMemo(
    () => createCreditUiBehavior({ model, form, onStatus: setStatus }),
    [model, form],
  );

  // Реестр страницы важнее общего: внутренний провайдер сливается с внешним, и при совпадении
  // имён выигрывает внутренний. `resolveFieldAdapter` тот же — адаптеры ключуются по ссылке
  // на компонент, а компоненты у обоих реестров одни и те же.
  const rendererSettings = useMemo<JsonRendererSettings>(
    () => ({ registry, resolveFieldAdapter }),
    [registry],
  );

  return { model, form, status, uiBehavior, rendererSettings };
}

export default function Form() {
  const { model, form, status, uiBehavior, rendererSettings } = useCreditApplicationForm();

  return (
    <FormLayout>
      <JsonRendererProvider settings={rendererSettings}>
        {/* Витринные блоки (итоги, предупреждения, копирование адреса) читают форму отсюда. */}
        <CreditFormProvider form={form}>
          <JsonFormRenderer<CreditApplicationForm>
            schema={creditApplicationJsonSchema}
            model={model}
            renderBehavior={uiBehavior}
            validateSchema={import.meta.env.DEV}
          />
        </CreditFormProvider>
      </JsonRendererProvider>

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
