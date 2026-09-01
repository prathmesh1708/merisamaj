import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// --- Generic Helpers ---
const generatePath = (data, width, height, isArea = false) => {
  if (!data || !Array.isArray(data) || data.length === 0) return 'M 0,0';
  const validData = data.map(v => (typeof v === 'number' && Number.isFinite(v) ? v : 0));
  const max = Math.max(...validData, 1);
  const min = 0;
  const range = max - min || 1;
  const len = validData.length;
  
  const points = validData.map((val, i) => {
    const x = len > 1 ? (i / (len - 1)) * width : width / 2;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });

  const pathStr = `M ${points[0]} ` + points.slice(1).map((p, i) => {
    // Simple smooth curve approximation
    const prev = points[i].split(',');
    const curr = p.split(',');
    const cpx = (parseFloat(prev[0]) + parseFloat(curr[0])) / 2;
    return `C ${cpx},${prev[1]} ${cpx},${curr[1]} ${curr[0]},${curr[1]}`;
  }).join(' ');

  if (isArea) {
    return `${pathStr} L ${width},${height} L 0,${height} Z`;
  }
  return pathStr;
};

// --- Reusable SVG Chart Components ---

export const LineChart = ({ data, color = '#8B5CF6', height = 150, width = 300, showPoints = true, showGuides = true }) => {
  const pathStr = useMemo(() => generatePath(data, width, height), [data, width, height]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-hidden" preserveAspectRatio="none">
        {showGuides && (
          <>
            <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
            <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
            <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
            <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.1)" />
          </>
        )}
        
        <motion.path 
          d={pathStr} 
          fill="none" 
          stroke={color} 
          strokeWidth="3" 
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        
        {showPoints && data.map((val, i) => {
          const x = (i / (data.length - 1)) * width;
          const max = Math.max(...data, 1);
          const y = height - ((val) / max) * height;
          return (
            <motion.circle 
              key={i} cx={x} cy={y} r="4" fill={color} stroke="#1e1e2d" strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 + 0.5, type: 'spring' }}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const AreaChart = ({ data, color = '#8B5CF6', height = 150, width = 300, labels = [] }) => {
  const linePath = useMemo(() => generatePath(data, width, height), [data, width, height]);
  const areaPath = useMemo(() => generatePath(data, width, height, true), [data, width, height]);
  const gradientId = `grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full h-full relative" style={{ minHeight: height }}>
      <svg viewBox={`0 -10 ${width} ${height + 20}`} className="w-full h-full overflow-hidden" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.0"/>
          </linearGradient>
        </defs>

        {/* Guides */}
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
        <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.1)" />

        <motion.path 
          d={areaPath} 
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        />
        <motion.path 
          d={linePath} 
          fill="none" 
          stroke={color} 
          strokeWidth="3" 
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        
        {/* X Axis Labels */}
        {labels.length > 0 && labels.map((label, i) => {
          const x = (i / (labels.length - 1)) * width;
          return (
             <text key={i} x={x} y={height + 15} fill="rgba(0,0,0,0.5)" fontSize="10" fontWeight="bold" textAnchor="middle">
               {label}
             </text>
          )
        })}
      </svg>
    </div>
  );
};

export const BarChart = ({ data, labels = [], height = 150, width = 300, colors = ['#8B5CF6'] }) => {
  const max = Math.max(...data.map(d => Array.isArray(d) ? Math.max(...d) : d), 1);
  const barCount = data.length;
  const barGroupWidth = width / barCount;
  const padding = barGroupWidth * 0.3;
  
  return (
    <div className="w-full h-full relative" style={{ minHeight: height }}>
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-full overflow-hidden" preserveAspectRatio="none">
        <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.1)" />
        <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
        
        {data.map((item, i) => {
          const isGroup = Array.isArray(item);
          const vals = isGroup ? item : [item];
          const groupX = i * barGroupWidth + padding / 2;
          const individualBarWidth = (barGroupWidth - padding) / vals.length;

          return vals.map((v, j) => {
            const h = (v / max) * height;
            const y = height - h;
            const x = groupX + (j * individualBarWidth) + (j > 0 ? 2 : 0); // tiny gap between grouped bars
            const w = individualBarWidth - (vals.length > 1 ? 2 : 0);
            const color = colors[j % colors.length];

            return (
              <motion.rect 
                key={`${i}-${j}`}
                x={x} y={0} width={Math.max(w, 2)} rx={w > 4 ? 3 : 1}
                fill={color}
                initial={{ height: 0, y: height }}
                animate={{ height: h, y: y }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
              />
            );
          });
        })}

        {labels.map((label, i) => {
          const x = (i * barGroupWidth) + (barGroupWidth / 2);
          return (
             <text key={i} x={x} y={height + 15} fill="rgba(0,0,0,0.5)" fontSize="9" fontWeight="bold" textAnchor="middle">
               {label}
             </text>
          )
        })}
      </svg>
    </div>
  );
};

export const DonutChart = ({ data, size = 120, colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899'] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;

  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        
        {data.map((item, i) => {
          const dash = (item.value / total) * circumference;
          const gap = circumference - dash;
          const offset = circumference - currentOffset;
          currentOffset += dash;
          
          return (
            <motion.circle 
              key={i}
              cx="18" cy="18" r={radius} 
              fill="transparent" 
              stroke={colors[i % colors.length]} 
              strokeWidth="4"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              initial={{ opacity: 0, strokeDasharray: `0 ${circumference}` }}
              animate={{ opacity: 1, strokeDasharray: `${dash} ${gap}` }}
              transition={{ duration: 1, delay: i * 0.2 }}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const ProgressRing = ({ progress = 0, size = 100, color = '#10B981', trackColor = 'rgba(255,255,255,0.1)' }) => {
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const dash = (clampedProgress / 100) * circumference;
  
  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="transparent" stroke={trackColor} strokeWidth="4" />
        <motion.circle 
          cx="18" cy="18" r={radius} 
          fill="transparent" 
          stroke={color} 
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black text-gray-900">{clampedProgress.toFixed(0)}%</span>
      </div>
    </div>
  );
};

export const Sparkline = ({ data, color = '#34D399', width = 100, height = 30 }) => {
  const pathStr = useMemo(() => generatePath(data, width, height), [data, width, height]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-hidden" preserveAspectRatio="none">
      <motion.path 
        d={pathStr} 
        fill="none" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
    </svg>
  );
};
