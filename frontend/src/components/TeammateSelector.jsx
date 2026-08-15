import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { Users, Search, UserPlus, X, AlertTriangle, CheckCircle2, Shield, User, Loader2, Sparkles, Crown } from 'lucide-react';
import MemberDetailModal from './MemberDetailModal';
import './TeammateSelector.css';

export default function TeammateSelector({
    courseId,
    selectedTeammates = [],
    onTeammatesChange,
    disabled = false,
    maxTeammates = 5,
    currentIdeaId = null,
    readOnly = false
}) {
    const { lang } = useI18n();
    const { user } = useAuth();
    const isAr = lang === 'ar';

    const [searchQuery, setSearchQuery] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpenDropdown, setIsOpenDropdown] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [activeModalMember, setActiveModalMember] = useState(null);
    const containerRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpenDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced Search Candidates
    useEffect(() => {
        if (!courseId) {
            setCandidates([]);
            return;
        }

        const timer = setTimeout(() => {
            fetchCandidates(searchQuery);
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery, courseId, currentIdeaId]);

    const fetchCandidates = async (q = '') => {
        if (!courseId) return;
        setLoading(true);
        setErrorMsg('');
        try {
            const url = `/api/training/ideas/search_teammates.php?course_id=${courseId}&q=${encodeURIComponent(q)}&current_idea_id=${currentIdeaId || ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.candidates) {
                setCandidates(data.candidates);
            } else {
                setCandidates([]);
                if (data.error) setErrorMsg(data.error);
            }
        } catch (err) {
            console.error('Failed to search teammates:', err);
            setCandidates([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTeammate = (candidate) => {
        if (disabled || readOnly) return;

        // Check if student is already in another team
        if (candidate.is_in_team || candidate.is_in_other_team) {
            return;
        }

        // Check if student is already selected
        if (selectedTeammates.some(t => t.id === candidate.id || t.user_id === candidate.id)) {
            return;
        }

        // Check max limit
        if (selectedTeammates.length >= maxTeammates) {
            alert(isAr ? `الحد الأقصى لأعضاء الفريق هو ${maxTeammates} زملاء.` : `Maximum team size is ${maxTeammates} teammates.`);
            return;
        }

        const newMember = {
            id: candidate.id,
            user_id: candidate.id,
            full_name: candidate.full_name,
            student_id: candidate.student_id,
            email: candidate.email,
            avatar_url: candidate.avatar_url,
            username: candidate.username,
            role: 'member'
        };

        const updated = [...selectedTeammates, newMember];
        if (onTeammatesChange) {
            onTeammatesChange(updated);
        }
        setSearchQuery('');
        setIsOpenDropdown(false);
    };

    const handleRemoveTeammate = (teammateId) => {
        if (disabled || readOnly) return;
        const updated = selectedTeammates.filter(t => (t.id || t.user_id) !== teammateId);
        if (onTeammatesChange) {
            onTeammatesChange(updated);
        }
    };

    const isSelected = (candidateId) => {
        return selectedTeammates.some(t => (t.id || t.user_id) === candidateId);
    };

    const currentUserName = user?.full_name || user?.name || user?.username || (isAr ? 'أنت' : 'You');
    const currentUserStudentId = user?.student_id;

    return (
        <div className={`teammate-selector-container ${disabled ? 'is-disabled' : ''}`} ref={containerRef}>
            {/* Header & Status */}
            <div className="teammate-selector-header">
                <div className="teammate-header-title">
                    <Users size={18} className="text-primary" />
                    <h4>{isAr ? 'أعضاء فريق المشروع (اختياري)' : 'Project Teammates (Optional)'}</h4>
                    <span className="teammate-count-badge">
                        {selectedTeammates.length + 1} / {maxTeammates + 1} {isAr ? 'أعضاء' : 'Members'}
                    </span>
                </div>
                <p className="teammate-header-subtitle">
                    {isAr 
                        ? 'يمكنك البحث عن زملائك في الدورة وإضافتهم لمشروعك. كل طالب يمكنه المشاركة في مشروع واحد فقط لكل دورة.' 
                        : 'Search and invite enrolled classmates to your project. Each student can be in only 1 project per course.'}
                </p>
            </div>

            {/* Team Roster Grid / Chips */}
            <div className="teammates-roster-grid">
                {/* Team Leader (Current User) */}
                <div 
                    className="teammate-card leader-card clickable-member-card"
                    onClick={() => setActiveModalMember({
                        full_name: currentUserName,
                        student_id: currentUserStudentId,
                        email: user?.email,
                        username: user?.username,
                        role: 'leader',
                        major: user?.major,
                        academic_year: user?.academic_year,
                        department: user?.department,
                        avatar_url: user?.avatar_url
                    })}
                    title={isAr ? 'انقر لعرض كافة بيانات قائد الفريق' : 'Click to view team leader details'}
                >
                    <div className="teammate-avatar leader-avatar">
                        <Crown size={16} className="leader-crown-icon" />
                    </div>
                    <div className="teammate-info">
                        <div className="teammate-name-row">
                            <span className="teammate-name">{currentUserName}</span>
                            <span className="badge-role badge-leader">
                                {isAr ? 'قائد الفريق' : 'Team Leader'}
                            </span>
                        </div>
                        <div className="teammate-sub-info">
                            {currentUserStudentId && <span className="teammate-id">{currentUserStudentId}</span>}
                            <span className="teammate-tag-you">({isAr ? 'أنت' : 'You'})</span>
                        </div>
                    </div>
                </div>

                {/* Selected Teammates */}
                {selectedTeammates.map((tm) => {
                    const tmId = tm.id || tm.user_id;
                    const displayName = tm.full_name || tm.username || tm.email;
                    return (
                        <div 
                            key={tmId} 
                            className="teammate-card member-card clickable-member-card"
                            onClick={() => setActiveModalMember(tm)}
                            title={isAr ? 'انقر لعرض كافة بيانات العضو' : 'Click to view member details'}
                        >
                            <div className="teammate-avatar member-avatar">
                                {tm.avatar_url ? (
                                    <img src={tm.avatar_url} alt={displayName} />
                                ) : (
                                    <User size={16} />
                                )}
                            </div>
                            <div className="teammate-info">
                                <div className="teammate-name-row">
                                    <span className="teammate-name" title={displayName}>{displayName}</span>
                                    <span className="badge-role badge-member">
                                        {isAr ? 'عضو' : 'Member'}
                                    </span>
                                </div>
                                <div className="teammate-sub-info">
                                    {tm.student_id ? (
                                        <span className="teammate-id">{tm.student_id}</span>
                                    ) : (
                                        <span className="teammate-email">{tm.email}</span>
                                    )}
                                </div>
                            </div>
                            {!readOnly && !disabled && (
                                <button
                                    type="button"
                                    className="btn-remove-teammate"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTeammate(tmId);
                                    }}
                                    title={isAr ? 'إزالة من الفريق' : 'Remove from team'}
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Search and Add Teammates Input */}
            {!readOnly && !disabled && (
                <div className="teammate-search-section">
                    {!courseId ? (
                        <div className="teammate-no-course-alert">
                            <AlertTriangle size={15} />
                            <span>{isAr ? 'يرجى اختيار الدورة أولاً للبحث عن الزملاء' : 'Please select a training course first to search for teammates'}</span>
                        </div>
                    ) : (
                        <div className="teammate-search-input-wrapper">
                            <div className="search-field-box">
                                <Search size={16} className="search-field-icon" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setIsOpenDropdown(true);
                                    }}
                                    onFocus={() => setIsOpenDropdown(true)}
                                    placeholder={isAr ? 'ابحث عن زميل بالاسم، الرقم الجامعي، أو البريد الإلكتروني...' : 'Search student by name, student ID, username, or email...'}
                                    disabled={selectedTeammates.length >= maxTeammates}
                                />
                                {loading && <Loader2 size={16} className="search-spin-icon" />}
                                {searchQuery && !loading && (
                                    <button
                                        type="button"
                                        className="btn-clear-search"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Results */}
                            {isOpenDropdown && (
                                <div className="teammates-dropdown-menu">
                                    <div className="dropdown-header">
                                        <span>{isAr ? 'نتائج البحث عن الطلاب' : 'Search Results & Course Trainees'}</span>
                                        {candidates.length > 0 && (
                                            <span className="results-count">{candidates.length} {isAr ? 'طالب' : 'students'}</span>
                                        )}
                                    </div>

                                    {loading ? (
                                        <div className="dropdown-loading">
                                            <Loader2 size={20} className="spin" />
                                            <span>{isAr ? 'جاري البحث...' : 'Searching students...'}</span>
                                        </div>
                                    ) : candidates.length === 0 ? (
                                        <div className="dropdown-empty">
                                            <User size={24} />
                                            <p>{isAr ? 'لم يتم العثور على طلاب مطابقين في هذه الدورة' : 'No matching students found for this course.'}</p>
                                        </div>
                                    ) : (
                                        <div className="dropdown-list-scroll">
                                            {candidates.map((cand) => {
                                                const alreadyInTeam = cand.is_in_team || cand.is_in_other_team;
                                                const selected = isSelected(cand.id);
                                                const canAdd = !alreadyInTeam && !selected;

                                                return (
                                                    <div
                                                        key={cand.id}
                                                        className={`dropdown-candidate-item ${alreadyInTeam ? 'in-team-disabled' : ''} ${selected ? 'already-selected' : ''}`}
                                                        onClick={() => canAdd && handleAddTeammate(cand)}
                                                    >
                                                        <div className="candidate-avatar">
                                                            {cand.avatar_url ? (
                                                                <img src={cand.avatar_url} alt={cand.full_name} />
                                                            ) : (
                                                                <span>{(cand.full_name || 'U').charAt(0).toUpperCase()}</span>
                                                            )}
                                                        </div>

                                                        <div className="candidate-details">
                                                            <div className="candidate-name-row">
                                                                <span className="candidate-name">{cand.full_name}</span>
                                                                {cand.student_id && (
                                                                    <span className="candidate-id-badge">{cand.student_id}</span>
                                                                )}
                                                            </div>
                                                            <div className="candidate-sub-row">
                                                                <span className="candidate-email">{cand.email}</span>
                                                                {cand.major && (
                                                                    <span className="candidate-major">• {cand.major}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="candidate-action-status">
                                                            {alreadyInTeam ? (
                                                                <div className="badge-already-team" title={cand.existing_project_title ? `${isAr ? 'المشروع:' : 'Project:'} ${cand.existing_project_title}` : ''}>
                                                                    <AlertTriangle size={13} />
                                                                    <span>{isAr ? 'مسجل في فريق آخر' : 'Already in a Team'}</span>
                                                                </div>
                                                            ) : selected ? (
                                                                <div className="badge-added-team">
                                                                    <CheckCircle2 size={13} />
                                                                    <span>{isAr ? 'مضاف' : 'Added'}</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="btn-add-candidate"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAddTeammate(cand);
                                                                    }}
                                                                >
                                                                    <UserPlus size={14} />
                                                                    <span>{isAr ? 'إضافة' : 'Add'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Member Details Modal Popup */}
            {activeModalMember && (
                <MemberDetailModal 
                    member={activeModalMember} 
                    onClose={() => setActiveModalMember(null)} 
                />
            )}
        </div>
    );
}
