import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { AnnouncementIcon } from './components/AnnouncementIcon';
import { AnnouncementsModal } from './components/AnnouncementsModal';
import { announcementsData } from './data/announcementsData';
import type { Announcement } from './types';
import { InitialProfileSetupModal } from './components/InitialProfileSetupModal';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import './App.css';
import './components/Announcements.css';

// Import actual page components
import { DashboardPage } from './pages/DashboardPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { DataImportPage } from './pages/DataImportPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const { user, loading, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // --- お知らせ機能 State ---
  const [announcements, setAnnouncements] = useState<Announcement[]>(announcementsData);
  const [isAnnouncementsModalOpen, setIsAnnouncementsModalOpen] = useState(false);
  const [firestoreReadAnnouncementIds, setFirestoreReadAnnouncementIds] = useState<string[]>([]);

  // --- 初回ログイン時ユーザー名称設定 State ---
  const [isInitialProfileSetupModalOpen, setIsInitialProfileSetupModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // --- お知らせ機能 既読管理 Effect (Firestoreから読み込む) ---
  useEffect(() => {
    const fetchReadAnnouncementIds = async () => {
      if (user && !loading) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData && userData.readAnnouncementIds) {
            setFirestoreReadAnnouncementIds(userData.readAnnouncementIds);
          }
        } else {
          await setDoc(userDocRef, { readAnnouncementIds: [] }, { merge: true });
        }
      }
    };
    fetchReadAnnouncementIds();
  }, [user, loading]);

  // --- 初回ログイン時ユーザー名称設定 Effect (Firestoreからフラグを読み込む) ---
  useEffect(() => {
    const checkDisplayNameStatus = async () => {
      if (user && !loading) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData && userData.isDisplayNameSet !== true) {
            setIsInitialProfileSetupModalOpen(true);
          }
        } else {
          setIsInitialProfileSetupModalOpen(true);
          await setDoc(userDocRef, { isDisplayNameSet: false }, { merge: true });
        }
      }
    };
    checkDisplayNameStatus();
  }, [user, loading]);

  // --- お知らせ機能 ロジック ---
  const handleMarkAsRead = async (id: string) => {
    if (user && !firestoreReadAnnouncementIds.includes(id)) {
      const newReadIds = [...firestoreReadAnnouncementIds, id];
      setFirestoreReadAnnouncementIds(newReadIds);
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { readAnnouncementIds: newReadIds }, { merge: true });
    }
  };

  const unreadCount = announcements.filter(a => !firestoreReadAnnouncementIds.includes(a.id)).length;

  // --- 初回ログイン時ユーザー名称設定 ロジック ---
  const handleUpdateDisplayName = async (newDisplayName: string) => {
    if (user && user.displayName !== newDisplayName) {
      try {
        await updateProfile(user, { displayName: newDisplayName });
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { isDisplayNameSet: true }, { merge: true });
        setIsInitialProfileSetupModalOpen(false);
      } catch (error) {
        console.error("ユーザー名の更新に失敗しました:", error);
      }
    }
  };

  if (loading) {
    return <div className="loading-container">読み込み中...</div>;
  }

  const handleContentClick = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage setCurrentPage={setCurrentPage} />;
      case 'dataManagement':
        return <DataManagementPage />;
      case 'dataImport':
        return <DataImportPage setCurrentPage={setCurrentPage} />;
      case 'settings':
        return <SettingsPage isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      default:
        return <DashboardPage setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="app-layout">
      {user ? (
        <>
          <Sidebar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            displayName={user.displayName}
            onLogout={logout}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
          <main className="main-content" onClick={handleContentClick}>
            {!isSidebarOpen && (
                <button className="open-sidebar-button" onClick={() => setIsSidebarOpen(true)}>
                    ≡
                </button>
            )}
            {renderPage()}
          </main>

          <AnnouncementIcon 
            unreadCount={unreadCount} 
            onClick={() => setIsAnnouncementsModalOpen(true)} 
          />
          <AnnouncementsModal
            isOpen={isAnnouncementsModalOpen}
            onClose={() => setIsAnnouncementsModalOpen(false)}
            announcements={announcements}
            readIds={firestoreReadAnnouncementIds}
            onMarkAsRead={handleMarkAsRead}
          />
          <InitialProfileSetupModal
            isOpen={isInitialProfileSetupModalOpen}
            onClose={() => setIsInitialProfileSetupModalOpen(false)}
            onSave={handleUpdateDisplayName}
          />
        </>
      ) : (
        <div className="login-container">
          <h1>N+ analyzer</h1>
          <button onClick={login}>Googleでログイン</button>
        </div>
      )}
    </div>
  );
}

export default App;