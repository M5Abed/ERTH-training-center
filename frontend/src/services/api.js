/**
 * API Service — ERTH Training Center
 * Only active endpoints are included here.
 */

const API_BASE = '/api';

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
}

async function _api(path, { method = 'GET', body = null, form = null } = {}) {
    const opts = { method, credentials: 'include', headers: {} };
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
        const token = getCookie('thinktank_csrf_token');
        if (token) opts.headers['X-CSRF-Token'] = token;
    }
    // Attach user identity header for resilient proxy auth
    try {
        const storedStr = sessionStorage.getItem('erth_session_cache');
        if (storedStr) {
            const stored = JSON.parse(storedStr);
            const uid = stored?.data?.user?.id;
            if (uid) {
                opts.headers['X-User-Id'] = String(uid);
                opts.headers['Authorization'] = `Bearer ${uid}`;
            }
        }
    } catch (_) {}
    if (form) { opts.body = form; }
    else if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    try {
        const res = await fetch(`${API_BASE}/${path}`, opts);
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};
        if (!res.ok) console.error(`[api] ${path} → ${res.status}`, json.error ?? json);
        return { data: json, error: res.ok ? null : { message: json.error ?? 'Request failed' }, status: res.status };
    } catch (err) {
        console.error('[api] Network error:', err);
        return { data: null, error: { message: 'Connection error. Check your internet and try again.' } };
    }
}

// ── Session cache ──────────────────────────────────────────────────────────────
let _sessionCache = null;
let _sessionCacheTime = 0;
const SESSION_CACHE_TTL = 60000 * 5;

async function _getSessionData() {
    const now = Date.now();
    if (_sessionCache && (now - _sessionCacheTime) < SESSION_CACHE_TTL) return _sessionCache;
    try {
        const storedStr = sessionStorage.getItem('erth_session_cache');
        if (storedStr) {
            const stored = JSON.parse(storedStr);
            if (now - stored.time < SESSION_CACHE_TTL) {
                _sessionCache = stored.data;
                _sessionCacheTime = stored.time;
                return stored.data;
            }
        }
    } catch (e) { }
    const { data } = await _api('auth/session.php');
    if (data && data.user) {
        _sessionCache = data;
        _sessionCacheTime = now;
        try { sessionStorage.setItem('erth_session_cache', JSON.stringify({ data, time: now })); } catch (e) { }
    } else {
        _sessionCache = null;
        sessionStorage.removeItem('erth_session_cache');
    }
    return data;
}

