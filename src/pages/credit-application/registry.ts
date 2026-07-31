/**
 * Реестр кредитной заявки: мост hexa-ui + витринные компоненты страницы + `$dataSource(...)`.
 *
 * Собирается СВОИМ реестром, а не дописывается в общий `hexaRegistry`: словари и itemLabel-функции
 * принадлежат этой форме, и в глобальном реестре они были бы видны любой другой странице.
 *
 * Имена — ровно те, что стоят в `form.json` (схема скопирована из ui-kit-примера байт в байт).
 * Расхождение имени ловится не типами, а рантаймом: `convertJsonToM1Tree` бросит
 * «Component "X" not found in registry», а `validateSchema` в dev нарисует панель ошибок.
 *
 * Форма в реестр НЕ попадает — она рантайм-сущность и приезжает в ноду визарда из `ui.ts`
 * (`onInit` → `patchProps({ form, … })`), а витринные компоненты берут её из `form-context.tsx`.
 */

import { defineRegistry, type ComponentRegistry } from '@reformer/renderer-json';
import { registerHexaComponents } from '../../libs/hexa-ui';
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
} from './components';
import {
  EDUCATIONS,
  EMPLOYMENT_STATUSES,
  EXISTING_LOAN_TYPES,
  GENDERS,
  LOAN_TYPES,
  MARITAL_STATUSES,
  RELATIONSHIPS,
} from './constants';

/**
 * Реестр строится функцией, а не константой модуля: `CURRENT_YEAR_PLUS_ONE` вычисляется в момент
 * сборки, и у модульного синглтона он замёрз бы на дате первой загрузки бандла.
 * Страница зовёт это один раз в `useMemo` — ссылка на реестр обязана быть стабильной.
 */
export function createCreditRegistry(): ComponentRegistry {
  return defineRegistry((reg) => {
    // Весь мост целиком: Input/InputMask/Select/Checkbox/FormArray/AsyncBoundary/RendererFormWizard
    // и системная обёртка поля. Дальше — только то, чего в мосте нет.
    registerHexaComponents(reg);

    // --- Витринные блоки шагов 3, 4 и 6 (leaf-контейнеры без `value`). ---
    reg.component('ResidenceAddressSection', ResidenceAddressSection);
    reg.component('UnemployedWarning', UnemployedWarning);
    reg.component('ConfirmationInfoBlock', ConfirmationInfoBlock);
    reg.component('HighPaymentWarning', HighPaymentWarning);
    reg.component('LoanSummarySection', LoanSummarySection);
    reg.component('ApplicantSummarySection', ApplicantSummarySection);
    reg.component('ElectronicSignatureHint', ElectronicSignatureHint);
    reg.component('SubmitWarning', SubmitWarning);
    reg.component('NextStepsInfo', NextStepsInfo);

    // --- Словари для `options` селектов и радиогрупп. ---
    reg.dataSource('LOAN_TYPES', LOAN_TYPES);
    reg.dataSource('EMPLOYMENT_STATUSES', EMPLOYMENT_STATUSES);
    reg.dataSource('MARITAL_STATUSES', MARITAL_STATUSES);
    reg.dataSource('EDUCATIONS', EDUCATIONS);
    reg.dataSource('GENDERS', GENDERS);
    reg.dataSource('EXISTING_LOAN_TYPES', EXISTING_LOAN_TYPES);
    reg.dataSource('RELATIONSHIPS', RELATIONSHIPS);

    // `max` года выпуска авто. Значение, а не функция: схема кладёт его прямо в проп `max`.
    reg.dataSource('CURRENT_YEAR_PLUS_ONE', new Date().getFullYear() + 1);

    // --- Подписи элементов массивов. ---
    // Именно `dataSource`, а не `fn`: `validateFormSchema` сверяет вид регистрации с оператором
    // в схеме (`$dataSource(...)`) и в dev отклонит перепутанные `$fn`/`$dataSource`.
    // Под-модель элемента не читается — подпись зависит только от позиции, как в источнике.
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
  });
}
