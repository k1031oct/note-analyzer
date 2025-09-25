import React, { useState } from 'react';
import type { Kpi } from './types';

const formulaHints = [
  'noteビュー (note_data.views)',
  'noteコメント (note_data.comments)',
  'noteスキ (note_data.likes)',
  'Xインプレッション (x_confirmed_data.impressions)',
  'Xエンゲージメント (x_confirmed_data.engagements)',
  'Xいいね (x_confirmed_data.likes)',
  'Xインプレッション(速報) (x_preliminary_data.impressions)',
  'Xいいね(速報) (x_preliminary_data.likes)',
  // Operators and examples
  '+', '-', '*', '/', '>=', '<=', '==', '>', '<', '!=',
  '(', ')', '&&', '||',
  'note_data.views >= 1000',
  '(note_data.likes / note_data.views) * 100',
];

interface KpiManagementProps {
  kpis: Kpi[];
  onAddKpi: (kpi: Omit<Kpi, 'id' | 'authorId' | 'createdAt'>) => void;
  onDeleteKpi: (kpiId: string) => void;
}

export const KpiManagement: React.FC<KpiManagementProps> = ({ kpis, onAddKpi, onDeleteKpi }) => {
  const [kpiName, setKpiName] = useState('');
  const [expression, setExpression] = useState('');
  const [targetValue, setTargetValue] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName || !expression) {
      alert('KPI名と数式を入力してください。');
      return;
    }
    onAddKpi({ kpiName, expression, targetValue });
    setKpiName('');
    setExpression('');
    setTargetValue(0);
  };

  return (
    <>
      <h3>KPI設定</h3>
      <div style={{ paddingLeft: '20px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="KPI名 (例: 月間目標PV)"
            value={kpiName}
            onChange={(e) => setKpiName(e.target.value)}
          />
          <input
            type="text"
            placeholder="数式 (例: note_data.views >= 1000)"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            style={{ width: '300px' }}
            list="formula-hints"
          />
          <datalist id="formula-hints">
            {formulaHints.map(hint => <option key={hint} value={hint.match(/\(([^)]+)\)/)?.[1] || hint} >{hint}</option>)}
          </datalist>
          <input
            type="number"
            placeholder="目標値"
            value={targetValue}
            onChange={(e) => setTargetValue(Number(e.target.value))}
          />
          <button type="submit" className="button-secondary">KPIを追加</button>
        </form>
        <div>
          <p style={{ marginTop: '20px', fontWeight: 'bold', color: 'var(--text-color)' }}>設定済みKPI一覧</p>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px' }}>
            {kpis.map(kpi => (
              <li key={kpi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span>{kpi.kpiName} (数式: {kpi.expression}) : {kpi.targetValue.toLocaleString()}</span>
                <button onClick={() => onDeleteKpi(kpi.id)} className="delete-button">削除</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};