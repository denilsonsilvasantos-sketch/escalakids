import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { MacroScheduleView } from './components/schedules/MacroScheduleView';
import { MicroScheduleView } from './components/schedules/MicroScheduleView';
import { VolunteerList } from './components/volunteers/VolunteerList';
import { VolunteerWizardModal } from './components/volunteers/VolunteerWizardModal';
import { VolunteerDetailModal } from './components/volunteers/VolunteerDetailModal';
import { GlobalSearchModal } from './components/volunteers/GlobalSearchModal';
import { MicroManagement } from './components/micros/MicroManagement';
import { FamilyManagement } from './components/families/FamilyManagement';
import { BirthdayTracker } from './components/birthdays/BirthdayTracker';
import { AuditHistoryView } from './components/history/AuditHistoryView';
import { VolunteerPortalView } from './components/volunteers/VolunteerPortalView';
import { SupabaseSyncModal } from './components/settings/SupabaseSyncModal';
import { UserManagementModal } from './components/auth/UserManagementModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { UserAccount, Person } from './types';
import { storageService } from './services/storageService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount>(storageService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(storageService.isAuthenticated());
  const [currentView, setCurrentView] = useState<string>('dashboard');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardPerson, setWizardPerson] = useState<Person | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const [selectedPersonForDetail, setSelectedPersonForDetail] = useState<Person | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  const refreshData = () => setDataVersion((v) => v + 1);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUserChange = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    storageService.logout();
    setIsAuthenticated(false);
  };

  const handleOpenNewVolunteer = () => {
    setWizardPerson(null);
    setIsWizardOpen(true);
  };

  const handleOpenEditVolunteer = (person: Person) => {
    setWizardPerson(person);
    setIsWizardOpen(true);
  };

  const handleResetData = () => {
    storageService.resetAllData();
    window.location.reload();
  };

  // If not authenticated, show modern Login Screen
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Header */}
      <Header
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onNavigate={setCurrentView}
        onResetData={handleResetData}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          currentUser={currentUser}
          onOpenNewVolunteerModal={handleOpenNewVolunteer}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {currentView === 'volunteer-portal' && (
            <VolunteerPortalView currentUser={currentUser} onNavigate={setCurrentView} />
          )}

          {currentView === 'dashboard' && (
            <DashboardOverview
              currentUser={currentUser}
              onNavigate={setCurrentView}
              onOpenNewVolunteer={handleOpenNewVolunteer}
              onOpenVolunteerDetail={setSelectedPersonForDetail}
            />
          )}

          {currentView === 'macro-schedule' && (
            <MacroScheduleView currentUser={currentUser} />
          )}

          {currentView === 'micro-schedules' && (
            <MicroScheduleView currentUser={currentUser} />
          )}

          {currentView === 'volunteers' && (
            <VolunteerList
              key={`volunteers-${dataVersion}`}
              currentUser={currentUser}
              onOpenWizard={handleOpenEditVolunteer}
              onViewDetail={setSelectedPersonForDetail}
            />
          )}

          {currentView === 'micros-functions' && (
            <MicroManagement
              key={`micros-${dataVersion}`}
              currentUser={currentUser}
            />
          )}

          {currentView === 'families' && (
            <FamilyManagement currentUser={currentUser} />
          )}

          {currentView === 'birthdays' && (
            <BirthdayTracker currentUser={currentUser} />
          )}

          {currentView === 'audit-history' && (
            <AuditHistoryView currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* Global Search Omnibox */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectPerson={(p) => setSelectedPersonForDetail(p)}
        onNavigate={setCurrentView}
      />

      {/* Modern Guided Volunteer Wizard */}
      <VolunteerWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardPerson(null);
        }}
        initialPerson={wizardPerson}
        onSaved={() => {
          setIsWizardOpen(false);
          setWizardPerson(null);
          refreshData();
        }}
      />

      {/* Volunteer Full Detail & Availability Modal */}
      <VolunteerDetailModal
        person={selectedPersonForDetail}
        onClose={() => setSelectedPersonForDetail(null)}
        onEdit={(p) => {
          setSelectedPersonForDetail(null);
          handleOpenEditVolunteer(p);
        }}
      />

      {/* Supabase Cloud & Vercel Sync Modal (Restricted strictly to ADMIN) */}
      {currentUser.role === 'ADMIN_LIDERANCA' && (
        <SupabaseSyncModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* User Management & Hierarchy Delegation Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onUserUpdated={() => {
          setCurrentUser(storageService.getCurrentUser());
        }}
      />
    </div>
  );
}
