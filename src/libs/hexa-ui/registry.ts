/**
 * Реестр компонентов для JSON-схем: имя из `$component(...)` → компонент hexa-ui.
 *
 * Модуль-синглтон намеренно: реестр обязан быть стабильным по ссылке. Пересборка на каждый
 * рендер дала бы новые типы компонентов, и React ремонтировал бы всё поддерево формы.
 */

import { Textbox } from "@kaspersky/hexa-ui";
import { FIELD_WRAPPER, defineRegistry } from "@reformer/renderer-json";
import type { RendererSettings } from "@reformer/renderer-react";
import { HexaField, TEXTBOX_ADAPTER } from "./HexaField";

export const hexaRegistry = defineRegistry((reg) => {
  // Имя из схемы → компонент hexa-ui.
  reg.component("Textbox", Textbox);
  // Обёртка полей: label + сообщение об ошибке вокруг каждого листа.
  reg.component(FIELD_WRAPPER, HexaField);
});

/**
 * Резолв адаптера по РЕЗОЛВНУТОМУ компоненту (тому, что реестр вернул на `$component(...)`),
 * поэтому сравнение идёт по ссылке, а не по имени.
 */
export const resolveFieldAdapter: NonNullable<
  RendererSettings["resolveFieldAdapter"]
> = (component) => (component === Textbox ? TEXTBOX_ADAPTER : undefined);
