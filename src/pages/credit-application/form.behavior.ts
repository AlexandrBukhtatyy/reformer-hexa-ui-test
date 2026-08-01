/**
 * Поведение формы «кредитная заявка» — реактивные связи над МОДЕЛЬЮ (вычисляемые поля, копирование,
 * доступность, реакции на изменения). Docs: @reformer/core/behaviors.
 *
 * Слой намеренно ничего не знает про UI-kit: он оперирует значениями модели (`model.$.*`) и нодами
 * формы (`form.*`), а не компонентами. Поэтому переезд с @reformer/ui-kit на @kaspersky/hexa-ui его
 * не затрагивает — файл перенесён из исходного примера один-в-один.
 *
 * Гибрид по природе: value-операции (compute/copyFrom/transformValue) пишут сигналы модели,
 * state/UI-операции (enableWhen, reset/clear/updateComponentProps) — ноды формы.
 *
 * Свободные операторы сами регистрируются в активной схеме, поэтому массива cleanup'ов здесь нет:
 * жизненным циклом владеет `createForm({ behavior })`.
 */
import {
  defineFormBehavior,
  compute,
  copyFrom,
  enableWhen,
  onChange,
  transformValue,
  apply,
  type ReadonlySignal,
} from '@reformer/core/behaviors';
import type { Address, CoBorrower, CreditApplicationForm, PersonalData } from './types';
import {
  computeAge,
  computeCoBorrowersIncome,
  computeFullName,
  computeInitialPayment,
  computeInterestRate,
  computeMonthlyPayment,
  computePaymentRatio,
  computeTotalIncome,
} from './compute';
import { fetchCarModels, fetchCities } from './api';

// =====================================================================================
// 0. Пользовательские операторы
//
// Контракт @reformer/core/behaviors открыт: оператор — обычная функция поверх встроенных (те сами
// регистрируются в активной схеме), поэтому на месте вызова свой оператор неотличим от встроенного.
//
// Цели описаны структурно, а не импортом FieldNode/ArrayNode: оператору достаточно нужных методов,
// и он остаётся применимым к любой ноде с таким контрактом.
// =====================================================================================

/** Нода-поле с динамическими опциями (Select и т.п.). */
interface OptionsTarget {
  reset(): void;
  updateComponentProps(props: Record<string, unknown>): void;
}

/** Нода-массив, которую можно очистить. */
interface Clearable {
  clear(): void;
}

/**
 * Подгружать опции поля при изменении источника (с debounce и опциональным сбросом цели).
 *
 * Колбэк `onChange` core запускает ВНЕ effect-контекста (микротаск/таймер), поэтому писать ноды
 * (`updateComponentProps`/`reset`) отсюда безопасно — ручной `defer`/`queueMicrotask` нужен только
 * там, где `updateComponentProps` идёт в одном тике с `form.patchValue` (загрузка заявки в ui.ts),
 * иначе preact бросает «Cycle detected».
 *
 * @example
 * loadOptionsOn(model.$.carBrand, form.carModel, fetchCarModels, { resetTarget: true });
 */
export function loadOptionsOn<TValue, TOption>(
  source: ReadonlySignal<TValue>,
  target: OptionsTarget,
  fetcher: (value: TValue) => Promise<{ data: TOption[] }>,
  options: { debounce?: number; resetTarget?: boolean } = {},
): void {
  const { debounce = 300, resetTarget = false } = options;
  onChange(
    source,
    async (value, { signal }) => {
      if (resetTarget) target.reset();
      if (!value) {
        target.updateComponentProps({ options: [] });
        return;
      }
      try {
        const { data } = await fetcher(value);
        // Пока ждали ответ, источник мог смениться — core аннулирует signal предыдущего вызова.
        // Без этой проверки поздний ответ по старому значению перетирает актуальные опции.
        if (signal.aborted) return;
        target.updateComponentProps({ options: data });
      } catch {
        if (signal.aborted) return;
        target.updateComponentProps({ options: [] });
      }
    },
    { debounce },
  );
}

/** Очистить массив-ноду при снятии булева флага. */
export function clearWhenOff(flag: ReadonlySignal<boolean>, array: Clearable): void {
  onChange(flag, (on) => {
    if (!on) array.clear();
  });
}

// =====================================================================================
// 1. Под-схема адреса — переиспользуется для адреса регистрации и адреса проживания
// =====================================================================================

export const addressBehavior = defineFormBehavior<Address>(({ model, form }) => {
  // Подгрузка городов по региону. Город НЕ сбрасываем (region выставляется раньше city при загрузке;
  // поле «Город» — обычный Input, список носит вспомогательный характер).
  loadOptionsOn(model.$.region, form.city, fetchCities);

  // Автоформат почтового индекса (только цифры, ≤ 6).
  transformValue(model.$.postalCode, (pc) => (pc ?? '').replace(/\D/g, '').slice(0, 6));
});

// =====================================================================================
// 2. Поведение кредитной заявки
// =====================================================================================

