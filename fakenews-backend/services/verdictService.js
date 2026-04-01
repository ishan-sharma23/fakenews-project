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

const toNumberOr = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const extractModelProbabilities = (analysisResult) => {
  const fakeProb = toNumberOr(analysisResult?.details?.probabilities?.fake, -1);
  const realProb = toNumberOr(analysisResult?.details?.probabilities?.real, -1);

  if (fakeProb >= 0 && realProb >= 0) {
    return {
      fakeProb: Math.max(0, Math.min(1, fakeProb)),
      realProb: Math.max(0, Math.min(1, realProb))
    };
  }

  // Fallback when per-class probabilities are unavailable.
  const modelPrediction = normalizeModelPrediction(analysisResult);
  const confidencePct = Math.max(0, Math.min(100, toNumberOr(analysisResult?.confidence, 0)));
  const topProb = confidencePct / 100;

  if (modelPrediction === 'FAKE') {
    return {
      fakeProb: topProb,
      realProb: 1 - topProb
    };
  }

  return {
    fakeProb: 1 - topProb,
    realProb: topProb
  };
};

const extractSignalDetails = (analysisResult) => {
  const details = analysisResult?.details || {};
  const featureBreakdown = details.featureBreakdown || {};

  // Predictor now returns sentimentScore as percentage [-100, 100].
  const sentimentScore = toNumberOr(
    details.sentimentScore,
    toNumberOr(featureBreakdown.sentiment, 0) * 100
  );

  // Keep backward compatibility with legacy objectivity-only payloads.
  const subjectivityScore = toNumberOr(
    details.subjectivityScore,
    details.objectivityScore !== undefined
      ? 100 - toNumberOr(details.objectivityScore, 50)
      : toNumberOr(featureBreakdown.subjectivity, 0.5) * 100
  );

  const linguisticFlags = Array.isArray(details.linguisticFlags)
    ? details.linguisticFlags
    : Array.isArray(details.flags)
      ? details.flags
      : [];

  return {
    sentimentScore,
    subjectivityScore,
    linguisticFlags
  };
};

const buildReasonWithSignals = (baseReason, signalDetails) => {
  const segments = [baseReason];

  if (Math.abs(signalDetails.sentimentScore) >= 45) {
    segments.push(
      `strong sentiment (${signalDetails.sentimentScore > 0 ? '+' : ''}${signalDetails.sentimentScore.toFixed(1)})`
    );
  }

  if (signalDetails.subjectivityScore >= 70) {
    segments.push(`high subjectivity (${signalDetails.subjectivityScore.toFixed(0)}%)`);
  }

  if (signalDetails.linguisticFlags.length > 0) {
    segments.push(`flags: ${signalDetails.linguisticFlags.slice(0, 2).join(', ')}`);
  }

  return segments.join(' | ');
};

const deriveBinaryVerdict = (analysisResult, sourceCredibility, textLength) => {
  const signalDetails = extractSignalDetails(analysisResult);
  const modelPrediction = normalizeModelPrediction(analysisResult);
  const { fakeProb, realProb } = extractModelProbabilities(analysisResult);
  const confidence = toNumberOr(analysisResult?.confidence, 0);

  // Use sentiment and linguistic signals as additional confidence calibration.
  const sentimentMagnitude = Math.min(30, Math.abs(signalDetails.sentimentScore) / 3);
  const linguisticBias = Math.min(15, signalDetails.linguisticFlags.length * 5);
  const subjectivityBias = signalDetails.subjectivityScore >= 70 ? 8 : 0;
  const adjustedConfidence = confidence + sentimentMagnitude + linguisticBias + subjectivityBias;

  if (textLength < 80) {
    const verdict = sourceCredibility < 50 ? 'FAKE' : 'REAL';
    return {
      verdict,
      modelPrediction,
      confidence: verdict === 'FAKE' ? Math.round(fakeProb * 10000) / 100 : Math.round(realProb * 10000) / 100,
      reason: buildReasonWithSignals('Limited content; fallback based on source credibility', signalDetails)
    };
  }

  if (modelPrediction === 'FAKE') {
    // Respect strong FAKE model signals before applying conservative source calibration.
    if (fakeProb >= 0.6 || adjustedConfidence >= 88 || (adjustedConfidence >= 75 && sourceCredibility < 60) || sourceCredibility < 35) {
      return {
        verdict: 'FAKE',
        modelPrediction,
        confidence: Math.round(fakeProb * 10000) / 100,
        reason: buildReasonWithSignals('Strong fake-content signals', signalDetails)
      };
    }

    return {
      verdict: 'REAL',
      modelPrediction,
      confidence: Math.round(realProb * 10000) / 100,
      reason: buildReasonWithSignals('Insufficient fake evidence after source/context calibration', signalDetails)
    };
  }

  if (realProb >= 0.6 || adjustedConfidence >= 55 || sourceCredibility >= 60) {
    return {
      verdict: 'REAL',
      modelPrediction,
      confidence: Math.round(realProb * 10000) / 100,
      reason: buildReasonWithSignals('Content signal indicates real news', signalDetails)
    };
  }

  return {
    verdict: 'FAKE',
    modelPrediction,
    confidence: Math.round(fakeProb * 10000) / 100,
    reason: buildReasonWithSignals('Low-confidence real-content signal with weak source trust', signalDetails)
  };
};

module.exports = {
  getSourceCredibilityByName,
  getSourceCredibilityFromUrl,
  deriveBinaryVerdict
};