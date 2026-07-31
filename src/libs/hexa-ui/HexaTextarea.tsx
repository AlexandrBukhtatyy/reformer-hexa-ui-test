/**
 * Мост «`$component(Textarea)` из схемы → hexa-ui `Textbox.Textarea`».
 *
 * Контракты почти совпадают (`value`/`onChange(value)`/`rows`/`maxLength`/`placeholder`), поэтому
 * обёртка тонкая. Её работа — не пустить в контрол ничего сверх перечисленного: рендерер спредит
 * `componentProps` как есть, а hexa-ui/antd прокидывают неизвестные пропы в DOM.
 *
 * Отдельно: `showCount` намеренно НЕ включаем, хотя схема передаёт `maxLength: 500`. Счётчик у
 * hexa-ui подписан через i18next, а инстанс в приложении не инициализирован — вместо «0/500»
 * пользователь увидел бы ключ `textarea.wordsCount` (та же причина, что у явных подписей кнопок
 * в `HexaWizard`).
 *
 * `rows` из схемы работает: hexa-ui задаёт свой `rows: 3` ДО спреда пропсов, поэтому наш выигрывает.
 */

import { Textbox } from '@kaspersky/hexa-ui';
import type { FieldAdapter } from '@reformer/renderer-react';
import type { FocusEventHandler } from 'react';

export interface HexaTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: FocusEventHandler;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  /** Проставляет рендерер (из `componentProps.testId` либо пути сигнала) — доводим до `<textarea>`. */
  'data-testid'?: string;
}

export function HexaTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  rows,
  maxLength,
  disabled,
  className,
  'data-testid': testId,
}: HexaTextareaProps) {
  // Пропы перечислены поимённо: `...rest` протащил бы в DOM всё, что рендерер положил в
  // `componentProps` сверх известного контролу (см. тот же приём в `HexaInput`).
  return (
    <Textbox.Textarea
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      className={className}
      onBlur={onBlur}
      data-testid={testId}
      value={value}
      onChange={(next) => onChange?.(next)}
    />
  );
}

/**
 * Контрол уже value-based. Адаптер снимает `label` (его рисует `HexaField`) и не даёт рендереру
 * подмешать ноду формы (`control`); `toValue` страхует от `null` — antd на нём ругается в консоль
 * и переключает поле в неуправляемое.
 */
export const TEXTAREA_ADAPTER: FieldAdapter = {
  strip: ['label'],
  toValue: (value) => value ?? '',
};
