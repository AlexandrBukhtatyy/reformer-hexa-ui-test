/**
 * Чистые функции вычисляемых полей заявки (ставка, платёж, возраст, доходы).
 *
 * Каждая принимает ОДИН объект-параметр и ничего не знает ни о модели, ни о реактивности:
 * подписки собирает `compute()` в behavior.ts, читая сигналы при вызове. Поэтому здесь нельзя
 * появляться ни асинхронности, ни обращениям к модели — иначе зависимость не отследится.
 */

import type { CoBorrower, PersonalData } from './types';

/**
 * Процентная ставка по типу кредита с надбавками/скидками.
 *
 * @returns ставка в процентах годовых
 */
export function computeInterestRate({
  loanType,
  registrationAddress,
  hasProperty,
  properties,
}: {
  loanType: string;
  registrationAddress: unknown;
  hasProperty: boolean;
  properties: unknown[];
}): number {
  // Базовые ставки по типам кредита
  const baseRates: Record<string, number> = {
    consumer: 15.5,
    mortgage: 8.5,
    car: 12.0,
    business: 18.0,
    refinancing: 14.0,
  };

  let rate = baseRates[loanType] || 15.0;

  // Надбавки и скидки
  if (loanType === 'mortgage') {
    // Надбавка за регион (Москва дороже). Адрес приходит нетипизированным куском модели —
    // читаем поле через каст, чтобы не тащить сюда зависимость от формы адреса.
    const region = (registrationAddress as Record<string, unknown>)?.region;
    if (region === 'moscow') {
      rate += 0.5;
    }
  }

  // TODO (из источника): скидка 1 п.п. за КАСКО для автокредита — нужен параметр `carInsurance`,
  // поля под него в модели пока нет.

  // Скидка за обеспечение (имущество)
  if (hasProperty === true && properties && properties.length > 0) {
    rate -= 0.5;
  }

  return Math.max(rate, 0);
}

/**
 * Ежемесячный платёж по формуле аннуитета:
 * `P * (r * (1 + r)^n) / ((1 + r)^n - 1)`, где P — сумма, r — месячная ставка, n — срок в месяцах.
 *
 * @returns платёж (₽)
 */
export function computeMonthlyPayment({
  loanAmount,
  loanTerm,
  interestRate,
}: {
  loanAmount: number;
  loanTerm: number;
  interestRate: number;
}): number {
  if (!loanAmount || !loanTerm || interestRate === undefined) {
    return 0;
  }

  // Месячная процентная ставка
  const monthlyRate = interestRate / 12 / 100;

  // Если ставка 0, то платеж = сумма / срок
  if (monthlyRate === 0) {
    return loanAmount / loanTerm;
  }

  // Формула аннуитетного платежа
  const coefficient =
    (monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / (Math.pow(1 + monthlyRate, loanTerm) - 1);
  const monthlyPayment = loanAmount * coefficient;

  return Math.round(monthlyPayment);
}

/**
 * Первоначальный взнос — 20% от стоимости недвижимости.
 *
 * @returns взнос (₽)
 */
export function computeInitialPayment({ propertyValue }: { propertyValue: number }): number {
  if (!propertyValue) {
    return 0;
  }

  return Math.round(propertyValue * 0.2);
}

/**
 * Полное имя: Фамилия Имя Отчество (пустые части выпадают, лишних пробелов не остаётся).
 */
export function computeFullName({ personalData }: { personalData: PersonalData }): string {
  const data = personalData;
  const lastName = data?.lastName || '';
  const firstName = data?.firstName || '';
  const middleName = data?.middleName || '';

  return [lastName, firstName, middleName].filter(Boolean).join(' ');
}

/**
 * Возраст (полных лет) из даты рождения.
 *
 * @returns возраст или `null`, если дата не заполнена — на `null` завязаны required-правила
 */
export function computeAge({ personalData }: { personalData: PersonalData }): number | null {
  const birthDate = personalData.birthDate;

  if (!birthDate) {
    return null;
  }

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Общий доход: основной + дополнительный + доход созаёмщиков.
 *
 * @returns доход (₽)
 */
export function computeTotalIncome({
  monthlyIncome,
  additionalIncome,
  coBorrowersIncome,
}: {
  monthlyIncome: number;
  additionalIncome: number;
  coBorrowersIncome?: number;
}): number {
  return (monthlyIncome || 0) + (additionalIncome || 0) + (coBorrowersIncome || 0);
}

/**
 * Доля платежа в доходе.
 *
 * @returns целые проценты
 */
export function computePaymentRatio({
  monthlyPayment,
  totalIncome,
}: {
  monthlyPayment: number;
  totalIncome: number;
}): number {
  if (!monthlyPayment || !totalIncome || totalIncome === 0) {
    return 0;
  }

  return Math.round((monthlyPayment / totalIncome) * 100);
}

/**
 * Суммарный доход созаёмщиков.
 *
 * ⚠️ Проверка `Array.isArray` не формальность: если сюда передать `ModelArray` (фасад массива
 * модели) вместо результата `model.coBorrowers.map(...)`, функция молча вернёт 0.
 */
export function computeCoBorrowersIncome({ coBorrowers }: { coBorrowers: CoBorrower[] }): number {
  if (!coBorrowers || !Array.isArray(coBorrowers)) {
    return 0;
  }

  return coBorrowers.reduce((sum, coBorrower) => {
    const income = coBorrower.monthlyIncome || 0;
    return sum + (typeof income === 'number' ? income : 0);
  }, 0);
}
