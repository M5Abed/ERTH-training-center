import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { CheckCircle2, XCircle, Clock, Loader2, UserCheck } from 'lucide-react';
import './TrainingApprovals.css';

export default function TrainingApprovals() {
    const { lang } = useI18n();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/training/registrations/list.php');
            const data = await res.json();
            if (res.ok && data.requests) {
                setRequests(data.requests);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (reqId, userId, courseId) => {
        setActionId(reqId);
        try {
            const res = await fetch('/api/training/registrations/approve.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: reqId, user_id: userId, course_id: courseId })
            });
            if (res.ok) {
                fetchRequests();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionId(null);
        }
    };

    const handleReject = async (reqId, userId) => {
        const reason = prompt(lang === 'ar' ? 'سبب الرفض (اختياري):' : 'Rejection reason (optional):');
        setActionId(reqId);
        try {
            const res = await fetch('/api/training/registrations/reject.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: reqId, user_id: userId, reason: reason || '' })
            });
            if (res.ok) {
                fetchRequests();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="approvals-page container">
            <div className="page-header">
                <h1>{lang === 'ar' ? 'طلبات تسجيل المتدربين المعلقة' : 'Pending Trainee Registration Requests'}</h1>
                <p>{lang === 'ar' ? 'مراجعة وقبول أو رفض طلبات تسجيل الطلاب الجدد للتدريب الصيفي' : 'Review, approve, or reject new trainee registration requests for university summer training.'}</p>
            </div>

            {loading ? (
                <div className="loader-container">
                    <Loader2 className="spin" size={32} />
                </div>
            ) : requests.length === 0 ? (
                <div className="empty-state">
                    <UserCheck size={48} />
                    <h3>{lang === 'ar' ? 'لا توجد طلبات معلقة' : 'No Pending Requests'}</h3>
                    <p>{lang === 'ar' ? 'تمت مراجعة جميع طلبات التسجيل الجارية.' : 'All trainee registration requests have been reviewed.'}</p>
                </div>
            ) : (
                <div className="requests-grid">
                    {requests.map(req => (
                        <div key={req.request_id} className="request-card">
                            <div className="card-top">
                                <div className="user-avatar">
                                    {(req.full_name || req.email)[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3>{req.full_name}</h3>
                                    <p className="user-email">{req.email}</p>
                                </div>
                            </div>

                            <div className="card-details">
                                <div className="detail-item">
                                    <span>Student ID:</span> <strong>{req.student_id || 'N/A'}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>College:</span> <strong>{req.college_key || 'Engineering'}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Academic Year:</span> <strong>Year {req.academic_year || '3'}</strong>
                                </div>
                                {req.requested_course_name && (
                                    <div className="req-detail">
                                        <span>Requested Course:</span> <strong>{req.requested_course_name}</strong>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <span>Requested At:</span> <strong>{req.requested_at}</strong>
                                </div>
                            </div>

                            <div className="card-actions">
                                <button 
                                    className="btn btn-success" 
                                    disabled={actionId === req.request_id}
                                    onClick={() => handleApprove(req.request_id, req.user_id, req.course_id)}
                                >
                                    {actionId === req.request_id ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                                    {lang === 'ar' ? 'قبول الطالب' : 'Approve Trainee'}
                                </button>
                                <button 
                                    className="btn btn-danger"
                                    disabled={actionId === req.request_id}
                                    onClick={() => handleReject(req.request_id, req.user_id)}
                                >
                                    <XCircle size={16} />
                                    {lang === 'ar' ? 'رفض' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
