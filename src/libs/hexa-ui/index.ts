/**
 * Интеграция @reformer с дизайн-системой @kaspersky/hexa-ui.
 *
 * Всё, что знает про различия двух контрактов, собрано здесь; страницы импортируют готовое.
 *
 * Страница, которой нужны свои компоненты и `$dataSource(...)`, собирает СВОЙ реестр поверх
 * моста: `defineRegistry((reg) => { registerHexaComponents(reg); … })`. Готовый `hexaRegistry` —
 * для страниц, которым хватает моста.
 */

// Контролы: обёртки над hexa-ui + их адаптеры seam'а (ключуются по ссылке на компонент).
export { HexaInput, INPUT_ADAPTER, type HexaInputProps } from './HexaInput';
export { HexaInputMask, INPUT_MASK_ADAPTER, type HexaInputMaskProps } from './HexaInputMask';
export { HexaTextarea, TEXTAREA_ADAPTER, type HexaTextareaProps } from './HexaTextarea';
export { HexaSelect, type HexaSelectProps } from './HexaSelect';
export { HexaCheckbox, CHECKBOX_ADAPTER, type HexaCheckboxProps } from './HexaCheckbox';
export { HexaUploader, UPLOADER_ADAPTER, type HexaUploaderProps } from './HexaUploader';

// Обёртка поля (`FIELD_WRAPPER`) и адаптеры сырых контролов hexa-ui.
export { HexaField, RADIO_ADAPTER, TEXTBOX_ADAPTER } from './HexaField';

// Контейнеры и узлы-массивы.
export { HexaBox } from './HexaBox';
export { HexaSection, type HexaSectionProps } from './HexaSection';
export { HexaCard, type HexaCardProps } from './HexaCard';
export { HexaAsyncBoundary, type HexaAsyncBoundaryProps } from './HexaAsyncBoundary';
export { HexaFormArray, type HexaFormArrayProps } from './HexaFormArray';
export {
  HexaWizard,
  HexaWizardStep,
  type HexaWizardHandle,
  type HexaWizardProps,
} from './HexaWizard';

// Реестр и настройки рендерера.
export { hexaRegistry, registerHexaComponents, resolveFieldAdapter } from './registry';
export { resolveValidationMessage } from './validation-messages';
