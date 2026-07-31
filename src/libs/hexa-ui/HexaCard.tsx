/**
 * Мост «контейнер-нода JSON-схемы → hexa-ui `Card`».
 *
 * Единственное расхождение контрактов — заголовок: hexa-ui ждёт объект (`{ value, size, … }`),
 * а в схеме заголовок пишут строкой. Строка без нормализации не падает, а тихо рисует пустую
 * шапку карточки (`title.value === undefined`), поэтому переводим её здесь.
 */

import { Card, type CardProps } from '@kaspersky/hexa-ui';

export interface HexaCardProps extends Omit<CardProps, 'title'> {
  /** Заголовок: строкой (частый случай в схеме) либо полным объектом hexa-ui. */
  title?: string | CardProps['title'];
}

export function HexaCard({ title, children, ...rest }: HexaCardProps) {
  return (
    <Card title={typeof title === 'string' ? { value: title } : title} {...rest}>
      {children}
    </Card>
  );
}
