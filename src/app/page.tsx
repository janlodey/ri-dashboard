'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    // Check initial session on load
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/dashboard');
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const login = async () => {
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'http://localhost:3000/dashboard' }});
    alert('Check your email for login link.');
  };

  return (
    <div className="h-screen flex justify-center items-center bg-slate-100 flex-col">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-2 border"
      />
      <button onClick={login} className="mt-4 bg-slate-500 text-white px-4 py-2">
        Login via OTP
      </button>
    </div>
  );
}