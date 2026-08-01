/**
 * Схема валидации формы «registration» — правила над МОДЕЛЬЮ (не в JSON-схеме формы).
 * Запуск: validateModel(model, formValidation). Docs: @reformer/core/validation.
 *
 * Импортируется ровно то, что вызывается: tsc собран с `noUnusedLocals`, и «шпаргалка про запас»
 * в импортах держала бы сборку красной постоянно — а постоянно красная сборка перестаёт что-либо
 * значить. Примеры остальных правил лежат ниже комментарием, вместе со строками их импорта.
 */
import { validate, defineValidationSchema } from "@reformer/core/validation";
import {
  required,
  email,
  minLength,
  maxLength,
} from "@reformer/core/validators";
import type { FormShape } from "./form.model";

export const formValidation = defineValidationSchema<FormShape>(({ model }) => {
  // ── Активные правила ──
  validate(model.$.name, [
    required({ message: "Укажите имя" }),
    minLength(2),
    maxLength(50),
  ]);
  validate(model.$.email, [required(), email()]);

  // ── Шпаргалка (скопируйте под свои поля, добавив нужное в импорты наверху файла) ──
  //
  // import { validateAsync, validateWhen, cross, each, apply } from '@reformer/core/validation';
  // import {
  //   min, max, pattern, url, phone, isNumber, integer, multipleOf, nonNegative,
  // } from '@reformer/core/validators';

  // Обязательное:
  // validate(model.$.field, [required({ message: 'Обязательное поле' })]);

  // Число в диапазоне:
  // validate(model.$.amount, [required(), isNumber(), min(1000), max(1_000_000)]);

  // Длина строки:
  // validate(model.$.login, [required(), minLength(3), maxLength(20)]);

  // Регэксп (ИНН/паспорт/код):
  // validate(model.$.inn, [required(), pattern(/^\d{10,12}$/, { message: 'ИНН — 10–12 цифр' })]);

  // URL / телефон / целое / кратное / неотрицательное:
  // validate(model.$.site, [url()]);
  // validate(model.$.phone, [required(), phone()]);
  // validate(model.$.count, [integer(), nonNegative()]);
  // validate(model.$.step, [multipleOf(5)]);

  // Условная валидация (активна только при условии):
  // validateWhen(() => model.employmentStatus === 'employed', () => {
  //   validate(model.$.companyName, [required({ message: 'Укажите компанию' })]);
  //   validate(model.$.companyInn, [required(), pattern(/^\d{10}$/)]);
  // });

  // Cross-field (сравнение полей — читает снапшот формы):
  // cross(model.$.initialPayment, (f) =>
  //   f.initialPayment > f.propertyValue
  //     ? { code: 'tooBig', message: 'Взнос больше стоимости' }
  //     : null,
  // );

  // Массив: правило к каждому элементу:
  // each(model.coBorrowers, (item) => {
  //   validate(item.$.firstName, [required()]);
  //   validate(item.$.income, [isNumber(), min(0)]);
  // });

  // Async (проверка на сервере). ВАЖНО: исключение из правила наружу НЕ выходит —
  // `validateModel` вернёт true, и упавшая проверка молча зачтётся как пройденная.
  // Поэтому ошибку запроса ловим сами и роутим явным кодом:
  // validateAsync(model.$.login, [
  //   async (value) => {
  //     try {
  //       return (await isLoginTaken(value)) ? { code: 'taken', message: 'Логин занят' } : null;
  //     } catch {
  //       return { code: 'checkFailed', message: 'Не удалось проверить логин, попробуйте ещё раз' };
  //     }
  //   },
  // ]);

  // Композиция под-схем (например, по шагам):
  // apply(step1Validation, step2Validation);
});
