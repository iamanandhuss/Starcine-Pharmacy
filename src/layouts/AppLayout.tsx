import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Pill,
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  BarChart2,
  Truck,
  Store,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { Button } from '../components/ui/Button';
import { Dropdown, DropdownItem } from '../components/ui/Dropdown';
import { StoreSelector } from '../components/ui/StoreSelector';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
  children?: { name: string; path: string; disabled?: boolean }[];
}

// ─── Role-based Navigation Configs ───────────────────────────────────────────

const SUPER_ADMIN_NAV: NavItem[] = [
  { name: 'Dashboard', path: '/super-admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  {
    name: 'Organization',
    path: '/super-admin/organization-group',
    icon: <Store className="h-5 w-5" />,
    children: [
      { name: 'Stores', path: '/super-admin/stores' },
      { name: 'Branches', path: '/super-admin/branches' },
      { name: 'Departments', path: '/super-admin/departments' },
      { name: 'Roles', path: '/super-admin/roles' },
      { name: 'Users', path: '/super-admin/users' },
    ],
  },
  {
    name: 'Employees',
    path: '/super-admin/employees-group',
    icon: <Users className="h-5 w-5" />,
    children: [
      { name: 'Employees', path: '/super-admin/employees' },
      { name: 'Attendance', path: '/super-admin/attendance' },
      { name: 'Leave', path: '/super-admin/leave' },
      { name: 'Shifts', path: '/super-admin/shifts' },
    ],
  },
  {
    name: 'Store Operations',
    path: '/super-admin/operations-group',
    icon: <ClipboardList className="h-5 w-5" />,
    children: [
      { name: 'Store Layouts', path: '/super-admin/layouts' },
      { name: 'Assets', path: '/super-admin/assets' },
      { name: 'Rack Management', path: '/super-admin/racks' },
      { name: 'Grooming', path: '/super-admin/grooming' },
      { name: 'Issues', path: '/super-admin/issues' },
    ],
  },
  { name: 'Home Delivery', path: '/super-admin/deliveries', icon: <Truck className="h-5 w-5" /> },
  { name: 'Sales', path: '/super-admin/sales', icon: <BarChart2 className="h-5 w-5" /> },
  {
    name: 'Performance',
    path: '/super-admin/performance-group',
    icon: <ShieldCheck className="h-5 w-5" />,
    children: [
      { name: 'Daily Scores', path: '/super-admin/scores' },
      { name: 'Store Health', path: '/super-admin/health' },
      { name: 'Championship', path: '/super-admin/championship' },
    ],
  },
  { name: 'Reports', path: '/super-admin/reports', icon: <BarChart2 className="h-5 w-5" /> },
  { name: 'System Settings', path: '/super-admin/settings', icon: <Settings className="h-5 w-5" /> },
  { name: 'Audit Logs', path: '/super-admin/audit', icon: <FileText className="h-5 w-5" /> },
];

const STORE_ADMIN_NAV: NavItem[] = [
  { name: 'Dashboard', path: '/store/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  {
    name: 'Employees',
    path: '/store/employees-group',
    icon: <Users className="h-5 w-5" />,
    children: [
      { name: 'Employee List', path: '/store/employees' },
      { name: 'Attendance', path: '/store/attendance' },
      { name: 'Leave', path: '/store/leave' },
    ],
  },
  {
    name: 'Store Operations',
    path: '/store/operations-group',
    icon: <ClipboardList className="h-5 w-5" />,
    children: [
      { name: 'Store Layout', path: '/store/layouts' },
      { name: 'Assets', path: '/store/assets' },
      { name: 'Rack Management', path: '/store/racks' },
      { name: 'Product Placement', path: '/store/products' },
      { name: 'Grooming', path: '/store/grooming' },
      { name: 'Issues', path: '/store/issues' },
    ],
  },
  { name: 'Home Delivery', path: '/store/deliveries', icon: <Truck className="h-5 w-5" /> },
  { name: 'Sales', path: '/store/sales', icon: <BarChart2 className="h-5 w-5" /> },
  { name: 'Daily Checklist', path: '/store/checklist', icon: <ClipboardList className="h-5 w-5" /> },
  { name: 'Performance', path: '/store/performance', icon: <ShieldCheck className="h-5 w-5" /> },
  { name: 'Reports', path: '/store/reports', icon: <FileText className="h-5 w-5" /> },
  { name: 'Notifications', path: '/store/notifications', icon: <Bell className="h-5 w-5" /> },
  { name: 'Store Settings', path: '/store/settings', icon: <Settings className="h-5 w-5" /> },
];

