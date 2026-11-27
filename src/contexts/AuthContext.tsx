import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
  const loadingUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user);
      } else {
        loadingUserIdRef.current = null;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(user: User, force = false) {
    if (!force && loadingUserIdRef.current === user.id) return;
    loadingUserIdRef.current = user.id;

    try {
      const rawPendingType = localStorage.getItem('pending_account_type');
      const validPendingType =
        rawPendingType === 'business' || rawPendingType === 'individual' ? rawPendingType : null;
      const pendingBusinessName = localStorage.getItem('pending_business_name');
      const pendingBusinessType = localStorage.getItem('pending_business_type');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) {
        // منع الحسابات المعطلة من قبل الإدارة
        if ((data as Profile & { is_disabled?: boolean }).is_disabled) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        subscribeToPushNotifications(user.id).catch(console.error);

        const needsTypeUpdate = validPendingType && data.account_type !== validPendingType;
        const needsBusinessUpdate =
          (validPendingType === 'business' || data.account_type === 'business') &&
          (pendingBusinessName || pendingBusinessType);

        if (needsTypeUpdate || needsBusinessUpdate) {
          const updates: Record<string, unknown> = {};
          if (needsTypeUpdate) updates.account_type = validPendingType;
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

      const rawType = validPendingType || user.user_metadata?.account_type || 'individual';
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
      subscribeToPushNotifications(user.id).catch(console.error);
      setProfile((created as Profile) || null);
      setLoading(false);
    } finally {
      loadingUserIdRef.current = null;
    }
  }

  async function refreshProfile() {
    if (session) {
      await loadProfile(session.user, true);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_disabled')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (prof?.is_disabled) {
        await supabase.auth.signOut();
        return { error: 'تم تعطيل هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم.' };
      }
    }

    return { error: null };
  }

  async function signUp(email: string, password: string, fullName: string, accountType: string) {
    const safeType = accountType === 'business' ? 'business' : 'individual';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, account_type: safeType },
      },
    });
    return { error: error?.message || null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    loadingUserIdRef.current = null;
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