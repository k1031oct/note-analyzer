import { useMemo } from 'react';
import type { Article, Classification, SecondaryClassification } from '../components/types';

const getDatesInRange = (startDate: string, endDate: string) => {
    const dates = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    while (currentDate <= lastDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

export const useInsightfulData = (
    allArticles: Article[],
    startDate: string,
    endDate: string,
    classifications: Classification[],
    secondaryClassifications: SecondaryClassification[],
    selectedClassificationIds: string[],
    selectedSecondaryIds: string[]
) => {
    const insightfulData = useMemo(() => {
        const filteredArticlesByClassification = allArticles.filter(article => {
            const primaryMatch = selectedClassificationIds.length === 0 || selectedClassificationIds.includes(article.classificationId);
            const secondaryMatch = selectedSecondaryIds.length === 0 || (article.secondaryClassificationId && selectedSecondaryIds.includes(article.secondaryClassificationId));
            return primaryMatch && secondaryMatch;
        });

        const dates = getDatesInRange(startDate, endDate);
        const dailyTotals: { [date: string]: any } = {};
        const articlesToProcessForLineChart = filteredArticlesByClassification.filter(a => (a.publicationDate ? a.publicationDate.split('T')[0] : '') <= endDate);

        dates.forEach(date => {
            let totalNoteViews = 0, totalNoteLikes = 0, totalXImpressions = 0, totalXLikes = 0;
            articlesToProcessForLineChart.forEach(article => {
                if ((article.publicationDate ? article.publicationDate.split('T')[0] : '') > date) return;
                const latestSnapshot = article.daily_snapshots.filter(s => s.id <= date).pop();
                totalNoteViews += latestSnapshot?.note_data?.views ?? 0;
                totalNoteLikes += latestSnapshot?.note_data?.likes ?? 0;
                totalXImpressions += latestSnapshot?.x_confirmed_data?.impressions ?? latestSnapshot?.x_preliminary_data?.impressions ?? 0;
                totalXLikes += latestSnapshot?.x_confirmed_data?.likes ?? latestSnapshot?.x_preliminary_data?.likes ?? 0;
            });
            dailyTotals[date] = { date, 'noteビュー': totalNoteViews, 'noteスキ': totalNoteLikes, 'Xインプレッション': totalXImpressions, 'Xいいね': totalXLikes };
        });

        const calculateSpikes = (data: any[], key: string) => {
            const values = data.map(d => d[key]).filter(v => typeof v === 'number');
            if (values.length < 2) return;

            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
            const stdDev = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((sum, sq) => sum + sq, 0) / values.length);
            const threshold = mean + stdDev * 2;

            data.forEach(d => {
                if (d[key] > threshold) {
                    d[`${key}IsSpike`] = true;
                }
            });
        };

        const lineChartData = Object.values(dailyTotals);
        calculateSpikes(lineChartData, 'noteビュー');
        calculateSpikes(lineChartData, 'noteスキ');
        calculateSpikes(lineChartData, 'Xインプレッション');
        calculateSpikes(lineChartData, 'Xいいね');

        const dashboardArticles = filteredArticlesByClassification.map(article => {
            const endSnapshots = article.daily_snapshots.filter(s => s.id <= endDate);
            const endSnapshot = endSnapshots.length > 0 ? endSnapshots[endSnapshots.length - 1] : null;

            const startSnapshots = article.daily_snapshots.filter(s => s.id < startDate);
            const startSnapshot = startSnapshots.length > 0 ? startSnapshots[startSnapshots.length - 1] : null;

            const endViews = endSnapshot?.note_data?.views ?? 0;
            const endLikes = endSnapshot?.note_data?.likes ?? 0;
            const endComments = endSnapshot?.note_data?.comments ?? 0;
            const endXImpressions = endSnapshot?.x_confirmed_data?.impressions ?? endSnapshot?.x_preliminary_data?.impressions ?? 0;
            const endXLikes = endSnapshot?.x_confirmed_data?.likes ?? endSnapshot?.x_preliminary_data?.likes ?? 0;

            const startViews = startSnapshot?.note_data?.views ?? 0;
            const startLikes = startSnapshot?.note_data?.likes ?? 0;
            const startComments = startSnapshot?.note_data?.comments ?? 0;
            const startXImpressions = startSnapshot?.x_confirmed_data?.impressions ?? startSnapshot?.x_preliminary_data?.impressions ?? 0;
            const startXLikes = startSnapshot?.x_confirmed_data?.likes ?? startSnapshot?.x_preliminary_data?.likes ?? 0;

            const viewsDelta = endViews - startViews;
            const likesDelta = endLikes - startLikes;
            const commentsDelta = endComments - startComments;
            const xImpressionsDelta = endXImpressions - startXImpressions;
            const xLikesDelta = endXLikes - startXLikes;

            const snapshotsInPeriod = article.daily_snapshots.filter(snapshot => snapshot.id >= startDate && snapshot.id <= endDate);

            return {
                ...article,
                daily_snapshots: snapshotsInPeriod,
                note_views_change: viewsDelta,
                note_likes_change: likesDelta,
                note_comments_change: commentsDelta,
                x_impressions_change: xImpressionsDelta,
                x_likes_change: xLikesDelta,
            };
        }).filter(article => {
            const publishedBeforeEndOfPeriod = (article.publicationDate ? article.publicationDate.split('T')[0] : '') <= endDate;
            const hasSnapshotsInPeriod = article.daily_snapshots.some(s => s.id >= startDate && s.id <= endDate);
            return publishedBeforeEndOfPeriod && (hasSnapshotsInPeriod || article.note_views_change !== 0 || article.note_likes_change !== 0);
        });

        let topPerformerArticleId: string | null = null;
        let maxViewsChange = -Infinity;

        dashboardArticles.forEach(article => {
            if (article.note_views_change !== undefined && article.note_views_change > maxViewsChange) {
                maxViewsChange = article.note_views_change;
                topPerformerArticleId = article.id;
            }
        });

        const articlesWithTopPerformer = dashboardArticles.map(article => ({
            ...article,
            isTopPerformer: article.id === topPerformerArticleId && maxViewsChange > 0,
        }));

        const categoryTotals = classifications.map(c => {
            const articlesInCategory = filteredArticlesByClassification.filter(a => a.classificationId === c.id);
            
            const totals = articlesInCategory.reduce((acc, article) => {
                const snapshotsToConsider = article.daily_snapshots
                    .filter(s => s.id <= endDate)
                    .reverse();

                const latestNoteViews = snapshotsToConsider.find(s => s.note_data?.views != null)?.note_data?.views ?? 0;
                const latestNoteLikes = snapshotsToConsider.find(s => s.note_data?.likes != null)?.note_data?.likes ?? 0;

                const latestXImpressionsSnapshot = snapshotsToConsider.find(s => (s.x_confirmed_data?.impressions ?? s.x_preliminary_data?.impressions) != null);
                const latestXImpressions = latestXImpressionsSnapshot?.x_confirmed_data?.impressions ?? latestXImpressionsSnapshot?.x_preliminary_data?.impressions ?? 0;

                const latestXLikesSnapshot = snapshotsToConsider.find(s => (s.x_confirmed_data?.likes ?? s.x_preliminary_data?.likes) != null);
                const latestXLikes = latestXLikesSnapshot?.x_confirmed_data?.likes ?? latestXLikesSnapshot?.x_preliminary_data?.likes ?? 0;

                acc.noteViews += latestNoteViews;
                acc.noteLikes += latestNoteLikes;
                acc.xImpressions += latestXImpressions;
                acc.xLikes += latestXLikes;

                return acc;
            }, { noteViews: 0, noteLikes: 0, xImpressions: 0, xLikes: 0 });

            return { name: c.name, ...totals };
        });

        const calculateAboveAverage = (data: any[], key: string) => {
            const values = data.map(d => d[key]).filter(v => typeof v === 'number');
            if (values.length === 0) return;

            const average = values.reduce((sum, v) => sum + v, 0) / values.length;
            const threshold = average * 1.5;

            data.forEach(d => {
                if (d[key] > threshold) {
                    d[`${key}IsAboveAverage`] = true;
                }
            });
        };

        calculateAboveAverage(categoryTotals, 'noteViews');
        calculateAboveAverage(categoryTotals, 'noteLikes');
        calculateAboveAverage(categoryTotals, 'xImpressions');
        calculateAboveAverage(categoryTotals, 'xLikes');
        
        const secondaryCategoryArticleCountData = secondaryClassifications.map(sc => {
            const count = filteredArticlesByClassification.filter(a => a.secondaryClassificationId === sc.id).length;
            return { name: sc.name, value: count };
        }).filter(item => item.value > 0);

        const secondaryCategoryLikeRateData = secondaryClassifications.map(sc => {
            const articlesInCategory = filteredArticlesByClassification.filter(a => a.secondaryClassificationId === sc.id);
            const totals = articlesInCategory.reduce((acc, article) => {
                const snapshotsToConsider = article.daily_snapshots.filter(s => s.id <= endDate && s.note_data);
                const latestSnapshot = snapshotsToConsider.length > 0 ? snapshotsToConsider[snapshotsToConsider.length - 1] : null;
                if(latestSnapshot && latestSnapshot.note_data){
                    acc.views += latestSnapshot.note_data.views;
                    acc.likes += latestSnapshot.note_data.likes;
                }
                return acc;
            }, { views: 0, likes: 0 });
            const likeRate = totals.views > 0 ? (totals.likes / totals.views) * 100 : 0;
            return { name: sc.name, "スキ率": likeRate };
        }).filter(item => item["スキ率"] > 0);

        // Pipeline Data Calculation
        const totalImpressions = articlesWithTopPerformer.reduce((sum, article) => sum + (article.totalXImpressions || 0), 0);
        const totalViews = articlesWithTopPerformer.reduce((sum, article) => sum + (article.note_views_change || 0), 0);
        const totalAnnouncements = totalImpressions + totalViews;
        const totalLikes = articlesWithTopPerformer.reduce((sum, article) => sum + (article.note_likes_change || 0), 0);

        const proposalClassification = classifications.find(c => c.name === '提案（有料記事）');
        const proposalArticles = proposalClassification
            ? articlesWithTopPerformer.filter(a => a.classificationId === proposalClassification.id)
            : [];

        const proposalViews = proposalArticles.reduce((sum, article) => sum + (article.note_views_change || 0), 0);

        const totalSales = proposalArticles.reduce((acc, article) => {
            const snapshotsInPeriod = article.daily_snapshots.filter(s => s.id >= startDate && s.id <= endDate);
            snapshotsInPeriod.forEach(snapshot => {
                acc += snapshot.note_data?.sales ?? 0;
            });
            return acc;
        }, 0);

        const pipelineData = [
            { name: '告知', value: totalAnnouncements },
            { name: '集客', value: totalViews },
            { name: '誘因', value: totalLikes },
            { name: '提案', value: proposalViews },
            { name: '販売', value: totalSales },
        ].filter(item => item.value > 0);

        const attractionRate = totalAnnouncements > 0 ? (totalViews / totalAnnouncements) * 100 : 0;
        const inducementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
        const salesRate = proposalViews > 0 ? (totalSales / proposalViews) * 100 : 0;

        const pipelineRates = {
            attractionRate,
            inducementRate,
            salesRate,
        };

        return {
            lineChartData,
            dashboardArticles: articlesWithTopPerformer,
            categoryTotalData: categoryTotals,
            secondaryCategoryArticleCountData,
            secondaryCategoryLikeRateData,
            pipelineData,
            pipelineRates,
        };
    }, [allArticles, startDate, endDate, classifications, secondaryClassifications, selectedClassificationIds, selectedSecondaryIds]);

    return insightfulData;
};
