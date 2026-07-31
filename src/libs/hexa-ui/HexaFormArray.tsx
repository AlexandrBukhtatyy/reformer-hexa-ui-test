/**
 * Мост «нода-массив JSON-схемы (`$component(FormArray)`) → редактируемая секция на hexa-ui».
 *
 * Аналога в hexa-ui нет: `Repeater` умеет только раскладывать готовый массив данных, без
 * add/remove/reorder и без привязки к форме. Поэтому хром (карточки, кнопки, пустое состояние)
 * собран здесь, а вся работа с данными делегирована рендереру.
 *
 * Контракт инъекции у узла-массива с `component` другой, чем у контейнера: рендерер зовёт
 * `<Component array item initialValue fieldWrapper {...componentProps} />` — без `children` и без
 * `selector` (у него нет DOM, чтобы что-то утекло).
 *
 * Итерацию НЕ пишем руками: `useModelArrayItems` подписывается на структурные изменения массива
 * (add/remove/reorder) и кэширует поддерево `item(model)` по идентичности под-модели. Кэш здесь —
 * не оптимизация, а корректность: свежий `item(model)` на каждый рендер даёт новый тип узла,
 * React размонтирует поддерево, и поле теряет фокус на каждом нажатии клавиши.
 */

import type { ComponentType, ReactNode } from 'react';
import { ActionButton, Button, Placeholder, Space, Text } from '@kaspersky/hexa-ui';
import { ArrowDownMicro, ArrowUpMicro } from '@kaspersky/hexa-ui-icons/16';
import {
  resolveInitialValue,
  useModelArrayItems,
  type FieldWrapperProps,
  type RenderModelArrayControl,
  type RenderNode,
} from '@reformer/renderer-react';
import { HexaCard } from './HexaCard';

export interface HexaFormArrayProps {
  /** Реактивный массив модели. Инъектит рендерер. */
  array: RenderModelArrayControl;
  /** Фабрика поддерева элемента. Инъектит рендерер. */
  item: (itemModel: unknown) => RenderNode<unknown>;
  /** Значение нового элемента: литерал или фабрика `() => value`. Инъектит рендерер. */
  initialValue?: unknown;
  /** Обёртка полей (`FIELD_WRAPPER`). Инъектит рендерер. */
  fieldWrapper?: ComponentType<FieldWrapperProps>;
  /** Заголовок секции. Задан — кнопка «Добавить» уезжает в шапку. */
  title?: string;
  /** Метка элемента: строка-префикс либо `(model, index) => string` (из `$dataSource(...)`). */
  itemLabel?: string | ((itemModel: unknown, index: number) => string);
  addButtonLabel?: string;
  removeButtonLabel?: string;
  /** Текст пустого состояния. Не задан — пустое состояние не рисуется. */
  emptyMessage?: string;
  /** Пояснение под текстом пустого состояния. */
  emptyMessageHint?: string;
  /** Кнопки ↑/↓ перестановки. */
  reorderable?: boolean;
  /** Показывать «Удалить», когда остался один элемент. */
  showRemoveOnSingle?: boolean;
  className?: string;
}

export function HexaFormArray({
  array,
  item,
  initialValue,
  fieldWrapper,
  title,
  itemLabel,
  addButtonLabel = '+ Добавить',
  removeButtonLabel = 'Удалить',
  emptyMessage,
  emptyMessageHint,
  reorderable = false,
  showRemoveOnSingle = false,
  className,
}: HexaFormArrayProps) {
  const items = useModelArrayItems(array, item, fieldWrapper);
  const count = items.length;

  const resolveItemLabel = (itemModel: unknown, index: number): string =>
    typeof itemLabel === 'function'
      ? itemLabel(itemModel, index)
      : `${itemLabel ?? title ?? 'Элемент'} #${index + 1}`;

  const addButton: ReactNode = (
    <Button
      mode="secondary"
      size="small"
      type="button"
      text={addButtonLabel}
      // `initialValue` бывает фабрикой — иначе все элементы делили бы один объект.
      onClick={() => array.push(resolveInitialValue(initialValue))}
      testId="array-add"
    />
  );

  return (
    <section className={className}>
      {/* align="stretch": по умолчанию Space центрирует детей, и поля формы съёжились бы по контенту. */}
      <Space direction="vertical" gap="grouped" align="stretch">
        {title ? (
          <Space direction="horizontal" justify="space-between" align="center">
            <Text type="H5" htmlTag="h3">
              {title}
            </Text>
            {addButton}
          </Space>
        ) : null}

        {items.map(({ key, index, model, element }) => (
          // key — по идентичности под-модели, а не по индексу: при удалении и перестановке
          // индексы сдвигаются, и React переиспользовал бы состояние чужого элемента.
          <HexaCard key={key} mode="filled" testId={`array-item-${index}`}>
            <Space direction="vertical" gap="grouped" align="stretch">
              {/* Без заголовка и без itemLabel шапка элемента не нужна — так же ведёт себя ui-kit. */}
              {title || itemLabel ? (
                <Space direction="horizontal" justify="space-between" align="center">
                  <Text type="H6" htmlTag="h4">
                    {resolveItemLabel(model, index)}
                  </Text>
                  <Space direction="horizontal" gap="related" align="center" wrap="nowrap">
                    {reorderable ? (
                      <>
                        <ActionButton
                          size="small"
                          icon={<ArrowUpMicro />}
                          aria-label="Переместить вверх"
                          disabled={index === 0}
                          onClick={() => array.move(index, index - 1)}
                          testId={`array-item-${index}-move-up`}
                        />
                        <ActionButton
                          size="small"
                          icon={<ArrowDownMicro />}
                          aria-label="Переместить вниз"
                          disabled={index === count - 1}
                          onClick={() => array.move(index, index + 1)}
                          testId={`array-item-${index}-move-down`}
                        />
                      </>
                    ) : null}
                    {showRemoveOnSingle || count > 1 ? (
                      <Button
                        mode="dangerOutlined"
                        size="small"
                        type="button"
                        text={removeButtonLabel}
                        onClick={() => array.removeAt(index)}
                        testId={`array-item-${index}-remove`}
                      />
                    ) : null}
                  </Space>
                </Space>
              ) : null}
              {element}
            </Space>
          </HexaCard>
        ))}

        {count === 0 && emptyMessage ? (
          <Placeholder mode="filled" size="small" title={emptyMessage} description={emptyMessageHint} />
        ) : null}

        {/* Без шапки кнопка «Добавить» — единственная точка входа, поэтому уходит под список. */}
        {title ? null : addButton}
      </Space>
    </section>
  );
}
