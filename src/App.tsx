import { useState } from 'react'
import { Button } from '@kaspersky/hexa-ui'
import './App.css'
import RegistrationForm from './pages/registration/Form'
import SubscriptionForm from './pages/subscription/Form'

type PageId = 'registration' | 'subscription'

// Роутера в проекте нет, а страниц уже две — переключаем состоянием.
const PAGES: { id: PageId; title: string }[] = [
  { id: 'registration', title: 'Регистрация' },
  { id: 'subscription', title: 'Подписка (wizard)' },
]

function App() {
  const [page, setPage] = useState<PageId>('subscription')

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

      {page === 'registration' ? <RegistrationForm /> : <SubscriptionForm />}
    </>
  )
}

export default App
