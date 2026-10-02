import { redirect } from "next/navigation";
import { Mail } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getFreshUser } from "@/lib/auth/guards";
import { ChangePasswordForm } from "@/modules/auth/components/ChangePasswordForm";

export default async function AccountPage(): Promise<React.JSX.Element> {
    const [user, fresh] = await Promise.all([getCurrentUser(), getFreshUser()]);
    if (!user) redirect("/login");

    const email = fresh?.email ?? user.email;

    return (
        <div className='max-w-2xl'>
            <div className='mb-6'>
                <h1 className='text-2xl font-bold text-slate-900'>Mi cuenta</h1>
                <p className='mt-0.5 text-sm text-muted-foreground'>
                    Tus datos de acceso
                </p>
            </div>

            <Card className='mb-6'>
                <CardHeader className='border-b border-border'>
                    <CardTitle>Email</CardTitle>
                </CardHeader>
                <CardContent className='flex items-center gap-2 text-sm text-secondary-foreground'>
                    <Mail className='size-4 shrink-0 text-muted-foreground' />
                    <span className='truncate'>{email}</span>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className='border-b border-border'>
                    <CardTitle>Cambiar contraseña</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChangePasswordForm />
                </CardContent>
            </Card>
        </div>
    );
}
