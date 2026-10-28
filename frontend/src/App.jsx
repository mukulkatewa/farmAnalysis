import { lazy, Suspense } from 'react';
import { useAuth } from './contexts/authcontext/Authcontext';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './contexts/authcontext/Authcontext'
import { SidebarProvider } from './contexts/sidebarcontext/SidebarContext'
import Landing from './components/landing/Landing'
import Login from './components/auth/login/Login'
import Register from './components/auth/register/Register'
const Home=lazy(()=>import('./pages/Home'));
const Profile=lazy(()=>import('./pages/Profile'));
import Header from './components/header/Header'
const FarmSelection=lazy(()=>import('./pages/FarmSelection'));
const Features=lazy(()=>import('./pages/Features'));
const Alerts=lazy(()=>import('./pages/Alerts'));
const Analytics=lazy(()=>import('./pages/Analytics'));
const LiveCheck=lazy(()=>import('./pages/LiveCheck'));
const PestScanner=lazy(()=>import('./pages/PestScanner'));
const SoilAnalysis=lazy(()=>import('./pages/SoilAnalysis'));
const Logistics=lazy(()=>import('./pages/Logistics'));
const Insurance=lazy(()=>import('./pages/Insurance'));
const Machinery=lazy(()=>import('./pages/Machinery'));
const FindCustomers=lazy(()=>import('./pages/FindCustomers'));
const VendorDashboard=lazy(()=>import('./pages/VendorDashboard'));
const VendorOpportunities=lazy(()=>import('./pages/VendorOpportunities'));
import UserTypeSelection from './components/auth/UserTypeSelection'
const Chat=lazy(()=>import('./pages/Chat'));
const Reports=lazy(()=>import('./pages/Reports'));
import './App.css'


function RequireAuth(){
  const {userLoggedIn}=useAuth();
  return userLoggedIn?<Outlet/>:<Navigate to="/login" replace/>;
}
function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Router>
          <Header />
        <Suspense fallback={<div role="status" className="p-8">Loading…</div>}><Routes>

          {/* Public Routes */}
          <Route path="/" element={<Landing />} />

          <Route path="/user-type" element={<UserTypeSelection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<RequireAuth/>}>
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/farm-selection" element={<FarmSelection />} />
          <Route path="/features" element={<Features />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/disease-detection" element={<LiveCheck/>}/>
          <Route path="/pest-scanner" element={<PestScanner/>}/>
          <Route path="/soil-analysis" element={<SoilAnalysis/>}/>
          <Route path="/logistics" element={<Logistics/>}/>
          <Route path="/insurance" element={<Insurance/>}/>
          <Route path="/machinery" element={<Machinery/>}/>
          <Route path="/find-customers" element={<FindCustomers/>}/>
          <Route path="/vendor-dashboard" element={<VendorDashboard/>}/>
          <Route path="/vendor-opportunities" element={<VendorOpportunities/>}/>
          <Route path="/reports" element={<Reports/>}/>
          <Route path="/chat/:otherUserId" element={<Chat/>}/>

          </Route>
          {/* Catch all - redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense>
      </Router>
      </SidebarProvider>
    </AuthProvider>
  )
}

export default App
