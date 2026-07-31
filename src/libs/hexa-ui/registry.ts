/**
 * Реестр компонентов для JSON-схем: имя из `$component(...)` → компонент hexa-ui.
 *
 * Модуль-синглтон намеренно: реестр обязан быть стабильным по ссылке. Пересборка на каждый
 * рендер дала бы новые типы компонентов, и React ремонтировал бы всё поддерево формы.
 *
 * Роль узла решает его структура в схеме, а не регистрация: лист несёт `value: $model(...)`,
 * контейнер — `children`. Поэтому одним `reg.component` регистрируются и контролы, и обёртки.
 */

import { Heading, Radio, SectionMessage, Text, Textbox } from "@kaspersky/hexa-ui";
import { FIELD_WRAPPER, defineRegistry } from "@reformer/renderer-json";
import type { FieldAdapter, RendererSettings } from "@reformer/renderer-react";
import { HexaField, RADIO_ADAPTER, TEXTBOX_ADAPTER } from "./HexaField";
import { HexaCard } from "./HexaCard";
import { HexaWizard, HexaWizardStep } from "./HexaWizard";

export const hexaRegistry = defineRegistry((reg) => {
  // Контролы: лист схемы (`value: "$model(...)"`) → контрол hexa-ui. Сырые диалекты
  // (Radio эмитит DOM-событие) переводит адаптер ниже, а не обёртка вокруг контрола.
  reg.component("Textbox", Textbox);
  reg.component("Radio", Radio);

  // Контейнеры: узел с `children`. Wizard и Card идут через адаптеры — их контракты
  // с JSON-схемой не совпадают (steps-колбэки у одного, объект-заголовок у другого).
  reg.component("Wizard", HexaWizard);
  reg.component("Step", HexaWizardStep);
  reg.component("Card", HexaCard);
  reg.component("SectionMessage", SectionMessage);

  // Типографика: текст берётся из поля `text` узла — литералом или реактивным `$model(...)`.
  reg.component("Text", Text);
  reg.component("Heading", Heading);

  // Обёртка полей: label + сообщение об ошибке вокруг каждого листа.
  reg.component(FIELD_WRAPPER, HexaField);
});

/**
 * Адаптеры ключуются по ССЫЛКЕ на компонент — резолвер получает уже РЕЗОЛВНУТЫЙ компонент
 * (тот, что реестр вернул на `$component(...)`), а не имя из схемы.
 */
const FIELD_ADAPTERS = new Map<unknown, FieldAdapter>([
  [Textbox, TEXTBOX_ADAPTER],
  [Radio, RADIO_ADAPTER],
]);

export const resolveFieldAdapter: NonNullable<
  RendererSettings["resolveFieldAdapter"]
> = (component) => FIELD_ADAPTERS.get(component);
