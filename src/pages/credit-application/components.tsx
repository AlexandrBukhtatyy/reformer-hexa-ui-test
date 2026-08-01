/**
 * Витринные компоненты кредитной заявки — девять имён, на которые JSON-схема ссылается
 * через `$component(...)`.
 *
 * Схема копируется из источника байт в байт, поэтому имена и точки монтирования те же:
 * меняется только реализация — Tailwind-панельки источника переехали на примитивы hexa-ui
 * (`SectionMessage` / `Card` / `FieldSet.KeyValueMapper` / `Space`).
 *
 * Два инварианта, общих для всего файла:
 *
 * 1. **Пропы не спредятся в DOM.** Рендерер кладёт в узел-контейнер `selector` (строкой), `ref`
 *    и колбэки из `onComponentEvent`; hexa-ui дальше отдаёт неизвестные пропы в `div`, и React
 *    ругался бы на несуществующие атрибуты. Поэтому компоненты ниже либо вовсе не объявляют
 *    пропов (React их просто игнорирует), либо разбирают ровно те, что нужны.
 * 2. **Форма берётся из `useCreditForm()`**, а не из `useFormWizard()`, как в источнике:
 *    hexa-ui `Wizard` не монтирует cdk-контекст мастера (подробности — в form-context.tsx).
 *
 * Форматирование значений (`toLocaleString('ru-RU')`, `toFixed(1)`, прочерки-заглушки, строка
 * «Доход созаемщиков» только при `> 0`) перенесено дословно: это логика, а не оформление.
 */

import type { ReactNode } from 'react';
import { useFormControlValue } from '@reformer/core';
import {
  Button,
  Divider,
  FieldSet,
  Heading,
  SectionMessage,
  Space,
  Text,
  type KeyValuePair,
} from '@kaspersky/hexa-ui';
// Пофайлово, а не через барель: реестр моста импортирует этот модуль, и импорт из index.ts
// замкнул бы цикл (index → registry → components → index).
import { HexaCard } from '../../libs/hexa-ui/HexaCard';
import { useCreditForm } from './form-context';

// ============================================================================
// Константы и общие мелочи
// ============================================================================

/** Порог «дорогого» платежа из источника: строго выше него показываем красную плашку. */
const HIGH_PAYMENT_THRESHOLD = 30000;

/** Пункты блока «Что будет дальше?» — вынесены, чтобы разметка не тонула в тексте. */
const NEXT_STEPS = [
  'Ваша заявка будет рассмотрена в течение 24 часов',
  'Мы свяжемся c вами для подтверждения информации',
  'После одобрения вы получите индивидуальное предложение',
  'Вы сможете подписать договор онлайн или в офисе',
] as const;

/**
 * Строка `KeyValueMapper` со СВОИМ `testId`: без него маппер подставляет в `data-testid`
 * подпись строки, то есть кириллицу («ФИО», «Итого»), — по такому селектору не поищешь.
 */
type SummaryRow = KeyValuePair & { testId?: string };

interface SummaryValueProps {
  /**
   * Значение строки. `testId` в источнике висел РОВНО на числе (`<span>{value}</span> ₽/мес`),
   * поэтому единицы измерения передаются снаружи `<Text testId=…>`, а не внутри него.
   */
  children: ReactNode;
  /** Серая подпись под значением — пояснение, откуда число взялось. */
  hint?: string;
}

/** Значение + необязательная подпись: общий кусок обеих summary-секций. */
function SummaryValue({ children, hint }: SummaryValueProps) {
  return (
    // align по умолчанию `center` — для вертикальной колонки это centered-текст, нам нужен левый край.
    <Space direction="vertical" gap="closest" align="flex-start">
      <Text type="BTM3">{children}</Text>
      {hint ? (
        <Text type="BTR4" color="secondary">
          {hint}
        </Text>
      ) : null}
    </Space>
  );
}

