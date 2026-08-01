/**
 * Мок-API кредитной заявки: заявка, справочники, города по региону, модели авто по марке, отправка.
 *
 * Сервера у демо нет, а `axios` в проект не ставили — но форма ответа сохранена axios-совместимой
 * (`{ data, status }`) намеренно: поведение читает `.status !== 200`, а оператор `loadOptionsOn`
 * деструктурирует `const { data } = await fetcher(value)`. Благодаря этому весь вызывающий код
 * переезжает из источника без правок, а замена моков на реальный HTTP — это правка одного файла.
 *
 * Эндпоинты оригинала (сохранены в комментариях как контракт будущего бэкенда):
 * - GET  /api/v1/credit-applications/{id}  — получение заявки
 * - POST /api/v1/credit-applications       — создание заявки
 * - GET  /api/v1/dictionaries              — справочники
 * - GET  /api/v1/cities?region={region}    — города по региону
 * - GET  /api/v1/car-models?brand={brand}  — модели авто по марке
 */

import type { CreditApplicationForm, Option } from "./form.types";

/**
 * Подмножество `AxiosResponse`, которым реально пользуется код заявки. Больше полей не нужно —
 * добавлять их «на будущее» значит выдавать мок за настоящий HTTP-ответ.
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface DictionariesResponse {
  banks: Option[];
  cities: Option[];
  propertyTypes: Option[];
}

export interface SubmitResponse {
  success: boolean;
  id: string;
  message: string;
}

/**
 * Задержки моков (мс). Нужны не для красоты: на них держится демонстрация `AsyncBoundary`
 * (статус loading на старте) и видимый эффект debounce у подгрузки опций.
 * 2000 мс у справочников — цифра из мока источника.
 */
const MOCK_DELAYS = {
  application: 800,
  dictionaries: 2000,
  options: 300,
  submit: 1000,
} as const;

/**
 * Ответ с задержкой. `signal` обрабатываем честно (источник его принимал, но axios отменял запрос
 * сам): без этого ответ ушедшего со страницы шага прилетел бы в размонтированную форму.
 */
function respond<T>(
  data: T,
  ms: number,
  options: { status?: number; signal?: AbortSignal } = {},
): Promise<ApiResponse<T>> {
  const { status = 200, signal } = options;

  return new Promise<ApiResponse<T>>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Запрос отменён", "AbortError"));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Запрос отменён", "AbortError"));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve({ data, status });
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// ============================================================================
// Фикстуры
// ============================================================================

/** Справочники (фикстура из мока источника, дополнена типами имущества). */
const MOCK_DICTIONARIES: DictionariesResponse = {
  banks: [
    { value: "sberbank", label: "Сбербанк" },
    { value: "vtb", label: "ВТБ" },
    { value: "alfabank", label: "Альфа-Банк" },
    { value: "tinkoff", label: "Тинькофф" },
    { value: "gazprombank", label: "Газпромбанк" },
    { value: "raiffeisen", label: "Райффайзенбанк" },
    { value: "rosbank", label: "Росбанк" },
    { value: "sovcombank", label: "Совкомбанк" },
  ],
  cities: [
    { value: "moscow", label: "Москва" },
    { value: "spb", label: "Санкт-Петербург" },
    { value: "novosibirsk", label: "Новосибирск" },
    { value: "ekaterinburg", label: "Екатеринбург" },
    { value: "kazan", label: "Казань" },
    { value: "nn", label: "Нижний Новгород" },
    { value: "chelyabinsk", label: "Челябинск" },
    { value: "samara", label: "Самара" },
    { value: "omsk", label: "Омск" },
    { value: "rostov", label: "Ростов-на-Дону" },
  ],
  propertyTypes: [
    { value: "apartment", label: "Квартира" },
    { value: "house", label: "Дом" },
    { value: "car", label: "Автомобиль" },
    { value: "land", label: "Земельный участок" },
  ],
};

/**
 * Черновики заявок по id. Поведение грузит захардкоженный id `'1'` — как в источнике.
 *
 * Набор полей намеренно узкий и формат-корректный (телефон под маску `+7 (999) 999-99-99`,
 * дата под `input[type=date]`, индекс — 6 цифр): черновик приезжает в форму через `patchValue`,
 * и значение, не проходящее валидацию, встретило бы пользователя ошибками на пустой форме.
 */
const MOCK_APPLICATIONS: Record<string, Partial<CreditApplicationForm>> = {
  "1": {
    loanType: "consumer",
    loanAmount: 500000,
    loanTerm: 36,
    loanPurpose: "Ремонт квартиры",
    personalData: {
      lastName: "Иванов",
      firstName: "Иван",
      middleName: "Иванович",
      birthDate: "1990-05-12",
      birthPlace: "Москва",
      gender: "male",
    },
    phoneMain: "+7 (999) 123-45-67",
    email: "ivan.ivanov@example.com",
    registrationAddress: {
      region: "moscow",
      city: "moscow",
      street: "Тверская",
      house: "10",
      apartment: "25",
      postalCode: "125009",
    },
    monthlyIncome: 120000,
  },
};

