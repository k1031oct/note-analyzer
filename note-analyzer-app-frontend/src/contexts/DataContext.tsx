import { createContext, useContext, useState, useCallback, type ReactNode, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, functions } from '../firebase';
import { useAuth } from './AuthContext';
import { useFirestoreQuery } from '../hooks/useFirestore';
import { useInsightfulData } from '../hooks/useInsightfulData';
import type { Article, Classification, SecondaryClassification, DailySnapshot, Kpi } from '../components/types';


const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface DataContextType {
    allArticles: Article[];
    dashboardArticles: Article[];
    lineChartData: any[];
    categoryTotalData: any[];
    secondaryCategoryArticleCountData: any[];
    secondaryCategoryLikeRateData: any[];
    pipelineData: any[];
    pipelineRates: { [key: string]: number };
    classifications: Classification[];
    secondaryClassifications: SecondaryClassification[];
    kpis: Kpi[];
    startDate: string;
    endDate: string;
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
    selectedClassificationIds: string[];
    selectedSecondaryIds: string[];
    handlePrimaryFilterChange: (id: string) => void;
    handleSecondaryFilterChange: (id: string) => void;
    handleExtractAndAddArticles: (text: string) => Promise<boolean>;
    handleUpdateArticle: (id: string, updatedData: Partial<Article>) => Promise<void>;
    handleUpdateLatestSnapshot: (articleId: string, updatedData: { sales?: number }) => Promise<void>;
    handleAddClassification: (name: string) => Promise<void>;
    handleAddSecondaryClassification: (name: string) => Promise<void>;
    handleDeleteClassification: (id: string) => Promise<void>;
    handleDeleteSecondaryClassification: (id: string) => Promise<void>;
    handleAddKpi: (kpi: Omit<Kpi, 'id' | 'authorId' | 'createdAt'>) => Promise<void>;
    handleDeleteKpi: (kpiId: string) => Promise<void>;
    handleFileUpload: (file: File) => Promise<void>;


}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [allArticles, setAllArticles] = useState<Article[]>([]);



    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(1); // 月の1日に設定
        return formatDate(date);
    });
    const [endDate, setEndDate] = useState(() => formatDate(new Date()));

    const [selectedClassificationIds, setSelectedClassificationIds] = useState<string[]>([]);
    const [selectedSecondaryIds, setSelectedSecondaryIds] = useState<string[]>([]);

    const classificationsQuery = useMemo(() => user ? query(collection(db, "classifications"), where("authorId", "==", user.uid)) : null, [user]);
    const { data: classificationsData } = useFirestoreQuery<Classification>(classificationsQuery);
    const classifications = useMemo(() => classificationsData ?? [], [classificationsData]);

    const secondaryClassificationsQuery = useMemo(() => user ? query(collection(db, "secondary_classifications"), where("authorId", "==", user.uid)) : null, [user]);
    const { data: secondaryClassificationsData } = useFirestoreQuery<SecondaryClassification>(secondaryClassificationsQuery);
    const secondaryClassifications = useMemo(() => secondaryClassificationsData ?? [], [secondaryClassificationsData]);

    useEffect(() => {
        setSelectedClassificationIds(classifications.map(c => c.id));
    }, [classifications]);

    useEffect(() => {
        setSelectedSecondaryIds(secondaryClassifications.map(sc => sc.id));
    }, [secondaryClassifications]);

    const kpisQuery = useMemo(() => user ? query(collection(db, "kpis"), where("authorId", "==", user.uid)) : null, [user]);
    const { data: kpisData } = useFirestoreQuery<Kpi>(kpisQuery);
    const kpis = useMemo(() => kpisData ?? [], [kpisData]);

    const {
        lineChartData,
        dashboardArticles,
        categoryTotalData,
        secondaryCategoryArticleCountData,
        secondaryCategoryLikeRateData,
        pipelineData,
        pipelineRates,
    } = useInsightfulData(
        allArticles,
        startDate,
        endDate,
        classifications,
        secondaryClassifications,
        selectedClassificationIds,
        selectedSecondaryIds
    );

    const handlePrimaryFilterChange = (id: string) => {
        setSelectedClassificationIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };
    const handleSecondaryFilterChange = (id: string) => {
        setSelectedSecondaryIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };



    const fetchAllData = useCallback(async () => {
        if (!user) return setAllArticles([]);
        const articlesQuery = query(collection(db, "articles"), where("authorId", "==", user.uid));
        const articlesSnapshot = await getDocs(articlesQuery);
        const articlesData = articlesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, daily_snapshots: [] } as unknown as Article));

        const articlesWithAllSnapshots = await Promise.all(articlesData.map(async (article) => {
            const snapshotsQuery = query(collection(db, "articles", article.id, "daily_snapshots"));
            const snapshotsSnapshot = await getDocs(snapshotsQuery);
            article.daily_snapshots = snapshotsSnapshot.docs.map(sDoc => ({ ...sDoc.data(), id: sDoc.id })).sort((a, b) => a.id.localeCompare(b.id)) as DailySnapshot[];

            let totalXImpressions = 0;
            let totalXLikes = 0;
            let totalXReplies = 0;
            let totalXRetweets = 0;
            let totalXQuotes = 0;
            let totalXEngagements = 0;

            for (const snapshot of article.daily_snapshots) {
                if (snapshot.x_confirmed_data) {
                    totalXImpressions += snapshot.x_confirmed_data.impressions ?? 0;
                    totalXLikes += snapshot.x_confirmed_data.likes ?? 0;
                    totalXEngagements += snapshot.x_confirmed_data.engagements ?? 0;
                } else if (snapshot.x_preliminary_data) {
                    totalXImpressions += snapshot.x_preliminary_data.impressions ?? 0;
                    totalXLikes += snapshot.x_preliminary_data.likes ?? 0;
                    totalXReplies += snapshot.x_preliminary_data.replies ?? 0;
                    totalXRetweets += snapshot.x_preliminary_data.retweets ?? 0;
                    totalXQuotes += snapshot.x_preliminary_data.quotes ?? 0;
                }
            }
            article.totalXImpressions = totalXImpressions;
            article.totalXLikes = totalXLikes;
            article.totalXReplies = totalXReplies;
            article.totalXRetweets = totalXRetweets;
            article.totalXQuotes = totalXQuotes;
            article.totalXEngagements = totalXEngagements;
            return article;
        }));
        setAllArticles(articlesWithAllSnapshots);
    }, [user]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handleExtractAndAddArticles = useCallback(async (notePastedText: string): Promise<boolean> => {
        if (!notePastedText || !user) {
            console.error("テキストが空か、ログインしていません。");
            return false;
        }

        try {
            const lines = notePastedText.trim().split('\n');
            const articlesData = [];
            const skippedTitles = [];

            let startIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('記事\tビュー')) {
                    startIndex = i + 1;
                    break;
                }
            }

            for (let i = startIndex; i < lines.length; i += 2) {
                const titleLine = lines[i]?.trim();
                const statsLine = lines[i + 1]?.trim();

                if (!titleLine || !statsLine) continue;

                const statsParts = statsLine.split('\t');
                if (statsParts.length === 3 && statsParts.every(p => !isNaN(parseInt(p.replace(/,/g, ''), 10)))) {
                    const title = titleLine;
                    const [views, comments, likes] = statsParts.map(p => parseInt(p.replace(/,/g, ''), 10));
                    articlesData.push({ url: '', title, views, comments, likes });
                } else {
                    skippedTitles.push(titleLine);
                }
            }

            if (articlesData.length === 0) {
                console.error("処理できる記事データが見つかりませんでした。");
                return false;
            }

            const today = formatDate(new Date());
            const articlesCollectionRef = collection(db, "articles");

            for (const articleData of articlesData) {
                let articleId;
                const q = query(articlesCollectionRef, where("title", "==", articleData.title), where("authorId", "==", user.uid));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    const newArticleRef = await addDoc(articlesCollectionRef, {
                        authorId: user.uid, url: '', title: articleData.title,
                        publicationDate: serverTimestamp(), classificationId: "",
                        secondaryClassificationId: "", createdAt: serverTimestamp(),
                    });
                    articleId = newArticleRef.id;
                } else {
                    articleId = querySnapshot.docs[0].id;
                    await updateDoc(doc(db, "articles", articleId), { title: articleData.title });
                }

                const snapshotRef = doc(db, "articles", articleId, "daily_snapshots", today);
                await setDoc(snapshotRef, { 
                    note_data: { views: articleData.views, likes: articleData.likes, comments: articleData.comments },
                    fetchedAt: serverTimestamp()
                }, { merge: true });
            }

            await fetchAllData();
            return true;

        } catch (error) {
            console.error("記事の抽出と追加でエラーが発生しました:", error);
            return false;
        }
    }, [user, fetchAllData]);

    const handleUpdateArticle = useCallback(async (id: string, updatedData: Partial<Article>) => {
        const articleRef = doc(db, "articles", id);
        try { await updateDoc(articleRef, updatedData); await fetchAllData(); } catch (error) { console.error("記事更新エラー:", error); }
    }, [fetchAllData]);

    const handleUpdateLatestSnapshot = useCallback(async (articleId: string, updatedData: { sales?: number }) => {
        if (!user) return;
        const today = formatDate(new Date());
        const snapshotRef = doc(db, "articles", articleId, "daily_snapshots", today);
        try {
            await setDoc(snapshotRef, { note_data: updatedData }, { merge: true });
            await fetchAllData();
        } catch (error) {
            console.error("スナップショットの更新エラー:", error);
            alert("データの更新中にエラーが発生しました。");
        }
    }, [user, fetchAllData]);

    const handleAddClassification = useCallback(async (name: string) => {
        if (!name || !user) return;
        try { await addDoc(collection(db, "classifications"), { authorId: user.uid, name, createdAt: serverTimestamp() }); } catch (error) { console.error("1次分類追加エラー:", error); }
    }, [user]);
    const handleAddSecondaryClassification = useCallback(async (name: string) => {
        if (!name || !user) return;
        try { await addDoc(collection(db, "secondary_classifications"), { authorId: user.uid, name, createdAt: serverTimestamp() }); } catch (error) { console.error("2次分類追加エラー:", error); }
    }, [user]);
    const handleDeleteClassification = useCallback(async (id: string) => {
        if (!window.confirm("この分類を削除しますか？")) return;
        try { await deleteDoc(doc(db, "classifications", id)); } catch (e) { console.error("Error deleting classification:", e); }
    }, []);
    const handleDeleteSecondaryClassification = useCallback(async (id: string) => {
        if (!window.confirm("この分類を削除しますか？")) return;
        try { await deleteDoc(doc(db, "secondary_classifications", id)); } catch (e) { console.error("Error deleting secondary classification:", e); }
    }, []);
    const handleAddKpi = useCallback(async (kpi: Omit<Kpi, 'id' | 'authorId' | 'createdAt'>) => {
        if (!user) return alert("ログインしていません。");
        try { await addDoc(collection(db, "kpis"), { authorId: user.uid, ...kpi, createdAt: serverTimestamp() }); } catch (e) { console.error(e); }
    }, [user]);
    const handleDeleteKpi = useCallback(async (kpiId: string) => {
        if (!user || !window.confirm("このKPIを削除してもよろしいですか？")) return;
        try { await deleteDoc(doc(db, "kpis", kpiId)); } catch (e) { console.error(e); }
    }, [user]);
    const handleFileUpload = useCallback(async (file: File) => {
        if (!file || !user) return alert("ファイルを選択してください。");
         const storage = getStorage();
        const filePath = `analytics_csv/${user.uid}/${file.name}`;
        const storageRef = ref(storage, filePath);
        try {
            await uploadBytes(storageRef, file);
            alert("アップロード完了。データの反映には少し時間がかかります。");
            await fetchAllData();
        } catch (error) {
            console.error("アップロードエラー:", error);
            alert(`アップロードエラー: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [user, fetchAllData]);


    const value = {
        allArticles, dashboardArticles, lineChartData, categoryTotalData,
        secondaryCategoryArticleCountData, secondaryCategoryLikeRateData,
        pipelineData,
        pipelineRates,
        classifications, secondaryClassifications, kpis,
        startDate, endDate, setStartDate, setEndDate,
        selectedClassificationIds, selectedSecondaryIds, 
        handlePrimaryFilterChange, handleSecondaryFilterChange,
        handleExtractAndAddArticles, handleUpdateArticle, handleUpdateLatestSnapshot,
        handleAddClassification, handleAddSecondaryClassification,
        handleDeleteClassification, handleDeleteSecondaryClassification, handleAddKpi, handleDeleteKpi, 
        handleFileUpload, fetchAllData,

    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
