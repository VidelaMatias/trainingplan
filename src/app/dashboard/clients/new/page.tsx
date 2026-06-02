import Link from 'next/link'
import ClientForm from '@/components/clients/ClientForm'

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/clients"
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nuevo alumno</h1>
          <p className="text-slate-500 text-sm mt-0.5">Completá los datos del alumno</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ClientForm />
      </div>
    </div>
  )
}
