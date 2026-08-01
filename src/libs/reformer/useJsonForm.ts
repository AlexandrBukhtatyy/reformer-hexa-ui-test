/**
 * Общая сборка формы из JSON-схемы: модель, форма, render-behavior и строка статуса.
 *
 * Все три страницы писали одно и то же: каст импортированного JSON, `useMemo` на
 * `createModel` + `createForm(convertJsonToM1Tree(...))`, `useMemo` на фабрику render-behavior и
 * состояние статуса с защитой от двойного submit'а. Здесь это лежит один раз — странице остаются
 * только СВОИ обработчики и разметка.
 *
 * Реестр компонентов вшит значением по умолчанию: конвертер и `JsonFormRenderer` обязаны смотреть
 * в ОДИН реестр (тот же `hexaRegistry` отдаёт рендереру `FormLayout`) — разъехавшись, они молча
 * не нашли бы компонент. Параметр `registry` оставлен на случай страницы со своим мостом.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { createForm, createModel, type FormModel, type FormProxy } from '@reformer/core';
import type { FormBehavior } from '@reformer/core/behaviors';
import {
  convertJsonToM1Tree,
  type ComponentRegistry,
  type JsonFormSchema,
} from '@reformer/renderer-json';
import type { RenderBehaviorFn } from '@reformer/renderer-react';
import { hexaRegistry } from '../hexa-ui';

/**
 * Каст импортированного JSON к схеме рендерера — ровно одна точка на проект.
 *
 * Операторы в чистом JSON типизируются как `string`, а `JsonFormSchema` ждёт литеральные union'ы:
 * структурного пути из `typeof import('./form.json')` в схему нет. Приведение и есть сценарий
 * «схема пришла строкой с сервера» — страницам больше не нужно писать `as unknown as`.
 */
export const asJsonFormSchema = (raw: unknown): JsonFormSchema => raw as JsonFormSchema;

/**
 * Контракт фабрики render-behavior страницы: рантайм-сущности (модель и форму) она получает
 * аргументом, а не замыканием на модульном уровне — их создаёт хук, и до его вызова их нет.
 *
 * Свои зависимости (обработчики, колбэки статуса) страница доносит замыканием вокруг фабрики.
 */
export type UiBehaviorFactory<T> = (ctx: {
  model: FormModel<T>;
  form: FormProxy<T>;
}) => RenderBehaviorFn<T>;

export interface UseJsonFormOptions<T extends object> {
  /** JSON-схема формы — обычно модульная константа страницы (см. {@link asJsonFormSchema}). */
  schema: JsonFormSchema;
  /**
   * Начальные значения модели: объект (копируется) либо фабрика — для форм, чей снимок собирается
   * кодом. Читается ОДИН раз, при создании модели.
   */
  initial: T | (() => T);
  /** Реактивность модели: `defineFormBehavior` из `*.behavior.ts` страницы. */
  behavior?: FormBehavior<T>;
  /**
   * Фабрика render-behavior. Ссылка обязана быть стабильной — модульная константа или
   * `useCallback`; почему, объяснено у мемоизации ниже.
   */
  ui?: UiBehaviorFactory<T>;
  /** Реестр компонентов; по умолчанию — мост hexa-ui, тот же, что у `FormLayout`. */
  registry?: ComponentRegistry;
}

export interface JsonForm<T extends object> {
  /** Модель — источник истины значений; уходит пропом `model` в `JsonFormRenderer`. */
  model: FormModel<T>;
  /** Форма — UI/валидационное состояние нод поверх сигналов модели. */
  form: FormProxy<T>;
  /** Готовый render-behavior: `undefined`, если страница не передала `ui`. */
  renderBehavior: RenderBehaviorFn<T> | undefined;
}

/**
 * Собрать модель, форму и render-behavior по JSON-схеме страницы.
 */
