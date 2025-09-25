import React, { useState, useMemo, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { evaluate } from 'mathjs';
import { useData } from '../contexts/DataContext';
import { useWindowWidth } from '../hooks/useWindowWidth';

// New unified color palette
const GRAPH_COLORS = ['#6a99e5', '#66bb6a', '#ffb74d', '#ba68c8', '#4dd0e1', '#f06292']; // 淡い色
const HIGHLIGHT_COLOR = '#FFEB3B'; // 淡い黄色
const SPIKE_COLOR = '#EF5350'; // 淡い赤

const ChartFilter = ({ keys, visibleKeys, onFilterChange }: { keys: { dataKey: string, name: string }[], visibleKeys: string[], onFilterChange: (key: string) => void }) => (
    <div className="chart-filters">
        {keys.map((key) => (
            <label key={key.dataKey}>
                <input
                    type="checkbox"
                    checked={visibleKeys.includes(key.dataKey)}
                    onChange={() => onFilterChange(key.dataKey)}
                />
                {key.name}
            </label>
        ))}
    </div>
);

const CollapsibleSection = ({ title, children, isVisible, onToggle, filterComponent, level = 0 }: { title: string, children: React.ReactNode, isVisible: boolean, onToggle: () => void, filterComponent?: React.ReactNode, level?: number }) => (
    <div className={`chart-section level-${level}`}>
        <div className="chart-header">
            <h4 onClick={onToggle} style={{ cursor: 'pointer', flexGrow: 1, fontSize: level > 0 ? '1em' : '1.17em' }}>
                {title} {isVisible ? '▼' : '▶'}
            </h4>
            {isVisible && filterComponent}
        </div>
        {isVisible && children}
    </div>
);

const RateDonutChart = ({ rate, title }: { rate: number, title: string }) => {
    const data = [
        { name: 'Rate', value: rate },
        { name: 'Remainder', value: 100 - rate },
    ];
    return (
        <div style={{ width: '45%', textAlign: 'center' }}>
            <h5 style={{ marginBottom: '10px' }}>{title}</h5>
            <ResponsiveContainer width="100%" height={150} debounce={1}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                    >
                        <Cell fill={GRAPH_COLORS[0]} />
                        <Cell fill="#eee" />
                    </Pie>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="24px" fontWeight="bold" fill="var(--text-color)">
                        {`${rate.toFixed(1)}%`}
                    </text>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

interface DashboardPageProps {
  setCurrentPage: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = React.memo(({ setCurrentPage }) => {
    const {
        allArticles,
        dashboardArticles,
        classifications,
        secondaryClassifications,
        kpis,
        startDate,
        endDate,
        lineChartData,
        categoryTotalData,
        secondaryCategoryArticleCountData,
        secondaryCategoryLikeRateData,
        pipelineData,
        pipelineRates,
        selectedClassificationIds,
        selectedSecondaryIds,
        handlePrimaryFilterChange,
        handleSecondaryFilterChange
    } = useData();

    const windowWidth = useWindowWidth();
    const isMobile = windowWidth < 768;

    const pipelineMargin = isMobile ? { top: 20, right: 80, bottom: 20, left: 20 } : { top: 20, right: 150, bottom: 20, left: 60 };
    const pipelineYAxisWidth = isMobile ? 60 : 80;

    const [isKpiVisible, setIsKpiVisible] = useState(true);
    const [isPipelineChartVisible, setIsPipelineChartVisible] = useState(true);
    const [isArticleDeltaVisible, setIsArticleDeltaVisible] = useState(true);
    const [isGraphSectionVisible, setIsGraphSectionVisible] = useState(false);
    
    const [isLineChartVisible, setIsLineChartVisible] = useState(true);
    const [isBarChartVisible, setIsBarChartVisible] = useState(true);
    const [isPieChartVisible, setIsPieChartVisible] = useState(true);
    const [isLikeRateChartVisible, setIsLikeRateChartVisible] = useState(true);

    const lineChartAllKeys = [
        { dataKey: 'noteビュー', name: 'noteビュー' },
        { dataKey: 'noteスキ', name: 'noteスキ' },
        { dataKey: 'Xインプレッション', name: 'Xインプレッション' },
        { dataKey: 'Xいいね', name: 'Xいいね' },
    ];
    const barChartAllKeys = [
        { dataKey: 'noteViews', name: 'noteビュー' },
        { dataKey: 'noteLikes', name: 'noteスキ' },
        { dataKey: 'xImpressions', name: 'Xインプレッション' },
        { dataKey: 'xLikes', name: 'Xいいね' },
    ];

    const [lineChartVisibleKeys, setLineChartVisibleKeys] = useState(lineChartAllKeys.map(k => k.dataKey));
    const [barChartVisibleKeys, setBarChartVisibleKeys] = useState(barChartAllKeys.map(k => k.dataKey));
    const [pieChartVisibleKeys, setPieChartVisibleKeys] = useState<string[]>([]);
    const [likeRateVisibleKeys, setLikeRateVisibleKeys] = useState<string[]>([]);

    useEffect(() => {
        setPieChartVisibleKeys(secondaryClassifications.map(sc => sc.name));
        setLikeRateVisibleKeys(secondaryClassifications.map(sc => sc.name));
    }, [secondaryClassifications]);

    const toggleKey = (setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) => {
        setter((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const filteredPieData = useMemo(() => secondaryCategoryArticleCountData.filter(d => pieChartVisibleKeys.includes(d.name)), [secondaryCategoryArticleCountData, pieChartVisibleKeys]);
    const filteredLikeRateData = useMemo(() => secondaryCategoryLikeRateData.filter(d => likeRateVisibleKeys.includes(d.name)), [secondaryCategoryLikeRateData, likeRateVisibleKeys]);

    const tooltipStyle = { backgroundColor: 'var(--card-background)', border: '1px solid var(--border-color)', color: 'var(--text-color)' };
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold">{`${(percent * 100).toFixed(0)}%`}</text>;
    };
    const PercentageFormatter = (value: number) => `${value.toFixed(1)}%`;

    const logTickFormatter = (tick: number) => {
        const log = Math.log10(tick);
        if (log % 1 === 0) {
            if (tick >= 1000000) return `${tick / 1000000}M`;
            if (tick >= 1000) return `${tick / 1000}k`;
            return tick.toString();
        }
        return "";
    };

    if (allArticles.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <h2>ようこそ、N+ analyzerへ！</h2>
                <p style={{ margin: '20px 0' }}>まずはあなたのnoteのデータを読み込み、分析を始めましょう。</p>
                <button onClick={() => setCurrentPage('dataImport')}>
                    データを読み込む
                </button>
            </div>
        );
    }

    const kpiTable = (
        <div className="table-container">
            <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '12px' }}>
                    <thead><tr><th>KPI名</th><th>数式</th><th>目標値</th><th>評価結果</th></tr></thead>
                    <tbody>
                        {kpis.map(kpi => {
                            const allArticlesScope = dashboardArticles.reduce((scope, article) => {
                                scope.note_data.views += article.note_views_change ?? 0;
                                scope.note_data.likes += article.note_likes_change ?? 0;
                                scope.note_data.comments += article.note_comments_change ?? 0;
                                return scope;
                            }, { note_data: { views: 0, likes: 0, comments: 0 }, x_preliminary_data: { impressions: 0, likes: 0, replies: 0, retweets: 0, quotes: 0 }, x_confirmed_data: { impressions: 0, likes: 0, engagements: 0 } });
                            let overallResult: string | number | boolean = 'N/A';
                            try {
                                const evalResult = evaluate(kpi.expression, allArticlesScope);
                                if (typeof evalResult === 'number' || typeof evalResult === 'boolean') overallResult = evalResult;
                            } catch (e) { overallResult = "計算エラー"; }
                            const isAchieved = typeof overallResult === 'number' && typeof kpi.targetValue === 'number' && overallResult >= kpi.targetValue;
                            const resultColor = isAchieved ? 'var(--plus-color)' : 'var(--minus-color)';
                            let displayResult = overallResult;
                            if (typeof overallResult === 'boolean') displayResult = overallResult ? '達成' : '未達成';
                            else if (typeof overallResult === 'number') displayResult = overallResult.toLocaleString();
                            return (
                                <tr key={kpi.id}>
                                    <td>{kpi.kpiName}</td>
                                    <td>{kpi.expression}</td>
                                    <td>{kpi.targetValue?.toLocaleString() ?? 'N/A'}</td>
                                    <td style={{ color: resultColor }}>{displayResult}{typeof overallResult === 'number' && typeof kpi.targetValue === 'number' && ` (${isAchieved ? '達成' : '未達成'})`}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const articleDeltaTable = (
        <div className="table-container">
            <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '12px', tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                        <col style={{ width: '60%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead><tr><th>記事タイトル</th><th>ビュー変化</th><th>スキ/いいね変化</th></tr></thead>
                    <tbody>
                        {dashboardArticles.map(article => {
                            const viewsDelta = article.note_views_change ?? 0;
                            const likesDelta = article.note_likes_change ?? 0;
                            return (
                                <tr key={article.id} className={article.isTopPerformer ? 'top-performer-row' : ''}>
                                    <td className="truncate-text">{article.title}</td>
                                    <td style={{ color: viewsDelta >= 0 ? 'var(--plus-color)' : 'var(--minus-color)' }}>{viewsDelta >= 0 ? `+${viewsDelta}` : viewsDelta}</td>
                                    <td style={{ color: likesDelta >= 0 ? 'var(--plus-color)' : 'var(--minus-color)' }}>{likesDelta >= 0 ? `+${likesDelta}` : likesDelta}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="card" style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>ダッシュボード ({startDate} 〜 {endDate})</h2>
            
            <CollapsibleSection title="KPI評価" isVisible={isKpiVisible} onToggle={() => setIsKpiVisible(!isKpiVisible)}>
                {kpiTable}
            </CollapsibleSection>

            <CollapsibleSection title="パイプライン分析" isVisible={isPipelineChartVisible} onToggle={() => setIsPipelineChartVisible(!isPipelineChartVisible)}>
                <div className="chart-wrapper" style={{ height: 'auto' }}>
                    <ResponsiveContainer width="100%" height={250} debounce={1}>
                        <BarChart
                            layout="vertical"
                            data={pipelineData}
                            margin={pipelineMargin}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" scale="log" domain={[1, 'dataMax']} tickFormatter={logTickFormatter} allowDataOverflow />
                            <YAxis type="category" dataKey="name" width={pipelineYAxisWidth} tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <Tooltip wrapperStyle={tooltipStyle} formatter={(value: number) => value.toLocaleString()} />
                            <Bar dataKey="value" isAnimationActive>
                                <LabelList dataKey="value" position="right" formatter={(value: number) => value.toLocaleString()} />
                                {pipelineData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={GRAPH_COLORS[index % GRAPH_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    {pipelineRates && (
                        <>
                            <p style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', margin: '20px 0' }}>
                                閲覧導線（note：X比較）：{pipelineRates.attractionRate > 50 ? "noteでの閲覧優位" : "Xでのインプレッション優位"}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px' }}>
                                <RateDonutChart rate={pipelineRates.inducementRate} title="誘因率" />
                                <RateDonutChart rate={pipelineRates.salesRate} title="販売率" />
                            </div>
                        </>
                    )}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="記事ごとの期間内変化" isVisible={isArticleDeltaVisible} onToggle={() => setIsArticleDeltaVisible(!isArticleDeltaVisible)}>
                {articleDeltaTable}
            </CollapsibleSection>

            <CollapsibleSection title="グラフ" isVisible={isGraphSectionVisible} onToggle={() => setIsGraphSectionVisible(!isGraphSectionVisible)}>
                <div>
                    <div className="chart-section" style={{padding: '10px 0', border: 'none'}}>
                        <h4 style={{cursor: 'default'}}>分類フィルター</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', padding: '10px 0' }}>
                            <div style={{ width: '45%', minWidth: '280px' }}>
                                <h5>1次分類</h5>
                                <div>{classifications.map(tag => (<label key={tag.id} style={{ marginRight: '15px', display: 'inline-block', marginBottom: '5px', fontSize: '12px' }}><input type="checkbox" checked={selectedClassificationIds.includes(tag.id)} onChange={() => handlePrimaryFilterChange(tag.id)} />{tag.name}</label>))}</div>
                            </div>
                            <div style={{ width: '45%', minWidth: '280px' }}>
                                <h5>2次分類</h5>
                                <div>{secondaryClassifications.map(tag => (<label key={tag.id} style={{ marginRight: '15px', fontWeight: 'normal', display: 'inline-block', marginBottom: '5px', fontSize: '12px' }}><input type="checkbox" checked={selectedSecondaryIds.includes(tag.id)} onChange={() => handleSecondaryFilterChange(tag.id)} />{tag.name}</label>))}</div>
                            </div>
                        </div>
                    </div>

                    <CollapsibleSection 
                        title="合計パフォーマンスの推移" 
                        isVisible={isLineChartVisible} 
                        onToggle={() => setIsLineChartVisible(!isLineChartVisible)}
                        filterComponent={<ChartFilter keys={lineChartAllKeys} visibleKeys={lineChartVisibleKeys} onFilterChange={(key) => toggleKey(setLineChartVisibleKeys, key)} />}
                        level={1}
                    >
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%" debounce={1}>
                                <LineChart data={lineChartData}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" stroke="var(--text-color)" tick={{ fontSize: 12 }} /><YAxis yAxisId="left" stroke={GRAPH_COLORS[0]} tick={{ fontSize: 12 }} /><YAxis yAxisId="right" orientation="right" stroke={GRAPH_COLORS[1]} tick={{ fontSize: 12 }} /><Tooltip wrapperStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: '12px' }} />
                                    {lineChartVisibleKeys.includes('noteビュー') && <Line yAxisId="left" type="monotone" dataKey="noteビュー" stroke={GRAPH_COLORS[0]} dot={(props: any) => { const { cx, cy, payload, index } = props; return payload['noteビューIsSpike'] ? <circle key={`spike-${index}`} cx={cx} cy={cy} r={5} fill={SPIKE_COLOR} /> : <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="transparent" stroke="transparent" />; }} />}
                                    {lineChartVisibleKeys.includes('noteスキ') && <Line yAxisId="right" type="monotone" dataKey="noteスキ" stroke={GRAPH_COLORS[1]} dot={(props: any) => { const { cx, cy, payload, index } = props; return payload['noteスキIsSpike'] ? <circle key={`spike-${index}`} cx={cx} cy={cy} r={5} fill={SPIKE_COLOR} /> : <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="transparent" stroke="transparent" />; }} />}
                                    {lineChartVisibleKeys.includes('Xインプレッション') && <Line yAxisId="left" type="monotone" dataKey="Xインプレッション" stroke={GRAPH_COLORS[2]} dot={(props: any) => { const { cx, cy, payload, index } = props; return payload['XインプレッションIsSpike'] ? <circle key={`spike-${index}`} cx={cx} cy={cy} r={5} fill={SPIKE_COLOR} /> : <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="transparent" stroke="transparent" />; }} />}
                                    {lineChartVisibleKeys.includes('Xいいね') && <Line yAxisId="right" type="monotone" dataKey="Xいいね" stroke={GRAPH_COLORS[3]} dot={(props: any) => { const { cx, cy, payload, index } = props; return payload['XいいねIsSpike'] ? <circle key={`spike-${index}`} cx={cx} cy={cy} r={5} fill={SPIKE_COLOR} /> : <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="transparent" stroke="transparent" />; }} />}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection 
                        title="分類ごとの総量" 
                        isVisible={isBarChartVisible} 
                        onToggle={() => setIsBarChartVisible(!isBarChartVisible)}
                        filterComponent={<ChartFilter keys={barChartAllKeys} visibleKeys={barChartVisibleKeys} onFilterChange={(key) => toggleKey(setBarChartVisibleKeys, key)} />}
                        level={1}
                    >
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%" debounce={1}>
                                <BarChart data={categoryTotalData}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" stroke="var(--text-color)" tick={{ fontSize: 12 }} /><YAxis stroke="var(--text-color)" tick={{ fontSize: 12 }} /><Tooltip wrapperStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: '12px' }} />
                                    {barChartVisibleKeys.includes('noteViews') && <Bar dataKey="noteViews" name="noteビュー" fill={GRAPH_COLORS[0]}>
                                        {categoryTotalData.map((entry: any, index: number) => (
                                            <Cell 
                                                key={`cell-noteViews-${index}`} 
                                                fill={GRAPH_COLORS[0]} 
                                                stroke={entry['noteViewsIsAboveAverage'] ? HIGHLIGHT_COLOR : 'none'}
                                                strokeWidth={entry['noteViewsIsAboveAverage'] ? 2 : 0}
                                            />
                                        ))}
                                    </Bar>}
                                    {barChartVisibleKeys.includes('noteLikes') && <Bar dataKey="noteLikes" name="noteスキ" fill={GRAPH_COLORS[1]}>
                                        {categoryTotalData.map((entry: any, index: number) => (
                                            <Cell 
                                                key={`cell-noteLikes-${index}`} 
                                                fill={GRAPH_COLORS[1]} 
                                                stroke={entry['noteLikesIsAboveAverage'] ? HIGHLIGHT_COLOR : 'none'}
                                                strokeWidth={entry['noteLikesIsAboveAverage'] ? 2 : 0}
                                            />
                                        ))}
                                    </Bar>}
                                    {barChartVisibleKeys.includes('xImpressions') && <Bar dataKey="xImpressions" name="Xインプレッション" fill={GRAPH_COLORS[2]}>
                                        {categoryTotalData.map((entry: any, index: number) => (
                                            <Cell 
                                                key={`cell-xImpressions-${index}`} 
                                                fill={GRAPH_COLORS[2]} 
                                                stroke={entry['xImpressionsIsAboveAverage'] ? HIGHLIGHT_COLOR : 'none'}
                                                strokeWidth={entry['xImpressionsIsAboveAverage'] ? 2 : 0}
                                            />
                                        ))}
                                    </Bar>}
                                    {barChartVisibleKeys.includes('xLikes') && <Bar dataKey="xLikes" name="Xいいね" fill={GRAPH_COLORS[3]}>
                                        {categoryTotalData.map((entry: any, index: number) => (
                                            <Cell 
                                                key={`cell-xLikes-${index}`} 
                                                fill={GRAPH_COLORS[3]} 
                                                stroke={entry['xLikesIsAboveAverage'] ? HIGHLIGHT_COLOR : 'none'}
                                                strokeWidth={entry['xLikesIsAboveAverage'] ? 2 : 0}
                                            />
                                        ))}
                                    </Bar>}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection 
                        title="二次分類の記事数構成比" 
                        isVisible={isPieChartVisible} 
                        onToggle={() => setIsPieChartVisible(!isPieChartVisible)}
                        filterComponent={<ChartFilter keys={secondaryClassifications.map(sc => ({ dataKey: sc.name, name: sc.name }))} visibleKeys={pieChartVisibleKeys} onFilterChange={(key) => toggleKey(setPieChartVisibleKeys, key)} />}
                        level={1}
                    >
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%" debounce={1}>
                                <PieChart>
                                    <Pie data={filteredPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} fill="#8884d8" labelLine={false} label={renderCustomizedLabel}>
                                        {filteredPieData.map((_, index) => (<Cell key={`cell-${index}`} fill={GRAPH_COLORS[index % GRAPH_COLORS.length]} />))}
                                    </Pie>
                                    <Tooltip wrapperStyle={tooltipStyle} /><Legend verticalAlign="bottom" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection 
                        title="二次分類のスキ率" 
                        isVisible={isLikeRateChartVisible} 
                        onToggle={() => setIsLikeRateChartVisible(!isLikeRateChartVisible)}
                        filterComponent={<ChartFilter keys={secondaryClassifications.map(sc => ({ dataKey: sc.name, name: sc.name }))} visibleKeys={likeRateVisibleKeys} onFilterChange={(key) => toggleKey(setLikeRateVisibleKeys, key)} />}
                        level={1}
                    >
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%" debounce={1}>
                                <BarChart data={filteredLikeRateData}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" stroke="var(--text-color)" tick={{ fontSize: 12 }} /><YAxis stroke="var(--text-color)" tick={{ fontSize: 12 }} tickFormatter={PercentageFormatter} /><Tooltip wrapperStyle={tooltipStyle} formatter={PercentageFormatter} /><Legend wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="スキ率" fill={GRAPH_COLORS[0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CollapsibleSection>
                </div>
            </CollapsibleSection>
        </div>
    );
});
