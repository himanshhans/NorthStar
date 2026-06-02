import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Goals = lazy(() => import('./pages/Goals'))
const GoalNew = lazy(() => import('./pages/GoalNew'))
const GoalDetail = lazy(() => import('./pages/GoalDetail'))
const Habits = lazy(() => import('./pages/Habits'))
const CheckinEvening = lazy(() => import('./pages/CheckinEvening'))
const CheckinMorning = lazy(() => import('./pages/CheckinMorning'))
const CheckinMidday = lazy(() => import('./pages/CheckinMidday'))
const Review = lazy(() => import('./pages/Review'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Settings = lazy(() => import('./pages/Settings'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Journal = lazy(() => import('./pages/Journal'))
const Focus = lazy(() => import('./pages/Focus'))

const Loading = () => (
  <div className="grid min-h-[40vh] place-items-center text-faint">
    <span className="animate-pulse">Loading…</span>
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login/*" element={<Login />} />
        <Route path="/signup/*" element={<Login mode="sign-up" />} />

        {/* Protected app shell */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/goals/new" element={<GoalNew />} />
          <Route path="/goals/:id" element={<GoalDetail />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/checkin/morning" element={<CheckinMorning />} />
          <Route path="/checkin/midday" element={<CheckinMidday />} />
          <Route path="/checkin/evening" element={<CheckinEvening />} />
          <Route path="/review" element={<Review />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
