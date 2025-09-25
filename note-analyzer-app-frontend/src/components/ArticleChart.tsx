// src/components/ArticleChart.tsx

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Article, Classification } from './types';

interface ChartProps {
    articles: Article[];
    classifications: Classification[];
}

export const ArticleChart = React.memo(function ArticleChart({ articles, classifications }: ChartProps) {
    // データをグラフ用に整形する
    const chartData = classifications.map(tag => {
        const count = articles.filter(article => article.classificationId === tag.id).length;
        return {
            name: tag.name,
            記事数: count,
        };
    });

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="記事数" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});