import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  Calendar, 
  ArrowRight, 
  Lock 
} from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Replace with your Supabase Auth login: supabase.auth.signInWithPassword({ email, password })
    setTimeout(() => {
      alert(`Logging in as ${email}`);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* 1. Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">ShiftPulse</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition">How It Works</a>
            <a href="#support" className="hover:text-blue-600 transition">Support</a>
          </nav>

          <a 
            href="#login-section"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 md:hidden"
          >
            Sign In
          </a>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5" /> 5 km Geofenced Time Tracking
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
              Smart Time Tracking, Scheduling & Payroll in One Place.
            </h1>
            
            <p className="text-lg text-slate-600 max-w-2xl">
              Geofenced clock-ins, instant container break bonuses, weekly availability matching, and automated weekly payroll reports—built for operations teams.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-sm font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Secure Geofencing
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" /> Smart Rostering
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-500" /> Automated Payroll
              </div>
            </div>
          </div>

          {/* Right Column: Portal Login Box */}
          <div id="login-section" className="lg:col-span-5">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Portal Access</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Employees, Managers & Administrators
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-sm"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="checkbox" className="rounded text-blue-600" /> Remember me
                  </label>
                  <a href="#forgot" className="text-blue-600 font-semibold hover:underline">Forgot password?</a>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Authenticating...' : (
                    <>
                      Sign In to Workspace <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Invited via email link? Open your email invite to complete onboarding.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Core Features Section */}
      <section id="features" className="bg-white py-16 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Designed for On-Site Operations</h2>
            <p className="text-slate-600 mt-2">Everything admins, managers, and employees need to stay in sync.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Location-Locked Clock In</h4>
              <p className="text-sm text-slate-600">
                Automatic GPS validation restricts clocking in to within 5 km of assigned work hubs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Container Time Bonuses</h4>
              <p className="text-sm text-slate-600">
                Clock out with quick-select options for 20 ft and 40 ft container handling bonus time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Email Shift Invites</h4>
              <p className="text-sm text-slate-600">
                Submit availability, receive email shift invites, and accept or decline with a single tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ShiftPulse HR Systems. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-white transition">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition">Terms of Service</a>
            <a href="#security" className="hover:text-white transition">Security Info</a>
          </div>
        </div>
      </footer>

    </div>
  );
}