import React, { useState, useMemo } from 'react';
import type { Article, Classification, SecondaryClassification } from './types';

type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
} | null;

interface DataManagementProps {
    articles: Article[];
    classifications: Classification[];
    secondaryClassifications: SecondaryClassification[];
    handleUpdateArticle: (id: string, updatedData: Partial<Article>) => void;
    handleUpdateLatestSnapshot: (articleId: string, updatedData: { sales?: number }) => void;
    onReturnToDashboard: () => void;
}

const getValue = (article: Article, key: string) => {
    const latestSnapshot = article.daily_snapshots.length > 0 ? article.daily_snapshots[article.daily_snapshots.length - 1] : null;
    switch (key) {
        case 'note_views':
            return latestSnapshot?.note_data?.views ?? 0;
        case 'note_comments':
            return latestSnapshot?.note_data?.comments ?? 0;
        case 'note_likes':
            return latestSnapshot?.note_data?.likes ?? 0;
        case 'note_sales':
            return latestSnapshot?.note_data?.sales ?? 0;
        case 'x_total_impressions':
            return article.totalXImpressions ?? 0;
        case 'x_total_likes':
            return article.totalXLikes ?? 0;
        case 'x_total_replies':
            return article.totalXReplies ?? 0;
        case 'x_total_retweets':
            return article.totalXRetweets ?? 0;
        case 'x_total_quotes':
            return article.totalXQuotes ?? 0;
        case 'x_total_engagements':
            return article.totalXEngagements ?? 0;
        default:
            return article[key as keyof Article] ?? 0;
    }
};

