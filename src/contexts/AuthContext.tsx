import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { subscribeToPushNotifications } from '@/lib/pushNotifications';
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
    subscribeToPushNotifications(user.id).catch(console.error);

    const pendingType = localStorage.getItem('pending_account_type');
    const pendingBusinessName = localStorage.getItem('pending_business_name');
    const pendingBusinessType = localStorage.getItem('pending_business_type');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (data) {
      const needsTypeUpdate = pendingType && data.account_type !== pendingType;
      const needsBusinessUpdate =
        (pendingType === 'business' || data.account_type === 'business') &&
        (pendingBusinessName || pendingBusinessType);

      if (needsTypeUpdate || needsBusinessUpdate) {
        const updates: Record<string, unknown> = {};
        if (needsTypeUpdate) updates.account_type = pendingType;
        if (pendingBusinessName) updates.business_name = pendingBusinessName;
        if (pendingBusinessType) updates.business_type = pendingBusinessType;

        const { data: updated } = await supabase
          .from('profiles')
          .update(updates)
          .eq('auth_user_id', user.id)
          .select('*')
          .maybeSingle();

        localStorage.removeItem('pending_account_type');
        localStorage.removeItem('pending_business_name');
        localStorage.removeItem('pending_business_type');
        setProfile((updated as Profile) || (data as Profile));
      } else {
        localStorage.removeItem('pending_account_type');
        localStorage.removeItem('pending_business_name');
        localStorage.removeItem('pending_business_type');
        setProfile(data as Profile);
      }
      setLoading(false);
      return;
    }

    const rawType = pendingType || user.user_metadata?.account_type || 'individual';
    const resolvedAccountType = rawType === 'business' ? 'business' : 'individual';
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
        ...(resolvedAccountType === 'business' && pendingBusinessName
          ? { business_name: pendingBusinessName }
          : {}),
        ...(resolvedAccountType === 'business' && pendingBusinessType
          ? { business_type: pendingBusinessType }
          : {}),
        ...(user.user_metadata?.avatar_url ? { avatar_url: user.user_metadata.avatar_url } : {}),
      })
      .select('*')
      .maybeSingle();

    localStorage.removeItem('pending_account_type');
    localStorage.removeItem('pending_business_name');
    localStorage.removeItem('pending_business_type');
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