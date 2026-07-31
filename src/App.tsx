import { useState, type ComponentType } from 'react'
import { Button } from '@kaspersky/hexa-ui'
import './App.css'
import RegistrationForm from './pages/registration/Form'
import SubscriptionForm from './pages/subscription/Form'
import CreditApplicationForm from './pages/credit-application/Form'

type PageId = 'registration' | 'subscription' | 'credit'

// Роутера в проекте нет, а страниц уже три — переключаем состоянием.
const PAGES: { id: PageId; title: string }[] = [
  { id: 'registration', title: 'Регистрация' },
  { id: 'subscription', title: 'Подписка (wizard)' },
  { id: 'credit', title: 'Кредитная заявка' },
]

// Отдельная карта вместо тернарника: с третьей страницей цепочка `? :` перестаёт читаться,
// а Record заодно не даёт забыть компонент при добавлении id.
const PAGE_COMPONENTS: Record<PageId, ComponentType> = {
  registration: RegistrationForm,
  subscription: SubscriptionForm,
  credit: CreditApplicationForm,
}

function App() {
  const [page, setPage] = useState<PageId>('credit')
  const ActivePage = PAGE_COMPONENTS[page]

  return (
    <>
      <nav className="flex gap-2 justify-center bg-slate-100 pt-4">
        {PAGES.map(({ id, title }) => (
          <Button
            key={id}
            text={title}
            mode={page === id ? 'primary' : 'secondary'}
            onClick={() => setPage(id)}
          />
        ))}
      </nav>

      <ActivePage />
    </>
  )
}

export default App
