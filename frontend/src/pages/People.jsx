import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { searchUsers } from '../services/api';
import { COLLEGES } from '../data/constants';
import { Search, Users, Star, SlidersHorizontal, ChevronDown } from 'lucide-react';
import './People.css';

const PAGE_SIZE = 30;

export default function People() {
    const { t, lang } = useI18n();
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [college, setCollege] = useState('');
    const [year, setYear] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                const res = await searchUsers(query);
                setUsers(res || []);
                setVisibleCount(PAGE_SIZE);
                setLoading(false);
            } else {
                setUsers([]);
            }
        }, 300); // debounce
        return () => clearTimeout(timer);
    }, [query]);

    // Filter users by college and year
    const filteredUsers = users.filter(u => {
        if (college && u.college_key !== college) return false;
        if (year && String(u.academic_year) !== year) return false;
        return true;
    });

    const visibleUsers = filteredUsers.slice(0, visibleCount);
    const hasMore = visibleCount < filteredUsers.length;

    return (
        <div className="people-page">
            <div className="page-header">
                <div><h1 className="page-title">{t('nav_people')}</h1></div>
            </div>

            {/* Search bar */}
            <div className="people-toolbar">
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder={t('search_users')} value={query} onChange={e => setQuery(e.target.value)} autoFocus />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(!showFilters)}>
                    <SlidersHorizontal size={16} /> {t('filter')}
                </button>
            </div>

            {/* Filters (#29) */}
            {showFilters && (
                <div className="people-filters animate-fade-in">
                    <select value={college} onChange={e => setCollege(e.target.value)}>
                        <option value="">{t('all')} {lang === 'ar' ? 'الكلية' : 'College'}</option>
                        {COLLEGES.map(c => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(e.target.value)}>
                        <option value="">{t('all')} {lang === 'ar' ? 'السنة' : 'Year'}</option>
                        {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{t(`year_${y}`)}</option>)}
                        <option value="grad">{t('graduate')}</option>
                    </select>
                    {(college || year) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setCollege(''); setYear(''); }}>
                            {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                        </button>
                    )}
                </div>
            )}

            {loading ? (
                <div className="loading-state"><div className="spinner" /></div>
            ) : filteredUsers.length === 0 && query.length >= 2 ? (
                <div className="empty-state"><Users size={48} /><h3>{t('no_users_found')}</h3></div>
            ) : (
                <>
                    <div className="people-grid">
                        {visibleUsers.map((u, i) => (
                            <Link key={u.id} to={`/profile/${u.academic_id || u.student_id || u.id}`} className="person-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div className="person-avatar">
                                    {u.avatar_url ? <img src={u.avatar_url} alt="" /> : <span>{(u.full_name || u.email || '?')[0].toUpperCase()}</span>}
                                </div>
                                <div className="person-info">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <div className="person-name" style={{ margin: 0 }}>{u.full_name || u.email}</div>
                                        {u.username && <span className="person-username" style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(79, 70, 229, 0.08)', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>@{u.username}</span>}
                                    </div>
                                    <div className="person-college">{u.college_name || ''}</div>
                                    {u.student_id && <div className="person-student-id">#{u.student_id}</div>}
                                    {u.skills && u.skills.length > 0 && (
                                        <div className="person-skills">
                                            {u.skills.slice(0, 3).map((s, i) => <span key={i} className="skill-tag">{s.skill_name || s.id || s}</span>)}
                                        </div>
                                    )}
                                </div>
                                {u.avg_rating && <div className="person-rating"><Star size={14} /> {Number(u.avg_rating).toFixed(1)}</div>}
                            </Link>
                        ))}
                    </div>

                    {/* Load More (#30) */}
                    {hasMore && (
                        <div className="people-load-more">
                            <button className="btn btn-ghost btn-md" onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}>
                                <ChevronDown size={16} /> {lang === 'ar' ? 'عرض المزيد' : 'Load More'} ({filteredUsers.length - visibleCount} {lang === 'ar' ? 'متبقي' : 'remaining'})
                            </button>
                        </div>
                    )}
                </>
            )}
            {query.length < 2 && <div className="people-hint">{t('search')}...</div>}
        </div>
    );
}
