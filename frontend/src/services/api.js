/**
 * API Service — Direct port from js/api.js
 * All endpoints and signatures preserved exactly.
 */

const API_BASE = '/api';

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Normalize user objects: backend returns full_name_en, frontend expects full_name
function normalizeUser(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (!obj.full_name && obj.full_name) {
        obj.full_name = obj.full_name || '';
    }
    if (obj.college_key) {
        const lang = localStorage.getItem('thinktank_lang') || 'en';
        const colleges = [
            { key: 'cs', en: 'Computer Science & Engineering', ar: 'كلية علوم الحاسبات والهندسة' },
            { key: 'engineering', en: 'Engineering', ar: 'كلية الهندسة' },
            { key: 'science', en: 'Science', ar: 'كلية العلوم' },
            { key: 'business', en: 'Business', ar: 'كلية الأعمال' },
            { key: 'other', en: 'Other College', ar: 'كلية أخرى' },
        ];
        const college = colleges.find(c => c.key === obj.college_key);
        obj.college_name = college ? (lang === 'ar' ? college.ar : college.en) : obj.college_key;
    } else {
        obj.college_name = '';
    }
    return obj;
}
function normalizeUsers(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(normalizeUser);
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

// Session cache
let _sessionCache = null;
let _sessionCacheTime = 0;
const SESSION_CACHE_TTL = 60000 * 5;

async function _getSessionData() {
    const now = Date.now();
    if (_sessionCache && (now - _sessionCacheTime) < SESSION_CACHE_TTL) return _sessionCache;
    try {
        const storedStr = sessionStorage.getItem('thinktank_session_cache');
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
        normalizeUser(data.user);
        _sessionCache = data;
        _sessionCacheTime = now;
        try { sessionStorage.setItem('thinktank_session_cache', JSON.stringify({ data, time: now })); } catch (e) { }
    } else {
        _sessionCache = null;
        sessionStorage.removeItem('thinktank_session_cache');
    }
    return data;
}

export function clearSessionCache() {
    _sessionCache = null;
    _sessionCacheTime = 0;
    try { sessionStorage.removeItem('thinktank_session_cache'); } catch (e) { }
    try { sessionStorage.clear(); } catch (e) { }
}

// Auth
export async function getSession() { const data = await _getSessionData(); return data?.session ?? null; }
export async function getUser() { const data = await _getSessionData(); return data?.user ?? null; }
export async function getUserProfile(userId = null) {
    const validId = (userId && userId !== 'undefined' && userId !== 'null') ? userId : null;
    const url = validId ? `users/profile.php?id=${encodeURIComponent(validId)}` : 'users/profile.php';
    const { data, error } = await _api(url);
    if (error) { console.error('getUserProfile error:', error.message); return null; }
    return normalizeUser(data);
}
export async function getPublicProfile(id) {
    const { data, error } = await _api(`public/profile.php?id=${encodeURIComponent(id)}`);
    if (error) { console.error('getPublicProfile error:', error.message); return null; }
    return normalizeUser(data);
}
export async function searchUsers(q) {
    const { data, error } = await _api(`users/search.php?q=${encodeURIComponent(q)}`);
    if (error) return [];
    return normalizeUsers(Array.isArray(data) ? data : []);
}

export async function signIn(email, password) {
    const { data, error, status } = await _api('auth/login.php', { method: 'POST', body: { email, password } });
    // Handle "email not verified" — return verification info instead of a login error
    if (status === 403 && data?.requires_verification) {
        return { data: null, error: null, requiresVerification: true, verificationData: data };
    }
    if (error) return { data: null, error };
    _sessionCache = null; _sessionCacheTime = 0;
    sessionStorage.removeItem('thinktank_session_cache');
    return { data: { user: data.user, session: { user: data.user } }, error: null };
}

export async function signUp(email, password, extra = {}) {
    const { data, error, status } = await _api('auth/register.php', { method: 'POST', body: { email, password, ...extra } });
    // Registration now returns requires_verification on success (201)
    if (data?.requires_verification) {
        return { data: null, error: null, requiresVerification: true, verificationData: data };
    }
    if (error) return { data: null, error };
    _sessionCache = null; _sessionCacheTime = 0;
    sessionStorage.removeItem('thinktank_session_cache');
    return { data: { user: data.user, session: { user: data.user } }, error: null };
}

export async function verifyOtp(userId, email, otp) {
    const { data, error } = await _api('auth/verify.php', { method: 'POST', body: { user_id: userId, email, otp } });
    if (error) return { data: null, error };
    _sessionCache = null; _sessionCacheTime = 0;
    sessionStorage.removeItem('thinktank_session_cache');
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

// Profile
export async function upsertUserProfile(fields) {
    const { error } = await _api('users/profile.php', { method: 'POST', body: fields });
    return { success: !error, error };
}
export async function updateUserSkills(skills) {
    const { error } = await _api('users/skills.php', { method: 'POST', body: { skills } });
    return !error;
}
export async function updateUserPreferences(data) {
    const { error } = await _api('users/preferences.php', { method: 'POST', body: data });
    return !error;
}
export async function uploadAvatar(file) {
    const form = new FormData();
    form.append('avatar', file);
    const { data, error } = await _api('users/avatar.php', { method: 'POST', form });
    if (error) return null;
    return data?.url ?? null;
}

// Projects
export async function getProjects({ status, college_key, type, search, skill_id, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (college_key) params.set('college_key', college_key);
    if (type) params.set('type', type);
    if (search) params.set('search', search);
    if (skill_id) params.set('skill_id', skill_id);
    params.set('limit', limit);
    params.set('offset', offset);
    const { data, error } = await _api(`projects/list.php?${params}`);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function getProject(id) {
    const { data, error } = await _api(`projects/get.php?id=${id}`);
    if (error) return null;
    if (data && Array.isArray(data.team_members)) data.team_members = normalizeUsers(data.team_members);
    return normalizeUser(data);
}
export async function createProject(projectData) {
    const { data, error } = await _api('projects/create.php', { method: 'POST', body: projectData });
    if (error) return null;
    return data;
}
export async function updateProject(projectId, projectData) {
    const { error } = await _api('projects/edit.php', { method: 'POST', body: { id: projectId, ...projectData } });
    return !error;
}
export async function deleteProject(projectId) {
    const { error } = await _api(`projects/delete.php?id=${projectId}`, { method: 'POST' });
    return !error;
}
export async function updateProjectStatus(projectId, status) {
    const { error } = await _api('projects/update-status.php', { method: 'POST', body: { id: projectId, status } });
    return !error;
}
export async function addProjectSkills(projectId, skills) {
    const { error } = await _api('projects/skills.php', { method: 'POST', body: { project_id: projectId, skills } });
    return !error;
}

// Applications
export async function getApplications(projectId) {
    const { data, error } = await _api(`projects/applications.php?project_id=${projectId}`);
    if (error) return [];
    return normalizeUsers(Array.isArray(data) ? data : []);
}
export async function applyToProject(projectId, message = '') {
    const { data, error } = await _api('projects/applications.php', { method: 'POST', body: { project_id: projectId, message } });
    if (error) throw new Error(error.message || 'Failed to submit application');
    return data;
}
export async function updateApplicationStatus(appId, status) {
    const { error } = await _api('projects/applications.php', { method: 'PATCH', body: { id: appId, status } });
    return !error;
}
export async function checkExistingApplication(projectId) {
    const { data, error } = await _api(`projects/my-application.php?project_id=${projectId}`);
    if (error) return null;
    return data ?? null;
}
export async function getApplicationsForUser() {
    const { data, error } = await _api('projects/my-applications.php');
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function getReceivedApplications() {
    const { data, error } = await _api('projects/received-applications.php');
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function respondToInvitation(projectId, action) {
    const { error } = await _api('projects/respond-invite.php', { method: 'POST', body: { project_id: projectId, action } });
    return !error;
}

// Team
export async function getTeamMembers(projectId) {
    const { data, error } = await _api(`team/members.php?project_id=${projectId}`);
    if (error) return [];
    return normalizeUsers(Array.isArray(data) ? data : []);
}
export async function removeTeamMember(projectId, userId) {
    const form = new FormData();
    form.append('project_id', projectId);
    form.append('user_id', userId);
    const { error } = await _api('projects/remove_member.php', { method: 'POST', form });
    return !error;
}
export async function leaveProject(projectId) {
    const { error } = await _api('projects/leave_project.php', { method: 'POST', body: { project_id: projectId } });
    return !error;
}

// Matches
export async function getEligibleStudents(projectId) {
    const { data, error } = await _api(`matches/eligible.php?project_id=${projectId}`);
    if (error) return { project: null, students: [] };
    return { project: normalizeUser(data?.project) ?? null, students: normalizeUsers(data?.students ?? []) };
}

// Tasks (Kanban)
export async function getTasks(projectId) {
    const { data, error } = await _api(`tasks/list.php?project_id=${projectId}`);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function createTask(projectId, title, description = '', assignedTo = null, deadline = null) {
    const { data, error } = await _api('tasks/create.php', { method: 'POST', body: { project_id: projectId, title, description, assigned_to: assignedTo, deadline } });
    if (error) return null;
    return data;
}
export async function updateTask(taskId, updates) {
    const { error } = await _api('tasks/update.php', { method: 'POST', body: { id: taskId, ...updates } });
    return !error;
}
export async function deleteTask(taskId) {
    const { error } = await _api('tasks/delete.php', { method: 'POST', body: { id: taskId } });
    return !error;
}

// Chat
export async function getChatMessages(projectId, afterId = 0) {
    const url = `chat/list.php?project_id=${projectId}` + (afterId ? `&after_id=${afterId}` : '');
    const { data, error } = await _api(url);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function sendChatMessage(projectId, message) {
    const { error } = await _api('chat/send.php', { method: 'POST', body: { project_id: projectId, message } });
    return !error;
}

// Activity Feed
export async function getActivityFeed(limit = 20, offset = 0) {
    const { data, error } = await _api(`activity/feed.php?limit=${limit}&offset=${offset}`);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function getMyProjects() {
    const { data, error } = await _api('projects/my_projects.php');
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function getUserProjects(userId) {
    const { data, error } = await _api(`projects/user_projects.php?user_id=${userId}`);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}

// Reviews
export async function getUserReviews(userId) {
    const { data, error } = await _api(`reviews/get.php?user_id=${userId}`);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function submitReview(reviewData) {
    const { error } = await _api('reviews/submit.php', { method: 'POST', body: reviewData });
    return { error: error || null };
}
export async function getWrittenReviews() {
    const { data, error } = await _api('reviews/written.php');
    if (error) return [];
    return Array.isArray(data?.reviews) ? data.reviews : [];
}
export async function updateReview(reviewId, rating, commitment, quality, collaboration, comment) {
    const payload = { id: reviewId, rating, commitment_rating: commitment, quality_rating: quality, collaboration_rating: collaboration, comment };
    console.log('[updateReview] Sending:', JSON.stringify(payload));
    const { data, error, status } = await _api('reviews/edit.php', { method: 'POST', body: payload });
    console.log('[updateReview] Response:', { data, error, status });
    return { error: error || null };
}
export async function deleteReview(reviewId) {
    const { error } = await _api('reviews/delete.php', { method: 'POST', body: { id: reviewId } });
    return { error: error || null };
}
export async function getCompletedProjectsForUser(userId) {
    const { data, error } = await _api(`projects/completed-by-user.php?user_id=${userId}`);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}

// Notifications
export async function getNotifications() {
    const { data, error } = await _api('notifications/list.php');
    if (error) return [];
    return Array.isArray(data) ? data : [];
}
export async function markNotificationsRead() { await _api('notifications/read.php', { method: 'POST' }); }
export async function clearAllNotifications() { await _api('notifications/clear.php', { method: 'POST' }); }
export async function createNotification(userId, type, messageEn, messageAr = '', projectId = null) {
    const { error } = await _api('notifications/create.php', {
        method: 'POST',
        body: { user_id: userId, type, message_en: messageEn, message_ar: messageAr, project_id: projectId }
    });
    return !error;
}

// Admin
export async function getAdminStats() {
    const { data, error } = await _api('admin/stats.php');
    if (error) return {};
    return data ?? {};
}
export async function adminDeleteUser(userId) {
    const { error } = await _api('admin/delete_user.php', { method: 'POST', body: { user_id: userId } });
    return !error;
}
export async function adminDeleteProject(projectId) {
    const { error } = await _api('admin/delete_project.php', { method: 'POST', body: { project_id: projectId } });
    return !error;
}
export async function adminCreateStaff({ email, password, full_name_en, role, college_key }) {
    const { data, error } = await _api('admin/create_staff.php', { method: 'POST', body: { email, password, full_name_en, role, college_key } });
    if (error) return { error: error.message || 'Failed to create account' };
    return data;
}
export async function getPublicStats() {
    const { data, error } = await _api('public/stats.php');
    if (error) return {};
    return data ?? {};
}
export async function getSkillHeatmap(collegeKey = null) {
    const url = collegeKey ? `admin/heatmap.php?college_key=${encodeURIComponent(collegeKey)}` : 'admin/heatmap.php';
    const { data, error } = await _api(url);
    if (error) return [];
    return Array.isArray(data) ? data : [];
}

// AI Writer
export async function aiWrite(prompt, action = 'expand') {
    const { data, error } = await _api('ai/proxy.php', { method: 'POST', body: { prompt, action } });
    if (error) return { text: null, error: error.message || 'AI service unavailable' };
    return { text: data?.text ?? '', error: null };
}

export async function aiSuggestSkills(description) {
    const { text, error } = await aiWrite(description, 'skills');
    if (error || !text) return [];
    return text.split(',').map(s => s.trim()).filter(Boolean);
}

// Password
export async function changePassword(currentPassword, newPassword) {
    const { data, error } = await _api('auth/change-password.php', { method: 'POST', body: { current_password: currentPassword, password: newPassword } });
    if (error) throw error;
    return data;
}

// Password Reset (3-step flow)
export async function requestPasswordReset(email) {
    const { data, error } = await _api('auth/reset-password.php', { method: 'POST', body: { email } });
    if (error) return { data: null, error };
    return { data, error: null };
}

export async function verifyResetOtp(email, otp) {
    const { data, error } = await _api('auth/reset-verify.php', { method: 'POST', body: { email, otp } });
    if (error) return { data: null, error };
    return { data, error: null };
}

export async function resetSetPassword(email, resetToken, password) {
    const { data, error } = await _api('auth/reset-set-password.php', { method: 'POST', body: { email, reset_token: resetToken, password } });
    if (error) return { data: null, error };
    return { data, error: null };
}

// Utilities
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
export function isProjectExpired(deadline) {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
}
export function getInitials(nameEn = '', nameAr = '') {
    const name = nameEn || nameAr || '';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// Staff 
export async function searchStaff(query) {
    const { data, error } = await _api(`/users/search-staff.php?q=${encodeURIComponent(query)}`);
    if (error) return [];
    return data || [];
}

// Download Proposal DOCX helper
export async function downloadProposalDocx(ideaId, customTitle = '') {
    if (!ideaId) throw new Error('Missing ideaId');
    const res = await fetch(`/api/training/ideas/proposal_docx.php?idea_id=${ideaId}`, {
        credentials: 'include'
    });
    if (!res.ok) {
        let err = 'Failed to download document';
        try {
            const j = await res.json();
            if (j.error) err = j.error;
        } catch (_) {}
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