/** Ширины колонок «ключ | значение» для обеих summary-секций — держим одинаковыми. */
const SUMMARY_GRID = { cols: ['1fr', '1fr'] };

// ============================================================================
// 1. Информационный блок шага «Подтверждение» (в источнике — синяя панель)
// ============================================================================

/**
 * Пропов не объявляет намеренно: узел схемы их не передаёт, а служебные (`selector`) не должны
 * попасть в DOM. Функция без параметров гарантирует это на уровне сигнатуры.
 */
export function ConfirmationInfoBlock() {
  return (
    // closable по умолчанию `true` — иначе пользователь скрывает блок крестиком и больше его не видит.
    <SectionMessage mode="info" closable={false} testId="confirmation-info-block">
      <Text type="BTR3">
        Пожалуйста, внимательно ознакомьтесь с условиями и дайте необходимые согласия перед
        отправкой заявки.
      </Text>
    </SectionMessage>
  );
}

// ============================================================================
// 2. Предупреждение о высоком платеже (в источнике — красная панель)
// ============================================================================

/**
 * Видимостью управляет сам компонент, а не `hideWhen`: так было в источнике, и порог остаётся
 * рядом с текстом, который про него рассказывает.
 */
export function HighPaymentWarning() {
  const form = useCreditForm();
  const monthlyPayment = useFormControlValue(form.monthlyPayment);

  if (monthlyPayment <= HIGH_PAYMENT_THRESHOLD) {
    return null;
  }

  // Красный в hexa-ui — это `error`; `warning` жёлтый и в источнике занят другими плашками.
  return (
    <SectionMessage mode="error" title="Внимание!" closable={false} testId="high-payment-warning">
      <Text type="BTR3">Ежемесячный платеж превышает 30 000 Руб.</Text>
    </SectionMessage>
  );
}

// ============================================================================
// 3. Секция «Итого» — вычисляемые параметры кредита
// ============================================================================

export function LoanSummarySection() {
  const form = useCreditForm();
  const interestRate = useFormControlValue(form.interestRate);
  const monthlyPayment = useFormControlValue(form.monthlyPayment);

  const rows: SummaryRow[] = [
    {
      key: 'interestRate',
      testId: 'row-interestRate',
      pairKey: 'Процентная ставка',
      pairValue: (
        <SummaryValue hint="зависит от типа кредита, региона, наличия имущества">
          <Text type="BTM3" testId="computed-interestRate">
            {interestRate}
          </Text>
          %
        </SummaryValue>
      ),
    },
    {
      key: 'monthlyPayment',
      testId: 'row-monthlyPayment',
      pairKey: 'Ежемесячный платеж',
      pairValue: (
        <SummaryValue hint="вычисляется по формуле аннуитетного платежа">
          <Text type="BTM3" testId="computed-monthlyPayment">
            {monthlyPayment.toLocaleString('ru-RU')}
          </Text>{' '}
          ₽
        </SummaryValue>
      ),
    },
  ];

  return (
    <HexaCard
      title={{ value: 'Итого', size: 'medium' }}
      mode="filled"
      testId="loan-summary-section"
    >
      {/* gridLayout у `Field` перебивает labelPosition, поэтому позицию подписи не задаём. */}
      <FieldSet.KeyValueMapper gridLayout={SUMMARY_GRID} data={rows} />
    </HexaCard>
  );
}

// ============================================================================
// 4. Секция «Данные заявителя» — вычисляемые поля по заёмщику
// ============================================================================

