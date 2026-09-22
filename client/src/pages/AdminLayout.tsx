import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { AdminLoginPage } from './AdminLoginPage.js';
import { AdminSidebar } from '../components/admin/AdminSidebar.js';
import { AdminHeader } from '../components/admin/AdminHeader.js';
import { AdminDashboard } from './AdminDashboard.js';
import { AdminQuestionsPage } from './AdminQuestionsPage.js';
import { AdminTeamsPage } from './AdminTeamsPage.js';
import { AdminLeaderboard } from './AdminLeaderboard.js';
import { AdminSettingsPage } from './AdminSettingsPage.js';

interface AdminLayoutProps {
  onNavigate: (route: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onNavigate }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <AdminLoginPage onNavigate={onNavigate} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <AdminDashboard onSelectTab={setCurrentTab} onNavigate={onNavigate} />;
      case 'questions':
        return <AdminQuestionsPage />;
      case 'teams':
        return <AdminTeamsPage />;
      case 'leaderboard':
        return <AdminLeaderboard />;
      case 'settings':
        return <AdminSettingsPage />;
      default:
        return <AdminDashboard onSelectTab={setCurrentTab} onNavigate={onNavigate} />;
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Live Monitor & Event Controls';
      case 'questions': return 'Question Bank (100 Active Questions)';
      case 'teams': return 'Registered Teams';
      case 'leaderboard': return 'Live Leaderboard & Standings';
      case 'settings': return 'Quiz Settings & Timers';
      default: return 'Admin Portal';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onNavigate={onNavigate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader
          title={getTabTitle()}
          subtitle="Department of Artificial Intelligence & Data Science"
        />
        <main className="flex-1 pb-16">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
