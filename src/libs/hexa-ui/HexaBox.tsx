/**
 * Мост «нода `Box` JSON-схемы → `div`».
 *
 * Кандидат из hexa-ui — `Space`, но он навязывает `display:flex` и собственный gap, а схема
 * раскладывает Box'ы Tailwind-классами (`grid grid-cols-2 gap-4`, `space-y-6`). Flex поверх грида
 * не падает, а молча схлопывает колонки в строку, поэтому Box остаётся голым `div`: у него нет
 * конкурирующих стилей hexa/antd, и утилиты Tailwind работают без суффикса `!`.
 *
 * Контейнеру рендерер отдаёт не только `className`/`children`: там же лежит `selector` (адрес узла
 * для render-behavior), колбэки из `onComponentEvent` и, если у узла брали `getRef()`, — `ref`.
 * Ни одно из этого в DOM не пускаем — поэтому берём ровно то, что рисуем, и ничего не спредим.
 */

import type { ContainerComponentProps } from '@reformer/renderer-react';

export function HexaBox({ className, children }: ContainerComponentProps) {
  return <div className={className}>{children}</div>;
}
