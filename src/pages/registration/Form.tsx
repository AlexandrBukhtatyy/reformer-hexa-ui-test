/**
 * Форма «registration» на @reformer/renderer-json + @kaspersky/hexa-ui.
 *
 * Обязанности разведены по соседним файлам — здесь только сборка:
 * - [form.json]      — весь layout (может прийти строкой с сервера);
 * - [model.ts]       — тип данных и initial-значения;
 * - [validation.ts]  — правила значений (в JSON-DSL валидаторов нет), гоняются `validateModel`;
 * - [behavior.ts]    — реактивность модели (`createForm({ behavior })`);
 * - [ui.ts]          — render-behavior поверх дерева рендера (hideWhen/patchProps/onInit).
 *
 * Реестр и мост к hexa-ui живут здесь: JSON знает только имена (`$component(Input)`),
 * а какой это React-компонент — решает приложение.
 */

import { useMemo, useState, type ReactElement } from 'react';
import { createForm, createModel, useFormControlValue } from '@reformer/core';
import { validateModel } from '@reformer/core/validation';
import { ValidationMessagesProvider, type ValidationErrorResolver } from '@reformer/cdk';
import { useFormField } from '@reformer/cdk/form-field';
import { Button, Field, Textbox } from '@kaspersky/hexa-ui';
import {
  FIELD_WRAPPER,
  JsonFormRenderer,
  JsonRendererProvider,
  convertJsonToM1Tree,
  defineRegistry,
  type JsonFormSchema,
} from '@reformer/renderer-json';
import type {
  FieldAdapter,
  FieldWrapperProps,
  RendererSettings,
} from '@reformer/renderer-react';
import rawJsonSchema from './form.json';
import { formBehavior } from './behavior';
import { initialFormModel, type FormShape } from './model';
import { formUiBehavior } from './ui';
import { formValidation } from './validation';

// Операторы в чистом JSON типизируются как `string` — приведение и есть сценарий
// «схема пришла строкой с сервера».
const registrationJsonSchema = rawJsonSchema as unknown as JsonFormSchema;

/**
 * Системная обёртка поля (`FIELD_WRAPPER`): рендерер отдаёт сюда ноду формы и уже отрисованный
 * контрол, а label/ошибку берём из ноды и раскладываем в hexa-ui `<Field>`.
 */
function HexaField({ control, className, testId, children }: FieldWrapperProps) {
  const { state } = useFormField(control);

  return (
    <Field
      className={className}
      label={state.label}
      labelPosition="top"
      required={state.required}
      control={children as ReactElement}
      message={state.shouldShowError ? state.error : undefined}
      messageMode="error"
      testId={testId}
    />
  );
}

/**
 * `Textbox` — уже value-based (`value` + `onChange(value)`), поэтому переклад seam'а не нужен.
 * Адаптер здесь ради двух вещей: он не подмешивает в контрол проп `control` (ноду формы) и
 * снимает `label` — его рисует обёртка, а в antd-input он утёк бы атрибутом в DOM.
 */
const TEXTBOX_ADAPTER: FieldAdapter = { strip: ['label'] };

/**
 * Тексты ошибок по кодам валидаторов. Валидаторы из `@reformer/core/validators` без явного
 * `message` кладут в ошибку пустую строку либо `'invalid'` — без таблицы поле показало бы
 * пользователю именно это.
 */
const VALIDATION_MESSAGES: Record<string, (params?: Record<string, unknown>) => string> = {
  required: () => 'Обязательное поле',
  email: () => 'Введите корректный email',
  minLength: (p) => `Минимум ${p?.minLength} символов`,
  maxLength: (p) => `Максимум ${p?.maxLength} символов`,
};

/**
 * Явный текст из validation.ts (`required({ message: 'Укажите имя' })`) важнее таблицы, поэтому
 * готовый `createMessageResolver` не подходит: он ключуется по коду и такой текст бы перетёр.
 */
const resolveValidationMessage: ValidationErrorResolver = (error) => {
  const explicit = error.message && error.message !== 'invalid' ? error.message : undefined;
  return explicit ?? VALIDATION_MESSAGES[error.code]?.(error.params) ?? error.code;
};

const resolveFieldAdapter: NonNullable<RendererSettings['resolveFieldAdapter']> = (component) =>
  component === Textbox ? TEXTBOX_ADAPTER : undefined;

/**
 * Сборка модели, формы и реестра. Без React-хуков — компонент зовёт её один раз в `useMemo`:
 * повторная сборка создала бы новый реестр и новые типы компонентов, и React ремонтировал бы
 * поддерево на каждый рендер.
 */
function createSetup() {
  const registry = defineRegistry((reg) => {
    // Имя из схемы → компонент hexa-ui.
    reg.component('Input', Textbox);
    // Обёртка полей: label + сообщение об ошибке вокруг каждого листа.
    reg.component(FIELD_WRAPPER, HexaField);
  });

  const model = createModel<FormShape>({ ...initialFormModel });
  // Форма строится из ТОЙ ЖЕ JSON-схемы: конвертер биндит листья к сигналам модели.
  // Без этого вызова рендерер не найдёт ноду для сигнала и не отрисует поля.
  const form = createForm<FormShape>({
    model,
    schema: convertJsonToM1Tree(registrationJsonSchema, registry, model),
    behavior: formBehavior,
  });

  return { model, form, registry, renderBehavior: formUiBehavior };
}

export default function FormRendererJson() {
  const { model, form, registry, renderBehavior } = useMemo(() => createSetup(), []);
  const [status, setStatus] = useState<string | null>(null);

  // greeting в схеме нет — его считает behavior.ts из name. Нода всё равно существует:
  // FormProxy заводит её лениво по полю модели, поэтому доступен обычный хук ядра.
  const greeting = useFormControlValue(form.greeting);

  const handleSubmit = async (): Promise<void> => {
    // Без touched ноды не показывают ошибки — невалидные поля молча не отправились бы.
    form.markAsTouched();
    const valid = await validateModel(model, formValidation);
    setStatus(valid ? `Отправлено: ${JSON.stringify(model.get())}` : 'Проверьте выделенные поля');
  };

  const handleReset = (): void => {
    // Значения принадлежат модели, UI-состояние — форме: чистим порознь.
    model.reset();
    form.clearErrors();
    form.markAsUntouched();
    setStatus(null);
  };

  return (
    <ValidationMessagesProvider resolver={resolveValidationMessage}>
      <JsonRendererProvider settings={{ registry, model, resolveFieldAdapter }}>
        <JsonFormRenderer<FormShape>
          schema={registrationJsonSchema}
          renderBehavior={renderBehavior}
          validate={import.meta.env.DEV}
        />

        {greeting && <p>{greeting}</p>}

        <Button text="Отправить" mode="primary" onClick={() => void handleSubmit()} />
        <Button text="Очистить" mode="secondary" onClick={handleReset} />

        {status && <p>{status}</p>}
      </JsonRendererProvider>
    </ValidationMessagesProvider>
  );
}
