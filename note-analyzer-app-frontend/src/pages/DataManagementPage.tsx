import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import type { Article } from '../components/types';

type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
} | null;

interface DataManagementPageProps {}

const getValue = (article: Article, key: string) => {
    const latestSnapshot = article.daily_snapshots.length > 0 ? article.daily_snapshots[article.daily_snapshots.length - 1] : null;
    switch (key) {
        case 'note_views': return latestSnapshot?.note_data?.views ?? 0;
        case 'note_comments': return latestSnapshot?.note_data?.comments ?? 0;
        case 'note_likes': return latestSnapshot?.note_data?.likes ?? 0;
        case 'note_sales': return latestSnapshot?.note_data?.sales ?? 0;
        case 'x_total_impressions': return article.totalXImpressions ?? 0;
        case 'x_total_likes': return article.totalXLikes ?? 0;
        case 'x_total_replies': return article.totalXReplies ?? 0;
        case 'x_total_retweets': return article.totalXRetweets ?? 0;
        case 'x_total_quotes': return article.totalXQuotes ?? 0;
        case 'x_total_engagements': return article.totalXEngagements ?? 0;
        default: return article[key as keyof Article] ?? 0;
    }
};

export const DataManagementPage: React.FC<DataManagementPageProps> = () => {
    const {
        allArticles: articles,
        classifications,
        secondaryClassifications,
        handleUpdateArticle,
        handleUpdateLatestSnapshot
    } = useData();

    const [isTableEditing, setIsTableEditing] = useState(false);
    const [editState, setEditState] = useState<{ [id: string]: Partial<Article> }>({});
    const [snapshotEditState, setSnapshotEditState] = useState<{ [id: string]: { sales?: string } }>({});
    const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'publicationDate', direction: 'descending' });

    const sortedArticles = useMemo(() => {
        let sortableItems = [...articles];
        if (sortConfig) {
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

    const onEdit = () => {
        const initialEditState = articles.reduce((acc, article) => {
            acc[article.id] = { publicationDate: article.publicationDate, url: article.url, classificationId: article.classificationId, secondaryClassificationId: article.secondaryClassificationId };
            return acc;
        }, {} as { [id: string]: Partial<Article> });
        const initialSnapshotState = articles.reduce((acc, article) => {
            const latestSnapshot = article.daily_snapshots.length > 0 ? article.daily_snapshots[article.daily_snapshots.length - 1] : null;
            acc[article.id] = { sales: latestSnapshot?.note_data?.sales?.toString() ?? '0' };
            return acc;
        }, {} as { [id: string]: { sales?: string } });
        setEditState(initialEditState);
        setSnapshotEditState(initialSnapshotState);
        setIsTableEditing(true);
    };

    const onCancel = () => {
        setEditState({});
        setSnapshotEditState({});
        setIsTableEditing(false);
    };

    const onSave = async () => {
        await Promise.all([
            ...Object.keys(editState).map(id => handleUpdateArticle(id, editState[id])),
            ...Object.keys(snapshotEditState).map(id => {
                const sales = snapshotEditState[id].sales !== undefined ? parseInt(snapshotEditState[id].sales!, 10) : undefined;
                if (sales !== undefined && !isNaN(sales)) {
                    return handleUpdateLatestSnapshot(id, { sales });
                }
                return Promise.resolve();
            })
        ]);
        onCancel();
    };

    const handleFieldChange = (id: string, field: keyof Article, value: any) => {
        setEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const handleSnapshotFieldChange = (id: string, field: 'sales', value: string) => {
        setSnapshotEditState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const handleSelectArticle = (id: string) => {
        setSelectedArticleIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedArticleIds(sortedArticles.map(a => a.id));
        } else {
            setSelectedArticleIds([]);
        }
    };

    const handleBulkToggleActive = async (isActive: boolean) => {
        if (selectedArticleIds.length === 0) return alert('記事を選択してください。');
        const confirmMessage = `選択した ${selectedArticleIds.length} 件の記事を「${isActive ? '有効' : '無効'}」にしますか？`;
        if (window.confirm(confirmMessage)) {
            await Promise.all(selectedArticleIds.map(id => handleUpdateArticle(id, { isActive })));
            setSelectedArticleIds([]);
        }
    };

    const renderHeaderWithSort = (label: string, key: string) => (
        <th onClick={() => requestSort(key)} className="sortable-header">
            {label} {sortConfig?.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : ''}
        </th>
    );

    return (
        <div className="data-management-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>登録済み記事一覧</h2>
                <div style={{display: 'flex', gap: '10px'}}>
                    {isTableEditing ? (
                        <>
                            <button onClick={onSave} className="button-primary">保存</button>
                            <button onClick={onCancel} className="button-secondary">キャンセル</button>
                        </>
                    ) : (
                        <button onClick={onEdit}>編集</button>
                    )}

                </div>
            </div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span>選択した記事を:</span>
                <button onClick={() => handleBulkToggleActive(true)} className="button-secondary">有効にする</button>
                <button onClick={() => handleBulkToggleActive(false)} className="button-secondary">無効にする</button>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th><input type="checkbox" onChange={handleSelectAll} checked={selectedArticleIds.length === articles.length && articles.length > 0} /></th>
                            {renderHeaderWithSort('記事タイトル', 'title')}
                            {renderHeaderWithSort('投稿日', 'publicationDate')}
                            {renderHeaderWithSort('販売数', 'note_sales')}
                            <th>URL</th>
                            <th>分類</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedArticles.map(article => (
                            <tr key={article.id} className={article.isActive === false ? 'inactive-article' : ''}>
                                <td><input type="checkbox" checked={selectedArticleIds.includes(article.id)} onChange={() => handleSelectArticle(article.id)} /></td>
                                <td><div title={article.title} className="truncate-text">{article.title}</div></td>
                                <td>
                                    {isTableEditing ? (
                                        <input type="datetime-local" value={editState[article.id]?.publicationDate ?? ''} onChange={(e) => handleFieldChange(article.id, 'publicationDate', e.target.value)} />
                                    ) : (
                                        article.publicationDate ? new Date(article.publicationDate).toLocaleString() : '未設定'
                                    )}
                                </td>
                                <td>
                                    {isTableEditing ? (
                                        <input type="number" value={snapshotEditState[article.id]?.sales ?? '0'} onChange={(e) => handleSnapshotFieldChange(article.id, 'sales', e.target.value)} />
                                    ) : (
                                        getValue(article, 'note_sales').toLocaleString()
                                    )}
                                </td>
                                <td>
                                    {isTableEditing ? (
                                        <input type="url" value={editState[article.id]?.url ?? ''} onChange={(e) => handleFieldChange(article.id, 'url', e.target.value)} />
                                    ) : (
                                        <div title={article.url} className="truncate-text">{article.url}</div>
                                    )}
                                </td>
                                <td>
                                    {isTableEditing ? (
                                        <>
                                            <select value={editState[article.id]?.classificationId ?? ''} onChange={(e) => handleFieldChange(article.id, 'classificationId', e.target.value)}><option value="">1次...</option>{classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                            <select value={editState[article.id]?.secondaryClassificationId ?? ''} onChange={(e) => handleFieldChange(article.id, 'secondaryClassificationId', e.target.value)}><option value="">2次...</option>{secondaryClassifications.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}</select>
                                        </>
                                    ) : (
                                        <>
                                            <div>{classifications.find(c => c.id === article.classificationId)?.name}</div>
                                            <div>{secondaryClassifications.find(sc => sc.id === article.secondaryClassificationId)?.name}</div>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};