/**
 * Мост «лист схемы → контрол hexa-ui»: обёртка поля и адаптер контрола.
 *
 * Рендерер работает с нодами формы и value-based seam'ом (`value` + `onChange(value)`),
 * hexa-ui — со своими пропами. Здесь эти два контракта сводятся, чтобы прикладной код
 * про их различия не знал.
 */

import type { ReactElement } from 'react';
import { useFormField } from '@reformer/cdk/form-field';
import { Field } from '@kaspersky/hexa-ui';
import type { FieldAdapter, FieldWrapperProps } from '@reformer/renderer-react';

/**
 * Статический маркер контрола «подпись рисую сам» — тот же, что читает `FormField` из ui-kit
 * (`checkbox`/`switch` ставят `reformerLayout = 'inline-label'`). Дублировать её сверху нельзя:
 * получится две подписи у одного чекбокса.
 */
function hasInlineLabel(component: unknown): boolean {
  return (component as { reformerLayout?: string } | undefined)?.reformerLayout === 'inline-label';
}

/**
 * Системная обёртка поля (регистрируется под `FIELD_WRAPPER`): рендерер отдаёт сюда ноду формы
 * и уже отрисованный контрол, а label/ошибку берём из ноды и раскладываем в hexa-ui `<Field>`.
 */
export function HexaField({ control, className, testId, children }: FieldWrapperProps) {
  const { state } = useFormField(control);

  const inlineLabel = hasInlineLabel(control.component);
  // `componentProps` — сырой мешок из схемы (`Record<string, unknown>`), а hexa-ui ждёт строку:
  // всё остальное (ReactNode из `$fn`, число) отдали бы вёрстке невалидный проп.
  const { description } = state.componentProps;

  return (
    <Field
      className={className}
      label={inlineLabel ? undefined : state.label}
      labelPosition="top"
      required={state.required}
      control={children as ReactElement}
      description={typeof description === 'string' ? description : undefined}
      message={state.shouldShowError ? state.error : undefined}
      messageMode="error"
      testId={testId}
    />
  );
}

/**
 * `Radio` — это antd `Radio.Group`: значение он отдаёт не аргументом, а DOM-событием
 * (`onChange(event)`). Без перевода в модель уехал бы сам объект события.
 *
 * Тип события берём структурно, чтобы не тянуть в приложение прямую зависимость от antd
 * (он приходит транзитивно через hexa-ui).
 */
export const RADIO_ADAPTER: FieldAdapter = {
  fromEmit: (event) => (event as { target?: { value?: unknown } }).target?.value,
  strip: ['label'],
};
