/**
 * Render-behavior кредитной заявки — декларативные правила над деревом рендера по selector'ам
 * из `form.json`. Docs: @reformer/renderer-react render-behavior.
 *
 * Здесь живёт всё, чего JSON выразить не умеет:
 * - инъекция рантайм-сущностей (форма, конфиг валидации) в ноду визарда — `onInit` + `patchProps`;
 * - загрузка заявки и справочников с управлением состоянием `AsyncBoundary`;
 * - видимость условных секций (10 `hideWhen`);
 * - реактивная навигация по шагам и отправка формы.
 *
 * В источнике это было ДВА файла (общее поведение + JSON-обёртка над ним): второй рендер той же
 * формы собирался из TS-схемы и переиспользовал общее поведение. Здесь рендер один, и делить файл
 * не за чем — сохранён порядок регистраций, а не структура папок.
 *
 * Отличие от источника одно: `alert()` на результат отправки заменён колбэком `onStatus` —
 * текстом владеет страница, она же показывает его в live-регионе.
 */

import type { FormModel, FormProxy } from "@reformer/core";
import {
  hideWhen,
  onComponentEvent,
  onInit,
  onMount,
  renderEffect,
  type RenderBehaviorFn,
  type RenderNodeControl,
} from "@reformer/renderer-react";
import type { HexaWizardHandle } from "../../libs/hexa-ui";
import {
  fetchCreditApplication,
  fetchDictionaries,
  submitCreditApplication,
} from "./api";
import type { CreditSelector } from "./form.selectors";
import type { CreditApplicationForm } from "./form.types";
import { makeCreditValidationConfig } from "./validation";

/** Результат отправки заявки. `pending` — нейтральный: у мока секунда задержки. */
export interface CreditFormStatus {
  kind: "pending" | "success" | "error";
  text: string;
}

export interface CreditUiBehaviorDeps {
  model: FormModel<CreditApplicationForm>;
  form: FormProxy<CreditApplicationForm>;
  /**
   * Результат отправки. В источнике здесь стоял `alert()`; поведение не знает про React,
   * поэтому текст уходит наружу колбэком, а рисует его страница.
   */
  onStatus: (status: CreditFormStatus | null) => void;
}

/** Идентификатор заявки захардкожен так же, как в источнике: демо грузит одну и ту же анкету. */
const APPLICATION_ID = "1";

