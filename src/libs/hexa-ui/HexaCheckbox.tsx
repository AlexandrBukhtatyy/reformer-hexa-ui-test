/**
 * Мост «`$component(Checkbox)` из схемы → hexa-ui `Checkbox`».
 *
 * Расхождение — место подписи. В ui-kit у чекбокса есть проп `label`: контрол сам рисует подпись
 * справа от квадратика, а обёртка поля верхний label не показывает. У hexa-ui пропа `label` нет
 * вовсе — подпись это `children` (строку `Checkbox` сам заворачивает в `FormLabel` с `htmlFor`),
 * а переданный `label` уехал бы атрибутом в DOM. Схема общая и не меняется, поэтому
 * `label → children` перекладывает обёртка.
 *
 * Второе следствие того же расхождения: если бы `HexaField` нарисовал ещё и верхний label, подпись
 * задвоилась бы. Гасим это статическим маркером {@link HexaCheckbox.reformerLayout} — ровно тем же
 * приёмом, что и ui-kit (`FormField` смотрит на `control.component?.reformerLayout`), так что
 * договорённость между обёрткой поля и контролом остаётся одна на оба ui-kit'а.
 */

import { Checkbox } from '@kaspersky/hexa-ui';
import type { CheckboxProps } from '@kaspersky/hexa-ui';
import type { FocusEventHandler, ReactNode } from 'react';
import type { FieldAdapter } from '@reformer/renderer-react';

export interface HexaCheckboxProps {
  /** Подпись из схемы. У hexa-ui это `children`, отдельного пропа нет. */
  label?: ReactNode;
  /** Диалект antd: значение живёт в `checked`, не в `value`. Перекладывает {@link CHECKBOX_ADAPTER}. */
  checked?: CheckboxProps['checked'];
  onChange?: CheckboxProps['onChange'];
  onBlur?: FocusEventHandler;
  disabled?: boolean;
  className?: string;
  /** Проставляет рендерер (из `componentProps.testId` либо пути сигнала). */
  'data-testid'?: string;
}

export function HexaCheckbox({
  label,
  checked,
  onChange,
  onBlur,
  disabled,
  className,
  'data-testid': testId,
}: HexaCheckboxProps) {
  // Пропы перечислены поимённо: `...rest` протащил бы в DOM всё, что рендерер положил в
  // `componentProps` сверх известного контролу (см. тот же приём в `HexaInput`).
  //
  // Приведение — из-за пробела в типах hexa-ui: `onFocus` у чекбокса объявлен, а `onBlur` нет,
  // хотя antd/rc-checkbox прокидывают его на нативный `<input>`. Без blur'а поле не помечалось бы
  // «потроганным», и ошибка обязательного согласия не показалась бы до первого клика.
  const checkboxProps = {
    checked,
    onChange,
    onBlur,
    disabled,
    className,
    'data-testid': testId,
  } as CheckboxProps;

  return <Checkbox {...checkboxProps}>{label}</Checkbox>;
}

/**
 * Маркер для обёртки поля: подпись уже нарисована внутри контрола, верхний label не нужен.
 * Значение и имя пропа повторяют ui-kit — `HexaField` проверяет его так же, как `FormField`.
 */
HexaCheckbox.reformerLayout = 'inline-label';

/**
 * Диалект antd: значение живёт в `checked`, а изменение приходит DOM-событием, а не значением.
 * Без перевода в модель уехал бы сам объект события, а `checked` остался бы пустым.
 *
 * `label` НЕ снимаем — в отличие от прочих контролов его потребляет обёртка, а `strip` вырезал бы
 * ключ до попадания в компонент. Тип события берём структурно, чтобы не тянуть в приложение прямую
 * зависимость от antd (он приходит транзитивно через hexa-ui).
 */
export const CHECKBOX_ADAPTER: FieldAdapter = {
  valueProp: 'checked',
  fromEmit: (event) => Boolean((event as { target?: { checked?: unknown } }).target?.checked),
  toValue: (value) => value ?? false,
};
