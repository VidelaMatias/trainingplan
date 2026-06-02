"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";
import Spinner from "@/components/ui/Spinner";

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);
        const result = await login(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-800'>
            <div className='w-full max-w-md px-8 py-10 bg-white rounded-2xl shadow-2xl'>
                <div className='text-center mb-8'>
                    <div className='inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4'>
                        <svg
                            className='w-8 h-8 text-white'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'>
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M13 10V3L4 14h7v7l9-11h-7z'
                            />
                        </svg>
                    </div>
                    <h1 className='text-2xl font-bold text-slate-900'>
                        Training Planner
                    </h1>
                    <p className='text-slate-500 text-sm mt-1'>
                        Diego Simon Trail Run
                    </p>
                </div>

                <form action={handleSubmit} className='space-y-5'>
                    <div>
                        <label
                            htmlFor='email'
                            className='block text-sm font-medium text-slate-700 mb-1'>
                            Email
                        </label>
                        <input
                            id='email'
                            name='email'
                            type='email'
                            required
                            autoComplete='email'
                            className='w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
                            placeholder='profesor@ejemplo.com'
                        />
                    </div>

                    <div>
                        <label
                            htmlFor='password'
                            className='block text-sm font-medium text-slate-700 mb-1'>
                            Contraseña
                        </label>
                        <input
                            id='password'
                            name='password'
                            type='password'
                            required
                            autoComplete='current-password'
                            className='w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
                            placeholder='••••••••'
                        />
                    </div>

                    {error && (
                        <div className='flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3'>
                            <svg
                                className='w-4 h-4 shrink-0'
                                fill='currentColor'
                                viewBox='0 0 20 20'>
                                <path
                                    fillRule='evenodd'
                                    d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                                    clipRule='evenodd'
                                />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className='text-right'>
                        <Link href='/forgot-password' className='text-sm text-blue-600 hover:underline'>
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <button
                        type='submit'
                        disabled={loading}
                        className='w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
                        {loading && <Spinner />}
                        {loading ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>
            </div>
        </div>
    );
}
