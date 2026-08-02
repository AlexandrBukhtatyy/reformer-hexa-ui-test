import { test, expect } from '@playwright/test'

test('переключение между страницами форм', async ({ page }) => {
  await page.goto('/')

  const nav = page.locator('nav')
  await expect(nav.getByRole('button', { name: 'Регистрация' })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Подписка (wizard)' })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Кредитная заявка' })).toBeVisible()

  await nav.getByRole('button', { name: 'Регистрация' }).click()
  await expect(page.getByRole('button', { name: 'Отправить' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Очистить' })).toBeVisible()
})
