import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import './App.css'

/* ── Lazy-loaded pages ── */
const AppLayout = lazy(() => import('./components/layout/AppLayout'))
const Landing = lazy(() => import('./pages/Landing'))
const Auth = lazy(() => import('./pages/Auth'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const PostProject = lazy(() => import('./pages/PostProject'))
const Matches = lazy(() => import('./pages/Matches'))
const People = lazy(() => import('./pages/People'))
const Reviews = lazy(() => import('./pages/Reviews'))
const Admin = lazy(() => import('./pages/Admin'))
const Heatmap = lazy(() => import('./pages/Heatmap'))
const TaskBoard = lazy(() => import('./pages/TaskBoard'))
const ProjectChat = lazy(() => import('./pages/ProjectChat'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))

const TrainingCourses = lazy(() => import('./pages/TrainingCourses'))
const TrainingCourseDetail = lazy(() => import('./pages/TrainingCourseDetail'))
const TrainersManagement = lazy(() => import('./pages/TrainersManagement'))
const TraineeProjects = lazy(() => import('./pages/TraineeProjects'))
const IdeaLeaderboard = lazy(() => import('./pages/IdeaLeaderboard'))
const DocumentsArchive = lazy(() => import('./pages/DocumentsArchive'))
const TraineesManagement = lazy(() => import('./pages/TraineesManagement'))

const CertificateVerification = lazy(() => import('./pages/CertificateVerification'))

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

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/u/:id" element={<PublicProfile />} />
        <Route path="/verify-certificate" element={<CertificateVerification />} />
        <Route path="/verify" element={<CertificateVerification />} />

        {/* Protected — inside AppLayout (sidebar) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<TrainingCourses />} />
          <Route path="/courses/robotics" element={<TrainingCourseDetail courseIdOverride="robotics" />} />
          <Route path="/courses/robotics/*" element={<TrainingCourseDetail courseIdOverride="robotics" />} />
          <Route path="/courses/:id" element={<TrainingCourseDetail />} />
          <Route path="/submitted-projects" element={<TraineeProjects />} />
          <Route path="/trainee-projects" element={<TraineeProjects />} />
          <Route path="/evaluations" element={<Navigate to="/courses/default?tab=evaluations" replace />} />
          <Route path="/post-project" element={<PostProject />} />
          <Route path="/leaderboard" element={<IdeaLeaderboard />} />
          <Route path="/docs-archive" element={<DocumentsArchive />} />
          <Route path="/trainees" element={<TrainerOrAdminRoute><TraineesManagement /></TrainerOrAdminRoute>} />
          <Route path="/trainees-management" element={<TrainerOrAdminRoute><TraineesManagement /></TrainerOrAdminRoute>} />
          <Route path="/approvals" element={<Navigate to="/trainees" replace />} />
          <Route path="/training-approvals" element={<Navigate to="/trainees" replace />} />
          <Route path="/trainers" element={<AdminRoute><TrainersManagement /></AdminRoute>} />

          {/* Legacy route redirects */}
          <Route path="/projects" element={<Navigate to="/trainee-projects" replace />} />
          <Route path="/people" element={<Navigate to="/courses" replace />} />
          

          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

