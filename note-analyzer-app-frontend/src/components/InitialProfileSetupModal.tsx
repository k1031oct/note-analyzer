import React, { useState } from 'react';
import { Modal } from './Modal';

interface InitialProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newDisplayName: string) => Promise<void>;
}

export const InitialProfileSetupModal: React.FC<InitialProfileSetupModalProps> = ({ isOpen, onClose, onSave }) => {
  const [newDisplayName, setNewDisplayName] = useState('');
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
      setMessage('表示名を保存しました。');
      setIsError(false);
      window.location.reload(); // ADDED: 成功したらページをリロードして最新のユーザー情報を取得
    } catch (error) {
      console.error('Error setting initial display name:', error);
      setIsError(true);
      setMessage('表示名の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="ようこそ！表示名を設定してください" onClose={onClose} isOpen={isOpen}>
      <div className="modal-section">
        <p>アプリを始める前に、あなたの表示名を設定してください。</p>
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
          {/* 初回設定なのでキャンセルボタンは不要か、閉じるボタンとして機能させるか */}
          {/* <button type="button" onClick={onClose} className="button-secondary" disabled={isSaving}>
            後で設定
          </button> */}
        </div>
      </div>
    </Modal>
  );
};
