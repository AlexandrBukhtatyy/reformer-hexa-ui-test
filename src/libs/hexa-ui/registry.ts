/**
 * Реестр компонентов для JSON-схем: имя из `$component(...)` → компонент hexa-ui.
 *
 * Роль узла решает его структура в схеме, а не регистрация: лист несёт `value: $model(...)`,
 * контейнер — `children`, массив — `item`. Поэтому одним `reg.component` регистрируются
 * и контролы, и обёртки, и узлы-массивы.
 *
 * Регистрации вынесены в {@link registerHexaComponents}, а не заперты в одном синглтоне:
 * странице со своими компонентами и `$dataSource(...)` нужен СВОЙ реестр, но на общем мосту.
 * Наследование реестров (`ComponentRegistryImpl.withParent`) для этого не годится — оно
 * не выражается через публичный `defineRegistry`, а builder-функция переиспользуется как есть.
 */

import { Heading, Radio, SectionMessage, Text, Textbox } from '@kaspersky/hexa-ui';
import {
  FIELD_WRAPPER,
  defineRegistry,
  type RegistryBuilder,
} from '@reformer/renderer-json';
import type { FieldAdapter, RendererSettings } from '@reformer/renderer-react';
import { HexaAsyncBoundary } from './HexaAsyncBoundary';
import { HexaBox } from './HexaBox';
import { HexaCard } from './HexaCard';
import { CHECKBOX_ADAPTER, HexaCheckbox } from './HexaCheckbox';
import { HexaField, RADIO_ADAPTER, TEXTBOX_ADAPTER } from './HexaField';
import { HexaFormArray } from './HexaFormArray';
import { HexaInput, INPUT_ADAPTER } from './HexaInput';
import { HexaInputMask, INPUT_MASK_ADAPTER } from './HexaInputMask';
import { HexaSection } from './HexaSection';
import { HexaSelect, SELECT_ADAPTER } from './HexaSelect';
import { HexaTextarea, TEXTAREA_ADAPTER } from './HexaTextarea';
import { HexaUploader, UPLOADER_ADAPTER } from './HexaUploader';
import { HexaWizard, HexaWizardStep } from './HexaWizard';

/**
 * Регистрирует весь мост в чужом builder'е.
 *
 * Нужно, чтобы страница расширяла мост, а не копировала его:
 * `defineRegistry((reg) => { registerHexaComponents(reg); reg.component('MyBlock', MyBlock); … })`.
 * Адаптеры контролов при этом переиспользуются автоматически: {@link resolveFieldAdapter}
 * ключуется по ССЫЛКЕ на компонент, а ссылки у всех реестров одни и те же.
 *
 * Регистрируются ДВА диалекта имён — «родные» hexa-ui (`Textbox`, `Radio`, `Card`, `Wizard`)
 * и имена @reformer/ui-kit (`Input`, `Select`, `Box`, `Section`, `RendererFormWizard`, …).
 * Второй набор — плата за главный тезис демо: схема кредитной заявки переносится из примера
 * на ui-kit БАЙТ В БАЙТ, подменяется только реестр.
 */
export function registerHexaComponents(reg: RegistryBuilder): void {
  // --- Контролы: лист схемы (`value: "$model(...)"`) → контрол hexa-ui. ---

  // Сырые компоненты hexa-ui. Их диалекты (Radio эмитит DOM-событие) переводит адаптер ниже,
  // а не обёртка вокруг контрола: лишний слой стоил бы лишний ре-рендер на каждое нажатие.
  reg.component('Textbox', Textbox);
  reg.component('Radio', Radio);

  // Имена ui-kit. Там, где контракты ui-kit и hexa-ui расходятся не значением, а СТРУКТУРОЙ
  // (один компонент против двух, `label` против `children`, свой диалект маски), стоит обёртка
  // Hexa*; она же гасит «лишние» пропы из `componentProps`, которые antd уронил бы в DOM.
  reg.component('Input', HexaInput);
  reg.component('InputMask', HexaInputMask);
  reg.component('Textarea', HexaTextarea);
  reg.component('Select', HexaSelect);
  reg.component('Checkbox', HexaCheckbox);
  reg.component('FileUpload', HexaUploader);
  // `RadioGroup` из ui-kit — это и есть antd-`Radio.Group`: обёртка не нужна, хватает адаптера.
  reg.component('RadioGroup', Radio);

  // --- Контейнеры: узел с `children`. ---

  reg.component('Box', HexaBox);
  reg.component('Section', HexaSection);
  reg.component('Card', HexaCard);
  reg.component('SectionMessage', SectionMessage);
  reg.component('AsyncBoundary', HexaAsyncBoundary);

  // Wizard идёт через мост: его контракт с JSON-схемой не совпадает (шаги — ноды против
  // конфигов с `render()`). `RendererFormWizard` — то же имя, под которым wizard живёт
  // в схемах ui-kit-примера; алиас позволяет не править схему.
  reg.component('Wizard', HexaWizard);
  reg.component('RendererFormWizard', HexaWizard);
  reg.component('Step', HexaWizardStep);

  // --- Узлы-массивы: у ноды с `component` контракт инъекции свой (`array`/`item`, без children). ---
  reg.component('FormArray', HexaFormArray);

  // --- Типографика: текст берётся из поля `text` узла — литералом или реактивным `$model(...)`. ---
  reg.component('Text', Text);
  reg.component('Heading', Heading);

  // --- Обёртка полей: label + сообщение об ошибке вокруг каждого листа. ---
  reg.component(FIELD_WRAPPER, HexaField);
}

/**
 * Общий реестр моста — для страниц без собственных компонентов.
 *
 * Модуль-синглтон намеренно: реестр обязан быть стабильным по ссылке. Пересборка на каждый
 * рендер дала бы новые типы компонентов, и React ремонтировал бы всё поддерево формы.
 */
export const hexaRegistry = defineRegistry(registerHexaComponents);

/**
 * Адаптеры ключуются по ССЫЛКЕ на компонент — резолвер получает уже РЕЗОЛВНУТЫЙ компонент
 * (тот, что реестр вернул на `$component(...)`), а не имя из схемы. Отсюда два следствия:
 * одна запись обслуживает все имена-алиасы (`Radio` и `RadioGroup`), и таблица не требует
 * обновления, когда страница собирает свой реестр поверх {@link registerHexaComponents}.
 *
 * Адаптер нужен КАЖДОМУ контролу, даже value-based: без него рендерер подмешивает в контрол
 * проп `control` (ноду формы), и тот утекает в DOM.
 */
const FIELD_ADAPTERS = new Map<unknown, FieldAdapter>([
  [Textbox, TEXTBOX_ADAPTER],
  [Radio, RADIO_ADAPTER],
  [HexaInput, INPUT_ADAPTER],
  [HexaInputMask, INPUT_MASK_ADAPTER],
  [HexaTextarea, TEXTAREA_ADAPTER],
  [HexaSelect, SELECT_ADAPTER],
  [HexaCheckbox, CHECKBOX_ADAPTER],
  [HexaUploader, UPLOADER_ADAPTER],
]);

export const resolveFieldAdapter: NonNullable<
  RendererSettings['resolveFieldAdapter']
> = (component) => FIELD_ADAPTERS.get(component);