export function clearSessionCache() {
    _sessionCache = null;
    _sessionCacheTime = 0;
    try { sessionStorage.removeItem('erth_session_cache'); } catch (e) { }
    try { sessionStorage.removeItem('thinktank_session_cache'); } catch (e) { }
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export async function getSession() { const data = await _getSessionData(); return data?.session ?? null; }
export async function getUser() { const data = await _getSessionData(); return data?.user ?? null; }

export async function getUserProfile(userId = null) {
    // session.php already returns the full user — use that when possible
    const data = await _getSessionData();
    if (!userId && data?.user) return data.user;
    if (userId && data?.user && String(data.user.id) === String(userId)) return data.user;
    // Fallback for explicitly requested different user
    const { data: profileData, error } = await _api(`users/profile.php?id=${encodeURIComponent(userId)}`);
    if (error) return null;
    return profileData;
}

export async function getPublicProfile(id) {
    // Public profile via profile.php (own endpoint)
    const { data, error } = await _api(`users/profile.php?id=${encodeURIComponent(id)}`);
    if (error) return null;
    return data;
}

export async function searchUsers(q) {
    const { data, error } = await _api(`users/search.php?q=${encodeURIComponent(q)}`);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}

export async function signIn(email, password) {
    const { data, error, status } = await _api('auth/login.php', { method: 'POST', body: { email, password } });
    if (status === 403 && data?.requires_verification) {
        return { data: null, error: null, requiresVerification: true, verificationData: data };
    }
    if (error) return { data: null, error };
    _sessionCache = null; _sessionCacheTime = 0;
    sessionStorage.removeItem('erth_session_cache');
    return { data: { user: data.user, session: { user: data.user } }, error: null };
}

export async function signUp(email, password, extra = {}) {
    const { data, error, status } = await _api('auth/register.php', { method: 'POST', body: { email, password, ...extra } });
    if (data?.requires_verification) {
        return { data: null, error: null, requiresVerification: true, verificationData: data };
    }
    if (error) return { data: null, error };
    _sessionCache = null; _sessionCacheTime = 0;
    sessionStorage.removeItem('erth_session_cache');
    return { data: { user: data.user, session: { user: data.user } }, error: null };
}

export async function verifyOtp(userId, email, otp) {
    const { data, error } = await _api('auth/verify.php', { method: 'POST', body: { user_id: userId, email, otp } });
    if (error) return { data: null, error };
    _sessionCache = null; _sessionCacheTime = 0;
    sessionStorage.removeItem('erth_session_cache');
    return { data, error: null };
}

export async function resendOtp(userId, email) {
    const { data, error } = await _api('auth/resend_otp.php', { method: 'POST', body: { user_id: userId, email } });
    if (error) return { data: null, error };
    return { data, error: null };
}

export async function signOut() {
    clearSessionCache();
    await _api('auth/logout.php', { method: 'POST' });
}

// ── Profile ────────────────────────────────────────────────────────────────────
export async function upsertUserProfile(fields) {
    const { error } = await _api('users/profile.php', { method: 'POST', body: fields });
    if (!error) { clearSessionCache(); }
    return { success: !error, error };
}

// ── Notifications ──────────────────────────────────────────────────────────────
export async function getNotifications() {
    const { data, error } = await _api('notifications/list.php');
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function markNotificationsRead() { await _api('notifications/read.php', { method: 'POST' }); }
export async function clearAllNotifications() { await _api('notifications/clear.php', { method: 'POST' }); }

// ── Admin ──────────────────────────────────────────────────────────────────────
export async function getAdminStats() {
    const { data, error } = await _api('admin/stats.php');
    if (error) return {};
    return data ?? {};
}
export async function adminDeleteUser(userId) {
    const { error } = await _api('admin/delete_user.php', { method: 'POST', body: { user_id: userId } });
    return !error;
}
export async function getPublicStats() {
    const { data, error } = await _api('public/stats.php');
    if (error) return {};
    return data ?? {};
}
export async function searchTrainers(query) {
    const { data, error } = await _api(`users/search-trainers.php?q=${encodeURIComponent(query)}`);
    if (error) return [];
    return data || [];
}

// ── AI ─────────────────────────────────────────────────────────────────────────
export async function aiWrite(prompt, action = 'expand') {
    const { data, error } = await _api('ai/proxy.php', { method: 'POST', body: { prompt, action } });
    if (error) return { text: null, error: error.message || 'AI service unavailable' };
    return { text: data?.text ?? '', error: null };
}

// ── Password ───────────────────────────────────────────────────────────────────
export async function changePassword(currentPassword, newPassword) {
    const { data, error } = await _api('auth/change-password.php', { method: 'POST', body: { current_password: currentPassword, password: newPassword } });
    if (error) throw error;
    return data;
}

export async function requestPasswordReset(email) {
    const { data, error } = await _api('auth/reset-password.php', { method: 'POST', body: { email } });
    if (error) return { data: null, error };
    return { ...data, data, error: null };
}

export async function verifyResetOtp(email, otp) {
    const { data, error } = await _api('auth/reset-verify.php', { method: 'POST', body: { email, otp } });
    if (error) return { data: null, error };
    return { ...data, reset_token: data?.reset_token, data, error: null };
}

export async function resetSetPassword(email, resetToken, password) {
    const { data, error } = await _api('auth/reset-set-password.php', { method: 'POST', body: { email, reset_token: resetToken, password } });
    if (error) return { data: null, error };
    return { ...data, data, error: null };
}

// ── Proposal DOCX download ─────────────────────────────────────────────────────
export async function downloadProposalDocx(ideaId, customTitle = '') {
    if (!ideaId) throw new Error('Missing ideaId');
    const res = await fetch(`/api/training/ideas/proposal_docx.php?idea_id=${ideaId}`, {
        credentials: 'include'
    });
    if (!res.ok) {
        let err = 'Failed to download document';
        try { const j = await res.json(); if (j.error) err = j.error; } catch (_) {}
        throw new Error(err);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const safeTitle = (customTitle || 'Proposal').replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `ERTH_${safeTitle}_Proposal.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// ── Utilities ──────────────────────────────────────────────────────────────────
export function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
export function formatMonthYear(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}
export function getInitials(name = '') {
    return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}
