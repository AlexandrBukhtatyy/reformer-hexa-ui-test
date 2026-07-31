/**
 * Мост «`$component(InputMask)` из схемы → hexa-ui `Textbox.Masked`».
 *
 * Расходятся и имя пропа, и алфавит маски. ui-kit построен на react-input-mask: маска приходит
 * строкой в `mask`, цифра там — `9`, остальные символы литералы, и маскирование ЧИСТО визуальное
 * (литералы пользователь дописывает сам). hexa-ui под капотом IMask: маска лежит в
 * `maskOptions.mask`, цифра там — `0`, а `9` — обычный литерал, и маскирование настоящее.
 *
 * Схема — общая для обоих ui-kit'ов и не меняется, поэтому перевод `9 → 0` и упаковку в
 * `maskOptions` делает обёртка. Замена всех девяток безопасна: литеральной девятки нет ни в одной
 * из семи масок схемы (единственная литеральная цифра — `7` в `+7 (999) 999-99-99`).
 *
 * Значение остаётся МАСКИРОВАННЫМ (`unmask` не включаем) — именно этого ждут правила валидации
 * (`/^\+7\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$/`, `/^\d{3}-\d{3}$/` и т.д.).
 */

import { useMemo } from 'react';
import { Textbox } from '@kaspersky/hexa-ui';
import type { TextboxMaskedProps } from '@kaspersky/hexa-ui';
import type { FieldAdapter } from '@reformer/renderer-react';
import type { FocusEventHandler } from 'react';

export interface HexaInputMaskProps {
  /** Маска в диалекте ui-kit: `9` — цифра, остальное литералы. */
  mask?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: FocusEventHandler;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Проставляет рендерер (из `componentProps.testId` либо пути сигнала) — доводим до `<input>`. */
  'data-testid'?: string;
}

/** `9` (цифра у react-input-mask) → `0` (цифра у IMask). */
function toImaskPattern(mask: string): string {
  return mask.replace(/9/g, '0');
}

export function HexaInputMask({
  mask,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  className,
  'data-testid': testId,
}: HexaInputMaskProps) {
  // Новый объект `maskOptions` на каждый рендер пересоздавал бы IMask-инстанс вместе с кареткой.
  const maskOptions = useMemo<TextboxMaskedProps['maskOptions']>(
    () => (mask ? { mask: toImaskPattern(mask) } : undefined),
    [mask],
  );

  // Пропы перечислены поимённо: `...rest` протащил бы в DOM всё, что рендерер положил в
  // `componentProps` сверх известного контролу (см. тот же приём в `HexaInput`).
  return (
    <Textbox.Masked
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onBlur={onBlur}
      data-testid={testId}
      maskOptions={maskOptions}
      value={value}
      onChange={(next) => onChange?.(next)}
    />
  );
}

/**
 * Контрол уже value-based, поэтому seam переводить не нужно — адаптер снимает `label` (его рисует
 * `HexaField`) и не даёт рендереру подмешать ноду формы (`control`). `mask` НЕ снимаем: его
 * потребляет обёртка, а `strip` вырезает ключ до попадания в компонент.
 *
 * `toValue` не косметика: `InputMasked` гасит стартовый emit только проверкой
 * `value === undefined && acceptValue === ''`. Отдай мы `''` или `null` — на монтировании прилетел бы
 * `onChange('')` и форма сразу стала бы «изменённой».
 */
export const INPUT_MASK_ADAPTER: FieldAdapter = {
  strip: ['label'],
  toValue: (value) => (value === null || value === undefined || value === '' ? undefined : String(value)),
};
