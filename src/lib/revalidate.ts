import { revalidatePath } from 'next/cache'

// Every write in the app lands somewhere the dashboard aggregates: the panel's
// tiles, the payments report, the alumnos list and its filtered views, the
// ficha, the edit forms. Listing paths one by one kept missing some — the
// payments report after editing an alumno, the edit pages after saving.
//
// The root layout is the one scope for which Next documents a purge of the
// whole client cache, and next.config's staleTimes needs exactly that: without
// it a page visited in the last 30 s could come back with pre-edit data. A
// narrower path only looked safe because a Server Action's revalidatePath
// currently purges everything anyway, which Next calls temporary. The only
// other pages are the static auth screens, which rebuild on their next visit.
export function revalidateAppData(): void {
  revalidatePath('/', 'layout')
}