export function ApplicantSummarySection() {
  const form = useCreditForm();
  const fullName = useFormControlValue(form.fullName);
  const age = useFormControlValue(form.age);
  const totalIncome = useFormControlValue(form.totalIncome);
  const paymentToIncomeRatio = useFormControlValue(form.paymentToIncomeRatio);
  const coBorrowersIncome = useFormControlValue(form.coBorrowersIncome);

  const rows: SummaryRow[] = [
    {
      key: 'fullName',
      testId: 'row-fullName',
      pairKey: 'ФИО',
      pairValue: (
        <SummaryValue>
          <Text type="BTM3" testId="computed-fullName">
            {/* Пустая строка — «ещё не заполнено»: `||`, а не `??`, иначе прочерк не появится. */}
            {fullName || '—'}
          </Text>
        </SummaryValue>
      ),
    },
    {
      key: 'age',
      testId: 'row-age',
      pairKey: 'Возраст',
      pairValue: (
        <SummaryValue>
          <Text type="BTM3" testId="computed-age">
            {age ?? '—'}
          </Text>
          {/* «лет» только к числу: у прочерка единица измерения бессмысленна. */}
          {age !== null && ' лет'}
        </SummaryValue>
      ),
    },
    {
      key: 'totalIncome',
      testId: 'row-totalIncome',
      pairKey: 'Общий доход',
      pairValue: (
        <SummaryValue hint="основной + дополнительный">
          <Text type="BTM3" testId="computed-totalIncome">
            {totalIncome.toLocaleString('ru-RU')}
          </Text>{' '}
          ₽/мес
        </SummaryValue>
      ),
    },
    {
      key: 'paymentToIncomeRatio',
      testId: 'row-paymentToIncomeRatio',
      pairKey: 'Платеж/Доход',
      pairValue: (
        <SummaryValue hint="рекомендуется менее 50%">
          <Text type="BTM3" testId="computed-paymentToIncomeRatio">
            {paymentToIncomeRatio.toFixed(1)}
          </Text>
          %
        </SummaryValue>
      ),
    },
  ];

  // Созаёмщиков может не быть — строку добавляем, а не гасим: пустой `KeyValuePair`
  // маппер отрисовал бы как строку без значения.
  if (coBorrowersIncome > 0) {
    rows.push({
      key: 'coBorrowersIncome',
      testId: 'row-coBorrowersIncome',
      pairKey: 'Доход созаемщиков',
      pairValue: (
        <SummaryValue>
          <Text type="BTM3" testId="computed-coBorrowersIncome">
            {coBorrowersIncome.toLocaleString('ru-RU')}
          </Text>{' '}
          ₽/мес
        </SummaryValue>
      ),
    });
  }

  return (
    <HexaCard
      title={{ value: 'Данные заявителя', size: 'medium' }}
      mode="filled"
      testId="applicant-summary-section"
    >
      <FieldSet.KeyValueMapper gridLayout={SUMMARY_GRID} data={rows} />
    </HexaCard>
  );
}

// ============================================================================
// 5. Предупреждение перед отправкой (в источнике — жёлтая панель)
// ============================================================================

interface SpacedBlockProps {
  /** Класс из схемы (или дефолт источника) — отвечает только за внешний отступ. */
  className?: string;
}

/**
 * `className` по умолчанию `mt-6` — ровно как в источнике: схема этот проп не передаёт,
 * но верхний отступ в 24px был частью вида блока.
 */
export function SubmitWarning({ className = 'mt-6' }: SpacedBlockProps) {
  return (
    <SectionMessage
      mode="warning"
      title="Внимание!"
      closable={false}
      className={className}
      testId="submit-warning"
    >
      <Text type="BTR3">
        После нажатия кнопки &quot;Отправить заявку&quot; вы подтверждаете достоверность
        предоставленной информации и согласие c условиями кредитования.
      </Text>
    </SectionMessage>
  );
}

// ============================================================================
// 6. Блок «Что будет дальше?» (в источнике — зелёная панель)
// ============================================================================

