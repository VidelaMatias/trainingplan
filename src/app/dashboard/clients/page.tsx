import Link from "next/link";
import { Plus, Users, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getClientsWithPlans } from "@/modules/clients/queries";
import { getAllPayments } from "@/modules/payments/queries";
import { buildPaidIndex, getClientOwedMonths } from "@/modules/payments/utils";
import { getPlanStatus } from "@/modules/plans/utils";
import {
    matchesClientFilter,
    readClientFilter,
    withClientFilter,
    type ClientFilterSearchParams,
} from "@/modules/clients/utils";
import {
    ClientsList,
    type ClientRow,
} from "@/modules/clients/components/ClientsList";
import {
    CLIENT_FILTERS,
    CLIENT_FILTER_META,
    PLAN_STATUS,
} from "@/types/constants";
import type { PlanSummary } from "@/modules/clients/queries";

function currentPlanOf(plans: PlanSummary[]): PlanSummary | undefined {
    return (
        plans.find((p) => getPlanStatus(p) === PLAN_STATUS.ACTIVE) ??
        plans.find((p) => getPlanStatus(p) === PLAN_STATUS.UPCOMING) ??
        plans[0]
    );
}

interface ClientsPageProps {
    searchParams: ClientFilterSearchParams;
}

export default async function ClientsPage({
    searchParams,
}: ClientsPageProps): Promise<React.JSX.Element> {
    const [filter, clients, payments] = await Promise.all([
        readClientFilter(searchParams),
        getClientsWithPlans(),
        getAllPayments(),
    ]);
    const filterMeta = filter ? CLIENT_FILTER_META[filter] : null;

    const paidIndex = buildPaidIndex(payments);
    const rows: ClientRow[] = [];
    for (const client of clients) {
        const owed = getClientOwedMonths(client, paidIndex);

        if (
            filter &&
            !matchesClientFilter(
                {
                    active: client.active,
                    plans: client.plans,
                    owedCount: owed.length,
                },
                filter
            )
        ) {
            continue;
        }

        const current = currentPlanOf(client.plans);
        rows.push({
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email,
            date_of_birth: client.date_of_birth,
            goal: client.goal,
            active: client.active,
            isFree: client.is_free,
            planKey: current ? getPlanStatus(current) : "none",
            planEndDate: current?.end_date ?? null,
            owedLabels: owed.map((m) => m.label),
        });
    }

    return (
        <div>
            <div className='mb-6 flex items-center justify-between gap-3'>
                <div className='min-w-0'>
                    <h1 className='text-2xl font-bold text-slate-900'>
                        {filterMeta?.title ?? "Alumnos"}
                    </h1>
                    <p className='mt-0.5 text-sm text-muted-foreground'>
                        {filter
                            ? `${rows.length} de ${clients.length} ${
                                  clients.length === 1 ? "alumno" : "alumnos"
                              }`
                            : `${clients.length} ${
                                  clients.length === 1
                                      ? "alumno registrado"
                                      : "alumnos registrados"
                              }`}
                    </p>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                    {filter && (
                        <Link
                            href='/dashboard/clients'
                            className={cn(
                                buttonVariants({
                                    variant: "secondary",
                                    size: "sm",
                                })
                            )}>
                            <X />
                            Ver todos
                        </Link>
                    )}
                    <Link
                        href={withClientFilter(
                            "/dashboard/clients/new",
                            filter
                        )}
                        className={cn(buttonVariants())}>
                        <Plus />
                        Nuevo alumno
                    </Link>
                </div>
            </div>

            {rows.length === 0 ? (
                <Card className='py-20 text-center'>
                    <Users className='mx-auto mb-3 size-12 text-slate-300' />
                    <p className='font-medium text-muted-foreground'>
                        {filterMeta?.empty ?? "No hay alumnos aún"}
                    </p>
                    {filter ? (
                        <Link
                            href='/dashboard/clients'
                            className={cn(
                                buttonVariants({
                                    variant: "secondary",
                                    size: "sm",
                                }),
                                "mt-4"
                            )}>
                            Ver todos los alumnos
                        </Link>
                    ) : (
                        <>
                            <p className='mt-1 text-sm text-muted-foreground'>
                                Creá tu primer alumno para comenzar
                            </p>
                            <Link
                                href='/dashboard/clients/new'
                                className={cn(
                                    buttonVariants({ size: "sm" }),
                                    "mt-4"
                                )}>
                                Crear alumno
                            </Link>
                        </>
                    )}
                </Card>
            ) : (
                <ClientsList
                    key={filter ?? "all"}
                    rows={rows}
                    initialSort={
                        filter === CLIENT_FILTERS.DEBTORS ? "owed" : undefined
                    }
                />
            )}
        </div>
    );
}
