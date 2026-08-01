/**
 * Доступ витринных компонентов кредитной заявки к форме.
 *
 * В источнике эти компоненты доставали форму через `useFormWizard()` (`@reformer/cdk/form-wizard`).
 * Здесь мастером работает hexa-ui `Wizard`: он не является cdk-овским `FormWizard` и контекст
 * `FormWizardContext` не монтирует, поэтому `useFormWizard()` бросил бы «used outside <FormWizard>».
 *
 * Форму знает только страница (она её и создаёт), а рендерер узлов-компонентов её не прокидывает —
 * значит нужен собственный канал. Контекст выбран вместо `componentProps`, потому что схема
 * копируется из источника байт в байт и дописать в неё проп невозможно.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { FormProxy } from '@reformer/core';
import type { CreditApplicationForm } from './form.types';

/**
 * `null` — маркер «провайдера нет». Отличать его от валидной формы обязательно: без маркера
 * компонент вне провайдера молча читал бы `undefined` и падал бы уже внутри hexa-ui.
 */
const CreditFormContext = createContext<FormProxy<CreditApplicationForm> | null>(null);

export interface CreditFormProviderProps {
  /** Форма заявки. Страница создаёт её один раз, поэтому ссылка стабильна. */
  form: FormProxy<CreditApplicationForm>;
  children?: ReactNode;
}

/**
 * Провайдер вешается страницей ВОКРУГ `JsonFormRenderer` — витринные узлы рендерятся внутри него.
 */
export function CreditFormProvider({ form, children }: CreditFormProviderProps) {
  // Значение не мемоизируем намеренно: сама форма стабильна по ссылке, оборачивать нечего.
  return <CreditFormContext.Provider value={form}>{children}</CreditFormContext.Provider>;
}

/**
 * Форма заявки для витринных компонентов. Бросает вне провайдера — «тихий» fallback здесь хуже
 * падения: компонент показал бы пустые итоги, и ошибку заметили бы только по скриншотам.
 */
export function useCreditForm(): FormProxy<CreditApplicationForm> {
  const form = useContext(CreditFormContext);

  if (form === null) {
    throw new Error(
      'useCreditForm(): компонент отрисован вне <CreditFormProvider>. ' +
        'Оберните <JsonFormRenderer> провайдером на странице кредитной заявки.',
    );
  }

  return form;
}