export const DataManagement = React.memo(function DataManagement({
    articles,
    classifications,
    secondaryClassifications,
    handleUpdateArticle,
    handleUpdateLatestSnapshot,
    onReturnToDashboard
}: DataManagementProps) {
    const [editState, setEditState] = useState<{ [key: string]: Partial<Article> }>({});
    const [snapshotEditState, setSnapshotEditState] = useState<{ [key: string]: { sales?: string } }>({});
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'publicationDate', direction: 'descending' });

    const sortedArticles = useMemo(() => {
        let sortableItems = [...articles];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = getValue(a, sortConfig.key);
                const bValue = getValue(b, sortConfig.key);
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [articles, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return ''
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleFieldChange = (id: string, field: keyof Article, value: string) => {
        setEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const handleSnapshotFieldChange = (id: string, field: 'sales', value: string) => {
        setSnapshotEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const onSave = (id: string) => {
        const articleEdit = editState[id];
        const snapshotEdit = snapshotEditState[id];

        if (articleEdit) {
            handleUpdateArticle(id, articleEdit);
        }
        if (snapshotEdit) {
            const sales = snapshotEdit.sales !== undefined ? parseInt(snapshotEdit.sales, 10) : undefined;
            const updateData: { sales?: number } = {};
            if (sales !== undefined && !isNaN(sales)) updateData.sales = sales;
            if (Object.keys(updateData).length > 0) {
                handleUpdateLatestSnapshot(id, updateData);
            }
        }

        setEditState(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
        setSnapshotEditState(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
    };

    // 記事の有効/無効を切り替える関数
    const handleToggleArticleActive = (id: string, currentIsActive: boolean | undefined) => {
        const confirmMessage = currentIsActive === false
            ? 'この記事を再度有効にしますか？ダッシュボードの集計対象になります。'
            : 'この記事を無効にしますか？ダッシュボードの集計対象から外れます。'
        if (window.confirm(confirmMessage)) {
            handleUpdateArticle(id, { isActive: !currentIsActive });
        }
    };

    const renderHeaderWithSort = (label: string, key: string, width?: string, className?: string) => (
        <th style={{ width }} onClick={() => requestSort(key)} className={`sortable-header ${className || ''}`}>
            {label} {getSortIndicator(key)}
        </th>
    );

    return (
        <div className="data-management-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>登録済み記事一覧</h2>
                <button onClick={onReturnToDashboard} className="button-secondary">閉じる</button>
            </div>
            <div className="table-container">
                <table style={{ fontSize: '12px', tableLayout: 'fixed' }}>
                    <colgroup>
                        {/* 記事タイトル */}
                        <col style={{ width: '400px' }} />
                        {/* 投稿日 */}
                        <col style={{ width: '180px' }} />
                        {/* ビュー, コメント, スキ, 販売, Imps, Likes, リプライ, RT, 引用, Imps (C), Likes (C), エンゲージ (C) */}
                        <col style={{ width: '90px' }} span={12} /> {/* 12列を90pxに統一 */}
                        {/* URL */}
                        <col style={{ width: '400px' }} />
                        {/* 分類 */}
                        <col style={{ width: '180px' }} />
                        {/* 操作 */}
                        <col style={{ width: '100px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th colSpan={2}></th>
                            <th colSpan={4} className="group-header note-group-header" style={{ backgroundColor: '#e0f7fa' }}>note</th>
                            <th colSpan={5} className="group-header x-api-group-header" style={{ backgroundColor: '#fff3e0' }}>X (API速報値)</th>
                            <th colSpan={3} className="group-header x-csv-group-header" style={{ backgroundColor: '#e8f5e9' }}>X (CSV確定値)</th>
                            <th colSpan={3}></th>
                        </tr>
                        <tr>
                            {renderHeaderWithSort('記事タイトル', 'title', '400px')}
                            {renderHeaderWithSort('投稿日', 'publicationDate', '180px')}
                            {renderHeaderWithSort('ビュー', 'note_views', '90px', 'note-group-header')}
                            {renderHeaderWithSort('コメント', 'note_comments', '90px', 'note-group-header')}
                            {renderHeaderWithSort('スキ', 'note_likes', '90px', 'note-group-header')}
                            {renderHeaderWithSort('販売', 'note_sales', '90px', 'note-group-header')}
                            {renderHeaderWithSort('Imps', 'x_total_impressions', '90px', 'x-api-group-header')}
                            {renderHeaderWithSort('Likes', 'x_total_likes', '90px', 'x-api-group-header')}
                            {renderHeaderWithSort('リプライ', 'x_total_replies', '90px', 'x-api-group-header')}
                            {renderHeaderWithSort('RT', 'x_total_retweets', '90px', 'x-api-group-header')}
                            {renderHeaderWithSort('引用', 'x_total_quotes', '90px', 'x-api-group-header')}
                            {renderHeaderWithSort('Imps (C)', 'x_total_impressions', '90px', 'x-csv-group-header')}
                            {renderHeaderWithSort('Likes (C)', 'x_total_likes', '90px', 'x-csv-group-header')}
                            {renderHeaderWithSort('エンゲージ (C)', 'x_total_engagements', '90px', 'x-csv-group-header')}                            <th style={{width: '400px'}}>URL</th>
                            <th style={{width: '180px'}}>分類</th>
                            <th style={{width: '100px'}}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedArticles.map(article => {
                            const currentEdit = editState[article.id] || {};
                            const snapshotEdit = snapshotEditState[article.id] || {};
                            const dateValue = currentEdit.publicationDate ?? article.publicationDate ?? '';
                            const urlValue = currentEdit.url ?? article.url ?? '';
                            const classValue = currentEdit.classificationId ?? article.classificationId ?? '';
                            const subClassValue = currentEdit.secondaryClassificationId ?? article.secondaryClassificationId ?? '';
                            const latestSnapshot = article.daily_snapshots.length > 0 ? article.daily_snapshots[article.daily_snapshots.length - 1] : null;
                            const salesValue = snapshotEdit.sales ?? latestSnapshot?.note_data?.sales?.toString() ?? '0';

                            return (
                                <tr key={article.id} className={article.isActive === false ? 'inactive-article' : ''}>
                                    <td><div title={article.title} className="truncate-text">{article.title}</div></td>
                                    <td><input type="datetime-local" value={dateValue} onChange={(e) => handleFieldChange(article.id, 'publicationDate', e.target.value)} style={{ width: '100%' }} /></td>
                                    <td className="note-group-cell">{getValue(article, 'note_views')}</td>
                                    <td className="note-group-cell">{getValue(article, 'note_comments')}</td>
                                    <td className="note-group-cell">{getValue(article, 'note_likes')}</td>
                                    <td className="note-group-cell"><input type="number" value={salesValue} onChange={(e) => handleSnapshotFieldChange(article.id, 'sales', e.target.value)} style={{ width: '100%' }} /></td>
                                    <td className="x-api-group-cell">{getValue(article, 'x_total_impressions')}</td>
                                    <td className="x-api-group-cell">{getValue(article, 'x_total_likes')}</td>
                                    <td className="x-api-group-cell">{getValue(article, 'x_total_replies')}</td>
                                    <td className="x-api-group-cell">{getValue(article, 'x_total_retweets')}</td>
                                    <td className="x-api-group-cell">{getValue(article, 'x_total_quotes')}</td>
                                    <td className="x-csv-group-cell">{getValue(article, 'x_total_impressions')}</td>
                                    <td className="x-csv-group-cell">{getValue(article, 'x_total_likes')}</td>
                                    <td className="x-csv-group-cell">{getValue(article, 'x_total_engagements')}</td>
                                    <td><input type="url" value={urlValue} onChange={(e) => handleFieldChange(article.id, 'url', e.target.value)} style={{ width: '100%' }} /></td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <select value={classValue} onChange={(e) => handleFieldChange(article.id, 'classificationId', e.target.value)}><option value="">1次...</option>{classifications.map(tag => (<option key={tag.id} value={tag.id}>{tag.name}</option>))}</select>
                                            <select value={subClassValue} onChange={(e) => handleFieldChange(article.id, 'secondaryClassificationId', e.target.value)}><option value="">2次...</option>{secondaryClassifications.map(tag => (<option key={tag.id} value={tag.id}>{tag.name}</option>))}</select>
                                        </div>
                                    </td>
                                    <td className="action-cell">
                                        <button onClick={() => onSave(article.id)} disabled={!editState[article.id] && !snapshotEditState[article.id]}>保存</button>
                                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <label className="toggle-switch" style={{ margin: '0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={article.isActive !== false} // isActiveがfalseでなければチェック
                                                    onChange={() => handleToggleArticleActive(article.id, article.isActive)}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
