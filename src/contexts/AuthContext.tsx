import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, accountType: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function loadProfile(user: User) {
    const pendingType = localStorage.getItem('pending_account_type');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (data) {
      // في حال أنشأ Trigger في قاعدة البيانات الملف بنوع افتراضي 'client' وكان المستخدم قد اختار نوعاً آخر في صفحة التسجيل عبر جوجل
      if (pendingType && data.account_type !== pendingType) {
        const { data: updated } = await supabase
          .from('profiles')
          .update({ account_type: pendingType })
          .eq('auth_user_id', user.id)
          .select('*')
          .maybeSingle();
        localStorage.removeItem('pending_account_type');
        setProfile((updated as Profile) || (data as Profile));
      } else {
        localStorage.removeItem('pending_account_type');
        setProfile(data as Profile);
      }
      setLoading(false);
      return;
    }

    // إنشاء الملف الشخصي لأول مرة مع دعم بيانات Google ونوع الحساب المختار
    const resolvedAccountType = pendingType || user.user_metadata?.account_type || 'client';
    const resolvedName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'مستخدم جديد';

    const { data: created } = await supabase
      .from('profiles')
      .insert({
        auth_user_id: user.id,
        full_name: resolvedName,
        email: user.email,
        account_type: resolvedAccountType,
        ...(user.user_metadata?.avatar_url ? { avatar_url: user.user_metadata.avatar_url } : {}),
      })
      .select('*')
      .maybeSingle();

    localStorage.removeItem('pending_account_type');
    setProfile((created as Profile) || null);
    setLoading(false);
  }

  async function refreshProfile() {
    if (session) {
      await loadProfile(session.user);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }

  async function signUp(email: string, password: string, fullName: string, accountType: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, account_type: accountType },
      },
    });
    return { error: error?.message || null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}