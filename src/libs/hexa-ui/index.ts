/**
 * Интеграция @reformer с дизайн-системой @kaspersky/hexa-ui.
 *
 * Всё, что знает про различия двух контрактов, собрано здесь; страницы импортируют готовое.
 */

export { HexaField, TEXTBOX_ADAPTER } from './HexaField';
export { hexaRegistry, resolveFieldAdapter } from './registry';
export { resolveValidationMessage } from './validation-messages';
