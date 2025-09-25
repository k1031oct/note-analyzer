import React from 'react';
import type { Classification, SecondaryClassification } from './types';

interface ClassificationManagementProps {
    classifications: Classification[];
    secondaryClassifications: SecondaryClassification[];
    tagName: string;
    setTagName: (name: string) => void;
    secondaryTagName: string;
    setSecondaryTagName: (name: string) => void;
    handleAddClassification: (e: React.FormEvent) => void;
    handleAddSecondaryClassification: (e: React.FormEvent) => void;
    handleDeleteClassification: (id: string) => void;
    handleDeleteSecondaryClassification: (id: string) => void;
}

export const ClassificationManagement: React.FC<ClassificationManagementProps> = React.memo(function ClassificationManagement({
    classifications,
    secondaryClassifications,
    tagName,
    setTagName,
    secondaryTagName,
    setSecondaryTagName,
    handleAddClassification,
    handleAddSecondaryClassification,
    handleDeleteClassification,
    handleDeleteSecondaryClassification,
}) {
    return (
        <>
            <h3>分類タグ管理</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                <div style={{ width: '45%', minWidth: '280px', marginBottom: '20px' }}>
                    <h4>1次分類</h4>
                    <form onSubmit={handleAddClassification} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="text" placeholder="新しい1次分類名" value={tagName} onChange={(e) => setTagName(e.target.value)} />
                        <button type="submit" className="button-secondary">1次分類を追加</button>
                    </form>
                    <h5>登録済み</h5>
                    <ul>
                        {classifications.map(tag => (
                            <li key={tag.id}>
                                {tag.name}
                                <button onClick={() => handleDeleteClassification(tag.id)} className="delete-button">削除</button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div style={{ width: '45%', minWidth: '280px', marginBottom: '20px' }}>
                    <h4>2次分類</h4>
                    <form onSubmit={handleAddSecondaryClassification} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="text" placeholder="新しい2次分類名" value={secondaryTagName} onChange={(e) => setSecondaryTagName(e.target.value)} />
                        <button type="submit" className="button-secondary">2次分類を追加</button>
                    </form>
                    <h5>登録済み</h5>
                    <ul>
                        {secondaryClassifications.map(tag => (
                            <li key={tag.id}>
                                {tag.name}
                                <button onClick={() => handleDeleteSecondaryClassification(tag.id)} className="delete-button">削除</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
});
