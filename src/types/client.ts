export interface Client {
  id: string
  created_at: string
  created_by: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  goal: string | null
  notes: string | null
  rhythm_notes: string | null
  active: boolean
}

export type ClientInsert = Omit<Client, 'id' | 'created_at'>
export type ClientUpdate = Partial<ClientInsert>
