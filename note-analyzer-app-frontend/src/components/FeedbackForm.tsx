import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase'; // Firestoreインスタンスをインポート
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './FeedbackForm.css'; // 後で作成

export const FeedbackForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage('');
    setIsError(false);

    if (!subject.trim() || !message.trim()) {
      setIsError(true);
      setFeedbackMessage('件名と内容は必須です。');
      return;
    }

    if (!user) {
      setIsError(true);
      setFeedbackMessage('ログインしていません。');
      return;
    }

    setIsSending(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userName: user.displayName || '匿名ユーザー',
        userEmail: user.email || 'メールアドレスなし',
        subject,
        message,
        timestamp: serverTimestamp(),
      });
      setFeedbackMessage('お問い合わせ・ご要望を送信しました。ありがとうございます！');
      setSubject('');
      setMessage('');
      setIsError(false);
    } catch (error) {
      console.error('Error sending feedback:', error);
      setIsError(true);
      setFeedbackMessage('送信中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="feedback-form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="userName">ユーザー名:</label>
          <input type="text" id="userName" value={user?.displayName || '匿名ユーザー'} disabled />
        </div>
        <div className="form-group">
          <label htmlFor="userEmail">メールアドレス:</label>
          <input type="email" id="userEmail" value={user?.email || 'メールアドレスなし'} disabled />
        </div>
        <div className="form-group">
          <label htmlFor="subject">件名:</label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSending}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="message">内容:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            rows={5}
            required
          ></textarea>
        </div>
        {feedbackMessage && (
          <p className={`feedback-message ${isError ? 'error' : 'success'}`}>
            {feedbackMessage}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" disabled={isSending}>
            {isSending ? '送信中...' : '送信'}
          </button>
          <button type="button" onClick={onClose} className="button-secondary" disabled={isSending}>
            閉じる
          </button>
        </div>
      </form>
    </div>
  );
};