const EMPLOYEE_NAV: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: 'Attendance', path: '/attendance', icon: <Clock className="h-5 w-5" /> },
  { name: 'My Tasks', path: '/tasks', icon: <ClipboardList className="h-5 w-5" /> },
  { name: 'Deliveries', path: '/deliveries', icon: <Truck className="h-5 w-5" /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, profile, signOut, isSuperAdmin, isStoreAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const getNavTranslation = (name: string) => {
    const key = 'common.' + name.toLowerCase().replace(/\s+/g, '_');
    const translated = t(key);
    return translated === key ? name : translated;
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      'Organization': false,
      'Employees': false,
      'Store Operations': false,
      'Performance': false,
    };
    SUPER_ADMIN_NAV.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => location.pathname === child.path);
        if (hasActiveChild) {
          initial[item.name] = true;
        }
      }
    });
    STORE_ADMIN_NAV.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => location.pathname === child.path);
        if (hasActiveChild) {
          initial[item.name] = true;
        }
      }
    });
    return initial;
  });

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Pick navigation set based on role
  const navigationItems: NavItem[] = isSuperAdmin
    ? SUPER_ADMIN_NAV
    : isStoreAdmin
    ? STORE_ADMIN_NAV
    : EMPLOYEE_NAV;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNavClick = (path: string, disabled?: boolean) => {
    if (disabled) return;
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const userDisplayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const avatarInitials = (profile?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  // Role badge colors for the header
  const roleLabelClass = isSuperAdmin
    ? 'text-purple-600 dark:text-purple-400'
    : isStoreAdmin
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const SidebarNav = ({ collapsed }: { collapsed: boolean }) => {
    return (
      <nav className="space-y-1 flex-1 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
        {navigationItems.map((item) => {
          const hasChildren = !!item.children && item.children.length > 0;
          const isGroupExpanded = expandedGroups[item.name];

          // Determine if this item or any of its children is active
          const isParentActive = location.pathname === item.path;
          const isChildActive = hasChildren && item.children!.some(child => location.pathname === child.path);
          const isActive = isParentActive || isChildActive;

          return (
            <div key={item.name} className="space-y-1">
              <button
                onClick={() => {
                  if (hasChildren) {
                    if (collapsed) {
                      setIsSidebarCollapsed(false);
                      setExpandedGroups(prev => ({ ...prev, [item.name]: true }));
                    } else {
                      toggleGroup(item.name);
                    }
                  } else {
                    handleNavClick(item.path, item.disabled);
                  }
                }}
                disabled={item.disabled}
                title={item.name}
                className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer group relative
                  ${isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-bold'
                    : 'text-dark-600 hover:bg-dark-50 dark:text-dark-400 dark:hover:bg-dark-800/50'
                  }
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                <span className={`shrink-0 ${isActive ? 'text-brand-500' : 'text-dark-400 dark:text-dark-500 group-hover:text-dark-600 dark:group-hover:text-dark-300'}`}>
                  {item.icon}
                </span>

                {!collapsed && <span className="flex-1 truncate">{getNavTranslation(item.name)}</span>}

                {/* Arrow indicator for parent items */}
                {hasChildren && !collapsed && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 ml-auto text-dark-400 dark:text-dark-500 transition-transform duration-200
                      ${isGroupExpanded ? 'rotate-180' : ''}
                    `}
                  />
                )}

                {/* Collapsed tooltip */}
                {collapsed && (
                  <span className="absolute left-14 scale-0 bg-dark-900 text-white text-[10px] font-bold px-2 py-1.5 rounded-md group-hover:scale-100 duration-150 shadow-md origin-left z-50 whitespace-nowrap">
                    {getNavTranslation(item.name)}{item.disabled ? ' (Soon)' : ''}
                  </span>
                )}
              </button>

              {/* Render submenu items if group is expanded and sidebar is not collapsed */}
              {hasChildren && isGroupExpanded && !collapsed && (
                <div className="pl-8 space-y-1 border-l border-dark-100 dark:border-dark-800/50 ml-5 pr-1 animate-in fade-in duration-150">
                  {item.children!.map((child) => {
                    const isSubActive = location.pathname === child.path;
                    return (
                      <button
                        key={child.name}
                        onClick={() => handleNavClick(child.path, child.disabled)}
                        disabled={child.disabled}
                        className={`flex items-center w-full text-left py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer
                          ${isSubActive
                            ? 'text-brand-600 dark:text-brand-400 font-bold bg-brand-500/5'
                            : 'text-dark-500 hover:text-dark-800 dark:text-dark-400 dark:hover:text-dark-200 hover:bg-dark-50/50 dark:hover:bg-dark-800/20'
                          }
                          ${child.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                        `}
                      >
                        <span className="truncate">{getNavTranslation(child.name)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-50 dark:bg-dark-950 text-dark-900 dark:text-dark-100 transition-colors duration-300">

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-16 border-b border-dark-200 dark:border-dark-800 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 gap-3">

        {/* Left: Mobile toggle + Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 text-dark-500 dark:text-dark-400"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(isSuperAdmin ? '/super-admin/dashboard' : isStoreAdmin ? '/store/dashboard' : '/dashboard')}>
            <div className="bg-brand-600 p-1.5 rounded-md text-white">
              <Pill className="h-5 w-5" />
            </div>
            <span className="text-base font-bold uppercase tracking-wider text-dark-900 dark:text-white hidden sm:block">
              PharmacyOps
            </span>
          </div>
        </div>

        {/* Centre: Store Selector (Super Admin only) */}
        {isSuperAdmin && (
          <div className="hidden md:flex flex-1 justify-start pl-4">
            <StoreSelector />
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-auto">

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <Button
              variant="ghost"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="rounded-full p-2 text-dark-500 dark:text-dark-400 relative"
              leftIcon={<Bell className="h-4 w-4" />}
            />
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-4 border-b border-dark-100 dark:border-dark-800">
                  <h4 className="text-xs font-bold text-dark-900 dark:text-white">Notifications</h4>
                </div>
                <div className="p-6 text-center text-xs text-dark-400 dark:text-dark-500">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-40" />
                  No notifications yet
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="rounded-full p-2 text-dark-500 dark:text-dark-400"
            leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          />



          {/* User Profile Dropdown */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors text-left cursor-pointer">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase shrink-0
                  ${isSuperAdmin ? 'bg-gradient-to-tr from-purple-500 to-brand-600' : isStoreAdmin ? 'bg-gradient-to-tr from-blue-500 to-brand-500' : 'bg-gradient-to-tr from-emerald-500 to-teal-600'}
                `}>
                  {avatarInitials}
                </div>
                <div className="hidden sm:block text-xs">
                  <p className="font-bold text-dark-800 dark:text-dark-200 leading-tight">{userDisplayName}</p>
                  <p className={`leading-tight text-[10px] font-semibold ${roleLabelClass}`}>
                    {profile?.role_name || 'Staff'}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-dark-400 dark:text-dark-500 hidden sm:block" />
              </button>
            }
          >
            {/* Role info header */}
            <div className="px-3 py-2 border-b border-dark-100 dark:border-dark-800 mb-1">
              <p className="text-[10px] text-dark-400 dark:text-dark-500 font-semibold uppercase tracking-wider">Signed in as</p>
              <p className="text-xs font-bold text-dark-800 dark:text-dark-200 truncate max-w-[180px]">{user?.email}</p>
              {profile?.store_name && (
                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold mt-0.5">{profile.store_name}</p>
              )}
            </div>

            <DropdownItem icon={<User className="h-4 w-4" />} onClick={() => navigate(isSuperAdmin ? '/super-admin/profile' : '/profile')}>
              My Profile
            </DropdownItem>

            {isSuperAdmin && (
              <DropdownItem
                icon={<Store className="h-4 w-4" />}
                onClick={() => navigate('/super-admin/stores')}
              >
                Manage Stores
              </DropdownItem>
            )}

            {isSuperAdmin && (
              <DropdownItem
                icon={<ShieldCheck className="h-4 w-4" />}
                onClick={() => navigate('/super-admin/dashboard')}
              >
                Admin Console
              </DropdownItem>
            )}

            <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => navigate(isSuperAdmin ? '/super-admin/settings' : isStoreAdmin ? '/store/settings' : '/profile')}>
              Settings
            </DropdownItem>

            <hr className="border-dark-100 dark:border-dark-800 my-1" />
            <DropdownItem
              icon={<LogOut className="h-4 w-4" />}
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              Sign Out
            </DropdownItem>
          </Dropdown>
        </div>
      </header>

      {/* ── Main Content Shell ──────────────────────────────────────────────── */}
      <div className="flex-1 flex relative">

        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex flex-col border-r border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-3 shrink-0 transition-all duration-300 relative ${isSidebarCollapsed ? 'w-[68px]' : 'w-60'}`}>

          {/* Role indicator strip */}
          {!isSidebarCollapsed && (
            <div className={`mb-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
              ${isSuperAdmin ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : isStoreAdmin ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}
            `}>
              {isSuperAdmin ? '⚡ Super Admin Console' : isStoreAdmin ? '🏪 ' + (profile?.store_name || 'Store Admin') : '👤 ' + (profile?.role_name || 'Employee')}
            </div>
          )}

          <SidebarNav collapsed={isSidebarCollapsed} />

          {/* Collapse Toggle */}
          <div className="pt-3 border-t border-dark-100 dark:border-dark-800 flex justify-center">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg border border-dark-200 dark:border-dark-800 text-dark-500 hover:bg-dark-50 dark:hover:bg-dark-800 cursor-pointer transition-colors"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        {/* Mobile Slide-out Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-dark-950/40 dark:bg-dark-950/70 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-xs bg-white dark:bg-dark-900 p-4 flex flex-col h-full border-r border-dark-200 dark:border-dark-800 shadow-xl z-50 animate-in slide-in-from-left duration-250">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-dark-100 dark:border-dark-800">
                <div className="flex items-center gap-2">
                  <div className="bg-brand-600 p-1.5 rounded-md text-white">
                    <Pill className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider text-dark-900 dark:text-white">PharmacyOps</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800">
                  <X className="h-5 w-5 text-dark-500" />
                </button>
              </div>

              {/* Mobile Store Selector for Super Admin */}
              {isSuperAdmin && (
                <div className="mb-3">
                  <StoreSelector className="w-full" />
                </div>
              )}

              {/* Role label */}
              <div className={`mb-3 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider
                ${isSuperAdmin ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : isStoreAdmin ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}
              `}>
                {isSuperAdmin ? 'Super Admin' : isStoreAdmin ? (profile?.store_name || 'Store Admin') : (profile?.role_name || 'Employee')}
              </div>

              <nav className="space-y-1 flex-1">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.path, item.disabled)}
                      disabled={item.disabled}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer
                        ${isActive ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'text-dark-600 hover:bg-dark-50 dark:text-dark-400 dark:hover:bg-dark-800/50'}
                        ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                      `}
                    >
                      <span className={isActive ? 'text-brand-500' : 'text-dark-400'}>{item.icon}</span>
                      <span>{getNavTranslation(item.name)}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-dark-100 dark:border-dark-800 space-y-2">
                <div className="px-3 py-2 text-xs text-dark-500 dark:text-dark-400">
                  <p className="font-semibold text-dark-700 dark:text-dark-300">{profile?.full_name || user?.email}</p>
                  <p className="text-[10px] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                  {t('common.logout')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main scrollable page panel */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
