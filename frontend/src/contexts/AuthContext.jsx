import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUser, signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut, clearSessionCache } from '../services/api';

const AuthContext = createContext();

// Wraps a promise with a timeout — resolves null instead of hanging forever
function withTimeout(promise, ms = 8000) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(null), ms))
    ]);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async (forceFresh = false) => {
        if (forceFresh) clearSessionCache();
        try {
            // Single API call — session.php already returns the full user object
            const u = await withTimeout(getUser(), 8000);
            if (u) {
                setUser(u);
                setProfile(u);   // session already has all profile fields
                return { user: u, profile: u };
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
        return { user: null, profile: null };
    }, []);

    useEffect(() => { loadUser(true); }, [loadUser]);

    const login = useCallback(async (email, password) => {
        clearSessionCache();
        const result = await apiSignIn(email, password);
        if (result.requiresVerification) return result;
        if (result.error) return result;
        // Pre-set user from login response immediately so UI doesn't flicker
        if (result.data?.user) {
            setUser(result.data.user);
            setProfile(result.data.user);
        }
        // Then reload from session to get authoritative server state
        clearSessionCache();
        const sessionData = await loadUser(true);
        if (!sessionData.user && result.data?.user) {
            setUser(result.data.user);
            setProfile(result.data.user);
            return { ...result, user: result.data.user, profile: result.data.user };
        }
        return { ...result, ...sessionData };
    }, [loadUser]);

    const register = useCallback(async (email, password, extra) => {
        clearSessionCache();
        const result = await apiSignUp(email, password, extra);
        if (result.requiresVerification) return result;
        if (result.error) return result;
        if (result.data?.user) {
            setUser(result.data.user);
            setProfile(result.data.user);
        }
        clearSessionCache();
        const sessionData = await loadUser(true);
        if (!sessionData.user && result.data?.user) {
            setUser(result.data.user);
            setProfile(result.data.user);
            return { ...result, user: result.data.user, profile: result.data.user };
        }
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
            const updated = await withTimeout(getUser(), 5000);
            if (updated) {
                setUser(updated);
                setProfile(updated);
            }
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, register, logout, refreshProfile, reloadSession: () => loadUser(true) }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
