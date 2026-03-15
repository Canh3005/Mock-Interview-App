import { useSelector } from 'react-redux';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export default function ProfileRadarChart() {
  const { radarScores } = useSelector((state) => state.profile);

  // Map backend keys to human readable labels
  const data = [
    { subject: 'System Design', value: radarScores.systemDesignScore || Math.floor(Math.random() * 40) + 40, fullMark: 100 },
    { subject: 'Data Structures', value: radarScores.dsaScore || Math.floor(Math.random() * 40) + 40, fullMark: 100 },
    { subject: 'English', value: radarScores.englishScore || Math.floor(Math.random() * 40) + 40, fullMark: 100 },
    { subject: 'Soft Skills', value: radarScores.softSkillScore || Math.floor(Math.random() * 40) + 40, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[350px] relative">
       {/* Background glow effect for premium feel */}
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
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
            }}
            itemStyle={{ color: '#0ea5e9', fontWeight: 600 }}
          />
          <Radar
            name="Skill Level"
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
