import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  displayName: string | null;
  onLogout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, displayName, onLogout, isSidebarOpen, setIsSidebarOpen }) => {
  const navItems = [
    { page: 'dashboard', label: 'ダッシュボード' },
    { page: 'dataManagement', label: 'データ管理' },
    { page: 'dataImport', label: 'データ取り込み' },
    { page: 'settings', label: '設定' },
  ];

  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2 className="logo-text" onClick={() => setCurrentPage('dashboard')} style={{ cursor: 'pointer' }}>N+ analyzer</h2>
        <button className="toggle-button" onClick={() => setIsSidebarOpen(false)}>
          ×
        </button>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map(item => (
            <li
              key={item.page}
              className={currentPage === item.page ? 'active' : ''}
              onClick={() => setCurrentPage(item.page)}
              title={item.label} // 閉じたとき用
            >
              <span className="nav-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <div className="user-profile">
          <span className="nav-label">{displayName || 'ゲスト'}</span>
        </div>
        <button onClick={onLogout} className="logout-button">
          <span className="nav-label">ログアウト</span>
        </button>
      </div>
    </div>
  );
};