/**
 * Города по региону. Ключ — значение поля `region`, а это в схеме обычный `Input` (текст),
 * поэтому точного попадания ждать нельзя: незнакомый регион отдаёт полный список городов
 * справочника, а не пустоту.
 */
const MOCK_CITIES_BY_REGION: Record<string, Option[]> = {
  moscow: [
    { value: "moscow", label: "Москва" },
    { value: "zelenograd", label: "Зеленоград" },
    { value: "troitsk", label: "Троицк" },
  ],
  spb: [
    { value: "spb", label: "Санкт-Петербург" },
    { value: "pushkin", label: "Пушкин" },
    { value: "kolpino", label: "Колпино" },
  ],
  tatarstan: [
    { value: "kazan", label: "Казань" },
    { value: "naberezhnye-chelny", label: "Набережные Челны" },
    { value: "almetyevsk", label: "Альметьевск" },
  ],
};

/**
 * Модели по марке авто. Марка вводится текстом (`Input` с подсказкой «Например: Toyota»),
 * поэтому ключи нормализованы и продублированы кириллицей; для неизвестной марки список пуст —
 * ровно как ответил бы сервер.
 */
const MOCK_CAR_MODELS: Record<string, Option[]> = {
  toyota: [
    { value: "camry", label: "Camry" },
    { value: "corolla", label: "Corolla" },
    { value: "rav4", label: "RAV4" },
    { value: "land-cruiser", label: "Land Cruiser" },
  ],
  kia: [
    { value: "rio", label: "Rio" },
    { value: "sportage", label: "Sportage" },
    { value: "k5", label: "K5" },
  ],
  hyundai: [
    { value: "solaris", label: "Solaris" },
    { value: "creta", label: "Creta" },
    { value: "tucson", label: "Tucson" },
  ],
  lada: [
    { value: "vesta", label: "Vesta" },
    { value: "granta", label: "Granta" },
    { value: "niva", label: "Niva" },
  ],
  bmw: [
    { value: "x3", label: "X3" },
    { value: "x5", label: "X5" },
    { value: "3-series", label: "3 series" },
  ],
};

/** Синонимы марок: пользователь пишет по-русски чаще, чем латиницей. */
const CAR_BRAND_ALIASES: Record<string, string> = {
  тойота: "toyota",
  киа: "kia",
  хендай: "hyundai",
  хёндэ: "hyundai",
  лада: "lada",
  ваз: "lada",
  бмв: "bmw",
};

const normalize = (value: string): string => value.trim().toLowerCase();

// ============================================================================
// API
// ============================================================================

/**
 * Загрузка кредитной заявки по id.
 * `GET /api/v1/credit-applications/{id}`
 */
export function fetchCreditApplication(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResponse<Partial<CreditApplicationForm>>> {
  // Неизвестный id — пустой черновик: `Partial` позволяет вернуть `{}`, и форма останется initial.
  const application: Partial<CreditApplicationForm> =
    MOCK_APPLICATIONS[id] ?? {};
  return respond(application, MOCK_DELAYS.application, { signal });
}

/**
 * Загрузка справочников (банки, города, типы имущества).
 * `GET /api/v1/dictionaries`
 */
export function fetchDictionaries(
  signal?: AbortSignal,
): Promise<ApiResponse<DictionariesResponse>> {
  return respond(MOCK_DICTIONARIES, MOCK_DELAYS.dictionaries, { signal });
}

/**
 * Города выбранного региона.
 * `GET /api/v1/cities?region={region}`
 */
export function fetchCities(region: string): Promise<ApiResponse<Option[]>> {
  const cities =
    MOCK_CITIES_BY_REGION[normalize(region)] ?? MOCK_DICTIONARIES.cities;
  return respond(cities, MOCK_DELAYS.options);
}

/**
 * Модели автомобилей выбранной марки.
 * `GET /api/v1/car-models?brand={brand}`
 */
export function fetchCarModels(brand: string): Promise<ApiResponse<Option[]>> {
  const key = normalize(brand);
  const models = MOCK_CAR_MODELS[CAR_BRAND_ALIASES[key] ?? key] ?? [];
  return respond(models, MOCK_DELAYS.options);
}

/**
 * Отправка заявки.
 * `POST /api/v1/credit-applications`
 *
 * Статус 201 (created) — вызывающий код принимает и 200, и 201.
 */
export function submitCreditApplication(
  data: Partial<CreditApplicationForm>,
): Promise<ApiResponse<SubmitResponse>> {
  // Номер заявки собираем из времени: у мока нет хранилища, но id должен быть разным между отправками.
  const id = `APP-${Date.now().toString(36).toUpperCase()}`;

  return respond<SubmitResponse>(
    {
      success: true,
      id,
      message: `Заявка на ${data.loanType ?? "кредит"} принята в обработку`,
    },
    MOCK_DELAYS.submit,
    { status: 201 },
  );
}
