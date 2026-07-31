/**
 * Справочники-константы формы. В `form.json` попадают через реестр как `$dataSource(ИМЯ)` —
 * схема статична и импортировать модули не умеет, поэтому имена констант тут и в реестре
 * обязаны совпадать буквально.
 *
 * Типизация `Option[]` добавлена к исходным литералам осознанно: реестр отдаёт их в
 * `componentProps.options` контролов, и общий тип избавляет от дублирования формы записи.
 */

import type { Option } from './types';

export const LOAN_TYPES: Option[] = [
  { value: 'consumer', label: 'Потребительский кредит' },
  { value: 'mortgage', label: 'Ипотека' },
  { value: 'car', label: 'Автокредит' },
  { value: 'business', label: 'Кредит для бизнеса' },
  { value: 'refinancing', label: 'Рефинансирование' },
];

export const EMPLOYMENT_STATUSES: Option[] = [
  { value: 'employed', label: 'Работаю по найму' },
  { value: 'selfEmployed', label: 'Индивидуальный предприниматель' },
  { value: 'unemployed', label: 'Не работаю' },
  { value: 'retired', label: 'Пенсионер' },
  { value: 'student', label: 'Студент' },
];

export const MARITAL_STATUSES: Option[] = [
  { value: 'single', label: 'Холост/не замужем' },
  { value: 'married', label: 'Женат/Замужем' },
  { value: 'divorced', label: 'Разведен(а)' },
  { value: 'widowed', label: 'Вдовец/Вдова' },
];

export const EDUCATIONS: Option[] = [
  { value: 'secondary', label: 'Среднее' },
  { value: 'specialized', label: 'Среднее специальное' },
  { value: 'higher', label: 'Высшее' },
  { value: 'postgraduate', label: 'Послевузовское' },
];

/**
 * Не используется схемой: у `properties[].type` в `form.json` лежит СВОЙ inline-список из шести
 * вариантов (там есть `commercial`/`other`, а `none` — нет). Константа сохранена ради паритета
 * с источником; подменять ею inline-список нельзя — это правка схемы.
 */
export const PROPERTY_TYPES: Option[] = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'house', label: 'Дом' },
  { value: 'car', label: 'Автомобиль' },
  { value: 'land', label: 'Земельный участок' },
  { value: 'none', label: 'Нет' },
];

export const GENDERS: Option[] = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
];

export const EXISTING_LOAN_TYPES: Option[] = [
  { value: 'consumer', label: 'Потребительский кредит' },
  { value: 'mortgage', label: 'Ипотека' },
  { value: 'car', label: 'Автокредит' },
  { value: 'creditCard', label: 'Кредитная карта' },
  { value: 'other', label: 'Другое' },
];

export const RELATIONSHIPS: Option[] = [
  { value: 'spouse', label: 'Супруг(а)' },
  { value: 'parent', label: 'Родитель' },
  { value: 'child', label: 'Ребенок' },
  { value: 'sibling', label: 'Брат/Сестра' },
  { value: 'relative', label: 'Другой родственник' },
  { value: 'other', label: 'Другое' },
];