export function useJsonForm<T extends object>({
  schema,
  initial,
  behavior,
  ui,
  registry = hexaRegistry,
}: UseJsonFormOptions<T>): JsonForm<T> {
  // Модель и форма создаются РОВНО ОДИН РАЗ: пересборка дала бы новую модель, и форма теряла бы
  // введённое на каждый рендер. Поэтому здесь ленивый инициализатор `useState`, а не `useMemo`:
  // мемоизация — только подсказка кэшу (React вправе её выбросить), а «создать один раз» —
  // требование корректности. `schema`/`initial`/`behavior`/`registry` читаются при первом вызове.
  const [{ model, form }] = useState(() => {
    const model = createModel<T>(typeof initial === 'function' ? initial() : { ...initial });
    // Форма строится из ТОЙ ЖЕ JSON-схемы: конвертер биндит листья к сигналам модели. Без этого
    // вызова рендерер не найдёт ноду для сигнала и не отрисует поля; листья шагов wizard'а лежат
    // в `componentProps.steps`, но обход схемы находит и их.
    const form = createForm<T>({
      model,
      schema: convertJsonToM1Tree(schema, registry, model),
      behavior,
    });

    return { model, form };
  });

  // Стабильная ссылка на render-behavior — требование корректности, а не оптимизация: на новую
  // функцию рендерер пересобирает дерево, и вместе с ним теряются пропы, которые behavior доставил
  // через `onInit`/`patchProps` (конфиг валидации шага, обработчики wizard'а).
  // Отсюда требование к `ui`: он тоже обязан быть стабильным.
  const renderBehavior = useMemo(() => ui?.({ model, form }), [model, form, ui]);

  return { model, form, renderBehavior };
}

/** Статус отправки: `kind` задаёт цвет строки, `text` — то, что читает скринридер. */
export interface FormStatus {
  kind: 'success' | 'error';
  text: string;
}

export interface FormStatusApi<S> {
  /** Текущий статус или `null` — строка пустая. */
  status: S | null;
  setStatus: Dispatch<SetStateAction<S | null>>;
  /** Идёт ли отправка: для `loading`/`disabled` на кнопках. */
  pending: boolean;
  /**
   * Выполнить задачу под guard'ом «одна отправка за раз». Отсечённый вызов не запускает задачу и
   * резолвится в `undefined`.
   */
  run: <R>(task: () => R | PromiseLike<R>) => Promise<R | undefined>;
}

const isPromiseLike = <R,>(value: R | PromiseLike<R>): value is PromiseLike<R> =>
  typeof (value as PromiseLike<R> | null | undefined)?.then === 'function';

/**
 * Строка статуса формы плюс guard «одна отправка за раз».
 *
 * Флаг дублируется в ref: два клика в одном кадре придут из ОДНОГО рендера, где `pending` ещё
 * false, — на одном state такую пару не отсечь. Тот же guard нужен и «очистке»: хвост незавершённой
 * отправки поставил бы статус уже после сброса, и на пустой форме повисло бы «Проверьте поля».
 *
 * Параметр типа — для форм со своим набором `kind` (напр. с нейтральным `pending`).
 */
export function useFormStatus<
  S extends { kind: string; text: string } = FormStatus,
>(): FormStatusApi<S> {
  const [status, setStatus] = useState<S | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const run = useCallback(<R,>(task: () => R | PromiseLike<R>): Promise<R | undefined> => {
    if (pendingRef.current) return Promise.resolve(undefined);

    pendingRef.current = true;
    setPending(true);

    const release = (): void => {
      pendingRef.current = false;
      setPending(false);
    };

    try {
      const result = task();
      // Синхронную задачу отпускаем синхронно, в том же батче: `await` отложил бы снятие флага на
      // микротаску, и React успел бы закоммитить лишний кадр с `pending: true`.
      if (!isPromiseLike(result)) {
        release();
        return Promise.resolve(result);
      }

      return Promise.resolve(result).finally(release);
    } catch (error) {
      release();
      throw error;
    }
  }, []);

  return { status, setStatus, pending, run };
}
