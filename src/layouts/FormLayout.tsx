/**
 * Layout страницы с формой: внешняя вёрстка + оба провайдера, которые нужны любой форме.
 *
 * - `ValidationMessagesProvider` — тексты ошибок по кодам валидаторов (их читает `useFormField`);
 * - `JsonRendererProvider` — реестр компонентов, адаптеры контролов и модель данных.
 *
 * Реестр и резолверы приходят из `libs/hexa-ui` и общие для всех форм; снаружи задаётся только
 * модель — она у каждой формы своя.
 */

import { useMemo, type ReactNode } from 'react';
import type { FormModel } from '@reformer/core';
import { ValidationMessagesProvider } from '@reformer/cdk';
import { JsonRendererProvider } from '@reformer/renderer-json';
import { hexaRegistry, resolveFieldAdapter, resolveValidationMessage } from '../libs/hexa-ui';

export interface FormLayoutProps<T> {
  /** Модель данных формы — источник значений для листьев JSON-схемы. */
  model: FormModel<T>;
  children: ReactNode;
}

export function FormLayout<T>({ model, children }: FormLayoutProps<T>) {
  // Провайдер мемоизирует контекст по ССЫЛКЕ на settings: объектный литерал прямо в JSX
  // протухал бы каждый рендер, и вся форма перерисовывалась бы вслед за родителем.
  const settings = useMemo(
    () => ({ registry: hexaRegistry, model, resolveFieldAdapter }),
    [model],
  );

  return (
    <div className="@container min-h-dvh mx-auto bg-slate-100 p-4">
      <div className="w-full max-w-7xl mx-auto p-4 bg-white">
        <ValidationMessagesProvider resolver={resolveValidationMessage}>
          <JsonRendererProvider settings={settings}>{children}</JsonRendererProvider>
        </ValidationMessagesProvider>
      </div>
    </div>
  );
}
