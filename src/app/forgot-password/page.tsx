"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/app/auth/actions";
import Spinner from "@/components/ui/Spinner";

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);
        const result = await forgotPassword(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            setSuccess(true);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-800">
            <div className="w-full max-w-md px-8 py-10 bg-white rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Te enviamos un enlace al email
                    </p>
                </div>

                {success ? (
                    <div className="text-center space-y-4">
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Revisá tu email para continuar.
                        </div>
                        <Link href="/login" className="block text-sm text-blue-600 hover:underline">
                            Volver al login
                        </Link>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="profesor@ejemplo.com"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            {loading && <Spinner />}
                            {loading ? "Enviando..." : "Enviar enlace"}
                        </button>

                        <p className="text-center text-sm text-slate-500">
                            <Link href="/login" className="text-blue-600 hover:underline">
                                Volver al login
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
