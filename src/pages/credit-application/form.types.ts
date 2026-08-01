/**
 * Типы кредитной заявки — форма данных (M1) и вспомогательные словарные типы.
 *
 * В источнике каждый вложенный блок жил рядом со своей вложенной формой
 * (`components/nested-forms/<Блок>/types.ts`). Здесь вложенных форм нет — layout целиком приехал
 * в `form.json`, поэтому дробить типы по папкам не за чем: один файл = одна форма данных.
 *
 * Значения полей менять НЕЛЬЗЯ: `form.json` биндит листья по путям (`$model(personalData.lastName)`),
 * и любое расхождение имени с типом ловится только в рантайме — конвертер просто не найдёт сигнал.
 */

/** Вариант выбора: и для `$dataSource(...)` в схеме, и для ответов API (города/модели авто). */
export interface Option {
  value: string;
  label: string;
}

export type LoanType = 'consumer' | 'mortgage' | 'car' | 'business' | 'refinancing';
export type EmploymentStatus = 'employed' | 'selfEmployed' | 'unemployed' | 'retired' | 'student';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type EducationLevel = 'secondary' | 'specialized' | 'higher' | 'postgraduate';

/**
 * Адрес (в источнике — вложенная форма, здесь — обычная группа модели).
 *
 * `apartment` опционален по типу, но в initial-значениях он всё равно есть строкой: под M1
 * отсутствующий ключ означает отсутствие сигнала, и лист схемы для него просто не отрисуется.
 */
export interface Address {
  region: string;
  city: string;
  street: string;
  house: string;
  apartment?: string;
  postalCode: string;
}

/** Личные данные заявителя. */
export interface PersonalData {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  birthPlace: string;
  gender: 'male' | 'female';
}

/** Паспортные данные. */
export interface PassportData {
  series: string;
  number: string;
  issueDate: string;
  issuedBy: string;
  departmentCode: string;
}

/**
 * Тип имущества. Union шире, чем в источнике: `form.json` рисует у `properties[].type` inline-список
 * из шести вариантов, где есть `commercial` и `other` — их не было в исходном union'е, а схему
 * мы копируем байт в байт. Плюс `none` из источника, который справочник API не присылает.
 */
export type PropertyType = 'apartment' | 'house' | 'car' | 'land' | 'commercial' | 'other' | 'none';

export interface Property {
  /** Приходит с сервера; ни одна фабрика его не заполняет — держим ради совместимости с API. */
  id?: string;
  type: PropertyType;
  description: string;
  estimatedValue: number;
  hasEncumbrance: boolean;
}

export interface ExistingLoan {
  id?: string;
  bank: string;
  /** Не union: значения приходят из `EXISTING_LOAN_TYPES`, но типом не фиксируются (как в источнике). */
  type: string;
  amount: number;
  remainingAmount: number;
  monthlyPayment: number;
  maturityDate: string;
}

/**
 * Созаёмщик. `personalData` здесь — СВОЙ инлайновый объект из четырёх полей, а не {@link PersonalData}:
 * схема рисует у созаёмщика только эти четыре листа, и фабрика пустой строки заполняет только их.
 * Подстановка общего типа добавила бы полям `birthPlace`/`gender` сигналы, которых в строке нет.
 */
export interface CoBorrower {
  id?: string;
  personalData: {
    lastName: string;
    firstName: string;
    middleName: string;
    birthDate: string;
  };
  phone: string;
  email: string;
  relationship: string;
  monthlyIncome: number;
}

/**
 * Форма данных кредитной заявки (6 шагов + вычисляемые поля).
 *
 * Числовые поля объявлены как `number`, но в initial-снимке лежат `null` — так required-валидаторы
 * отличают «не заполнено» от нуля. Расхождение снимает каст в `model.ts`, тип не трогаем.
 */
export interface CreditApplicationForm {
  // Шаг 1: Основная информация
  loanType: LoanType;
  loanAmount: number;
  loanTerm: number;
  loanPurpose: string;

  // Специфичные поля для ипотеки
  propertyValue: number;
  initialPayment: number;

  // Специфичные поля для автокредита
  carBrand: string;
  carModel: string;
  carYear: number;
  carPrice: number;

  // Шаг 2: Персональные данные
  personalData: PersonalData;
  passportData: PassportData;
  inn: string;
  snils: string;

  // Шаг 3: Контактная информация
  phoneMain: string;
  phoneAdditional: string;
  email: string;
  emailAdditional: string;
  registrationAddress: Address;
  sameAsRegistration: boolean;
  residenceAddress: Address;

  // Шаг 4: Информация о занятости
  employmentStatus: EmploymentStatus;
  companyName: string;
  companyInn: string;
  companyPhone: string;
  companyAddress: string;
  position: string;
  workExperienceTotal: number;
  workExperienceCurrent: number;
  monthlyIncome: number;
  additionalIncome: number;
  additionalIncomeSource: string;
  businessType: string;
  businessInn: string;
  businessActivity: string;

  // Шаг 5: Дополнительная информация
  maritalStatus: MaritalStatus;
  dependents: number;
  education: EducationLevel;
  /** Сканы документов. `File` — Opaque для модели: сигнал хранит ссылку, а не копию. */
  documents: File[] | null;
  hasProperty: boolean;
  properties: Property[];
  hasExistingLoans: boolean;
  existingLoans: ExistingLoan[];
  hasCoBorrower: boolean;
  coBorrowers: CoBorrower[];

  // Шаг 6: Согласия
  agreePersonalData: boolean;
  agreeCreditHistory: boolean;
  agreeMarketing: boolean;
  agreeTerms: boolean;
  confirmAccuracy: boolean;
  electronicSignature: string;

  // Вычисляемые поля (compute владеет ими: `model.set()` игнорирует их значения из payload)
  interestRate: number;
  monthlyPayment: number;
  fullName: string;
  age: number | null;
  totalIncome: number;
  paymentToIncomeRatio: number;
  coBorrowersIncome: number;
  /** Не вычисляемое, а переключатель UI «email тот же» — источник группирует его сюда же. */
  sameEmail: boolean;
}
