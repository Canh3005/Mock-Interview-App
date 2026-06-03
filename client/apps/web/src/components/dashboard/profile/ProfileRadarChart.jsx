import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const DIMENSIONS = [
  { key: 'mustHaveSkillCoverage', labelKey: 'profile.radar.dimensions.requiredSkills' },
  { key: 'roleResponsibilityFit', labelKey: 'profile.radar.dimensions.responsibilities' },
  { key: 'experienceLevelFit', labelKey: 'profile.radar.dimensions.experience' },
  { key: 'evidenceQuality', labelKey: 'profile.radar.dimensions.evidenceQuality' },
  { key: 'domainFit', labelKey: 'profile.radar.dimensions.domainFit' },
];

function avgDimension(history, key) {
  const values = history
    .map((item) => item.fitAssessmentSummary?.scoreBreakdown?.[key])
    .filter((v) => typeof v === 'number');
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function ProfileRadarChart() {
  const { t } = useTranslation();
  const { assessmentHistory, historyLoading } = useSelector((state) => state.profile);

  const hasData = assessmentHistory.some((item) => item.fitAssessmentSummary?.scoreBreakdown);

  const data = DIMENSIONS.map(({ key, labelKey }) => ({
    subject: t(labelKey),
    value: avgDimension(assessmentHistory, key),
    fullMark: 100,
  }));

  if (historyLoading && !hasData) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-slate-700/40 animate-pulse" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="w-full h-[350px] flex flex-col items-center justify-center gap-2 text-slate-500">
        <p className="text-sm text-center leading-relaxed">
          {t('profile.radar.emptyLine1')}<br />{t('profile.radar.emptyLine2')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[350px] relative">
      <div className="absolute inset-0 bg-gradient-to-br from-cta/5 to-transparent rounded-full mix-blend-screen filter blur-3xl opacity-50 pointer-events-none" />

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#334155" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#475569', fontSize: 10 }}
            tickCount={6}
            stroke="#334155"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              color: '#f8fafc',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            }}
            itemStyle={{ color: '#0ea5e9', fontWeight: 600 }}
            formatter={(value) => [`${value}%`, t('profile.radar.avgScore')]}
          />
          <Radar
            name={t('profile.radar.skillLevel')}
            dataKey="value"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="#0ea5e9"
            fillOpacity={0.4}
            activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
