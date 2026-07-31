/**
 * Мост «`$component(Input)` из схемы → hexa-ui `Textbox`».
 *
 * Расхождение №1 — диспетчеризация по типу. В ui-kit `Input` ОДИН компонент: при `type: "number"`
 * он включает числовой разбор и отдаёт `number | null`, при остальных типах работает со строкой.
 * В hexa-ui это ДВА разных компонента с разным типом значения — `Textbox` (строка) и
 * `Textbox.Number` (число). Схема общая для обоих ui-kit'ов и не меняется, поэтому выбор ветки
 * берёт на себя обёртка.
 *
 * Расхождение №2 — «лишние» пропы. Рендерер спредит `componentProps` в контрол как есть, а
 * hexa-ui/antd прокидывают неизвестное дальше в DOM. Поэтому наружу отдаём только то, что контрол
 * реально понимает: `min`/`max`/`step` осмысленны лишь в числовой ветке (в схеме они и встречаются
 * только рядом с `type: "number"`), в строковой их гасим. Всё, чего нет в {@link HexaInputProps},
 * до контрола не доходит.
 *
 * `type: "date"` намеренно остаётся нативным атрибутом `<input>`, а не `Datepicker`: модель держит
 * ISO-строки (`'YYYY-MM-DD'`), а hexa-ui `Datepicker` работает с объектами dayjs.
 */

import { Textbox } from '@kaspersky/hexa-ui';
import type { FieldAdapter } from '@reformer/renderer-react';
import type { FocusEventHandler } from 'react';

export interface HexaInputProps {
  /** HTML-тип из схемы (`text` по умолчанию). Только `number` уводит в другой компонент. */
  type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'date';
  /** Значение поля. Числовые поля модели пустуют как `null`, строковые — как `''`. */
  value?: string | number | null;
  onChange?: (value: string | number | null) => void;
  onBlur?: FocusEventHandler;
  placeholder?: string;
  /** Границы и шаг — только для числовой ветки (в схеме иначе и не встречаются). */
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** Проставляет рендерер (из `componentProps.testId` либо пути сигнала) — доводим до `<input>`. */
  'data-testid'?: string;
}

/**
 * antd-`InputNumber` типизирует emit как `number | string | undefined`, а в модели поле — число
 * либо `null`. Пустой ввод и мусор сводим к `null`, чтобы `required()` увидел пустоту.
 */
function toModelNumber(emitted: string | number | undefined): number | null {
  if (emitted === null || emitted === undefined || emitted === '') return null;
  const parsed = typeof emitted === 'number' ? emitted : Number(emitted);
  return Number.isNaN(parsed) ? null : parsed;
}

export function HexaInput({
  type,
  value,
  onChange,
  onBlur,
  placeholder,
  min,
  max,
  step,
  disabled,
  className,
  'data-testid': testId,
}: HexaInputProps) {
  // Пропы перечислены поимённо, а не собраны в `...rest`: рендерер спредит в контрол ВСЁ, что лежит
  // в `componentProps`, включая дописанное поведением на лету (`updateComponentProps`). Такой
  // «лишний» проп (например, `options` у поля-подсказки) hexa-ui/antd прокинули бы прямо в DOM.
  const shared = { placeholder, disabled, className, onBlur, 'data-testid': testId };

  if (type === 'number') {
    return (
      <Textbox.Number
        {...shared}
        min={min}
        max={max}
        step={step}
        // Пустое значение отдаём как `undefined`: `null` antd показал бы строкой "null".
        value={value === null || value === undefined || value === '' ? undefined : value}
        allowEmpty
        onChange={(emitted) => onChange?.(toModelNumber(emitted))}
      />
    );
  }

  return (
    <Textbox
      {...shared}
      // `type` hexa-ui не разбирает — он уезжает нативным атрибутом на `<input>`, чем и живут
      // `date` (календарь браузера) и `email` (клавиатура на мобильных).
      type={type}
      // `Textbox` держит значение во внутреннем стейте от `value || ''`; `null` сюда лучше не пускать.
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(emitted) => onChange?.(emitted)}
    />
  );
}

/**
 * Обе ветки `HexaInput` уже value-based (`value` + `onChange(value)`), переводить seam не нужно.
 * Адаптер нужен по двум другим причинам: без него рендерер подмешал бы в контрол проп `control`
 * (ноду формы) — и тот утёк бы в DOM, — и не снял бы `label`, который рисует обёртка `HexaField`.
 */
export const INPUT_ADAPTER: FieldAdapter = { strip: ['label'] };
