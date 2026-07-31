/**
 * Мост «нода `AsyncBoundary` JSON-схемы → состояния загрузки на hexa-ui».
 *
 * Компонент управляемый (controlled): загрузку ведёт render-behavior, а сюда через
 * `node.patchProps({ status, error, onRetry })` приезжает только текущее состояние. Свой `load`
 * (self-managed режим ui-kit) здесь не нужен и намеренно не поддерживается — иначе на странице
 * оказалось бы два владельца одного запроса.
 *
 * Имена пропов повторяют `AsyncBoundaryProps` из @reformer/ui-kit, а `status` — тип `AsyncStatus`
 * из @reformer/cdk: поведение переносится из источника без правок.
 *
 * Контейнеру рендерер отдаёт ещё `selector` и колбэки узла — в DOM их не пускаем, поэтому
 * деструктурируем только нужное и ничего не спредим.
 */

import type { ReactNode } from 'react';
import { Button, Loader, SectionMessage, Space, Text } from '@kaspersky/hexa-ui';
import type { AsyncStatus } from '@reformer/cdk/async-boundary';

export interface HexaAsyncBoundaryProps {
  /** Текущее состояние. `idle` и `ready` показывают контент — как в ui-kit. */
  status?: AsyncStatus;
  /** Текст ошибки. Приходит из поведения вместе со `status: 'error'`. */
  error?: ReactNode;
  /** Повтор загрузки. Без него кнопка «Повторить» не рисуется — контракт ui-kit. */
  onRetry?: () => void;
  className?: string;
  /** Подпись под спиннером. */
  loadingTitle?: string;
  /** Заголовок блока ошибки. */
  errorTitle?: string;
  /** Подпись кнопки повтора. */
  retryLabel?: string;
  children?: ReactNode;
}

export function HexaAsyncBoundary({
  status = 'idle',
  error,
  onRetry,
  className,
  loadingTitle = 'Загрузка данных…',
  errorTitle = 'Ошибка загрузки',
  retryLabel = 'Повторить',
  children,
}: HexaAsyncBoundaryProps) {
  if (status === 'loading') {
    // Вежливое объявление: появление спиннера не должно прерывать чтение текущего экрана.
    return (
      <div className={className} role="status" aria-live="polite">
        <Space direction="vertical" gap="related" align="center" justify="center">
          <Loader centered />
          <Text type="BTR3" color="secondary">
            {loadingTitle}
          </Text>
        </Space>
      </div>
    );
  }

  if (status === 'error') {
    // Настойчивое объявление: пропавшие данные обязаны прервать чтение, иначе пользователь
    // продолжит работать с пустым экраном.
    return (
      <div className={className} role="alert" aria-live="assertive">
        {/* closable по умолчанию `true` — закрытый пользователем блок ошибки уже не вернуть,
            а вместе с ним исчезнет и кнопка повтора. */}
        <SectionMessage mode="error" title={errorTitle} closable={false} testId="async-boundary-error">
          <Space direction="vertical" gap="grouped" align="flex-start">
            {error ? <Text type="BTR3">{error}</Text> : null}
            {onRetry ? (
              <Button
                mode="secondary"
                size="small"
                type="button"
                text={retryLabel}
                onClick={onRetry}
                testId="async-boundary-retry"
              />
            ) : null}
          </Space>
        </SectionMessage>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
