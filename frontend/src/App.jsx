import { lazy, Suspense, Component } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import './App.css'

/* â”€â”€ Lazy-loaded pages (active routes only) â”€â”€ */
const AppLayout           = lazy(() => import('./components/layout/AppLayout'))
const Landing             = lazy(() => import('./pages/Landing'))
const Auth                = lazy(() => import('./pages/Auth'))
const Admin               = lazy(() => import('./pages/Admin'))
const Dashboard           = lazy(() => import('./pages/Dashboard'))
const TrainingCourses     = lazy(() => import('./pages/TrainingCourses'))
const TrainingCourseDetail= lazy(() => import('./pages/TrainingCourseDetail'))
const TrainersManagement  = lazy(() => import('./pages/TrainersManagement'))
const TraineeProjects     = lazy(() => import('./pages/TraineeProjects'))
const IdeaLeaderboard     = lazy(() => import('./pages/IdeaLeaderboard'))
const DocumentsArchive    = lazy(() => import('./pages/DocumentsArchive'))
const TraineesManagement  = lazy(() => import('./pages/TraineesManagement'))
const TrainingApprovals   = lazy(() => import('./pages/TrainingApprovals'))
const CertificateVerification = lazy(() => import('./pages/CertificateVerification'))

/* â”€â”€ Error Boundary: catches lazy-load failures instead of crashing to "/" â”€â”€ */
class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[PageErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1rem',
          fontFamily: 'inherit', color: 'var(--text-1, #fff)'
        }}>
          <h2 style={{ margin: 0 }}>Something went wrong loading this page.</h2>
          <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>
            {this.state.error?.message || 'Unexpected error'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
              background: 'var(--accent, #6366f1)', color: '#fff', cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageLoader() {
  return <div className="page-loader"><div className="spinner" /></div>;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  const isAdmin = !!(user?.is_admin || user?.role === 'admin' || profile?.is_admin || profile?.role === 'admin');
  if (!isAdmin) return <Navigate to="/courses" replace />;
  return children;
}

function TrainerOrAdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  const isAdmin = !!(user?.is_admin || user?.role === 'admin' || profile?.is_admin || profile?.role === 'admin');
  const isTrainer = user?.role === 'trainer' || profile?.role === 'trainer';
  if (!isAdmin && !isTrainer) return <Navigate to="/courses" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  // Keep the Routes mounted while loading so the URL is preserved.
  // ProtectedRoute handles its own loading state, showing a spinner
  // without unmounting the router tree.
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* â”€â”€ Public â”€â”€ */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={loading ? <PageLoader /> : (user ? <Navigate to="/dashboard" replace /> : <Auth />)} />
          <Route path="/verify-certificate" element={<CertificateVerification />} />
          <Route path="/verify" element={<CertificateVerification />} />

          {/* â”€â”€ Protected (inside AppLayout with sidebar) â”€â”€ */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard"         element={<Dashboard />} />
            <Route path="/courses"           element={<TrainingCourses />} />
            <Route path="/courses/robotics"  element={<TrainingCourseDetail courseIdOverride="robotics" />} />
            <Route path="/courses/robotics/*"element={<TrainingCourseDetail courseIdOverride="robotics" />} />
            <Route path="/courses/:id"       element={<TrainingCourseDetail />} />
            <Route path="/submitted-projects"element={<TraineeProjects />} />
            <Route path="/trainee-projects"  element={<TraineeProjects />} />
                        <Route path="/leaderboard"       element={<IdeaLeaderboard />} />
            <Route path="/docs-archive"      element={<DocumentsArchive />} />
            <Route path="/trainees"          element={<TrainerOrAdminRoute><TraineesManagement /></TrainerOrAdminRoute>} />
            <Route path="/trainees-management" element={<TrainerOrAdminRoute><TraineesManagement /></TrainerOrAdminRoute>} />
            <Route path="/trainers"          element={<AdminRoute><TrainersManagement /></AdminRoute>} />
            <Route path="/admin"             element={<AdminRoute><Admin /></AdminRoute>} />

            {/* Legacy redirects */}
            <Route path="/evaluations"       element={<Navigate to="/courses/default?tab=evaluations" replace />} />
            <Route path="/approvals"         element={<Navigate to="/trainees" replace />} />
            <Route path="/training-approvals"element={<Navigate to="/trainees" replace />} />
            <Route path="/projects"          element={<Navigate to="/trainee-projects" replace />} />
            <Route path="/people"            element={<Navigate to="/courses" replace />} />
          </Route>

          {/* Catch-all â†’ landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PageErrorBoundary>
  );
}

