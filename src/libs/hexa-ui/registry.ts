/**
 * Единый реестр компонентов для JSON-схем: имя из `$component(...)` → компонент hexa-ui.
 *
 * Роль узла решает его структура в схеме, а не регистрация: лист несёт `value: $model(...)`,
 * контейнер — `children`, массив — `item`. Поэтому одним `reg.component` регистрируются
 * и контролы, и обёртки, и узлы-массивы.
 *
 * Имена — «родные» для моста: как называется компонент hexa-ui (`Textbox`, `Radio`, `Select`,
 * `Uploader`, `Card`) либо, если у hexa-ui такого понятия нет, как называется наша обёртка
 * (`Box`, `Section`, `FormArray`, `AsyncBoundary`). Алиасов чужих дизайн-систем здесь больше нет:
 * схема кредитной заявки, приехавшая из примера на @reformer/ui-kit, переведена на эти имена.
 *
 * ВНИМАНИЕ на зависимость: реестр знает про витринные блоки и словари страницы «кредитная
 * заявка» (`../../pages/credit-application/*`), то есть общий слой смотрит в прикладной.
 * Так попросили сознательно — один реестр на проект; плата — libs зависит от pages, и вторая
 * страница со своими блоками потребует либо того же, либо возврата к реестру уровня страницы.
 * Чтобы это не превратилось в цикл, `components.tsx` импортирует компоненты моста ПОФАЙЛОВО,
 * а не через `index.ts` (барель тянул бы этот модуль обратно).
 */

import { Heading, Radio, SectionMessage, Text } from '@kaspersky/hexa-ui';
import {
  FIELD_WRAPPER,
  defineRegistry,
  type ComponentRegistry,
  type RegistryBuilder,
} from '@reformer/renderer-json';
import type { FieldAdapter, RendererSettings } from '@reformer/renderer-react';
import { HexaAsyncBoundary } from './HexaAsyncBoundary';
import { HexaBox } from './HexaBox';
import { HexaCard } from './HexaCard';
import { CHECKBOX_ADAPTER, HexaCheckbox } from './HexaCheckbox';
import { HexaField, RADIO_ADAPTER } from './HexaField';
import { HexaFormArray } from './HexaFormArray';
import { HexaInput, INPUT_ADAPTER } from './HexaInput';
import { HexaInputMask, INPUT_MASK_ADAPTER } from './HexaInputMask';
import { HexaSection } from './HexaSection';
import { HexaSelect } from './HexaSelect';
import { HexaTextarea, TEXTAREA_ADAPTER } from './HexaTextarea';
import { HexaUploader, UPLOADER_ADAPTER } from './HexaUploader';
import { HexaWizard, HexaWizardStep } from './HexaWizard';
import {
  ApplicantSummarySection,
  ConfirmationInfoBlock,
  ElectronicSignatureHint,
  HighPaymentWarning,
  LoanSummarySection,
  NextStepsInfo,
  ResidenceAddressSection,
  SubmitWarning,
  UnemployedWarning,
} from '../../pages/credit-application/components';
import {
  EDUCATIONS,
  EMPLOYMENT_STATUSES,
  EXISTING_LOAN_TYPES,
  GENDERS,
  LOAN_TYPES,
  MARITAL_STATUSES,
  RELATIONSHIPS,
} from '../../pages/credit-application/constants';

/** Компоненты моста: то, что умеет рисовать любая форма проекта. */
function registerBridge(reg: RegistryBuilder): void {
  // --- Контролы: лист схемы (`value: "$model(...)"`) → контрол hexa-ui. ---
  //
  // Под именем `Textbox` живёт обёртка, а не сырой компонент: схема различает текст, число и дату
  // одним пропом `type`, а hexa-ui — тремя разными компонентами. Разводит их `HexaInput`.
  reg.component('Textbox', HexaInput);
  reg.component('TextboxMasked', HexaInputMask);
  reg.component('Textarea', HexaTextarea);
  reg.component('Select', HexaSelect);
  reg.component('Checkbox', HexaCheckbox);
  reg.component('Uploader', HexaUploader);
  // Radio — сырой antd-`Radio.Group`: его диалект (значение в DOM-событии) переводит адаптер,
  // обёртка не нужна и стоила бы лишний ре-рендер на каждое нажатие.
  reg.component('Radio', Radio);

  // --- Контейнеры: узел с `children`. ---
  reg.component('Box', HexaBox);
  reg.component('Section', HexaSection);
  reg.component('Card', HexaCard);
  reg.component('SectionMessage', SectionMessage);
  reg.component('AsyncBoundary', HexaAsyncBoundary);

  // Wizard идёт через мост: его контракт с JSON-схемой не совпадает — шаги в схеме это ноды,
  // а hexa-ui ждёт конфиги с колбэком `render()`.
  reg.component('Wizard', HexaWizard);
  reg.component('Step', HexaWizardStep);

  // --- Узлы-массивы: у ноды с `component` контракт инъекции свой (`array`/`item`, без children). ---
  reg.component('FormArray', HexaFormArray);

  // --- Типографика: текст берётся из поля `text` узла — литералом или реактивным `$model(...)`. ---
  reg.component('Text', Text);
  reg.component('Heading', Heading);

  // --- Обёртка полей: label + сообщение об ошибке вокруг каждого листа. ---
  reg.component(FIELD_WRAPPER, HexaField);
}

