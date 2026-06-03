import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Toaster from './components/Toaster'
import OfflineBanner from './components/OfflineBanner'
import SlowIndicator from './components/SlowIndicator'
import { ErrorState } from './components/ui'

// Shown when a route's JS chunk can't be fetched (e.g. navigating while offline).
function RouteLoadError() {
  return (
    <div className="mx-auto max-w-md py-10">
      <ErrorState title="Couldn’t load this page" onRetry={() => window.location.reload()} />
    </div>
  )
}
// Lazy import that degrades to a friendly retry screen instead of crashing the app.
const lazyRoute = (factory) => lazy(() => factory().catch(() => ({ default: RouteLoadError })))

const Landing = lazyRoute(() => import('./pages/Landing'))
const Login = lazyRoute(() => import('./pages/Login'))
const Dashboard = lazyRoute(() => import('./pages/Dashboard'))
const Goals = lazyRoute(() => import('./pages/Goals'))
const GoalNew = lazyRoute(() => import('./pages/GoalNew'))
const GoalDetail = lazyRoute(() => import('./pages/GoalDetail'))
const Habits = lazyRoute(() => import('./pages/Habits'))
const CheckinEvening = lazyRoute(() => import('./pages/CheckinEvening'))
const CheckinMorning = lazyRoute(() => import('./pages/CheckinMorning'))
const CheckinMidday = lazyRoute(() => import('./pages/CheckinMidday'))
const Review = lazyRoute(() => import('./pages/Review'))
const Analytics = lazyRoute(() => import('./pages/Analytics'))
const Settings = lazyRoute(() => import('./pages/Settings'))
const Calendar = lazyRoute(() => import('./pages/Calendar'))
const Journal = lazyRoute(() => import('./pages/Journal'))
const Focus = lazyRoute(() => import('./pages/Focus'))

const Loading = () => (
  <div className="grid min-h-[40vh] place-items-center text-faint">
    <span className="animate-pulse">Loading…</span>
  </div>
)

export default function App() {
  return (
    <>
      <OfflineBanner />
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
      <Toaster />
      <SlowIndicator />
    </>
  )
}
