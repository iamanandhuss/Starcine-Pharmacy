import React from 'react';
import { Pill, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/Button';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-dark-50 dark:bg-dark-950 transition-colors duration-300">
      {/* Visual Side Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-dark-900 overflow-hidden select-none">
        {/* Futuristic glowing gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.4),transparent)]" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

        {/* Content Panel */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-2 rounded-lg text-white">
              <Pill className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-dark-300">
              PharmacyOps
            </span>
          </div>

          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
              Multi-Store Pharmacy Operations, Unified.
            </h1>
            <p className="text-dark-300 text-sm leading-relaxed">
              Manage multiple pharmacy branches, employees, attendance, home deliveries, and tasks — all from one centralized, role-based operations platform.
            </p>
            <div className="flex gap-6 text-xs text-dark-400 font-medium pt-4 border-t border-dark-800">
              <div>
                <p className="text-white font-bold text-base">Multi-Store</p>
                <p>Branch Management</p>
              </div>
              <div>
                <p className="text-white font-bold text-base">RBAC</p>
                <p>Role-Based Access</p>
              </div>
              <div>
                <p className="text-white font-bold text-base">Real-Time</p>
                <p>Live Operations</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-dark-500">
            © {new Date().getFullYear()} PharmacyOps. All rights reserved.
          </div>
        </div>
      </div>

      {/* Main Auth Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
        {/* Floating Theme Toggle */}
        <div className="absolute top-6 right-6">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="rounded-full p-2.5"
            leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          />
        </div>

        {/* Form Card wrapper */}
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="bg-brand-600 p-1.5 rounded-md text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold uppercase tracking-wider text-dark-900 dark:text-white">
              PharmacyOps
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
