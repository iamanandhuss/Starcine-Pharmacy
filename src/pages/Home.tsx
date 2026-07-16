import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, ArrowRight, Activity, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isStoreAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (isSuperAdmin) {
        navigate('/super-admin/dashboard', { replace: true });
      } else if (isStoreAdmin) {
        navigate('/store/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isSuperAdmin, isStoreAdmin, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 text-white selection:bg-brand-500 selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 border-b border-dark-900 bg-dark-950/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2 rounded-lg text-white">
            <Pill className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-wider uppercase">
            Starcine Rx
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Dispensing Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-dark-300 hover:text-white"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/register')}
              >
                Register Account
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
        {/* Floating background glowing orbs */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] bg-brand-500/10 rounded-full blur-[100px] -z-10 animate-pulse duration-[6000ms]" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] bg-purple-500/10 rounded-full blur-[120px] -z-10 animate-pulse duration-[8000ms]" />

        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-900 border border-dark-800 text-xs font-semibold text-brand-400">
            <Activity className="h-3.5 w-3.5" />
            Introducing Starcine Rx v1.0
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-dark-400">
            Pharmacy Management, Simplified.
          </h1>

          <p className="text-lg md:text-xl text-dark-400 max-w-2xl mx-auto font-light leading-relaxed">
            Dispense medications, catalog inventory status, audit patient prescriptions, and manage pharmacist privileges in a secure, real-time database environment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="w-full sm:w-auto"
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              Get Started Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const target = document.getElementById('features');
                target?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto border-dark-800 hover:bg-dark-900 text-dark-200"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-6 border-t border-dark-900 bg-dark-950 relative">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Built for Pharmacists & Technicians
            </h2>
            <p className="text-dark-400 text-sm max-w-md mx-auto">
              Everything you need to run daily pharmacy dispensing and inventory checklists securely.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-dark-900/50 border border-dark-900 p-8 rounded-2xl space-y-4 hover:border-brand-500/20 transition-all duration-300">
              <div className="bg-brand-600/10 p-3 rounded-xl text-brand-400 w-fit">
                <Pill className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Medication Catalogs</h3>
              <p className="text-dark-400 text-xs leading-relaxed">
                Log quantities, dosages, shelf locations, and low-stock indicators. Real-time updates prevent stockouts.
              </p>
            </div>

            <div className="bg-dark-900/50 border border-dark-900 p-8 rounded-2xl space-y-4 hover:border-brand-500/20 transition-all duration-300">
              <div className="bg-purple-600/10 p-3 rounded-xl text-purple-400 w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Supabase Access Controls</h3>
              <p className="text-dark-400 text-xs leading-relaxed">
                HIPAA-compliant JWT claims. Assign roles (`admin` pharmacists vs `user` technicians) to guard sensitive actions.
              </p>
            </div>

            <div className="bg-dark-900/50 border border-dark-900 p-8 rounded-2xl space-y-4 hover:border-brand-500/20 transition-all duration-300">
              <div className="bg-green-600/10 p-3 rounded-xl text-green-400 w-fit">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Prescription Dispensing</h3>
              <p className="text-dark-400 text-xs leading-relaxed">
                Review prescriptions in real-time. Dispense drugs and queue refills instantly with transaction logging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-dark-900 text-center text-xs text-dark-500 bg-dark-950">
        Starcine Rx, powered by React, Vite, Tailwind CSS v4.0, and Supabase.
      </footer>
    </div>
  );
};