export function NextStepsInfo() {
  return (
    <SectionMessage
      mode="success"
      title="Что будет дальше?"
      closable={false}
      testId="next-steps-info"
    >
      {/* Маркеры списка — обычный `ul`: у hexa-ui списка нет, а конкурентов за каскад
          на голом `ul` тоже нет, значит утилиты Tailwind здесь выигрывают без `!`. */}
      <ul className="list-disc list-inside">
        {NEXT_STEPS.map((step) => (
          // htmlTag у `Text` не знает `li`, поэтому семантику даёт внешний тег.
          <li key={step}>
            <Text type="BTR3">{step}</Text>
          </li>
        ))}
      </ul>
    </SectionMessage>
  );
}

// ============================================================================
// 7. Подпись под полем электронной подписи
// ============================================================================

export function ElectronicSignatureHint() {
  return (
    <Text type="BTR4" color="secondary">
      Введите код из SMS, отправленный на ваш номер телефона
    </Text>
  );
}

// ============================================================================
// 8. Секция «Адрес проживания» — единственная, которая ПИШЕТ в форму
// ============================================================================

interface UseAddressCopyResult {
  /** Копировать адрес регистрации в адрес проживания */
  copyRegistrationAddress: () => void;
  /** Очистить адрес проживания */
  clearResidenceAddress: () => void;
}

/**
 * Логика кнопок секции. Работает через `getValue`/`setValue`/`reset` группы, а не через сигналы:
 * адрес — вложенная форма, и копировать его надо целиком, одним обновлением.
 */
function useAddressCopy(): UseAddressCopyResult {
  const form = useCreditForm();

  return {
    copyRegistrationAddress: () => {
      form.residenceAddress.setValue(form.registrationAddress.getValue());
    },
    clearResidenceAddress: () => {
      form.residenceAddress.reset();
    },
  };
}

interface ResidenceAddressSectionProps {
  /** Класс из схемы, если он там появится. */
  className?: string;
  /** Поля адреса: их подставляет рендерер из `children` узла схемы. */
  children?: ReactNode;
}

/**
 * Видимостью секции управляет НЕ этот компонент, а `hideWhen` на внешнем `Box`
 * (`selector: "residence-address-section"`) — при «совпадает с регистрацией» блок скрыт целиком.
 */
export function ResidenceAddressSection({ className, children }: ResidenceAddressSectionProps) {
  const { copyRegistrationAddress, clearResidenceAddress } = useAddressCopy();

  return (
    // Серую панель источника (`bg-gray-50` + рамка + паддинг) в hexa-ui даёт `Card mode="filled"`.
    <HexaCard mode="filled" className={className} testId="residence-address-section">
      <Space direction="vertical" gap="grouped" align="stretch" width="100%">
        <Space direction="horizontal" justify="space-between" align="center" width="100%">
          <Heading type="H5">Адрес проживания</Heading>
          {/* type="button" обязателен: кнопка живёт внутри формы мастера и иначе отправила бы её. */}
          <Button
            mode="secondary"
            size="small"
            type="button"
            onClick={copyRegistrationAddress}
            testId="copy-registration-address"
            text="Скопировать из адреса регистрации"
          />
        </Space>

        <Divider mode="light" />

        {children}

        <Button
          mode="tertiary"
          size="small"
          type="button"
          onClick={clearResidenceAddress}
          testId="clear-residence-address"
          text="Очистить адрес проживания"
        />
      </Space>
    </HexaCard>
  );
}

// ============================================================================
// 9. Предупреждение для безработных (в источнике — жёлтая панель)
// ============================================================================

/**
 * Видимость — снаружи: `hideWhen(schema.node('unemployed-warning'), …)` по `employmentStatus`.
 * Схема передаёт сюда `className: "mt-6"`, поэтому проп принимаем и отдаём в корневой элемент.
 */
export function UnemployedWarning({ className }: SpacedBlockProps) {
  return (
    <SectionMessage
      mode="warning"
      closable={false}
      className={className}
      testId="unemployed-warning"
    >
      <Text type="BTR3">
        Обратите внимание: для получения кредита без подтвержденного дохода могут потребоваться
        дополнительные документы и поручители.
      </Text>
    </SectionMessage>
  );
}
