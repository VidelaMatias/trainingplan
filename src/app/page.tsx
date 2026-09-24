import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/guards'

export default async function Home(): Promise<never> {
  const user = await getCurrentUser()

  if (user) redirect('/dashboard')
  redirect('/login')
}
