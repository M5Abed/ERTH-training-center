import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, getTeamMembers, getProject } from '../services/api';
import { ArrowLeft, Plus, X, Trash2, User, GripVertical, CheckCircle, Clock, ListTodo, Loader2, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import './TaskBoard.css';

const COLUMNS = [
    { key: 'todo', icon: <ListTodo size={16} />, color: 'var(--primary-l)' },
    { key: 'in_progress', icon: <Clock size={16} />, color: 'var(--amber)' },
    { key: 'done', icon: <CheckCircle size={16} />, color: 'var(--green)' },
];

export default function TaskBoard() {
    const { id } = useParams();
    const { t, lang } = useI18n();
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [team, setTeam] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false); // only for 'todo' column now
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newAssignee, setNewAssignee] = useState('');
    const [newDeadline, setNewDeadline] = useState('');
    const [draggedTask, setDraggedTask] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const labels = {
        en: { todo: 'To Do', in_progress: 'In Progress', done: 'Done', add: 'Add Task', title: 'Task title...', desc: 'Description (optional)', assign: 'Assign to...', none: 'Unassigned', back: 'Back to Project', board: 'Task Board', empty: 'No tasks yet', progress: 'Progress', move_next: 'Move Forward', move_prev: 'Move Back' },
        ar: { todo: 'قيد الانتظار', in_progress: 'قيد التنفيذ', done: 'مكتمل', add: 'إضافة مهمة', title: 'عنوان المهمة...', desc: 'وصف (اختياري)', assign: 'إسناد إلى...', none: 'غير مُسند', back: 'العودة للمشروع', board: 'لوحة المهام', empty: 'لا توجد مهام بعد', progress: 'التقدم', move_next: 'تقدّم', move_prev: 'رجوع' },
    };
    const L = labels[lang] || labels.en;

    const COLUMN_KEYS = COLUMNS.map(c => c.key);

    const reload = async () => {
        const [t, m, p] = await Promise.all([getTasks(id), getTeamMembers(id), getProject(id)]);
        setTasks(t || []);
        setTeam(m || []);
        setProject(p);
        setLoading(false);
    };

    useEffect(() => { reload(); }, [id]);

    // Progress calculation
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // Check for confetti
    useEffect(() => {
        if (total > 0 && done === total) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [done, total]);

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        await createTask(id, newTitle.trim(), newDesc.trim(), newAssignee || null, newDeadline || null);
        setNewTitle('');
        setNewDesc('');
        setNewAssignee('');
        setNewDeadline('');
        setAdding(false);
        reload();
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm(lang === 'ar' ? 'حذف هذه المهمة؟' : 'Delete this task?')) return;
        await deleteTask(taskId);
        reload();
    };

    // Move task to the next or previous column
    const handleMoveTask = async (task, direction) => {
        const currentIdx = COLUMN_KEYS.indexOf(task.status);
        const nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx < 0 || nextIdx >= COLUMN_KEYS.length) return;
        const newStatus = COLUMN_KEYS[nextIdx];
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        await updateTask(task.id, { status: newStatus });
        reload();
    };

    // Drag and drop
    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('tb-dragging');
    };
    const handleDragEnd = (e) => {
        e.target.classList.remove('tb-dragging');
        setDraggedTask(null);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        if (!draggedTask || draggedTask.status === targetStatus) return;
        setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: targetStatus } : t));
        await updateTask(draggedTask.id, { status: targetStatus });
        reload();
    };

    if (loading) return <div className="loading-state"><div className="spinner" /></div>;

    return (
        <div className="task-board-page">
            {showConfetti && <div className="tb-confetti" />}

            <div className="tb-header">
                <Link to={`/project/${id}`} className="btn btn-ghost btn-sm">
                    <ArrowLeft size={16} /> {L.back}
                </Link>
                <div className="tb-title-area">
                    <h1>{L.board}</h1>
                    {project && <span className="tb-project-name">{project.title}</span>}
                </div>
            </div>

            {/* Progress Bar */}
            {total > 0 && (
                <div className="tb-progress-section">
                    <div className="tb-progress-info">
                        <span>{L.progress}</span>
                        <span className="tb-progress-pct">{progress}%</span>
                    </div>
                    <div className="tb-progress-bar">
                        <div
                            className={`tb-progress-fill ${progress === 100 ? 'tb-progress-fill--complete' : ''}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="tb-progress-detail">{done}/{total} {lang === 'ar' ? 'مهام مكتملة' : 'tasks complete'}</span>
                </div>
            )}

            {/* Kanban Columns */}
            <div className="tb-columns">
                {COLUMNS.map((col, colIdx) => {
                    const colTasks = tasks.filter(t => t.status === col.key);
                    return (
                        <div
                            key={col.key}
                            className="tb-column"
                            onDragOver={handleDragOver}
                            onDrop={e => handleDrop(e, col.key)}
                        >
                            <div className="tb-col-header" style={{ borderColor: col.color }}>
                                {col.icon}
                                <span>{L[col.key]}</span>
                                <span className="tb-col-count">{colTasks.length}</span>
                            </div>

                            <div className="tb-col-body">
                                {colTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="tb-card"
                                        draggable
                                        onDragStart={e => handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="tb-card-grip"><GripVertical size={14} /></div>
                                        <div className="tb-card-content">
                                            <span className="tb-card-title">{task.title}</span>
                                            {task.description && <p className="tb-card-desc">{task.description}</p>}
                                            <div className="tb-card-meta">
                                                {task.assignee_name ? (
                                                    <span className="tb-card-assignee"><User size={12} /> {task.assignee_name}</span>
                                                ) : (
                                                    <span className="tb-card-assignee tb-card-assignee--none"><User size={12} /> {L.none}</span>
                                                )}
                                                {task.deadline && (
                                                    <span className={`tb-card-deadline ${new Date(task.deadline) < new Date() && task.status !== 'done' ? 'tb-card-deadline--overdue' : ''}`}>
                                                        <Calendar size={12} /> {new Date(task.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Move buttons — quick status advancement without drag */}
                                            <div className="tb-card-move-btns">
                                                {colIdx > 0 && (
                                                    <button
                                                        className="tb-move-btn tb-move-btn--prev"
                                                        title={L.move_prev}
                                                        onClick={() => handleMoveTask(task, 'prev')}
                                                    >
                                                        <ChevronLeft size={13} />
                                                        {lang === 'ar' ? COLUMNS[colIdx - 1] && L[COLUMNS[colIdx - 1].key] : COLUMNS[colIdx - 1] && L[COLUMNS[colIdx - 1].key]}
                                                    </button>
                                                )}
                                                {colIdx < COLUMNS.length - 1 && (
                                                    <button
                                                        className="tb-move-btn tb-move-btn--next"
                                                        title={L.move_next}
                                                        onClick={() => handleMoveTask(task, 'next')}
                                                    >
                                                        {lang === 'ar' ? COLUMNS[colIdx + 1] && L[COLUMNS[colIdx + 1].key] : COLUMNS[colIdx + 1] && L[COLUMNS[colIdx + 1].key]}
                                                        <ChevronRight size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <button className="tb-card-delete" onClick={() => handleDelete(task.id)} title="Delete"><Trash2 size={12} /></button>
                                    </div>
                                ))}

                                {colTasks.length === 0 && col.key !== 'todo' && (
                                    <div className="tb-empty">
                                        <span>{L.empty}</span>
                                        <span className="tb-empty-hint">{lang === 'ar' ? 'اسحب المهام إلى هنا' : 'Drag tasks here or use the move buttons'}</span>
                                    </div>
                                )}

                                {/* Only allow adding new tasks from "To Do" column */}
                                {col.key === 'todo' && (
                                    adding ? (
                                        <div className="tb-add-form animate-fade-in">
                                            <input
                                                autoFocus
                                                placeholder={L.title}
                                                value={newTitle}
                                                onChange={e => setNewTitle(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                            />
                                            <textarea
                                                placeholder={L.desc}
                                                value={newDesc}
                                                onChange={e => setNewDesc(e.target.value)}
                                                rows={2}
                                            />
                                            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                                                <option value="">{L.assign}</option>
                                                {team.map(m => (
                                                    <option key={m.user_id || m.id} value={m.user_id || m.id}>
                                                        {m.full_name || m.full_name || m.email}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="form-group" style={{ marginTop: '0.25rem' }}>
                                                <label style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{lang === 'ar' ? 'الموعد النهائي (اختياري)' : 'Deadline (optional)'}</label>
                                                <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} max={project?.deadline?.split('T')[0] || ''} />
                                            </div>
                                            <div className="tb-add-actions">
                                                <button className="btn btn-primary btn-sm" onClick={handleAdd}><Plus size={14} /> {L.add}</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setNewTitle(''); setNewDesc(''); }}><X size={14} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="tb-add-btn" onClick={() => setAdding(true)}>
                                            <Plus size={14} /> {L.add}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