/** Витринные блоки и словари формы «кредитная заявка». */
function registerCreditApplication(reg: RegistryBuilder): void {
  reg.component('ResidenceAddressSection', ResidenceAddressSection);
  reg.component('UnemployedWarning', UnemployedWarning);
  reg.component('ConfirmationInfoBlock', ConfirmationInfoBlock);
  reg.component('HighPaymentWarning', HighPaymentWarning);
  reg.component('LoanSummarySection', LoanSummarySection);
  reg.component('ApplicantSummarySection', ApplicantSummarySection);
  reg.component('ElectronicSignatureHint', ElectronicSignatureHint);
  reg.component('SubmitWarning', SubmitWarning);
  reg.component('NextStepsInfo', NextStepsInfo);

  // Словари для `options` селектов и радиогрупп.
  reg.dataSource('LOAN_TYPES', LOAN_TYPES);
  reg.dataSource('EMPLOYMENT_STATUSES', EMPLOYMENT_STATUSES);
  reg.dataSource('MARITAL_STATUSES', MARITAL_STATUSES);
  reg.dataSource('EDUCATIONS', EDUCATIONS);
  reg.dataSource('GENDERS', GENDERS);
  reg.dataSource('EXISTING_LOAN_TYPES', EXISTING_LOAN_TYPES);
  reg.dataSource('RELATIONSHIPS', RELATIONSHIPS);

  // `max` года выпуска авто. Значение, а не функция: схема кладёт его прямо в проп `max`.
  reg.dataSource('CURRENT_YEAR_PLUS_ONE', new Date().getFullYear() + 1);

  // Подписи элементов массивов. Именно `dataSource`, а не `fn`: `validateFormSchema` сверяет вид
  // регистрации с оператором в схеме (`$dataSource(...)`) и в dev отклонит перепутанные `$fn`.
  reg.dataSource(
    'PROPERTY_ITEM_LABEL_SOURCE_FN',
    (_item: unknown, index: number) => `Имущество #${index + 1}`,
  );
  reg.dataSource(
    'EXISTING_LOAN_ITEM_LABEL_SOURCE_FN',
    (_item: unknown, index: number) => `Кредит #${index + 1}`,
  );
  reg.dataSource(
    'CO_BORROWER_ITEM_LABEL_SOURCE_FN',
    (_item: unknown, index: number) => `Созаемщик #${index + 1}`,
  );
}

/**
 * Наполняет чужой builder — на случай, если странице понадобится СВОЙ реестр поверх общего
 * (`defineRegistry((reg) => { registerHexaComponents(reg); … })`). Адаптеры контролов при этом
 * переиспользуются сами: {@link resolveFieldAdapter} ключуется по ССЫЛКЕ на компонент.
 */
export function registerHexaComponents(reg: RegistryBuilder): void {
  registerBridge(reg);
  registerCreditApplication(reg);
}

/**
 * Общий реестр проекта — его отдаёт `FormLayout`, и все три страницы рендерятся им.
 *
 * Модуль-синглтон намеренно: реестр обязан быть стабильным по ссылке. Пересборка на каждый
 * рендер дала бы новые типы компонентов, и React ремонтировал бы всё поддерево формы.
 */
export const hexaRegistry: ComponentRegistry = defineRegistry(registerHexaComponents);

/**
 * Адаптеры ключуются по ССЫЛКЕ на компонент — резолвер получает уже РЕЗОЛВНУТЫЙ компонент
 * (тот, что реестр вернул на `$component(...)`), а не имя из схемы.
 *
 * Адаптер нужен почти каждому контролу, даже value-based: без него рендерер подмешивает в контрол
 * проп `control` (ноду формы), и тот утекает в DOM. Исключение одно — `HexaSelect`: ему нода нужна
 * (реактивные опции из `updateComponentProps` живут на ней, а не в пропах из схемы), поэтому он
 * принимает `control` сам и гасит лишние пропы вручную.
 */
const FIELD_ADAPTERS = new Map<unknown, FieldAdapter>([
  [Radio, RADIO_ADAPTER],
  [HexaInput, INPUT_ADAPTER],
  [HexaInputMask, INPUT_MASK_ADAPTER],
  [HexaTextarea, TEXTAREA_ADAPTER],
  [HexaCheckbox, CHECKBOX_ADAPTER],
  [HexaUploader, UPLOADER_ADAPTER],
]);

export const resolveFieldAdapter: NonNullable<
  RendererSettings['resolveFieldAdapter']
> = (component) => FIELD_ADAPTERS.get(component);
