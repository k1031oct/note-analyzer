import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './Modal'; // Modalコンポーネントをインポート
import { auth } from '../firebase'; // ADDED
import { updateProfile } from 'firebase/auth'; // ADDED
import './UserPage.css';

interface UserPageProps {
  onReturnToDashboard: () => void;
  onNavigateToDataManagement: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  openModal: (modalName: string) => void;
}

// プロフィール編集モーダルコンポーネント
const EditProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName: string;
  onSave: (newDisplayName: string) => Promise<void>;
}> = ({ isOpen, onClose, currentDisplayName, onSave }) => {
  const [newDisplayName, setNewDisplayName] = useState(currentDisplayName);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

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
      await onSave(newDisplayName);
      setMessage('表示名を更新しました。');
      setIsError(false);
      window.location.reload(); // ADDED: 成功したらページをリロードして最新のユーザー情報を取得
    } catch (error) {
      console.error('Error updating display name:', error);
      setIsError(true);
      setMessage('表示名の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="プロフィールを編集" onClose={onClose} isOpen={isOpen}>
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
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button type="button" onClick={onClose} className="button-secondary" disabled={isSaving}>
            キャンセル
          </button>
        </div>
      </div>
    </Modal>
  );
};


export const UserPage: React.FC<UserPageProps> = ({ onReturnToDashboard, onNavigateToDataManagement, isDarkMode, toggleDarkMode, openModal }) => {
  const { user } = useAuth();
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  if (!user) {
    return <div className="user-page-container">ログインしていません。</div>;
  }

  const handleUpdateDisplayName = async (newDisplayName: string) => {
    if (user && user.displayName !== newDisplayName) {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newDisplayName });
        // Firebase Authのuserオブジェクトは自動で更新されない場合があるので、リロードまたは再取得が必要
        // ページをリロードして最新のユーザー情報を取得する
        window.location.reload();
      } else {
        console.error("Auth user not available for updateProfile.");
      }
    }
  };

  return (
    <div className="user-page-container">
      <div className="user-page-header">
        <h2>ユーザーページ</h2>
        {/* ダッシュボードへ戻るボタンはページ下部に移動 */}
      </div>

      <section className="user-profile-section">
        <h3>プロフィール</h3>
        <div className="profile-info">
          <p><strong>表示名:</strong> {user.displayName || '未設定'}</p>
          <p><strong>メールアドレス:</strong> {user.email}</p>
          {/* プロフィール画像表示を削除 */}
          <p><strong>アカウント作成日:</strong> {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : '不明'}</p>
          <p><strong>最終ログイン日:</strong> {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : '不明'}</p>
        </div>
        <div style={{ textAlign: 'right', marginTop: '15px' }}> {/* ボタンを右下に配置するためのdiv */}
          <button onClick={() => setIsEditProfileModalOpen(true)} className="button-primary">プロフィールを編集</button>
        </div>
      </section>

      <section className="user-settings-section">
        <h3>設定</h3>
        <div className="setting-item">
          <span>テーマ設定</span> {/* h4からspanに変更 */}
          <label className="toggle-switch">
            <input type="checkbox" checked={isDarkMode} onChange={toggleDarkMode} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="setting-item" style={{ marginTop: '20px' }}>
          <span>分類・KPI設定</span> {/* h4からspanに変更 */}
          <button onClick={() => openModal('classificationKpi')} className="button-primary">
            編集
          </button>
        </div>
      </section>

      <section className="user-account-management-section">
        <h3>アカウント管理</h3>
        <p>X連携の解除やアカウント削除など、アカウントに関する管理機能がここに入ります。</p>
        <button className="button-secondary">X連携を解除</button> {/* 後で実装 */}
        <button className="delete-button">アカウントを削除</button> {/* 後で実装 */}
      </section>

      <section className="user-data-access-section">
        <h3>データへのアクセス</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>記事データはこちら</span> {/* 文言変更 */}
          <button onClick={onNavigateToDataManagement} className="icon-link-button" aria-label="データ管理ページへ">
            {/* 一般的なリンクアイコン */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>
      </section>

      <div className="user-page-footer">
        <button onClick={onReturnToDashboard} className="button-secondary">閉じる</button>
      </div>

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        currentDisplayName={user.displayName || ''}
        onSave={handleUpdateDisplayName}
      />
    </div>
  );
};
