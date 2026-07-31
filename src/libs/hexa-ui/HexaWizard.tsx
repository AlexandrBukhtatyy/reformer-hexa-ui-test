/**
 * Мост «wizard-нода JSON-схемы → hexa-ui `Wizard`».
 *
 * JSON-DSL держит шаги в `componentProps.steps` — массиве нод `$component(Step)`; конвертер
 * разворачивает их в RenderNode-поддеревья ещё до рендера. hexa-ui ждёт другого: `steps` —
 * массив конфигов, где содержимое шага отдаёт колбэк `render()`. Здесь две формы сводятся:
 * заголовок/описание/иконка снимаются с `componentProps` ноды, а сама нода рисуется рендерером.
 *
 * Валидация и форма в JSON не выражаются — они приходят из render-behavior
 * (`onInit(node, () => node.patchProps({ form, validateStep, validateAll }))`).
 */

import { useMemo } from 'react';
import { Wizard, type WizardPageProps } from '@kaspersky/hexa-ui';
import type { FormProxy } from '@reformer/core';
import {
  RenderNodeComponent,
  type ContainerComponentProps,
  type ContainerRenderNode,
} from '@reformer/renderer-react';

/** Элемент `steps` hexa-ui: сам тип пакет наружу не отдаёт, достаём его из пропсов `Wizard`. */
type HexaStepConfig = WizardPageProps['steps'][number];

/** Что нода шага (`$component(Step)`) несёт в `componentProps`. */
interface StepNodeProps {
  /** Заголовок шага. `title` — синоним: так шаг подписан в доках renderer-json. */
  name?: string;
  title?: string;
  description?: string;
  icon?: HexaStepConfig['icon'];
  /** Свой хук перед переходом «Далее» (из схемы — через `$fn(...)`). `false` гасит переход. */
  onNext?: () => boolean | Promise<boolean> | void;
  onBack?: () => void;
}

export interface HexaWizardProps<T> extends Omit<WizardPageProps, 'steps'> {
  /** Ноды шагов из `componentProps.steps` — конвертер уже развернул их в RenderNode. */
  steps: ReadonlyArray<ContainerRenderNode<T>>;
  /** Форма — рантайм-сущность из render-behavior; нужна вложенным self-managed компонентам. */
  form?: FormProxy<T>;
  /** Валидация шага (1-based) перед «Далее»; `false` оставляет пользователя на шаге. */
  validateStep?: (step: number) => boolean | Promise<boolean>;
  /** Валидация всей формы перед `onFinish`. */
  validateAll?: () => boolean | Promise<boolean>;
}

/**
 * Подписи кнопок hexa-ui берёт из i18next, но сам инстанс не инициализирует — без него на кнопках
 * видны сами ключи (`wizard.actions.next`). Поэтому задаём тексты явно; схема их переопределяет.
 */
const DEFAULT_BUTTON_TEXTS = {
  backButtonText: 'Назад',
  nextButtonText: 'Далее',
  finishButtonText: 'Готово',
  cancelButtonText: 'Отмена',
} satisfies Partial<WizardPageProps>;

export function HexaWizard<T>({
  steps,
  form,
  validateStep,
  validateAll,
  onFinish,
  ...rest
}: HexaWizardProps<T>) {
  const hexaSteps = useMemo<HexaStepConfig[]>(
    () =>
      steps.map((node, index) => {
        const { name, title, description, icon, onNext, onBack } = (node.componentProps ??
          {}) as StepNodeProps;

        return {
          name: name ?? title ?? `Шаг ${index + 1}`,
          description,
          icon,
          onBack,
          // hexa-ui гасит переход, если onNext вернул false, — сюда и вешается валидация шага.
          // Собственный onNext ноды идёт первым: он может отменить переход до прогона правил.
          onNext: async () => {
            if ((await onNext?.()) === false) return false;
            return validateStep ? await validateStep(index + 1) : true;
          },
          // Шаг рисуется как обычное поддерево — вместе с hideWhen/patchProps своих узлов.
          render: () => <RenderNodeComponent node={node} form={form} />,
        };
      }),
    [steps, form, validateStep],
  );

  // Последний «Далее» у hexa-ui — это finish: onNext (валидация шага) уже отработал,
  // остаётся проверить форму целиком.
  const handleFinish = async (): Promise<void> => {
    if (validateAll && !(await validateAll())) return;
    onFinish?.();
  };

  return (
    <Wizard
      {...DEFAULT_BUTTON_TEXTS}
      {...rest}
      // Модалка и сайдбар держат состояние видимости, а это не layout — из JSON-схемы не выражается.
      view="page"
      steps={hexaSteps}
      onFinish={() => void handleFinish()}
    />
  );
}

/**
 * Нода шага (`$component(Step)`). Заголовок, описание и иконку читает из её `componentProps`
 * сам `HexaWizard`; в компонент они прилетают вместе с остальными пропами, и пускать их в DOM
 * нельзя — поэтому наружу отдаём только контент и `className`.
 */
export function HexaWizardStep({ className, children }: ContainerComponentProps) {
  return <div className={className}>{children}</div>;
}
