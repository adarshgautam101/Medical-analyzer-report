


export const generateTrendSVG = (parameterName, data) => {
  const width = 800;
  const height = 400;
  const padding = 60;

  if (!data || data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111827"/>
      <text x="${width/2}" y="${height/2}" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">No data available for trend</text>
    </svg>`;
  }

  
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  
  const values = sortedData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal === minVal ? 10 : (maxVal - minVal);
  const yMin = Math.max(0, minVal - valRange * 0.1);
  const yMax = maxVal + valRange * 0.1;

  
  const getX = (index) => padding + (index / (sortedData.length - 1 || 1)) * (width - 2 * padding);
  const getY = (val) => height - padding - ((val - yMin) / (yMax - yMin)) * (height - 2 * padding);

  
  let gridLines = '';
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const val = yMin + (i / yTicks) * (yMax - yMin);
    const y = getY(val);
    gridLines += `
      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#374151" stroke-dasharray="4" stroke-width="1"/>
      <text x="${padding - 15}" y="${y + 4}" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="12" text-anchor="end">${val.toFixed(1)}</text>
    `;
  }

  
  let linePath = '';
  let areaPath = `M ${getX(0)} ${height - padding}`;
  
  for (let i = 0; i < sortedData.length; i++) {
    const x = getX(i);
    const y = getY(sortedData[i].value);
    if (i === 0) {
      linePath += `M ${x} ${y}`;
    } else {
      linePath += ` L ${x} ${y}`;
    }
    areaPath += ` L ${x} ${y}`;
  }
  areaPath += ` L ${getX(sortedData.length - 1)} ${height - padding} Z`;

  
  let points = '';
  for (let i = 0; i < sortedData.length; i++) {
    const x = getX(i);
    const y = getY(sortedData[i].value);
    const dateObj = new Date(sortedData[i].date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isAbnormal = sortedData[i].is_abnormal || false;
    const pointColor = isAbnormal ? '#EF4444' : '#10B981';

    points += `
      <circle cx="${x}" cy="${y}" r="6" fill="${pointColor}" stroke="#111827" stroke-width="2"/>
      <text x="${x}" y="${y - 12}" fill="#F9FAFB" font-family="system-ui, sans-serif" font-weight="bold" font-size="11" text-anchor="middle">${sortedData[i].value}</text>
      <text x="${x}" y="${height - padding + 20}" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle" transform="rotate(30, ${x}, ${height - padding + 20})">${formattedDate}</text>
    `;
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <!-- Background -->
    <rect width="100%" height="100%" fill="#111827" rx="8"/>
    
    <!-- Title -->
    <text x="30" y="35" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">${parameterName} Trend Analysis</text>
    
    <!-- Gradients -->
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.0"/>
      </linearGradient>
    </defs>

    <!-- Grid -->
    ${gridLines}

    <!-- Area Fill -->
    <path d="${areaPath}" fill="url(#areaGrad)"/>

    <!-- Trend Line -->
    <path d="${linePath}" fill="none" stroke="#3B82F6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Points and text -->
    ${points}

    <!-- Axes -->
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#4B5563" stroke-width="2"/>
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#4B5563" stroke-width="2"/>
  </svg>`;
};


export const generateComparisonSVG = (data) => {
  const width = 800;
  const itemHeight = 70;
  const headerHeight = 70;
  const paddingBottom = 40;
  const height = headerHeight + data.length * itemHeight + paddingBottom;

  if (!data || data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111827"/>
      <text x="${width/2}" y="${height/2}" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">No parameters to compare</text>
    </svg>`;
  }

  const parseRange = (ref) => {
    let low = null;
    let high = null;
    const str = (ref || '').trim();
    for (const sep of ['–', '-']) {
      if (str.includes(sep)) {
        const parts = str.split(sep, 2);
        low = parseFloat(parts[0].trim());
        high = parseFloat(parts[1].trim().split(/\s+/)[0]);
        break;
      }
    }
    if (str.startsWith('<')) {
      high = parseFloat(str.replace('<', '').trim().split(/\s+/)[0]);
      low = 0;
    }
    if (str.startsWith('>')) {
      low = parseFloat(str.replace('>', '').trim().split(/\s+/)[0]);
      high = low * 2.0;
    }
    return { low, high };
  };

  let rowsSvg = '';
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const val = item.value;
    const { low, high } = parseRange(item.reference_range);
    
    const lowLimit = low !== null ? low : 0;
    const highLimit = high !== null ? high : (val * 1.5 || 100);
    const rangeSpan = highLimit - lowLimit || 1;
    const minVal = Math.max(0, lowLimit - rangeSpan * 0.4);
    const maxVal = highLimit + rangeSpan * 0.4;

    const scaleWidth = 350;
    const startX = 220;
    
    const getXCoord = (v) => {
      const clamped = Math.max(minVal, Math.min(maxVal, v));
      return startX + ((clamped - minVal) / (maxVal - minVal)) * scaleWidth;
    };

    const patientX = getXCoord(val);
    const normalX1 = getXCoord(lowLimit);
    const normalX2 = getXCoord(highLimit);

    const isNormal = val >= lowLimit && val <= highLimit;
    const statusColor = isNormal ? '#10B981' : '#EF4444';
    const statusText = isNormal ? 'Normal' : 'Abnormal';

    const y = headerHeight + i * itemHeight;

    rowsSvg += `
      <!-- Parameter row -->
      <g transform="translate(0, ${y})">
        <!-- Parameter Name & Value -->
        <text x="30" y="25" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">${item.parameter}</text>
        <text x="30" y="43" fill="${statusColor}" font-family="system-ui, sans-serif" font-size="12" font-weight="500">${val} ${item.unit} (${statusText})</text>

        <!-- Gauge background bar -->
        <rect x="${startX}" y="20" width="${scaleWidth}" height="10" fill="#374151" rx="5"/>
        
        <!-- Normal range bar (Green highlighted zone) -->
        <rect x="${normalX1}" y="20" width="${Math.max(4, normalX2 - normalX1)}" height="10" fill="#10B981" opacity="0.4" rx="2"/>

        <!-- Low limit label -->
        <text x="${normalX1}" y="42" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">${lowLimit}</text>
        <!-- High limit label -->
        <text x="${normalX2}" y="42" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">${highLimit}</text>

        <!-- Patient value indicator pin -->
        <circle cx="${patientX}" cy="25" r="7" fill="${statusColor}" stroke="#111827" stroke-width="2"/>
        <line x1="${patientX}" y1="12" x2="${patientX}" y2="25" stroke="${statusColor}" stroke-width="1.5"/>
        <text x="${patientX}" y="8" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="9" font-weight="bold" text-anchor="middle">${val}</text>

        <!-- Universal range label on right -->
        <text x="750" y="32" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="12" text-anchor="end">Ref: ${item.reference_range} ${item.unit}</text>
      </g>
      <!-- Separator line -->
      <line x1="30" y1="${y + itemHeight - 5}" x2="770" y2="${y + itemHeight - 5}" stroke="#1F2937" stroke-width="1"/>
    `;
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827" rx="8"/>
    <text x="30" y="35" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">Universal Standard Range Comparison</text>
    
    ${rowsSvg}
  </svg>`;
};


export const generateHealthSummarySVG = (data) => {
  const width = 600;
  const height = 400;

  const abnormalCount = data.filter(d => d.is_abnormal).length;
  const normalCount = data.length - abnormalCount;
  const total = data.length || 1;

  const normalPct = (normalCount / total) * 100;
  const abnormalPct = (abnormalCount / total) * 100;

  
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  
  const normalOffset = circumference;
  const abnormalOffset = circumference - (abnormalPct / 100) * circumference;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827" rx="8"/>
    <text x="30" y="35" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">Health Status Summary</text>
    
    <!-- Donut Circle Background -->
    <circle cx="200" cy="220" r="${radius}" fill="transparent" stroke="#374151" stroke-width="25"/>
    
    <!-- Normal values arc (Green) -->
    <circle cx="200" cy="220" r="${radius}" fill="transparent" 
            stroke="#10B981" stroke-width="25"
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="0"
            transform="rotate(-90 200 220)"/>
            
    <!-- Abnormal values arc (Red) overlay -->
    <circle cx="200" cy="220" r="${radius}" fill="transparent" 
            stroke="#EF4444" stroke-width="26"
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${abnormalOffset}"
            transform="rotate(${(normalPct / 100) * 360 - 90} 200 220)"/>

    <!-- Center Text -->
    <text x="200" y="215" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" text-anchor="middle">
      ${total > 0 ? Math.round(normalPct) : 0}%
    </text>
    <text x="200" y="235" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">
      Normal Indicators
    </text>

    <!-- Legend -->
    <g transform="translate(380, 160)">
      <!-- Normal -->
      <circle cx="0" cy="0" r="8" fill="#10B981"/>
      <text x="20" y="5" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">Normal (${normalCount})</text>
      <text x="20" y="22" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="12">${normalPct.toFixed(1)}% of total</text>

      <!-- Abnormal -->
      <circle cx="0" cy="60" r="8" fill="#EF4444"/>
      <text x="20" y="65" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">Flagged / Abnormal (${abnormalCount})</text>
      <text x="20" y="82" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="12">${abnormalPct.toFixed(1)}% of total</text>
    </g>
  </svg>`;
};


export const generateCorrelationSVG = (uniqueParams, matrix) => {
  const width = 600;
  const height = 600;
  const padding = 120; 

  if (!uniqueParams || uniqueParams.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111827"/>
      <text x="${width/2}" y="${height/2}" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">Insufficient data for correlation</text>
    </svg>`;
  }

  const n = uniqueParams.length;
  const cellSize = (width - padding - 40) / n;

  let heatCells = '';
  let labels = '';

  for (let i = 0; i < n; i++) {
    
    const paramName = uniqueParams[i];
    const shortenedName = paramName.length > 15 ? paramName.substring(0, 13) + '..' : paramName;

    
    labels += `<text x="${padding - 15}" y="${padding + i * cellSize + cellSize / 2 + 4}" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="11" font-weight="500" text-anchor="end">${shortenedName}</text>`;
    
    
    labels += `<text x="${padding + i * cellSize + cellSize / 2}" y="${padding - 15}" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="11" font-weight="500" text-anchor="middle" transform="rotate(-30, ${padding + i * cellSize + cellSize / 2}, ${padding - 15})">${shortenedName}</text>`;

    for (let j = 0; j < n; j++) {
      const corr = matrix[i][j];
      
      
      
      let color = '#374151'; 
      if (corr > 0) {
        
        const intensity = Math.round(corr * 255);
        color = `rgb(${intensity}, ${Math.round(intensity * 0.3)}, ${Math.round(intensity * 0.3)})`;
      } else if (corr < 0) {
        
        const intensity = Math.round(Math.abs(corr) * 255);
        color = `rgb(${Math.round(intensity * 0.2)}, ${Math.round(intensity * 0.4)}, ${intensity})`;
      } else {
        color = '#1f2937';
      }

      const cx = padding + j * cellSize;
      const cy = padding + i * cellSize;

      heatCells += `
        <rect x="${cx}" y="${cy}" width="${cellSize - 2}" height="${cellSize - 2}" fill="${color}" rx="2"/>
        <text x="${cx + cellSize / 2}" y="${cy + cellSize / 2 + 4}" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">${corr.toFixed(2)}</text>
      `;
    }
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827" rx="8"/>
    <text x="30" y="35" fill="#F9FAFB" font-family="system-ui, sans-serif" font-size="18" font-weight="bold">Parameter Correlation Heatmap</text>

    <!-- Labels -->
    ${labels}

    <!-- Heatmap Cells -->
    ${heatCells}
  </svg>`;
};
