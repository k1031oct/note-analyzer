import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { updateProfile } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Modal } from '../components/Modal';
import { ClassificationManagement } from '../components/ClassificationManagement';
import { KpiManagement } from '../components/KpiManagement';
import { FeedbackForm } from '../components/FeedbackForm';
import './SettingsPage.css';

// プロフィール設定タブのコンポーネント
const ProfileSettings = () => {
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    if (!newDisplayName.trim()) {
      setIsError(true);
      setMessage('表示名は必須です。');
      return;
    }
    setIsSaving(true);
    setMessage('');
    setIsError(false);
    try {
      await updateProfile(user, { displayName: newDisplayName });
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { displayName: newDisplayName }, { merge: true });
      setMessage('表示名を更新しました。');
      setIsError(false);
      setTimeout(() => {
        setIsEditModalOpen(false);
        window.location.reload(); // displayNameの変更を全体に反映させるため
      }, 1500);
    } catch (error) {
      console.error('Error updating display name:', error);
      setIsError(true);
      setMessage('表示名の更新に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h3>プロフィール</h3>
      <div className="profile-info">
        <p><strong>表示名:</strong> {user.displayName || '未設定'}</p>
        <p><strong>メールアドレス:</strong> {user.email}</p>
        <p><strong>アカウント作成日:</strong> {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : '不明'}</p>
        <p><strong>最終ログイン日:</strong> {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : '不明'}</p>
      </div>
      <div style={{ textAlign: 'right', marginTop: '15px' }}>
        <button onClick={() => setIsEditModalOpen(true)} className="button-primary">編集</button>
      </div>

      <Modal title="プロフィールを編集" onClose={() => setIsEditModalOpen(false)} isOpen={isEditModalOpen}>
        <div className="modal-section">
          <div className="form-group">
            <label htmlFor="displayName">表示名:</label>
            <input
              type="text"
              id="displayName"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>
          {message && (
            <p className={`feedback-message ${isError ? 'error' : 'success'}`}>
              {message}
            </p>
          )}
          <div className="form-actions">
            <button onClick={handleSave} disabled={isSaving} style={{ minWidth: '80px', minHeight: '38px' }}>
              {isSaving ? <div className="button-spinner"></div> : '保存'}
            </button>
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="button-secondary" disabled={isSaving}>
              キャンセル
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// 分析設定タブのコンポーネント
const AnalysisSettings = () => {
  const {
    classifications,
    secondaryClassifications,
    kpis,
    handleAddClassification,
    handleAddSecondaryClassification,
    handleDeleteClassification,
    handleDeleteSecondaryClassification,
    handleAddKpi,
    handleDeleteKpi,
  } = useData();

  const [tagName, setTagName] = useState("");
  const [secondaryTagName, setSecondaryTagName] = useState("");

  const onAddClassification = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddClassification(tagName).then(() => setTagName(""));
  };

  const onAddSecondaryClassification = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddSecondaryClassification(secondaryTagName).then(() => setSecondaryTagName(""));
  };

  return (
    <div>
      <ClassificationManagement
        classifications={classifications}
        secondaryClassifications={secondaryClassifications}
        tagName={tagName}
        setTagName={setTagName}
        secondaryTagName={secondaryTagName}
        setSecondaryTagName={setSecondaryTagName}
        handleAddClassification={onAddClassification}
        handleAddSecondaryClassification={onAddSecondaryClassification}
        handleDeleteClassification={handleDeleteClassification}
        handleDeleteSecondaryClassification={handleDeleteSecondaryClassification}
      />
      <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
      <KpiManagement
        kpis={kpis}
        onAddKpi={handleAddKpi}
        onDeleteKpi={handleDeleteKpi}
      />
    </div>
  );
};

// 表示設定タブのコンポーネント
const DisplaySettings: React.FC<{ isDarkMode: boolean; toggleDarkMode: () => void; }> = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <div>
      <h3>表示設定</h3>
      <div className="setting-item">
        <span>表示モード</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={isDarkMode} onChange={toggleDarkMode} />
          <span className="slider round"></span>
        </label>
      </div>
    </div>
  );
};

// その他設定タブのコンポーネント
const OtherSettings = () => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  return (
    <div>
      <h3>その他</h3>
      <div className="setting-item">
        <span>お問い合わせ・ご要望</span>
        <button onClick={() => setIsFeedbackModalOpen(true)} className="button-secondary">フォームを開く</button>
      </div>
      <Modal title="お問い合わせ・要望" onClose={() => setIsFeedbackModalOpen(false)} isOpen={isFeedbackModalOpen}>
        <FeedbackForm onClose={() => setIsFeedbackModalOpen(false)} />
      </Modal>
    </div>
  );
};

interface SettingsPageProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ isDarkMode, toggleDarkMode }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'analysis':
        return <AnalysisSettings />;
      case 'display':
        return <DisplaySettings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'other':
        return <OtherSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div>
      <h1>設定</h1>
      <div className="settings-tabs">
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}>プロフィール</button>
        <button onClick={() => setActiveTab('analysis')} className={activeTab === 'analysis' ? 'active' : ''}>分析設定</button>
        <button onClick={() => setActiveTab('display')} className={activeTab === 'display' ? 'active' : ''}>表示設定</button>
        <button onClick={() => setActiveTab('other')} className={activeTab === 'other' ? 'active' : ''}>その他</button>
      </div>
      <div className="settings-content card">
        {renderContent()}
      </div>
    </div>
  );
};