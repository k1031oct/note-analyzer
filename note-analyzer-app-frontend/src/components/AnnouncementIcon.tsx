import React from 'react';
import './Announcements.css';

interface AnnouncementIconProps {
  unreadCount: number;
  onClick: () => void;
}

export const AnnouncementIcon: React.FC<AnnouncementIconProps> = ({ unreadCount, onClick }) => {
  return (
    <div className="announcement-icon" onClick={onClick} role="button" aria-label="お知らせを開く">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '32px', height: '32px' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      {unreadCount > 0 && (
        <div className="announcement-badge">{unreadCount}</div>
      )}
    </div>
  );
};
