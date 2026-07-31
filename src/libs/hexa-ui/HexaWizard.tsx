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
 *
 * Навигация и submit тоже расходятся с cdk-шным `FormWizard`, на который написаны поведения:
 * шагом здесь владеет сам мост (см. `activeStep` ниже), а значения формы hexa в `onFinish`
 * не отдаёт — их приносит отдельный `onSubmit`.
 */

import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
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

/**
 * Императивный доступ к навигации — то немногое из cdk-шного `FormWizardHandle`, что реально
 * нужно поведениям (`wizardRef.current?.goToStep(1)`). Нумерация шагов 1-based, как в cdk:
 * перевод в 0-based диалект hexa-ui заперт внутри моста, поведения из источника не переписываем.
 */
export interface HexaWizardHandle {
  /** Перейти на шаг (1-based). `false` — шага с таким номером нет, переход не выполнен. */
  goToStep: (step: number) => boolean;
  /** Текущий шаг, 1-based. */
  readonly currentStep: number;
}

export interface HexaWizardProps<T>
  extends Omit<WizardPageProps, 'steps' | 'activeStep'> {
  /** Ноды шагов из `componentProps.steps` — конвертер уже развернул их в RenderNode. */
  steps: ReadonlyArray<ContainerRenderNode<T>>;
  /** Форма — рантайм-сущность из render-behavior; нужна вложенным self-managed компонентам. */
  form?: FormProxy<T>;
  /** Валидация шага (1-based) перед «Далее»; `false` оставляет пользователя на шаге. */
  validateStep?: (step: number) => boolean | Promise<boolean>;
  /** Валидация всей формы перед `onFinish`. */
  validateAll?: () => boolean | Promise<boolean>;
  /**
   * Отправка: снимок значений формы после успешного `validateAll`. Отдельный от `onFinish`
   * проп потому, что hexa-ui `onFinish` вызывается без аргументов, а поведения ждут значения
   * (`onComponentEvent(wizard, 'onSubmit', (values) => …)`).
   */
  onSubmit?: (values: T) => void | Promise<void>;
  /**
   * Рендерер отдаёт ref контейнерной ноды ОБЫЧНЫМ пропом (React 19), а не через `forwardRef` —
   * ref создаётся на `schema.node(selector).getRef()` и мержится в props рядом с колбэками.
   */
  ref?: Ref<HexaWizardHandle>;
  /** Selector ноды: рендерер добавляет его контейнерам для адресации, в DOM ему нельзя. */
  selector?: string;
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
  onSubmit,
  onStepChange,
  initialStep = 0,
  ref,
  // Снимаем до спреда: `selector` адресует ноду схемы и в DOM утёк бы неизвестным атрибутом.
  selector: _selector,
  ...rest
}: HexaWizardProps<T>) {
  /**
   * Шагом владеем мы, а не hexa-ui: её `WizardProvider` полностью игнорирует свой internal state,
   * как только приходит `activeStep`. Половинчатый контроль (императивный переход + внутренний
   * счётчик hexa) разъехался бы — следующий «Далее» вернул бы пользователя на прежний шаг.
   */
  const [activeStep, setActiveStep] = useState(initialStep);
  /**
   * Тот же шаг в ref: хэндл пересоздаётся редко (по deps), и обычное замыкание отдавало бы
   * в `currentStep` устаревший номер.
   */
  const activeStepIndex = useRef(initialStep);

  const moveToStep = useCallback((index: number) => {
    activeStepIndex.current = index;
    setActiveStep(index);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      goToStep: (step: number) => {
        const index = step - 1;
        if (!Number.isInteger(index) || index < 0 || index >= steps.length) return false;
        // Повторный переход на текущий шаг React схлопывает сам — эффекты поведения,
        // дёргающие goToStep на каждое изменение сигнала, не зацикливаются.
        moveToStep(index);
        return true;
      },
      get currentStep() {
        return activeStepIndex.current + 1;
      },
    }),
    [moveToStep, steps.length],
  );

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

  // Кнопки «Далее»/«Назад» ходят по шагам только через onStepChange (в контролируемом режиме
  // hexa-ui свой счётчик не трогает) — иначе wizard замер бы на первом шаге.
  const handleStepChange = (step: number): void => {
    moveToStep(step);
    onStepChange?.(step);
  };

  // Последний «Далее» у hexa-ui — это finish: onNext (валидация шага) уже отработал,
  // остаётся проверить форму целиком.
  const handleFinish = async (): Promise<void> => {
    if (validateAll && !(await validateAll())) return;

    if (onSubmit) {
      if (form) {
        await onSubmit(form.getValue());
      } else {
        // Форму в wizard кладёт render-behavior (`patchProps({ form })`); без неё снимка нет,
        // и молча проглоченный submit выглядел бы как «кнопка не работает».
        console.warn('[HexaWizard] onSubmit задан, но form не внедрена — значения недоступны');
      }
    }

    onFinish?.();
  };

  return (
    <Wizard
      {...DEFAULT_BUTTON_TEXTS}
      {...rest}
      // Модалка и сайдбар держат состояние видимости, а это не layout — из JSON-схемы не выражается.
      view="page"
      steps={hexaSteps}
      activeStep={activeStep}
      onStepChange={handleStepChange}
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
