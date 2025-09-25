import React, { useState, useEffect } from 'react';
import type { Announcement } from '../types';
import './Announcements.css';

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  readIds: string[];
  onMarkAsRead: (id: string) => void;
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({
  isOpen,
  onClose,
  announcements,
  readIds,
  onMarkAsRead,
}) => {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (isOpen && announcements.length > 0) {
      // Open the first unread announcement, or the very first one if all are read.
      const firstUnread = announcements.find(a => !readIds.includes(a.id));
      const announcementToSelect = firstUnread || announcements[0];
      setSelectedAnnouncement(announcementToSelect);
      if (!readIds.includes(announcementToSelect.id)) {
        onMarkAsRead(announcementToSelect.id);
      }
    }
  }, [isOpen, announcements]);

  const handleSelectAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (!readIds.includes(announcement.id)) {
      onMarkAsRead(announcement.id);
    }
  };

  return (
    <div className={`announcements-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className={`announcements-modal-content ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="announcements-modal-header">
          <h3>お知らせ</h3>
          <button onClick={onClose} className="announcements-modal-close-button">&times;</button>
        </div>
        <div className="announcements-modal-body">
          <ul className="announcements-list">
            {announcements.map((announcement) => (
              <li
                key={announcement.id}
                className={`announcement-list-item ${selectedAnnouncement?.id === announcement.id ? 'selected' : ''}`}
                onClick={() => handleSelectAnnouncement(announcement)}
              >
                {!readIds.includes(announcement.id) && <div className="unread-dot"></div>}
                <h5>{announcement.title}</h5>
                <p>{announcement.date} ({announcement.version})</p>
              </li>
            ))}
          </ul>
          <div className="announcement-detail">
            {selectedAnnouncement ? (
              <>
                <h4>{selectedAnnouncement.title}</h4>
                <p className="announcement-detail-meta">
                  {selectedAnnouncement.date} | Version: {selectedAnnouncement.version}
                </p>
                <div className="announcement-detail-content">
                  {selectedAnnouncement.content}
                </div>
              </>
            ) : (
              <p>お知らせを選択してください。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
