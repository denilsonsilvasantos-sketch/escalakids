import React, { useState, useEffect, useCallback } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardPerson, setWizardPerson] = useState<Person | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const [selectedPersonForDetail, setSelectedPersonForDetail] = useState<Person | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const refreshData = () => setDataVersion((v) => v + 1);

  const handleUserUpdated = useCallback(() => {
    const active = storageService.getCurrentUser();
    setCurrentUser((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(active)) {
        return active;
      }
      return prev;
    });
  }, []);

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

  // Listen to cross-device data updates in real time
  useEffect(() => {
    const handleDataSynced = () => {
      refreshData();
      const activeUser = storageService.getCurrentUser();
      if (activeUser && activeUser.id === currentUser.id) {
        if (JSON.stringify(activeUser) !== JSON.stringify(currentUser)) {
          setCurrentUser(activeUser);
        }
      }
    };
    window.addEventListener('mevam_data_synced', handleDataSynced);
    return () => window.removeEventListener('mevam_data_synced', handleDataSynced);
  }, [currentUser]);

  // Restore a previous session on load (validated against the server) and react to
  // the server telling us mid-session that our token is no longer valid.
  useEffect(() => {
    let cancelled = false;
    storageService.checkSession().then((user) => {
      if (cancelled) return;
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        storageService.startSync();
      }
      setIsCheckingSession(false);
    });

    const handleExpired = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('mevam_session_expired', handleExpired);
    return () => {
      cancelled = true;
      window.removeEventListener('mevam_session_expired', handleExpired);
    };
  }, []);

  const handleUserChange = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    storageService.startSync();
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    await storageService.logout();
  };

  const handleOpenNewVolunteer = () => {
    setWizardPerson(null);
    setIsWizardOpen(true);
  };

  const handleOpenEditVolunteer = (person: Person) => {
    setWizardPerson(person);
    setIsWizardOpen(true);
  };

  const handleResetData = async () => {
    await storageService.resetAllData();
    window.location.reload();
  };

  // While validating a stored session token against the server, avoid flashing the
  // login screen for users who are actually already authenticated.
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

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
        onNavigate={(view) => {
          setCurrentView(view);
          setIsMobileMenuOpen(false);
        }}
        onResetData={handleResetData}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            setIsMobileMenuOpen(false);
          }}
          currentUser={currentUser}
          onOpenNewVolunteerModal={handleOpenNewVolunteer}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0 overflow-y-auto pb-24 md:pb-8">
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
              currentUser={currentUser}
              onOpenWizard={handleOpenEditVolunteer}
              onViewDetail={setSelectedPersonForDetail}
              onPersonDeleted={refreshData}
            />
          )}

          {currentView === 'micros-functions' && (
            <MicroManagement
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
        onDeleted={() => {
          setIsWizardOpen(false);
          setWizardPerson(null);
          refreshData();
        }}
      />

      {/* Volunteer Full Detail & Availability Modal */}
      <VolunteerDetailModal
        person={selectedPersonForDetail}
        currentUser={currentUser}
        onClose={() => setSelectedPersonForDetail(null)}
        onEdit={(p) => {
          setSelectedPersonForDetail(null);
          handleOpenEditVolunteer(p);
        }}
        onDeleted={() => {
          setSelectedPersonForDetail(null);
          refreshData();
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
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
