export const normalizeToScore = (value, referenceRange, isAbnormal) => {
  try {
    const val = parseFloat(String(value).replace(/,/g, '').trim().split(/\s+/)[0]);
    if (isNaN(val)) throw new Error('Invalid value');

    const ref = (referenceRange || '').trim();

    
    for (const sep of ['–', '-']) {
      if (ref.includes(sep)) {
        const parts = ref.split(sep, 2);
        const lo = parseFloat(parts[0].trim());
        const hi = parseFloat(parts[1].trim().split(/\s+/)[0]);

        if (isNaN(lo) || isNaN(hi)) continue;

        if (hi === lo) {
          return val === lo ? 100.0 : 50.0;
        }

        const mid = (lo + hi) / 2.0;
        const half = (hi - lo) / 2.0;
        const dist = Math.abs(val - mid) / half;
        const score = Math.max(0.0, 100.0 - Math.pow(dist, 1.4) * 55);
        return Math.round(score * 10) / 10;
      }
    }

    
    if (ref.startsWith('<')) {
      const limit = parseFloat(ref.replace('<', '').trim().split(/\s+/)[0]);
      if (!isNaN(limit)) {
        if (val <= limit) {
          const ratio = limit ? val / limit : 0;
          return Math.round((100.0 - ratio * 20) * 10) / 10;
        } else {
          const excess = (val - limit) / (limit || 1);
          return Math.round(Math.max(0.0, 70.0 - excess * 80) * 10) / 10;
        }
      }
    }

    
    if (ref.startsWith('>')) {
      const limit = parseFloat(ref.replace('>', '').trim().split(/\s+/)[0]);
      if (!isNaN(limit)) {
        if (val >= limit) {
          const ratio = Math.min((val - limit) / (limit || 1), 1.0);
          return Math.round((80.0 + ratio * 20) * 10) / 10;
        } else {
          const deficit = (limit - val) / (limit || 1);
          return Math.round(Math.max(0.0, 70.0 - deficit * 80) * 10) / 10;
        }
      }
    }
  } catch (error) {
    
  }

  return isAbnormal ? 42.0 : 82.0;
};

export const scoreToStatus = (score) => {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 75) return 'normal';
  if (score >= 50) return 'borderline';
  return 'abnormal';
};

export const inferReportName = (parameterNames) => {
  const joined = parameterNames.join(' ').toLowerCase();
  if (['hba1c', 'hba', 'glycat', 'a1c'].some(k => joined.includes(k))) {
    return 'HbA1c';
  }
  if (['haemoglobin', 'hemoglobin', 'wbc', 'rbc', 'platelet', 'hematocrit', 'mcv', 'mch'].some(k => joined.includes(k))) {
    return 'CBC';
  }
  if (['ldl', 'hdl', 'cholesterol', 'triglyceride', 'vldl', 'lipid'].some(k => joined.includes(k))) {
    return 'Lipid panel';
  }
  if (['creatinine', 'urea', 'bun', 'gfr', 'kidney'].some(k => joined.includes(k))) {
    return 'Renal function';
  }
  if (['alt', 'ast', 'bilirubin', 'albumin', 'liver', 'sgpt', 'sgot'].some(k => joined.includes(k))) {
    return 'Liver function';
  }
  if (['tsh', 't3', 't4', 'thyroid'].some(k => joined.includes(k))) {
    return 'Thyroid';
  }
  if (['glucose', 'insulin', 'fasting'].some(k => joined.includes(k))) {
    return 'Blood glucose';
  }
  return 'Medical report';
};


export const calculatePearson = (x, y) => {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    num += diffX * diffY;
    denX += diffX * diffX;
    denY += diffY * diffY;
  }

  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
};


export const computeSlope = (values) => {
  if (values.length < 2) return 0.0;
  const n = values.length;
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
};
