/**
 * Справочники-константы формы. В `form.json` попадают через реестр как `$dataSource(ИМЯ)` —
 * схема статична и импортировать модули не умеет, поэтому имена констант тут и в реестре
 * обязаны совпадать буквально.
 *
 * Типизация `Option[]` добавлена к исходным литералам осознанно: реестр отдаёт их в
 * `componentProps.options` контролов, и общий тип избавляет от дублирования формы записи.
 */

import type { Option } from "./form.types";

export const LOAN_TYPES: Option[] = [
  { value: "consumer", label: "Потребительский кредит" },
  { value: "mortgage", label: "Ипотека" },
  { value: "car", label: "Автокредит" },
  { value: "business", label: "Кредит для бизнеса" },
  { value: "refinancing", label: "Рефинансирование" },
];

export const EMPLOYMENT_STATUSES: Option[] = [
  { value: "employed", label: "Работаю по найму" },
  { value: "selfEmployed", label: "Индивидуальный предприниматель" },
  { value: "unemployed", label: "Не работаю" },
  { value: "retired", label: "Пенсионер" },
  { value: "student", label: "Студент" },
];

export const MARITAL_STATUSES: Option[] = [
  { value: "single", label: "Холост/не замужем" },
  { value: "married", label: "Женат/Замужем" },
  { value: "divorced", label: "Разведен(а)" },
  { value: "widowed", label: "Вдовец/Вдова" },
];

export const EDUCATIONS: Option[] = [
  { value: "secondary", label: "Среднее" },
  { value: "specialized", label: "Среднее специальное" },
  { value: "higher", label: "Высшее" },
  { value: "postgraduate", label: "Послевузовское" },
];

/**
 * Не используется схемой: у `properties[].type` в `form.json` лежит СВОЙ inline-список из шести
 * вариантов (там есть `commercial`/`other`, а `none` — нет). Константа сохранена ради паритета
 * с источником; подменять ею inline-список нельзя — это правка схемы.
 */
export const PROPERTY_TYPES: Option[] = [
  { value: "apartment", label: "Квартира" },
  { value: "house", label: "Дом" },
  { value: "car", label: "Автомобиль" },
  { value: "land", label: "Земельный участок" },
  { value: "none", label: "Нет" },
];

export const GENDERS: Option[] = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
];

/**
 * Правовые формы бизнеса. Раньше поле было текстовым с подсказкой «ИП, ООО и т.д.» — то есть
 * список вариантов уже существовал, но жил в плейсхолдере и ничего не гарантировал.
 */
export const BUSINESS_TYPES: Option[] = [
  { value: "individual", label: "Индивидуальный предприниматель" },
  { value: "selfEmployed", label: "Самозанятый" },
  { value: "llc", label: "ООО" },
  { value: "jsc", label: "АО" },
  { value: "farm", label: "КФХ" },
];

/**
 * Регионы. Ключи совпадают с ключами `MOCK_CITIES_BY_REGION` в `api.ts` — по значению этого поля
 * подгружаются города, и расхождение имени оставит список городов пустым. Тот же ключ читает
 * `computeInterestRate` (надбавка 0.5 п.п. за `moscow`).
 */
export const REGIONS: Option[] = [
  { value: "moscow", label: "Москва" },
  { value: "spb", label: "Санкт-Петербург" },
  { value: "tatarstan", label: "Республика Татарстан" },
  { value: "novosibirsk-obl", label: "Новосибирская область" },
  { value: "sverdlovsk-obl", label: "Свердловская область" },
  { value: "nizhny-obl", label: "Нижегородская область" },
  { value: "chelyabinsk-obl", label: "Челябинская область" },
  { value: "samara-obl", label: "Самарская область" },
  { value: "omsk-obl", label: "Омская область" },
  { value: "rostov-obl", label: "Ростовская область" },
];

/**
 * Марки авто. Ключи совпадают с `MOCK_CAR_MODELS` в `api.ts`: по выбранной марке подгружаются
 * модели, и марка без записи в моке дала бы пустой список моделей.
 */
export const CAR_BRANDS: Option[] = [
  { value: "bmw", label: "BMW" },
  { value: "chery", label: "Chery" },
  { value: "geely", label: "Geely" },
  { value: "haval", label: "Haval" },
  { value: "hyundai", label: "Hyundai" },
  { value: "kia", label: "Kia" },
  { value: "lada", label: "Lada" },
  { value: "mazda", label: "Mazda" },
  { value: "nissan", label: "Nissan" },
  { value: "renault", label: "Renault" },
  { value: "skoda", label: "Škoda" },
  { value: "toyota", label: "Toyota" },
  { value: "volkswagen", label: "Volkswagen" },
];

/**
 * Банки — базовый список для поля «Банк» у существующих кредитов.
 *
 * Дублирует фикстуру `MOCK_DICTIONARIES.banks` СОЗНАТЕЛЬНО: справочник с сервера
 * (`fetchDictionaries`) поведение кладёт только в ноды кредитов, которые уже были в заявке на
 * момент загрузки, а кредит, добавленный кнопкой позже, получает опции ТОЛЬКО из схемы.
 * Та же схема «статика в схеме + переопределение с сервера» уже действует у `properties[].type`.
 */
export const BANKS: Option[] = [
  { value: "sberbank", label: "Сбербанк" },
  { value: "vtb", label: "ВТБ" },
  { value: "alfabank", label: "Альфа-Банк" },
  { value: "tinkoff", label: "Тинькофф" },
  { value: "gazprombank", label: "Газпромбанк" },
  { value: "raiffeisen", label: "Райффайзенбанк" },
  { value: "rosbank", label: "Росбанк" },
  { value: "sovcombank", label: "Совкомбанк" },
];

export const EXISTING_LOAN_TYPES: Option[] = [
  { value: "consumer", label: "Потребительский кредит" },
  { value: "mortgage", label: "Ипотека" },
  { value: "car", label: "Автокредит" },
  { value: "creditCard", label: "Кредитная карта" },
  { value: "other", label: "Другое" },
];

export const RELATIONSHIPS: Option[] = [
  { value: "spouse", label: "Супруг(а)" },
  { value: "parent", label: "Родитель" },
  { value: "child", label: "Ребенок" },
  { value: "sibling", label: "Брат/Сестра" },
  { value: "relative", label: "Другой родственник" },
  { value: "other", label: "Другое" },
];
