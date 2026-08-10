import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUser, getUserProfile, signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut, clearSessionCache } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        let result = { user: null, profile: null };
        try {
            const u = await getUser();
            if (u) {
                setUser(u);
                const p = await getUserProfile(u.id);
                setProfile(p);
                result = { user: u, profile: p };
            } else {
                setUser(null);
                setProfile(null);
            }
        } catch (e) {
            console.error('Auth check failed:', e);
            setUser(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
        return result;
    }, []);

    useEffect(() => { loadUser(); }, [loadUser]);

    const login = useCallback(async (email, password) => {
        const result = await apiSignIn(email, password);
        if (result.requiresVerification) return result;
        if (result.error) return result;
        const sessionData = await loadUser();
        return { ...result, ...sessionData };
    }, [loadUser]);

    const register = useCallback(async (email, password, extra) => {
        const result = await apiSignUp(email, password, extra);
        if (result.requiresVerification) return result;
        if (result.error) return result;
        const sessionData = await loadUser();
        return { ...result, ...sessionData };
    }, [loadUser]);

    const logout = useCallback(async () => {
        await apiSignOut();
        clearSessionCache();
        setUser(null);
        setProfile(null);
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            const p = await getUserProfile(user.id);
            setProfile(p);
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile, reloadSession: loadUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
