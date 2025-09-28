import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { ArticleExtractor } from '../components/ArticleExtractor';
import './DataImportPage.css';

interface DataImportPageProps {
  setCurrentPage: (page: string) => void;
}

export const DataImportPage: React.FC<DataImportPageProps> = ({ setCurrentPage }) => {
  const {
    handleExtractAndAddArticles,
    handleFileUpload,
  } = useData();

  const [notePastedText, setNotePastedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  const onExtract = async () => {
    const success = await handleExtractAndAddArticles(notePastedText);
    if (success) {
      setNotePastedText("");
      setExtractionSuccess(true);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const onFileUpload = () => {
    if (file) {
      handleFileUpload(file).then(() => {
        setFile(null);
        if (document.getElementById('csv-upload-input')) {
          (document.getElementById('csv-upload-input') as HTMLInputElement).value = "";
        }
      });
    }
  };

  return (
    <div>
      <h1>データ取り込み</h1>
      <div className="card">
        <section className="import-section">
          <h2>noteから記事を一括登録</h2>
          <div className="import-content" style={{ paddingLeft: '20px' }}>
            <ArticleExtractor
              notePastedText={notePastedText}
              setNotePastedText={setNotePastedText}
              handleExtractAndAddArticles={onExtract}
            />
            {extractionSuccess && (
              <div className="success-message">
                <p>✅ 記事の抽出・登録が完了しました。</p>
                <button onClick={() => setCurrentPage('dataManagement')} className="button-secondary">
                  データ管理ページへ
                </button>
              </div>
            )}
          </div>
        </section>



        <hr className="section-divider" />

        <section className="import-section">
          <h2>XアナリティクスCSVをアップロード</h2>
          <div className="import-content" style={{ paddingLeft: '20px' }}>
            <p>XアナリティクスからダウンロードしたCSVをアップロードすることで、過去のデータを一括で反映できます。</p>
            <div style={{ marginTop: '10px' }}>
                <input type="file" id="csv-upload-input" accept=".csv" onChange={onFileChange} />
            </div>
            <div style={{ marginTop: '10px' }}>
                <button onClick={onFileUpload} disabled={!file} className="button-secondary">
                  CSVをアップロード
                </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};