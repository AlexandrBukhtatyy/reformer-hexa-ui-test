import { test, expect, type Page } from '@playwright/test'

/**
 * Поля кредитной заявки, переведённые с текстового ввода на выбор из справочника.
 *
 * Форма грузит черновик и справочники моками (800 и 2000 мс), поэтому вход ждёт первый шаг,
 * а не событие `load`.
 */

/** Обёртка поля (`HexaField` → hexa-ui `Field`). Скрытые секции отсекаем: подписи в них дублируются. */
function field(page: Page, label: string) {
  return page
    .locator('.kl6-field')
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ visible: true })
}

const selectBox = (page: Page, label: string) => field(page, label).locator('.ant-select-selector')
const selectValue = (page: Page, label: string) =>
  field(page, label).locator('.ant-select-selection-item')
const dropdown = (page: Page) =>
  page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
const input = (page: Page, label: string) => field(page, label).locator('input')

async function pick(page: Page, label: string, option: string) {
  await selectBox(page, label).click()
  await dropdown(page).getByRole('option', { name: option, exact: true }).click()
}

async function openCreditForm(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Кредитная заявка' }).click()
  await expect(page.getByText('Основная информация о кредите')).toBeVisible({ timeout: 15000 })
}

const next = (page: Page) => page.getByRole('button', { name: 'Далее' }).click()

/** Шаг 2 целиком: паспорт и документы в черновике не приходят, а без них «Далее» не пускает. */
async function fillPassportStep(page: Page) {
  await expect(page.getByText('Паспортные данные')).toBeVisible()
  await field(page, 'Серия паспорта').locator('input').pressSequentially('1234')
  await field(page, 'Номер паспорта').locator('input').pressSequentially('567890')
  await field(page, 'Кем выдан').locator('textarea').fill('ОВД района Тверской г. Москвы')
  // Не раньше 14-летия владельца (cross-правило passportIssuedAfter14; в черновике 1990 год).
  await field(page, 'Дата выдачи').locator('input').fill('2010-06-15')
  await field(page, 'Код подразделения').locator('input').pressSequentially('770001')
  await field(page, 'ИНН').locator('input').pressSequentially('123456789012')
  await field(page, 'СНИЛС').locator('input').pressSequentially('12345678900')
}

