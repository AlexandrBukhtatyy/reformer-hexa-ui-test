/**
 * Мост «нода `Section` JSON-схемы → `<section>` + заголовок hexa-ui».
 *
 * Прямого аналога у hexa-ui нет: `Card` добавил бы рамку и паддинги вокруг каждой из двух десятков
 * секций (внутри шага wizard'а это выглядело бы как карточки в карточке), а `Heading` — только
 * заголовок, без обёртки. Поэтому обёртка своя: семантический `<section>` + заголовок в типографике
 * дизайн-системы.
 *
 * Контейнеру рендерер отдаёт ещё `selector`, колбэки и (при `getRef()`) `ref` — в DOM их пускать
 * нельзя, поэтому берём только то, что рисуем, и ничего не спредим.
 */

import { Text, type TextProps } from '@kaspersky/hexa-ui';
import type { ContainerComponentProps } from '@reformer/renderer-react';

/** Уровень заголовка секции — контракт `Section.titleAs` из ui-kit (`h1`…`h6`, по умолчанию `h3`). */
type SectionTitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/**
 * Уровень заголовка → ступень типографики hexa-ui. Сдвиг вниз намеренный: схема размечает секции
 * как `h2`, но hexa-ui `H2` — это 32px, размер заголовка страницы. Внутри шага wizard'а такие
 * заголовки перекричали бы саму форму, поэтому визуально секции живут на ступенях H4–H6
 * (24/20/16px) — ровно тот диапазон, который схема просила Tailwind'ом (`text-xl`, `text-lg`).
 * Семантический уровень при этом сохраняется: тег берётся из `titleAs`, а не из ступени.
 */
const TITLE_TYPE: Record<SectionTitleTag, TextProps['type']> = {
  h1: 'H4',
  h2: 'H5',
  h3: 'H6',
  h4: 'H6',
  h5: 'H6',
  h6: 'H6',
};

export interface HexaSectionProps extends ContainerComponentProps {
  /** Заголовок секции. Не задан — рисуется только обёртка. */
  title?: string;
  /** HTML-элемент заголовка. По умолчанию `h3` — как в ui-kit. */
  titleAs?: SectionTitleTag;
  /** Доп. класс заголовка из схемы. */
  titleClassName?: string;
}

export function HexaSection({
  title,
  titleAs = 'h3',
  titleClassName,
  className,
  children,
}: HexaSectionProps) {
  return (
    <section className={className}>
      {title ? (
        // `htmlTag` отвязывает тег от ступени: семантика — из схемы, размер — из дизайн-системы.
        // `titleClassName` прокидываем, но размер/жирность из него до заголовка не дойдут:
        // стили hexa-ui лежат вне CSS-слоёв и по каскаду обыгрывают утилиты Tailwind. Отступы
        // (`mt-4`) применяются — их hexa-ui не задаёт.
        <Text type={TITLE_TYPE[titleAs] ?? 'H6'} htmlTag={titleAs} className={titleClassName}>
          {title}
        </Text>
      ) : null}
      {children}
    </section>
  );
}
