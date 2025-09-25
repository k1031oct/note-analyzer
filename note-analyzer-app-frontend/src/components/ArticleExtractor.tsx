import React from 'react';

interface ArticleExtractorProps {
  notePastedText: string;
  setNotePastedText: (text: string) => void;
  handleExtractAndAddArticles: () => void;
}

export const ArticleExtractor = React.memo(function ArticleExtractor({
  notePastedText,
  setNotePastedText,
  handleExtractAndAddArticles,
}: ArticleExtractorProps) {
  return (
    <>
      <textarea
        placeholder="noteの「ダッシュボード > 記事」ページのテキスト全体をここに貼り付け"
        value={notePastedText}
        onChange={(e) => setNotePastedText(e.target.value)}
        style={{ width: '100%', minHeight: '150px' }}
      />
      <button onClick={handleExtractAndAddArticles} style={{ marginTop: '10px' }} className="button-secondary">
        記事を抽出・更新
      </button>
    </>
  );
});
