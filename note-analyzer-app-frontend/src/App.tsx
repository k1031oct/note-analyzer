import { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import Dashboard from './components/Dashboard';
import { ArticleExtractor } from './components/ArticleExtractor';
import { DataManagement } from './components/DataManagement';
import { KpiManagement } from './components/KpiManagement';
import { ClassificationManagement } from './components/ClassificationManagement';
import { Modal } from './components/Modal';
import { AnnouncementIcon } from './components/AnnouncementIcon'; // ADD
import { AnnouncementsModal } from './components/AnnouncementsModal'; // ADD
import { announcementsData } from './data/announcementsData.tsx'; // ADD
import type { Announcement } from './types'; // ADD
import { FeedbackForm } from './components/FeedbackForm'; // ADD
import { UserPage } from './components/UserPage'; // ADD
import { InitialProfileSetupModal } from './components/InitialProfileSetupModal'; // ADD
import { db } from './firebase'; // ADDED: authを追加
import { doc, getDoc, setDoc } from 'firebase/firestore'; // ADDED
import { updateProfile } from 'firebase/auth';
import './App.css';
import './components/Announcements.css'; // ADDED
import './components/UserPage.css'; // ADDED

function App() {
  const { user, loading, login, logout } = useAuth();
  const {
    allArticles,
    classifications,
    secondaryClassifications,
    kpis,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    handleExtractAndAddArticles,
    handleUpdateArticle,
    handleUpdateLatestSnapshot,
    handleAddClassification,
    handleAddSecondaryClassification,
    handleDeleteClassification,
    handleDeleteSecondaryClassification,
    handleAddKpi,
    handleDeleteKpi,
    handleFileUpload,
    handleFetchXData,
    isFetchingXData,
    isXConnected,
    activeModal,
    setActiveModal
  } = useData();

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  const [notePastedText, setNotePastedText] = useState("");
  const [tagName, setTagName] = useState("");
  const [secondaryTagName, setSecondaryTagName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // --- お知らせ機能 State ---
  const [announcements, setAnnouncements] = useState<Announcement[]>(announcementsData);
  const [isAnnouncementsModalOpen, setIsAnnouncementsModalOpen] = useState(false);
  const [firestoreReadAnnouncementIds, setFirestoreReadAnnouncementIds] = useState<string[]>([]); // MODIFIED: Firestoreから読み込む

  // --- 初回ログイン時ユーザー名称設定 State ---
  const [isInitialProfileSetupModalOpen, setIsInitialProfileSetupModalOpen] = useState(false);
  const [isDisplayNameSet, setIsDisplayNameSet] = useState(true); // Firestoreから読み込むまでtrueとしておく

  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

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
          // ドキュメントが存在しない場合は新規作成
          await setDoc(userDocRef, { readAnnouncementIds: [] }, { merge: true });
        }
      }
    };
    fetchReadAnnouncementIds();
  }, [user, loading]); // MODIFIED: 依存配列にdbを追加

  // --- 初回ログイン時ユーザー名称設定 Effect (Firestoreからフラグを読み込む) ---
  useEffect(() => {
    const checkDisplayNameStatus = async () => {
      if (user && !loading) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData && userData.isDisplayNameSet === true) {
            setIsDisplayNameSet(true);
          } else {
            setIsDisplayNameSet(false);
            setIsInitialProfileSetupModalOpen(true);
          }
        } else {
          // ドキュメントが存在しない場合も未設定とみなす
          setIsDisplayNameSet(false);
          setIsInitialProfileSetupModalOpen(true);
          // 新規ユーザーの場合、displayNameがnullの可能性もあるので、Firestoreにドキュメントを作成
          await setDoc(userDocRef, { isDisplayNameSet: false }, { merge: true });
        }
      }
    };
    checkDisplayNameStatus();
  }, [user, loading]); // MODIFIED: 依存配列にdbを追加


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const onExtract = () => handleExtractAndAddArticles(notePastedText).then(() => setNotePastedText(""));
  const onAddClassification = (e: React.FormEvent) => { e.preventDefault(); handleAddClassification(tagName).then(() => setTagName("")); };
  const onAddSecondaryClassification = (e: React.FormEvent) => { e.preventDefault(); handleAddSecondaryClassification(secondaryTagName).then(() => setSecondaryTagName("")); };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setFile(e.target.files[0]); };
  const onFileUpload = () => { if (file) handleFileUpload(file).then(() => { setFile(null); (document.getElementById('csv-upload-input') as HTMLInputElement).value = ""; }); };

  const openModal = (modalName: string) => {
    setIsSettingsMenuOpen(false);
    setActiveModal(modalName);
  };

  // --- お知らせ機能 ロジック ---
  const handleMarkAsRead = async (id: string) => { // MODIFIED: asyncを追加
    if (user && !firestoreReadAnnouncementIds.includes(id)) { // MODIFIED: userチェックとfirestoreReadAnnouncementIdsを使用
      const newReadIds = [...firestoreReadAnnouncementIds, id];
      setFirestoreReadAnnouncementIds(newReadIds); // UIを即時更新

      // Firestoreを更新
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { readAnnouncementIds: newReadIds }, { merge: true });
    }
  };

  const unreadCount = announcements.filter(a => !firestoreReadAnnouncementIds.includes(a.id)).length; // MODIFIED: firestoreReadAnnouncementIdsを使用

  // --- 初回ログイン時ユーザー名称設定 ロジック ---
  const handleUpdateDisplayName = async (newDisplayName: string) => {
    if (user && user.displayName !== newDisplayName) {
      try {
        await updateProfile(user, { displayName: newDisplayName });
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { isDisplayNameSet: true }, { merge: true });
        setIsInitialProfileSetupModalOpen(false);
        setIsDisplayNameSet(true);
      } catch (error) {
        console.error("ユーザー名の更新に失敗しました:", error);
      }
    }
  };


  if (loading) {
    return <div className="loading-container">読み込み中...</div>;
  }

  return (
    <div className="App">
      <div className="App-container">
        {user ? (
          <>
            <header className="main-header">
              <h1>N+ analyzer</h1>
              <div className="header-controls">
                <button ref={settingsButtonRef} onClick={() => setIsSettingsMenuOpen(prev => !prev)} className="button-secondary icon-button" aria-label="設定">…</button>
                {isSettingsMenuOpen && (
                  <div className="settings-dropdown-menu" ref={settingsMenuRef}>
                    <div className="settings-menu-list">
                      <div className="settings-menu-item" onClick={() => setCurrentPage('dashboard')}>
                        <span>ダッシュボード</span>
                      </div>
                      <div className="settings-menu-item" onClick={() => setCurrentPage('userPage')}>
                        <span>ユーザーページ</span>
                      </div>
                      <div className="settings-menu-item" onClick={() => openModal('feedback')}>
                        <span>お問い合わせ・要望</span>
                      </div>
                      <div className="settings-menu-item" onClick={logout}>
                        <span>ログアウト</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </header>
            
            <div className="user-info-header">
              <p>ようこそ, {user.displayName} さん</p>
            </div>

            {currentPage === 'dashboard' && (
              <div className="top-controls-container">
                <div className="analysis-period-container">
                  <label>分析期間</label>
                  <div className="date-range-picker">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span>〜</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <button onClick={() => openModal('dataImport')} className="button-primary">データ更新</button>
              </div>
            )}
            
            <main>
              {currentPage === 'dataManagement' ? (
                <DataManagement 
                  articles={allArticles} 
                  classifications={classifications} 
                  secondaryClassifications={secondaryClassifications} 
                  handleUpdateArticle={handleUpdateArticle} 
                  handleUpdateLatestSnapshot={handleUpdateLatestSnapshot}
                  onReturnToDashboard={() => setCurrentPage('dashboard')} 
                />
              ) : currentPage === 'userPage' ? ( // ADD
                <UserPage // ADD
                  onReturnToDashboard={() => setCurrentPage('dashboard')} // ADD
                  onNavigateToDataManagement={() => setCurrentPage('dataManagement')} // ADD
                  isDarkMode={isDarkMode} // ADDED
                  toggleDarkMode={toggleDarkMode} // ADDED
                  openModal={openModal} // ADDED
                /> // ADD
              ) : (
                <Dashboard />
              )}
            </main>

            {/* --- お知らせ機能 レンダリング --- */}
            <AnnouncementIcon 
              unreadCount={unreadCount} 
              onClick={() => setIsAnnouncementsModalOpen(true)} 
            />
            <AnnouncementsModal
              isOpen={isAnnouncementsModalOpen}
              onClose={() => setIsAnnouncementsModalOpen(false)}
              announcements={announcements}
              readIds={firestoreReadAnnouncementIds} // MODIFIED
              onMarkAsRead={handleMarkAsRead}
            />


            <Modal title="データ取得" onClose={() => setActiveModal(null)} isOpen={activeModal === 'dataImport'}>
              <div className="modal-section">
                <h3>noteから記事を一括登録</h3>
                <ArticleExtractor notePastedText={notePastedText} setNotePastedText={setNotePastedText} handleExtractAndAddArticles={onExtract} />
              </div>
              <div className="modal-section">
                <h3>X(Twitter)と連携</h3>
                <p>Xと連携することで、note記事のインプレッションなどを自動で取得できます。</p>
                {isXConnected ? (<p>✅ Xアカウントは連携済みです。</p>) : (<button className="button-secondary">Xアカウントと連携</button>)}
                <button onClick={handleFetchXData} disabled={isFetchingXData} className="button-secondary">{isFetchingXData ? "取得中..." : "速報値を今すぐ取得"}</button>
              </div>
              <div className="modal-section">
                <h3>XアナリティクスCSVをアップロード</h3>
                <p>XアナリティクスからダウンロードしたCSVをアップロードすることで、過去のデータを一括で反映できます。</p>
                <input type="file" id="csv-upload-input" accept=".csv" onChange={onFileChange} style={{ marginTop: '10px' }} />
                <button onClick={onFileUpload} disabled={!file} className="button-secondary">CSVをアップロード</button>
              </div>
            </Modal>

            <Modal title="分類・KPI設定" onClose={() => setActiveModal(null)} isOpen={activeModal === 'classificationKpi'}>
              <div className="modal-section">
                <ClassificationManagement classifications={classifications} secondaryClassifications={secondaryClassifications} tagName={tagName} setTagName={setTagName} secondaryTagName={secondaryTagName} setSecondaryTagName={setSecondaryTagName} handleAddClassification={onAddClassification} handleAddSecondaryClassification={onAddSecondaryClassification} handleDeleteClassification={handleDeleteClassification} handleDeleteSecondaryClassification={handleDeleteSecondaryClassification} />
              </div>
              <div className="modal-section">
                <KpiManagement kpis={kpis} onAddKpi={handleAddKpi} onDeleteKpi={handleDeleteKpi} />
              </div>
            </Modal>

            {/* --- お問い合わせ・要望フォーム --- */}
            <Modal title="お問い合わせ・要望" onClose={() => setActiveModal(null)} isOpen={activeModal === 'feedback'}>
              <FeedbackForm onClose={() => setActiveModal(null)} />
            </Modal>

            {/* --- 初回ログイン時ユーザー名称設定モーダル --- */}
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
    </div>
  );
}

export default App;