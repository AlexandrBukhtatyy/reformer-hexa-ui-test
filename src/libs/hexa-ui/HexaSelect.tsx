/**
 * Мост «`$component(Select)` из схемы → hexa-ui `Select`».
 *
 * Форма опций совпадает один в один (`{ value, label }`), и emit у hexa-ui тоже value-first
 * (`onChange(value, option)` — рендерер видит только первый аргумент). Расхождений три:
 *
 * 1. `clearable` (имя из ui-kit) у hexa-ui называется `allowClear`. В этой схеме проп не встречается,
 *    но контракт `$component(Select)` его допускает — переименовываем здесь, а не правим схему.
 * 2. Пустое значение. Модель держит незаполненный select как `''`, а rc-select показывает
 *    placeholder только на `null`/`undefined`. Отдаём `null`: на `undefined` hexa-ui подставляет
 *    СВОЮ копию последнего выбора (`preparedValue = raw !== undefined ? raw : valueInternal`),
 *    и программный сброс поля не доехал бы до экрана — в модели пусто, а в поле старый вариант.
 * 3. Опции, приезжающие в рантайме. Поведение зовёт `updateComponentProps({ options })`
 *    (например, модели авто по выбранной марке), но рендерер спредит в контрол пропы из СХЕМЫ —
 *    рантайм-обновления живут на НОДЕ ФОРМЫ. Поэтому этот контрол — единственный, кто работает
 *    без {@link FieldAdapter}: без адаптера рендерер отдаёт ноду пропом `control`, и мы читаем
 *    её реактивно. Плата за это — `label` больше не снимается адаптером, поэтому гасим его сами.
 *
 * Как и у остальных контролов, наружу отдаём только известные пропы: рендерер спредит
 * `componentProps` в контрол как есть, а неизвестное antd прокидывает в DOM.
 */

import { Select } from '@kaspersky/hexa-ui';
import type { SelectProps } from '@kaspersky/hexa-ui';
import { useFormControl, type FieldNode } from '@reformer/core';

/**
 * Фильтр поиска. Свой, а не встроенный: rc-select по умолчанию ищет по `value`, а там лежат коды
 * (`moscow`, `sberbank`, `toyota`) — набранное «Моск» не нашло бы ничего. Штатная альтернатива
 * `optionFilterProp: 'label'` работает только пока label — строка; функция переживёт и ReactNode.
 */
const filterByLabel = (input: string, option?: { label?: unknown }): boolean =>
  String(option?.label ?? '')
    .toLowerCase()
    .includes(input.trim().toLowerCase());

export interface HexaSelectProps {
  /** Опции из схемы: литералом либо через `$dataSource(...)`. */
  options?: SelectProps['options'];
  /**
   * Поиск по списку — то, что превращает выпадающий список в комбобокс.
   * Включается точечно из схемы: коротким перечислениям строка поиска только мешает,
   * а на мобильных ещё и поднимает клавиатуру на каждое открытие.
   */
  showSearch?: boolean;
  /**
   * Текст пустого списка. Нужен полям с рантайм-опциями: пока источник не выбран, опций нет,
   * и дефолтное «No data» ничего не объясняет («Сначала выберите марку» — объясняет).
   */
  notFoundContent?: SelectProps['notFoundContent'];
  value?: string | null;
  /** Рендерер даёт value-based seam; второй аргумент hexa-ui (`option`) колбэк отбрасывает сам. */
  onChange?: (value: string | null) => void;
  onBlur?: SelectProps['onBlur'];
  placeholder?: SelectProps['placeholder'];
  /** Имя пропа из ui-kit; у hexa-ui это `allowClear`. */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  /** Нода формы. Приходит от рендерера, потому что у контрола нет адаптера (см. шапку файла). */
  control?: FieldNode<string>;
  /** Подпись рисует обёртка поля; здесь проп только гасится, чтобы не утёк в DOM. */
  label?: string;
  /** Проставляет рендерер (из `componentProps.testId` либо пути сигнала). */
  'data-testid'?: string;
}

/** Часть без ноды формы: чистый контрол на пропах. */
function PlainSelect({
  options,
  showSearch,
  notFoundContent,
  value,
  onChange,
  onBlur,
  placeholder,
  clearable,
  disabled,
  className,
  'data-testid': testId,
}: Omit<HexaSelectProps, 'control' | 'label'>) {
  return (
    <Select
      options={options}
      showSearch={showSearch}
      // Фильтр ставим только вместе с поиском: без `showSearch` он мёртв, а лишний проп у antd
      // имеет шанс уехать в DOM.
      filterOption={showSearch ? (filterByLabel as SelectProps['filterOption']) : undefined}
      notFoundContent={notFoundContent}
      // `''` → `null`: иначе в поле висит пустой «выбранный» пункт вместо placeholder.
      // Каст нужен из-за типов hexa-ui: `null` они не объявляют, хотя rc-select именно его
      // трактует как «показать placeholder» (а на `undefined` подставляет свой прошлый выбор).
      value={(value === '' || value === undefined ? null : value) as SelectProps['value']}
      onChange={(next) => onChange?.((next as string | undefined) ?? null)}
      onBlur={onBlur}
      placeholder={placeholder}
      allowClear={clearable}
      disabled={disabled}
      className={className}
      data-testid={testId}
    />
  );
}

/** Часть с нодой: опции берём из неё — там же оседают рантайм-обновления поведения. */
function BoundSelect({ control, options, ...rest }: HexaSelectProps & { control: FieldNode<string> }) {
  const { componentProps } = useFormControl(control);
  const runtimeOptions = (componentProps as { options?: SelectProps['options'] } | undefined)?.options;

  return <PlainSelect {...rest} options={runtimeOptions ?? options} />;
}

export function HexaSelect({ control, label: _label, ...rest }: HexaSelectProps) {
  // Ветка выбирается по наличию ноды и не меняется за жизнь поля, поэтому ремонта поддерева нет.
  return control ? <BoundSelect control={control} {...rest} /> : <PlainSelect {...rest} />;
}
