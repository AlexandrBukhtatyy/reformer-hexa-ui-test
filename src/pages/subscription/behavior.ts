/**
 * Поведение формы «subscription» — реактивные связи над МОДЕЛЬЮ (вычисляемые поля, доступность,
 * сброс). Docs: @reformer/core/behaviors.
 */
import { defineFormBehavior, computeFrom, resetWhen } from '@reformer/core/behaviors';
import { BILLING_LABELS, PLAN_LABELS, type FormShape } from './model';

export const formBehavior = defineFormBehavior<FormShape>(({ model }) => {
  // Сводка для шага «Подтверждение»: JSON показывает готовое поле (`text: "$model(summary)"`),
  // вычислений в схеме нет.
  computeFrom([model.$.plan, model.$.billing], model.$.summary, (plan, billing) =>
    plan
      ? `Тариф «${PLAN_LABELS[plan] ?? plan}», оплата ${BILLING_LABELS[billing] ?? billing}`
      : 'Тариф пока не выбран',
  );

  // Промокод действует только для годовой оплаты: карточку прячет ui.ts, а введённое значение
  // чистим здесь — иначе скрытое поле молча уехало бы в заявку.
  resetWhen(model.$.promo, () => model.billing !== 'yearly', { resetValue: '' });
});
