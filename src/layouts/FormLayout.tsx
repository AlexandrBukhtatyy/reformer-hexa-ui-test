/**
 * Layout страницы с формой: внешняя вёрстка + оба провайдера, которые нужны любой форме.
 *
 * - `ValidationMessagesProvider` — тексты ошибок по кодам валидаторов (их читает `useFormField`);
 * - `JsonRendererProvider` — ГЛОБАЛЬНЫЕ настройки рендерера: реестр компонентов и адаптеры контролов.
 *
 * Модель сюда не входит: она per-form и передаётся пропом `model` в сам `JsonFormRenderer`, поэтому
 * под одним layout'ом можно рендерить несколько форм с разными моделями.
 */

import type { ReactNode } from 'react';
import { ValidationMessagesProvider } from '@reformer/cdk';
import { JsonRendererProvider, type JsonRendererSettings } from '@reformer/renderer-json';
import { hexaRegistry, resolveFieldAdapter, resolveValidationMessage } from '../libs/hexa-ui';

// Настройки ни от чего не зависят — держим их модульной константой: провайдер мемоизирует
// контекст по ССЫЛКЕ, а объектный литерал в JSX протухал бы каждый рендер и перерисовывал форму.
const RENDERER_SETTINGS: JsonRendererSettings = {
  registry: hexaRegistry,
  resolveFieldAdapter,
};

export interface FormLayoutProps {
  children: ReactNode;
}

export function FormLayout({ children }: FormLayoutProps) {
  return (
    <div className="@container min-h-dvh mx-auto bg-slate-100 p-4">
      <div className="w-full max-w-7xl mx-auto p-4">
        <ValidationMessagesProvider resolver={resolveValidationMessage}>
          <JsonRendererProvider settings={RENDERER_SETTINGS}>{children}</JsonRendererProvider>
        </ValidationMessagesProvider>
      </div>
    </div>
  );
}
