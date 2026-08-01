/**
 * M1: модель данных кредитной заявки (источник истины значений).
 *
 * `createInitialCreditApplication()` отдаёт начальный СНИМОК — саму модель из него строит
 * `useJsonForm` (опция `initial`). Значения принадлежат модели; ноды формы лишь ссылаются на её
 * сигналы, поэтому набор ключей здесь задаёт и набор биндингов схемы: лист `$model(path)`,
 * которому в снимке не нашлось значения, не получит сигнала и не отрисуется.
 *
 * Здесь же — фабрики «пустых» элементов массивов: при добавлении нового элемента нужно передать
 * ПОЛНЫЙ объект (все поля), иначе под-модель элемента не получит сигналов для полей схемы.
 */

import type {
  CoBorrower,
  CreditApplicationForm,
  ExistingLoan,
  Property,
} from "./form.types";

/**
 * Начальные значения формы (определяют форму данных и initial-снимок модели).
 *
 * Числовые «пустые» поля держим как `null` — required-валидаторы отличают по нему «не заполнено»
 * от честного нуля. Тип объявляет их как `number`, поэтому расхождение снимает каст
 * `as unknown as CreditApplicationForm`: заменить `null` на `0` нельзя — валидация пропустит
 * незаполненные поля.
 */
export const createInitialCreditApplication = (): CreditApplicationForm =>
  ({
    // Шаг 1: Основная информация
    loanType: "consumer",
    loanAmount: null,
    loanTerm: 12,
    loanPurpose: "",
    propertyValue: null,
    initialPayment: null,
    carBrand: "",
    carModel: "",
    carYear: null,
    carPrice: null,

    // Шаг 2: Персональные данные
    personalData: {
      lastName: "",
      firstName: "",
      middleName: "",
      birthDate: "",
      birthPlace: "",
      gender: "male",
    },
    passportData: {
      series: "",
      number: "",
      issueDate: "",
      issuedBy: "",
      departmentCode: "",
    },
    inn: "",
    snils: "",

    // Шаг 3: Контактная информация
    phoneMain: "",
    phoneAdditional: "",
    email: "",
    emailAdditional: "",
    registrationAddress: {
      region: "",
      city: "",
      street: "",
      house: "",
      apartment: "",
      postalCode: "",
    },
    sameAsRegistration: true,
    residenceAddress: {
      region: "",
      city: "",
      street: "",
      house: "",
      apartment: "",
      postalCode: "",
    },

    // Шаг 4: Информация о занятости
    employmentStatus: "employed",
    companyName: "",
    companyInn: "",
    companyPhone: "",
    companyAddress: "",
    position: "",
    workExperienceTotal: null,
    workExperienceCurrent: null,
    monthlyIncome: null,
    additionalIncome: null,
    additionalIncomeSource: "",
    businessType: "",
    businessInn: "",
    businessActivity: "",

    // Шаг 5: Дополнительная информация
    maritalStatus: "single",
    dependents: 0,
    education: "higher",
    documents: null,
    hasProperty: false,
    properties: [],
    hasExistingLoans: false,
    existingLoans: [],
    hasCoBorrower: false,
    coBorrowers: [],

    // Шаг 6: Согласия
    agreePersonalData: false,
    agreeCreditHistory: false,
    agreeMarketing: false,
    agreeTerms: false,
    confirmAccuracy: false,
    electronicSignature: "",

    // Вычисляемые поля
    interestRate: 0,
    monthlyPayment: 0,
    fullName: "",
    age: null,
    totalIncome: 0,
    paymentToIncomeRatio: 0,
    coBorrowersIncome: 0,
    sameEmail: false,
  }) as unknown as CreditApplicationForm;

// ============================================================================
// Фабрики «пустых» элементов массивов (полный объект — все поля обязательны)
// ============================================================================

/**
 * Значения фабрик продублированы в `form.json` как `initialValue` у соответствующих `FormArray`
 * (схема не умеет импортировать модули). Правки держать синхронными — расходиться им нельзя.
 */
export const createBlankProperty = (): Property => ({
  type: "apartment",
  description: "",
  estimatedValue: 0,
  hasEncumbrance: false,
});

export const createBlankExistingLoan = (): ExistingLoan => ({
  bank: "",
  type: "consumer",
  amount: 0,
  remainingAmount: 0,
  monthlyPayment: 0,
  maturityDate: "",
});

export const createBlankCoBorrower = (): CoBorrower => ({
  personalData: {
    lastName: "",
    firstName: "",
    middleName: "",
    birthDate: "",
  },
  phone: "",
  email: "",
  relationship: "spouse",
  monthlyIncome: 0,
});