export function createCreditUiBehavior({
  model,
  form,
  onStatus,
}: CreditUiBehaviorDeps): RenderBehaviorFn<CreditApplicationForm> {
  return (schema) => {
    // Единственное место, где selector превращается в ноду. Тип сужен до якорей схемы
    // (form.selectors.ts): `schema.node` берёт любую строку, и опечатка была бы молчаливым
    // no-op — `hideWhen` на несуществующей ноде оставил бы секцию видимой без единой жалобы.
    const node = (selector: CreditSelector): RenderNodeControl =>
      schema.node(selector);

    const wizard = node("wizard");
    const boundary = node("data-boundary");
    // Ref — единственный способ дотянуться до навигации визарда: шагом владеет он сам.
    const wizardRef = wizard.getRef<HexaWizardHandle>();

    // ── Инъекция рантайм-сущностей в wizard ─────────────────────────────────
    // onInit — единственный хук, чьи пропы попадают уже в первый рендер. `form` нужна визарду,
    // чтобы снять значения для submit; конфиг валидации — чтобы «Далее» проверял свой шаг.
    onInit(wizard, () => {
      wizard.patchProps({
        form,
        ...makeCreditValidationConfig(model, form),
      });
    });

    // ── Загрузка заявки: состоянием владеет нода AsyncBoundary ──────────────
    const loadApplication = async (): Promise<void> => {
      boundary.patchProps({ status: "loading", error: null });

      try {
        const [app, dict] = await Promise.all([
          fetchCreditApplication(APPLICATION_ID),
          fetchDictionaries(),
        ]);
        if (app.status !== 200) throw new Error("Ошибка загрузки заявки");
        if (dict.status !== 200)
          throw new Error("Ошибка загрузки справочников");

        form.patchValue(app.data);

        // queueMicrotask обязателен: `updateComponentProps` в одном тике с `patchValue` попадает
        // внутрь ещё не слитых реактивных эффектов, и preact бросает «Cycle detected».
        queueMicrotask(() => {
          form.registrationAddress.city.updateComponentProps({
            options: dict.data.cities,
          });
          form.residenceAddress.city.updateComponentProps({
            options: dict.data.cities,
          });
          // forEach у массива отдаёт НОДУ элемента (FormProxy), а не его значение.
          form.properties.forEach((property) => {
            property.type.updateComponentProps({
              options: dict.data.propertyTypes,
            });
          });
          form.existingLoans.forEach((loan) => {
            loan.bank.updateComponentProps({ options: dict.data.banks });
          });
        });

        boundary.patchProps({ status: "ready" });
      } catch (e) {
        // Текст ошибки уходит прямо в пропы: причина сбоя (заявка или справочники) иначе
        // до пользователя не доедет — в слоте загрузки он был бы захардкожен.
        boundary.patchProps({
          status: "error",
          error: e instanceof Error ? e.message : "Неизвестная ошибка",
          onRetry: () => void loadApplication(),
        });
      }
    };

    onMount(boundary, () => {
      void loadApplication();
    });

    // ── Реактивная навигация ────────────────────────────────────────────────
    // Ипотеку оформляем с первого шага: сумма и срок пересчитываются под другой продукт.
    // Эффект идёт после mount, поэтому ref уже заполнен; повторный переход на текущий шаг
    // React схлопывает сам — зацикливания на каждое изменение сигнала не будет.
    renderEffect(schema, () => {
      if (form.loanType.value.value === "mortgage") {
        wizardRef.current?.goToStep(1);
      }
    });

    // ── Шаг 1: тип кредита ──────────────────────────────────────────────────
    // Скрытие — только половина дела: скрытые поля продолжают валидироваться и уезжать в payload.
    // Вторую половину (disable + reset/clear) делает `behavior.ts`; обе нужны вместе.
    hideWhen(
      node("mortgage-section"),
      () => form.loanType.value.value !== "mortgage",
    );
    hideWhen(node("car-section"), () => form.loanType.value.value !== "car");

    // ── Шаг 3: адреса ───────────────────────────────────────────────────────
    hideWhen(
      node("residence-address-section"),
      () => form.sameAsRegistration.value.value === true,
    );

    // ── Шаг 4: занятость ────────────────────────────────────────────────────
    hideWhen(
      node("employer-section"),
      () => form.employmentStatus.value.value !== "employed",
    );
    hideWhen(
      node("business-section"),
      () => form.employmentStatus.value.value !== "selfEmployed",
    );
    hideWhen(
      node("income-section"),
      () => form.employmentStatus.value.value === "unemployed",
    );
    hideWhen(
      node("unemployed-warning"),
      () => form.employmentStatus.value.value !== "unemployed",
    );

    // ── Шаг 5: дополнительные секции ────────────────────────────────────────
    hideWhen(node("properties-array"), () => !form.hasProperty.value.value);
    hideWhen(
      node("existing-loans-array"),
      () => !form.hasExistingLoans.value.value,
    );
    hideWhen(node("co-borrowers-array"), () => !form.hasCoBorrower.value.value);

    // ── Шаг 6: отправка ─────────────────────────────────────────────────────
    // `onSubmit` — проп-событие моста: hexa-ui `onFinish` зовётся без аргументов, а значения
    // нужны здесь. Мост зовёт его снимком формы после успешного `validateAll`.
    onComponentEvent(
      wizard,
      "onSubmit",
      async (values: CreditApplicationForm) => {
        onStatus({ kind: "pending", text: "Отправляем заявку…" });

        try {
          const response = await submitCreditApplication(values);
          if (response.status === 200 || response.status === 201) {
            onStatus({
              kind: "success",
              text: `Заявка успешно отправлена! ID: ${response.data.id}`,
            });
          } else {
            onStatus({
              kind: "error",
              text: "Ошибка отправки заявки: сервер вернул неожиданный ответ",
            });
          }
        } catch {
          onStatus({
            kind: "error",
            text: "Ошибка отправки заявки: сервер недоступен",
          });
        }
      },
    );
  };
}
