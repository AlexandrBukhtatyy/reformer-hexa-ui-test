/**
 * Интеграция @reformer с дизайн-системой @kaspersky/hexa-ui.
 *
 * Всё, что знает про различия двух контрактов, собрано здесь; страницы импортируют готовое.
 */

export { HexaField, RADIO_ADAPTER, TEXTBOX_ADAPTER } from './HexaField';
export { HexaCard, type HexaCardProps } from './HexaCard';
export { HexaWizard, HexaWizardStep, type HexaWizardProps } from './HexaWizard';
export { hexaRegistry, resolveFieldAdapter } from './registry';
export { resolveValidationMessage } from './validation-messages';
