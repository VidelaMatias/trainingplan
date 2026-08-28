import { FormPageSkeleton } from '@/components/layout/FormPageSkeleton'

// Un plan pide título y fecha de inicio, y todo el alto se lo lleva la grilla
// de la primera semana.
export default function NewPlanLoading() {
  return <FormPageSkeleton fields={2} wideBlock />
}
