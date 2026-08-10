import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Trophy, Star, BookOpen, Filter, Loader2,
    User, Award, ChevronUp
} from 'lucide-react';
import './IdeaLeaderboard.css';

export default function IdeaLeaderboard() {
    const { lang } = useI18n();
    const { user } = useAuth();
    const role = (user?.role || '').toLowerCase();
    const isTrainer = role === 'trainer' || !!(user?.is_admin);

    const [ideas, setIdeas]     = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courseFilter, setCourseFilter] = useState('');
    const [voting, setVoting]   = useState(null); // idea id being voted
    const [hoverRating, setHoverRating] = useState({}); // { [ideaId]: n }
    const [noteMap, setNoteMap] = useState({});    // { [ideaId]: text }

    useEffect(() => {
        fetch('/api/training/courses/list.php')
            .then(r => r.json())
            .then(d => setCourses(d.courses || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchLeaderboard();
    }, [courseFilter]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const url = '/api/training/votes/list.php?' + (courseFilter ? `course_id=${courseFilter}` : '');
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) setIdeas(data.ideas || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleVote = async (ideaId, rating) => {
        if (!isTrainer) return;
        setVoting(ideaId);
        try {
            const res = await fetch('/api/training/votes/cast.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea_id: ideaId, rating, notes: noteMap[ideaId] || '' })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setIdeas(prev => prev.map(i =>
                    i.id === ideaId
                        ? { ...i, avg_rating: data.avg_rating, vote_count: data.vote_count }
                        : i
                ).sort((a, b) => b.avg_rating - a.avg_rating || b.vote_count - a.vote_count));
            }
        } catch (e) { console.error(e); }
        finally { setVoting(null); }
    };

    const StarRating = ({ idea }) => {
        const current = hoverRating[idea.id] ?? 0;
        return (
            <div className="star-vote-row">
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        className={`star-btn ${n <= current ? 'star-active' : ''}`}
                        onMouseEnter={() => setHoverRating(h => ({ ...h, [idea.id]: n }))}
                        onMouseLeave={() => setHoverRating(h => ({ ...h, [idea.id]: 0 }))}
                        onClick={() => handleVote(idea.id, n)}
                        disabled={voting === idea.id}
                        title={`Rate ${n} star${n > 1 ? 's' : ''}`}
                    >
                        <Star size={18} fill={n <= current ? '#F59E0B' : 'none'} stroke={n <= current ? '#F59E0B' : 'currentColor'} />
                    </button>
                ))}
                {voting === idea.id && <Loader2 size={16} className="spin" />}
            </div>
        );
    };

    const medalColors = ['#F59E0B', '#9CA3AF', '#B45309'];

    return (
        <div className="leaderboard-page">
            <div className="lb-header">
                <div>
                    <h1><Trophy size={28} /> {lang === 'ar' ? 'لوحة أفضل مشاريع المتدربين' : 'Project Ideas Leaderboard'}</h1>
                    <p>{lang === 'ar' ? 'أفضل المقترحات مُرتّبة حسب تقييمات أعضاء هيئة التدريس' : 'Top-rated project proposals ranked by faculty votes'}</p>
                </div>
                <div className="lb-filter">
                    <Filter size={16} />
                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                        <option value="">{lang === 'ar' ? 'جميع الدورات' : 'All Courses'}</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>
                                {lang === 'ar' && c.name_ar ? c.name_ar : c.name_en}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="lb-loading"><Loader2 className="spin" size={32} /></div>
            ) : ideas.length === 0 ? (
                <div className="lb-empty">
                    <Trophy size={48} strokeWidth={1} />
                    <h3>{lang === 'ar' ? 'لا توجد مشاريع مُقيَّمة بعد' : 'No rated projects yet'}</h3>
                    <p>{lang === 'ar' ? 'ستظهر المشاريع هنا بعد تقييمها من أعضاء هيئة التدريس.' : 'Projects will appear here once rated by faculty.'}</p>
                </div>
            ) : (
                <div className="lb-list">
                    {/* Top 3 podium */}
                    {ideas.length >= 3 && (
                        <div className="podium">
                            {[ideas[1], ideas[0], ideas[2]].map((idea, podIdx) => {
                                const rank = podIdx === 1 ? 1 : podIdx === 0 ? 2 : 3;
                                return (
                                    <div key={idea.id} className={`podium-card rank-${rank}`}>
                                        <div className="podium-medal" style={{ background: medalColors[rank - 1] }}>
                                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                                        </div>
                                        <h4>{idea.title_en || idea.title_ar}</h4>
                                        <p className="podium-trainee"><User size={12} /> {idea.trainee_name || 'Unknown'}</p>
                                        <div className="podium-score">
                                            <Star size={14} fill="#F59E0B" stroke="#F59E0B" />
                                            <strong>{idea.avg_rating.toFixed(1)}</strong>
                                            <span>({idea.vote_count} {lang === 'ar' ? 'أصوات' : 'votes'})</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full ranked list */}
                    <div className="lb-table-wrap">
                        <table className="lb-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{lang === 'ar' ? 'المشروع' : 'Project'}</th>
                                    <th>{lang === 'ar' ? 'المتدرب' : 'Trainee'}</th>
                                    <th>{lang === 'ar' ? 'الدورة' : 'Course'}</th>
                                    <th><Star size={14} /> {lang === 'ar' ? 'التقييم' : 'Rating'}</th>
                                    {isTrainer && <th>{lang === 'ar' ? 'تصويتك' : 'Your Vote'}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {ideas.map((idea, idx) => (
                                    <tr key={idea.id} className={idx < 3 ? 'top-row' : ''}>
                                        <td>
                                            <span className="rank-badge" style={{ background: idx < 3 ? medalColors[idx] : 'var(--surface-2)' }}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{idea.title_en || idea.title_ar}</strong>
                                            {idea.description_en && (
                                                <p className="lb-desc">{idea.description_en.substring(0, 80)}…</p>
                                            )}
                                        </td>
                                        <td>
                                            <div className="trainee-cell">
                                                <User size={14} />
                                                {idea.trainee_name || 'Unknown'}
                                                {idea.student_id && <span className="sid">({idea.student_id})</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="course-tag-sm">
                                                <BookOpen size={12} />
                                                {lang === 'ar' && idea.course_name_ar ? idea.course_name_ar : idea.course_name_en}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="rating-cell">
                                                <Star size={14} fill="#F59E0B" stroke="#F59E0B" />
                                                <strong>{idea.avg_rating.toFixed(1)}</strong>
                                                <span className="vote-count">/ 5 ({idea.vote_count})</span>
                                            </div>
                                        </td>
                                        {isTrainer && (
                                            <td>
                                                <StarRating idea={idea} />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