test('марка и модель автомобиля — связанные списки, а не текстовые поля', async ({ page }) => {
  await openCreditForm(page)

  await pick(page, 'Тип кредита', 'Автокредит')
  await expect(page.getByText('Информация об автомобиле')).toBeVisible()

  // Поиск включён точечно: у марки он есть, у короткого «Типа кредита» — нет.
  // rc-select помечает поле без поиска атрибутом readonly.
  await expect(field(page, 'Марка автомобиля').getByRole('combobox')).not.toHaveAttribute('readonly')
  await expect(field(page, 'Тип кредита').getByRole('combobox')).toHaveAttribute('readonly', '')

  // Модель до выбора марки объясняет, чего ждёт, вместо пустого «No data».
  await selectBox(page, 'Модель автомобиля').click()
  await expect(dropdown(page).getByText('Сначала выберите марку автомобиля')).toBeVisible()
  await page.keyboard.press('Escape')

  // Поиск идёт подстрокой, а не с начала подписи.
  await selectBox(page, 'Марка автомобиля').click()
  await page.keyboard.type('koda')
  await expect(dropdown(page).getByRole('option', { name: 'Škoda', exact: true })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(selectValue(page, 'Марка автомобиля')).toHaveText('Škoda')

  // Модели подгрузились по выбранной марке (debounce 300 мс + 300 мс мок).
  await selectBox(page, 'Модель автомобиля').click()
  await expect(dropdown(page).getByRole('option', { name: 'Octavia', exact: true })).toBeVisible({
    timeout: 5000,
  })
})

test('смена региона снимает город, который в новый регион не входит', async ({ page }) => {
  await openCreditForm(page)

  // Шаг 1 приезжает из черновика заполненным — «Далее» проходит сразу.
  await next(page)
  await fillPassportStep(page)
  await next(page)

  // Шаг 3: черновик приехал с регионом и городом «Москва».
  await expect(page.getByText('Адрес регистрации')).toBeVisible()
  await expect(selectValue(page, 'Город')).toHaveText('Москва', { timeout: 10000 })

  // Поиск фильтрует по подписи, а не по значению: в модели у региона лежит код `tatarstan`,
  // кириллицы в нём нет — встроенный фильтр rc-select по `value` тут не нашёл бы ничего.
  await selectBox(page, 'Регион').click()
  await page.keyboard.type('Тата')
  const region = dropdown(page).getByRole('option', { name: 'Республика Татарстан', exact: true })
  await expect(region).toBeVisible()
  await region.click()

  // Москвы в Татарстане нет: выбор снимается, а не висит «сырым» значением.
  await expect(selectValue(page, 'Город')).toHaveCount(0, { timeout: 5000 })
  await selectBox(page, 'Город').click()
  await expect(dropdown(page).getByRole('option', { name: 'Казань', exact: true })).toBeVisible()
})

test('банк и тип бизнеса выбираются из справочника', async ({ page }) => {
  await openCreditForm(page)
  await next(page)
  await fillPassportStep(page)
  await next(page)

  // Шаг 3 приезжает заполненным из черновика.
  await expect(page.getByText('Адрес регистрации')).toBeVisible()
  await next(page)

  // Тип бизнеса: раньше текстовое поле с подсказкой «ИП, ООО и т.д.».
  await page.getByText('Индивидуальный предприниматель', { exact: true }).click()
  await expect(page.getByText('Информация о бизнесе')).toBeVisible()
  await pick(page, 'Тип бизнеса', 'Самозанятый')
  await expect(selectValue(page, 'Тип бизнеса')).toHaveText('Самозанятый')

  // Пенсионер — чтобы шаг 4 прошёл без блока о работодателе (доход есть в черновике).
  await page.getByText('Пенсионер', { exact: true }).click()
  await next(page)

  await expect(page.getByText('Дополнительная информация')).toBeVisible()
  await page.getByText('У меня есть другие кредиты').click()
  await page.getByRole('button', { name: '+ Добавить кредит' }).click()

  // Кредит добавлен КНОПКОЙ: справочник с сервера поведение раскладывает только по элементам,
  // приехавшим с заявкой, поэтому опции такому элементу даёт статический BANKS из схемы.
  await selectBox(page, 'Банк').click()
  await expect(dropdown(page).getByRole('option', { name: 'Сбербанк', exact: true })).toBeVisible()
})

/**
 * Ошибки консоли, которые форма даёт и до правок — проверено прогоном того же пути на исходном
 * `src`. Держим списком, чтобы регрессия отличалась от фона:
 * - мост hexa-ui ↔ styled-components тащит `$`-пропы в DOM;
 * - hexa-ui `Select` всегда отдаёт rc-select `onSearch`, даже когда поиска нет;
 * - `Uploader` (dropzone) кладёт placeholder и hint двумя `<div>` внутрь `<p>` от hexa-ui `Text`.
 */
const KNOWN_CONSOLE_NOISE = [
  /\$themedColor/,
  /\$color/,
  /Invalid attribute name/,
  /element\.ref was removed/,
  /`onSearch` should work with `showSearch`/,
  /cannot contain a nested/,
]

test('автокредит проходит все шаги до успешной отправки', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !KNOWN_CONSOLE_NOISE.some((k) => k.test(m.text())))
      errors.push(m.text().split('\n')[0])
  })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

  await openCreditForm(page)

  // Шаг 1 — по обоим новым спискам.
  await pick(page, 'Тип кредита', 'Автокредит')
  await pick(page, 'Марка автомобиля', 'Toyota')
  await pick(page, 'Модель автомобиля', 'Camry')
  await input(page, 'Год выпуска').fill('2021')
  await input(page, 'Стоимость автомобиля (₽)').fill('2500000')
  await next(page)

  await fillPassportStep(page)
  await next(page)

  // Шаг 3 — регион и город приезжают из черновика кодами и рисуются подписями.
  await expect(selectValue(page, 'Регион')).toHaveText('Москва', { timeout: 10000 })
  await next(page)

  // Шаг 4.
  await expect(page.getByText('Информация о занятости')).toBeVisible()
  await input(page, 'Название компании').fill('ООО Ромашка')
  await input(page, 'ИНН компании').pressSequentially('1234567890')
  await input(page, 'Телефон компании').pressSequentially('9991234567')
  await input(page, 'Адрес компании').fill('Москва, Тверская 1')
  await input(page, 'Должность').fill('Инженер')
  await input(page, 'Общий стаж работы (месяцев)').fill('10')
  await input(page, 'Стаж на текущем месте (месяцев)').fill('5')
  await next(page)

  // Шаг 5 — значения по умолчанию проходят.
  await expect(page.getByText('Дополнительная информация')).toBeVisible()
  await next(page)

  // Шаг 6.
  await expect(page.getByText('Обязательные согласия')).toBeVisible()
  await page.getByText('Согласие на обработку персональных данных').click()
  await page.getByText('Согласие на проверку кредитной истории').click()
  await page.getByText('Согласие с условиями кредитования').click()
  await page.getByText('Подтверждаю точность введенных данных').click()
  await input(page, 'Код подтверждения из СМС').pressSequentially('123456')
  await page.getByRole('button', { name: 'Готово' }).click()

  await expect(page.getByText(/Заявка успешно отправлена/)).toBeVisible({ timeout: 15000 })
  expect(errors, 'новых ошибок в консоли быть не должно').toEqual([])
})
