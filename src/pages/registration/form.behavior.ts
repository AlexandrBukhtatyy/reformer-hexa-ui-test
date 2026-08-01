/**
 * Поведение формы «registration» — реактивные связи над МОДЕЛЬЮ (вычисляемые поля, копирование,
 * доступность, ре-валидация). Docs: @reformer/core/behaviors.
 *
 * Импортируется ровно то, что вызывается: tsc собран с `noUnusedLocals`, и «шпаргалка про запас»
 * в импортах держала бы сборку красной постоянно — а постоянно красная сборка перестаёт что-либо
 * значить. Примеры остальных операторов лежат ниже комментарием, вместе со строкой их импорта.
 */
import { defineFormBehavior, computeFrom } from "@reformer/core/behaviors";
import type { FormShape } from "./form.model";

export const formBehavior = defineFormBehavior<FormShape>(({ model }) => {
  // ── Активное поведение ──
  // greeting вычисляется из name.
  computeFrom([model.$.name], model.$.greeting, (name) =>
    name ? `Привет, ${name}!` : "",
  );

  // ── Шпаргалка (скопируйте под свои поля, добавив оператор в импорт наверху файла) ──
  //
  // import {
  //   compute, copyFrom, syncFields, onChange, enableWhen, disableWhen, resetWhen, revalidateWhen,
  // } from '@reformer/core/behaviors';

  // Вычисляемое поле (авто-трекинг зависимостей внутри read):
  // compute(model.$.total, () => model.price * model.qty);

  // Вычисляемое из явного списка источников:
  // computeFrom([model.$.amount, model.$.rate, model.$.term], model.$.monthlyPayment,
  //   (amount, rate, term) => annuity(amount, rate, term));

  // Копирование значения (опционально по условию):
  // copyFrom(model.$.email, model.$.login);
  // copyFrom(model.$.legalAddress, model.$.actualAddress, { when: () => model.sameAddress });

  // Двусторонняя синхронизация (с трансформом):
  // syncFields(model.$.priceWithVat, model.$.priceNoVat, { transform: (v) => v / 1.2 });

  // Реакция на изменение (с debounce):
  // onChange(model.$.query, (value) => void search(value), { debounce: 300 });

  // Доступность поля по условию:
  // enableWhen(model.$.companyName, () => model.employmentStatus === 'employed');
  // disableWhen(model.$.promoCode, () => !model.hasPromo, { resetOnDisable: true });

  // Сброс поля при условии:
  // resetWhen(model.$.childrenCount, () => !model.hasChildren, { resetValue: 0 });

  // Ре-валидация зависимого поля (мост к валидации):
  // revalidateWhen([model.$.password], () => void validateModel(model, formValidation));
});
