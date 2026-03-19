const SOURCE_CREDIBILITY = {
  'reuters': 92,
  'associated press': 92,
  'bbc news': 90,
  'the hindu': 86,
  'hindustan times': 82,
  'economic times': 82,
  'times of india': 78,
  'science daily': 80,
  'reuters health': 90,
  'clickbait central': 20,
  'health secrets revealed': 18,
  'truth uncovered': 15,
  'alien truth news': 10
};

const normalizeSourceName = (sourceName = '') => sourceName.trim().toLowerCase();

const getSourceCredibilityByName = (sourceName) => {
  const normalized = normalizeSourceName(sourceName);
  return SOURCE_CREDIBILITY[normalized] ?? 55;
};

const getSourceCredibilityFromUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host.includes('reuters')) return 92;
    if (host.includes('apnews')) return 92;
    if (host.includes('bbc')) return 90;
    if (host.includes('thehindu')) return 86;
    if (host.includes('hindustantimes')) return 82;
    if (host.includes('economictimes')) return 82;
    if (host.includes('timesofindia')) return 78;

    return 55;
  } catch {
    return 55;
  }
};

const normalizeModelPrediction = (analysisResult) => {
  const rawPrediction = analysisResult?.prediction;
  if (rawPrediction === 'FAKE' || rawPrediction === 'REAL') {
    return rawPrediction;
  }

  const fakeProb = Number(analysisResult?.details?.probabilities?.fake || 0);
  const realProb = Number(analysisResult?.details?.probabilities?.real || 0);
  if (fakeProb > realProb) return 'FAKE';

  return 'REAL';
};

const deriveBinaryVerdict = (analysisResult, sourceCredibility, textLength) => {
  const modelPrediction = normalizeModelPrediction(analysisResult);
  const confidence = Number(analysisResult?.confidence || 0);

  if (textLength < 80) {
    return {
      verdict: sourceCredibility < 50 ? 'FAKE' : 'REAL',
      modelPrediction,
      reason: 'Limited content; fallback based on source credibility'
    };
  }

  if (modelPrediction === 'FAKE') {
    // Mark as FAKE only for strong evidence, especially when source is not trusted.
    if (confidence >= 88 || (confidence >= 75 && sourceCredibility < 60) || sourceCredibility < 35) {
      return {
        verdict: 'FAKE',
        modelPrediction,
        reason: 'Strong fake-content signals'
      };
    }

    return {
      verdict: 'REAL',
      modelPrediction,
      reason: 'Insufficient fake evidence after source/context calibration'
    };
  }

  if (confidence >= 55 || sourceCredibility >= 60) {
    return {
      verdict: 'REAL',
      modelPrediction,
      reason: 'Content signal indicates real news'
    };
  }

  return {
    verdict: 'FAKE',
    modelPrediction,
    reason: 'Low-confidence real-content signal with weak source trust'
  };
};

module.exports = {
  getSourceCredibilityByName,
  getSourceCredibilityFromUrl,
  deriveBinaryVerdict
};