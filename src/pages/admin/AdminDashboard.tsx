import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, Database, FileText, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const adminActions = [
    { name: 'User & Role Controls', desc: 'Inspect pharmacy technician registrations, active sessions, and system roles.', icon: <Users className="h-5 w-5" /> },
    { name: 'Inventory Schema Maintenance', desc: 'Verify drug database schemas, stock indexes, and low stock warnings.', icon: <Database className="h-5 w-5" /> },
    { name: 'Transaction Audit Logs', desc: 'Track dispensing records, prescription fillings, and audit logs.', icon: <FileText className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2.5 rounded-xl text-white animate-pulse">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-dark-900 dark:text-white">Admin Management</h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20 tracking-wider">
                {role} claim
              </span>
            </div>
            <p className="text-xs text-dark-500 dark:text-dark-400">
              System tools and parameters for the Starcine Rx pharmacy platform
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Return to Dashboard
        </Button>
      </div>

      {/* Admin stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-purple-200 dark:border-purple-900/50 bg-gradient-to-tr from-purple-50/50 to-white dark:from-purple-950/10 dark:to-dark-900">
          <Card.Header>
            <Card.Title className="text-purple-800 dark:text-purple-300">Security Claims</Card.Title>
            <Card.Description>Verified session JWT privileges</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-2 border-b border-dark-100 dark:border-dark-800">
              <span className="font-semibold text-dark-500">Current User</span>
              <span className="text-dark-900 dark:text-white truncate max-w-[150px] font-mono">
                {user?.email}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 border-b border-dark-100 dark:border-dark-800">
              <span className="font-semibold text-dark-500">Session Role</span>
              <span className="font-bold text-purple-600 dark:text-purple-400 capitalize">
                {role}
              </span>
            </div>
            <div className="flex items-center justify-between p-2">
              <span className="font-semibold text-dark-500">JWT Scope</span>
              <span className="text-green-600 dark:text-green-400 font-semibold uppercase">
                Write Access
              </span>
            </div>
          </Card.Content>
        </Card>

        {/* Administration panels */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>System Actions</Card.Title>
              <Card.Description>Manage system details and parameters</Card.Description>
            </Card.Header>
            <Card.Content className="p-0">
              <div className="divide-y divide-dark-100 dark:divide-dark-800">
                {adminActions.map((action) => (
                  <div
                    key={action.name}
                    className="p-5 flex items-start gap-4 hover:bg-dark-50/50 dark:hover:bg-dark-900/50 transition-colors"
                  >
                    <div className="p-2.5 bg-dark-100 dark:bg-dark-800 text-dark-500 rounded-lg">
                      {action.icon}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-bold text-dark-900 dark:text-white">
                        {action.name}
                      </h4>
                      <p className="text-xs text-dark-500 dark:text-dark-400">
                        {action.desc}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => alert(`Running ${action.name} stub...`)}
                    >
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};