export const creditApplicationBehavior = defineFormBehavior<CreditApplicationForm>(
  ({ model, form }) => {
    // ===================================================================
    // 1. compute — вычисляемые поля (auto-tracking)
    //
    // Зависимости собираются ЧТЕНИЕМ сигналов внутри read — списка зависимостей нет.
    // Передача `model` целиком работает потому, что callee деструктурирует его синхронно,
    // не выходя из окна трекинга.
    // ===================================================================
    compute(model.$.interestRate, () =>
      computeInterestRate({
        loanType: model.loanType,
        registrationAddress: { region: model.registrationAddress.region },
        hasProperty: model.hasProperty,
        // .map подписывает на изменение длины массива (нужен только count);
        // .toArray() дал бы снимок БЕЗ подписки и ставка перестала бы пересчитываться.
        properties: model.properties.map(() => null),
      }),
    );
    compute(model.$.monthlyPayment, () => computeMonthlyPayment(model));
    // Первоначальный взнос (20% стоимости) — только для ипотеки
    compute(model.$.initialPayment, () => computeInitialPayment(model), {
      when: () => model.loanType === 'mortgage',
    });
    compute(model.$.fullName, () => computeFullName(model));
    compute(model.$.age, () =>
      computeAge({ personalData: { birthDate: model.personalData.birthDate } as PersonalData }),
    );
    compute(model.$.coBorrowersIncome, () =>
      computeCoBorrowersIncome({
        // Нужен НАСТОЯЩИЙ массив: computeCoBorrowersIncome отсекает не-массивы через Array.isArray,
        // и `model.coBorrowers` (фасад ModelArray) молча дал бы 0.
        coBorrowers: model.coBorrowers.map((cb) => ({
          monthlyIncome: cb.monthlyIncome,
        })) as CoBorrower[],
      }),
    );
    compute(model.$.totalIncome, () => computeTotalIncome(model));
    compute(model.$.paymentToIncomeRatio, () => computePaymentRatio(model));

    // ===================================================================
    // 2. copyFrom — копирование значений (скаляр + группа)
    // ===================================================================
    copyFrom(model.$.email, model.$.emailAdditional, { when: () => model.sameEmail === true });
    copyFrom(model.$.registrationAddress, model.$.residenceAddress, {
      when: () => model.sameAsRegistration === true,
    });

    // ===================================================================
    // 3. enableWhen — условные поля (массив целей; группа residence)
    //
    // Парная защита к hideWhen из ui.ts: спрятанное поле остаётся в модели, и без disable+reset
    // его значение молча уехало бы в заявку.
    // ===================================================================
    enableWhen(
      [model.$.propertyValue, model.$.initialPayment],
      () => model.loanType === 'mortgage',
      {
        resetOnDisable: true,
      },
    );
    enableWhen(
      [model.$.carBrand, model.$.carModel, model.$.carYear, model.$.carPrice],
      () => model.loanType === 'car',
      { resetOnDisable: true },
    );
    enableWhen(
      [
        model.$.companyName,
        model.$.companyInn,
        model.$.companyPhone,
        model.$.companyAddress,
        model.$.position,
      ],
      () => model.employmentStatus === 'employed',
      { resetOnDisable: true },
    );
    enableWhen(
      [model.$.businessType, model.$.businessInn, model.$.businessActivity],
      () => model.employmentStatus === 'selfEmployed',
      { resetOnDisable: true },
    );
    // Адрес проживания — группа: enable/disable без сброса (значение копируется из адреса регистрации)
    enableWhen(model.$.residenceAddress, () => model.sameAsRegistration === false);

    // ===================================================================
    // 4. Реакции — загрузка справочников / лимиты / очистка массивов
    // ===================================================================
    loadOptionsOn(model.$.carBrand, form.carModel, fetchCarModels, { resetTarget: true });

    // Максимальная сумма кредита от дохода (≤ 10 годовых, не более 10 млн).
    // onChange по умолчанию не immediate — на маунте лимит не применяется, стартовый max берётся
    // из статических componentProps в form.json.
    onChange(model.$.totalIncome, (totalIncome) => {
      if (totalIncome && totalIncome > 0) {
        form.loanAmount.updateComponentProps({ max: Math.min(totalIncome * 12 * 10, 10_000_000) });
      }
    });
    // Максимальный срок с учётом возраста (погашение до 70 лет)
    onChange(model.$.age, (age) => {
      if (age && age >= 18) {
        form.loanTerm.updateComponentProps({ max: Math.min(Math.max(70 - age, 1) * 12, 240) });
      }
    });

    clearWhenOff(model.$.hasProperty, form.properties);
    clearWhenOff(model.$.hasExistingLoans, form.existingLoans);
    clearWhenOff(model.$.hasCoBorrower, form.coBorrowers);

    // ===================================================================
    // 5. Под-схема адреса — на оба адреса
    // ===================================================================
    apply([model.$.registrationAddress, model.$.residenceAddress], addressBehavior);
  },
);
