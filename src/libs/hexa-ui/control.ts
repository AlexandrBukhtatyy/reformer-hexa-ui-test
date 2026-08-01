/**
 * Описание контрола моста одной строкой: имя в схеме + компонент + перевод seam'а.
 *
 * Раньше контрол жил в реестре в двух независимых местах — `reg.component(...)` и карта адаптеров.
 * Забытая запись в карте не ломала ничего на месте: рендерер без адаптера отдаёт контролу ноду
 * формы пропом `control`, тот спредит её в DOM, и расплата приходит рантаймовым предупреждением
 * про неизвестный атрибут — далеко от причины. Здесь запись одна, и адаптер — ОБЯЗАТЕЛЬНЫЙ
 * аргумент: «адаптера нет» стало таким же решением, которое пишут явно ({@link NO_ADAPTER}),
 * а не умолчанием, в которое можно провалиться молча.
 */

import type { ComponentType } from 'react';
import type { RegistryBuilder } from '@reformer/renderer-json';
import type { FieldAdapter, RendererSettings } from '@reformer/renderer-react';

/**
 * Явное «этому контролу адаптер не нужен»: он сам принимает ноду формы пропом `control` и сам
 * гасит лишние пропы. Такой в мосте один — `HexaSelect` (реактивные опции из `updateComponentProps`
 * живут на ноде, а не в пропах из схемы; подробности в шапке `HexaSelect.tsx`).
 */
export const NO_ADAPTER = Symbol('hexa-ui:no-field-adapter');

/** Строка таблицы контролов: из неё получаются и регистрация в реестре, и запись в карте адаптеров. */
export interface ControlEntry {
  /** Имя для `$component(...)` в JSON-схеме. */
  readonly name: string;
  /**
   * Ссылка на компонент — она же ключ карты адаптеров: резолвер получает уже РЕЗОЛВНУТЫЙ
   * компонент, а не имя из схемы. Тип стёрт до `unknown`, потому что таблица разнородная;
   * типизацию пропов держит замыкание {@link ControlEntry.register}.
   */
  readonly component: unknown;
  /** Перевод диалекта контрола в value-based seam рендерера либо {@link NO_ADAPTER}. */
  readonly adapter: FieldAdapter | typeof NO_ADAPTER;
  /** Регистрация в builder. Замыкание, а не поле-компонент: так `P` не теряется на границе. */
  readonly register: (reg: RegistryBuilder) => void;
}

/**
 * Описывает контрол: имя в схеме, компонент и адаптер. Третий аргумент обязателен — см. шапку файла.
 */
export function control<P>(
  name: string,
  component: ComponentType<P>,
  adapter: FieldAdapter | typeof NO_ADAPTER,
): ControlEntry {
  return {
    name,
    component,
    adapter,
    register: (reg) => reg.component<P>(name, component),
  };
}

/** Регистрирует всю таблицу контролов в реестре. */
export function registerControls(reg: RegistryBuilder, controls: readonly ControlEntry[]): void {
  for (const entry of controls) {
    entry.register(reg);
  }
}

/**
 * Собирает из той же таблицы `resolveFieldAdapter` для настроек рендерера.
 *
 * Карта строится один раз на модуль: резолвер зовётся на каждый рендер поля, а таблица за жизнь
 * приложения не меняется.
 */
export function createFieldAdapterResolver(
  controls: readonly ControlEntry[],
): NonNullable<RendererSettings['resolveFieldAdapter']> {
  const adapters = new Map<unknown, FieldAdapter>();

  for (const { component, adapter } of controls) {
    if (adapter !== NO_ADAPTER) {
      adapters.set(component, adapter);
    }
  }

  return (component) => adapters.get(component);
}
