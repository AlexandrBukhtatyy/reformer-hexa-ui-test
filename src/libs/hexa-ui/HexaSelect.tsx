/**
 * Мост «`$component(Select)` из схемы → hexa-ui `Select`».
 *
 * Форма опций совпадает один в один (`{ value, label }`), и emit у hexa-ui тоже value-first
 * (`onChange(value, option)` — рендерер видит только первый аргумент). Расхождений два, оба мелкие:
 *
 * 1. `clearable` (имя из ui-kit) у hexa-ui называется `allowClear`. В этой схеме проп не встречается,
 *    но контракт `$component(Select)` его допускает — переименовываем здесь, а не правим схему.
 * 2. Пустое значение. Модель держит незаполненный select как `''`, а rc-select показывает
 *    placeholder только на `undefined` — иначе в поле висит пустой «выбранный» пункт.
 *    Приведение живёт в адаптере ({@link SELECT_ADAPTER}), потому что выражается декларативно.
 *
 * Как и у остальных контролов, наружу отдаём только известные пропы: рендерер спредит
 * `componentProps` в контрол как есть, а неизвестное antd прокидывает в DOM.
 */

import { Select } from '@kaspersky/hexa-ui';
import type { SelectProps } from '@kaspersky/hexa-ui';
import type { FieldAdapter } from '@reformer/renderer-react';

export interface HexaSelectProps {
  /** Опции: литералом из схемы либо из `$dataSource(...)`/`updateComponentProps` в поведении. */
  options?: SelectProps['options'];
  value?: SelectProps['value'];
  onChange?: SelectProps['onChange'];
  onBlur?: SelectProps['onBlur'];
  placeholder?: SelectProps['placeholder'];
  /** Имя пропа из ui-kit; у hexa-ui это `allowClear`. */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  /** Проставляет рендерер (из `componentProps.testId` либо пути сигнала). */
  'data-testid'?: string;
}

export function HexaSelect({
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  clearable,
  disabled,
  className,
  'data-testid': testId,
}: HexaSelectProps) {
  // Пропы перечислены поимённо: `...rest` протащил бы в DOM всё, что рендерер положил в
  // `componentProps` сверх известного контролу (см. тот же приём в `HexaInput`).
  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      allowClear={clearable}
      disabled={disabled}
      className={className}
      data-testid={testId}
    />
  );
}

/**
 * Seam переводить не нужно (value-first emit), но адаптер обязателен: без него рендерер подмешал бы
 * в контрол проп `control` (ноду формы) и не снял бы `label` — оба утекли бы в DOM.
 *
 * `toValue`/`fromEmit` доводят краевые значения до диалекта rc-select и обратно до модели:
 * `''`/`null` → `undefined` (показать placeholder), очистка → `null` (как отдавал ui-kit).
 */
export const SELECT_ADAPTER: FieldAdapter = {
  strip: ['label'],
  toValue: (value) => (value === null || value === undefined || value === '' ? undefined : value),
  fromEmit: (value) => value ?? null,
};
