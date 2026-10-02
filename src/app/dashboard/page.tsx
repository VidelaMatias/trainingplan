import Link from "next/link";
import { Plus, Users, Wallet } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { cn } from "@/lib/utils";
import { compareText } from "@/lib/text";
import { getCurrentUser } from "@/lib/auth/guards";
import { getClientsWithPlans } from "@/modules/clients/queries";
import {
    compareByName,
    matchesClientFilter,
    withClientFilter,
} from "@/modules/clients/utils";
import { getAllPayments } from "@/modules/payments/queries";
import { buildPaidIndex, getClientOwedMonths } from "@/modules/payments/utils";
import { isPlanExpiringSoon } from "@/modules/plans/utils";
import {
    DebtorsPanel,
    type DebtorRow,
} from "@/modules/payments/components/DebtorsPanel";
import {
    ExpiringPlansPanel,
    type ExpiringPlanRow,
} from "@/modules/plans/components/ExpiringPlansPanel";
import { CLIENT_FILTERS, type ClientFilter } from "@/types/constants";

export default async function DashboardPage(): Promise<React.JSX.Element> {
    // The same two reads as the alumnos list. They used to be a separate
    // training_plans query made straight from this page — unpaginated, with its
    // error discarded, so a failure read as "0 planes activos".
    const [user, clients, payments] = await Promise.all([
        getCurrentUser(),
        getClientsWithPlans(),
        getAllPayments(),
    ]);

    // Indexed once and reused across every client, instead of re-scanning the
    // full payments array per client inside getClientOwedMonths. Free alumnos
    // owe nothing, so they never reach the debtors tile or panel.
    const paidIndex = buildPaidIndex(payments);
    const rows = clients.map((client) => {
        const owed = getClientOwedMonths(client, paidIndex);
        return {
            client,
            owed,
            filterable: {
                active: client.active,
                plans: client.plans,
                owedCount: owed.length,
            },
        };
    });

    // Each tile counts alumnos with matchesClientFilter, the rule the list it
    // opens filters by, so the number on the tile and the length of that list
    // are the same. Counting plans instead put "2" on the tile of an alumno with
    // two overlapping plans and "1 de N alumnos" on the list.
    const count = (filter: ClientFilter): number =>
        rows.filter((r) => matchesClientFilter(r.filterable, filter)).length;

    const debtors: DebtorRow[] = rows
        .filter((r) => matchesClientFilter(r.filterable, CLIENT_FILTERS.DEBTORS))
        .map(({ client, owed }) => ({
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            owed,
        }))
        .sort((a, b) => b.owed.length - a.owed.length || compareByName(a, b));

    // The panel lists plans, not alumnos — soonest to end first.
    const expiringRows: ExpiringPlanRow[] = clients
        .flatMap((client) =>
            client.plans.filter(isPlanExpiringSoon).map((plan) => ({
                id: plan.id,
                title: plan.title,
                end_date: plan.end_date,
                clientName: `${client.first_name} ${client.last_name}`.trim(),
            }))
        )
        // ISO dates compare as plain strings; names with the shared collation.
        .sort((a, b) =>
            a.end_date !== b.end_date
                ? a.end_date < b.end_date
                    ? -1
                    : 1
                : compareText(a.clientName, b.clientName)
        );

    const expiringCount = count(CLIENT_FILTERS.EXPIRING);

    return (
        <div>
            <div className='mb-8'>
                <h1 className='text-2xl font-bold text-slate-900'>
                    Panel principal
                </h1>
                <p className='mt-1 text-sm text-muted-foreground'>
                    {user?.email}
                </p>
            </div>

            <div className='mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-3 md:gap-4 xl:grid-cols-6'>
                {/* Cada tile abre la lista de alumnos ya filtrada por lo que cuenta. */}
                <StatTile
                    label='Alumnos'
                    value={clients.length}
                    href='/dashboard/clients'
                />
                <StatTile
                    label='Activos'
                    value={count(CLIENT_FILTERS.ACTIVE)}
                    href={withClientFilter(
                        "/dashboard/clients",
                        CLIENT_FILTERS.ACTIVE
                    )}
                    valueClassName='text-green-600'
                />
                <StatTile
                    label='Con plan activo'
                    value={count(CLIENT_FILTERS.WITH_ACTIVE_PLAN)}
                    href={withClientFilter(
                        "/dashboard/clients",
                        CLIENT_FILTERS.WITH_ACTIVE_PLAN
                    )}
                    valueClassName='text-primary'
                />
                <StatTile
                    label='Vencen esta semana'
                    value={expiringCount}
                    href={withClientFilter(
                        "/dashboard/clients",
                        CLIENT_FILTERS.EXPIRING
                    )}
                    highlight={
                        expiringCount > 0 ? "amber" : undefined
                    }
                />
                <StatTile
                    label='Cuotas pendientes'
                    value={debtors.length}
                    href={withClientFilter(
                        "/dashboard/clients",
                        CLIENT_FILTERS.DEBTORS
                    )}
                    highlight={debtors.length > 0 ? "red" : undefined}
                />
                {/* getAllPayments ya devuelve sólo las cuotas cobradas, así que el
            total del tile es exactamente el universo que desglosa el reporte:
            los dos números no pueden discrepar. */}
                <StatTile
                    label='Métodos de pago'
                    value={payments.length}
                    href='/dashboard/payments'
                    icon={Wallet}
                    valueClassName='text-primary'
                />
            </div>

            {expiringRows.length > 0 && (
                <ExpiringPlansPanel plans={expiringRows} />
            )}

            {debtors.length > 0 && <DebtorsPanel debtors={debtors} />}

            <div className='flex gap-3'>
                <Link
                    href='/dashboard/clients'
                    className={cn(buttonVariants())}>
                    <Users />
                    Ver alumnos
                </Link>
                <Link
                    href='/dashboard/clients/new'
                    className={cn(buttonVariants({ variant: "outline" }))}>
                    <Plus />
                    Nuevo alumno
                </Link>
            </div>
        </div>
    );
}
