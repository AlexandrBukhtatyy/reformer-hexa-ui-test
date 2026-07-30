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
 * Системная обёртка поля (регистрируется под `FIELD_WRAPPER`): рендерер отдаёт сюда ноду формы
 * и уже отрисованный контрол, а label/ошибку берём из ноды и раскладываем в hexa-ui `<Field>`.
 */
export function HexaField({ control, className, testId, children }: FieldWrapperProps) {
  const { state } = useFormField(control);

  return (
    <Field
      className={className}
      label={state.label}
      labelPosition="top"
      required={state.required}
      control={children as ReactElement}
      message={state.shouldShowError ? state.error : undefined}
      messageMode="error"
      testId={testId}
    />
  );
}

/**
 * `Textbox` — уже value-based (`value` + `onChange(value)`), поэтому переклад seam'а не нужен.
 * Адаптер здесь ради двух вещей: он не подмешивает в контрол проп `control` (ноду формы) и
 * снимает `label` — его рисует обёртка, а в antd-input он утёк бы атрибутом в DOM.
 */
export const TEXTBOX_ADAPTER: FieldAdapter = { strip: ['label'] };
