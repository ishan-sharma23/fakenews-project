const cron = require('node-cron');
const { getSourceCredibilityByName, deriveBinaryVerdict } = require('./verdictService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const MAX_CACHE_SIZE = 100;
const ML_TIMEOUT_MS = 15000;
const ML_RETRY_DELAY_MS = 2000;
const ML_RETRIES = 1;
const BATCH_SIZE = 5;
const ROTATING_QUERIES = [
  'India politics OR policy OR parliament',
  'Bollywood OR entertainment India OR film industry',
  'technology OR AI OR cybersecurity OR startups',
  'health OR medical research OR public health',
  'economy OR markets OR inflation OR GDP'
];
let queryCursor = 0;

// In-memory cache of trending news with analysis
let trendingCache = [];
let lastFetchTime = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getNextQuery = () => {
  const query = ROTATING_QUERIES[queryCursor % ROTATING_QUERIES.length];
  queryCursor += 1;
  return query;
};

const buildAnalysisText = (article) => {
  const title = article.title || '';
  const description = article.description || '';
  const content = (article.content || '').replace(/\[\+\d+\s+chars\]$/i, '').trim();

  // Include as much context as possible so trending analysis matches manual analysis better.
  return `${title} ${description} ${content}`.replace(/\s+/g, ' ').trim();
};


/**
 * Fetch news articles from NewsAPI
 */
const fetchNews = async (query = getNextQuery(), page = 1) => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.log('[NewsFetcher] No NEWS_API_KEY set, using demo data');
    return getDemoArticles();
  }

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', query);
    url.searchParams.set('language', 'en');
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', '20');
    url.searchParams.set('page', String(page));
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('[NewsFetcher] Fetch error:', error.message);
    return getDemoArticles();
  }
};

/**
 * Analyze a single article through the ML service
 */
const analyzeArticle = async (text) => {
  for (let attempt = 0; attempt <= ML_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

    try {
      const response = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`ML service error: ${response.status}`);
      clearTimeout(timeout);
      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      const isLastAttempt = attempt >= ML_RETRIES;
      if (isLastAttempt) {
        console.error('[NewsFetcher] ML analysis error:', error.message);
        return null;
      }
      await sleep(ML_RETRY_DELAY_MS);
    }
  }
  return null;
};

/**
 * Fetch news and analyze each article
 */
const fetchAndAnalyze = async (query) => {
  console.log('[NewsFetcher] Fetching and analyzing news...');

  const articles = await fetchNews(query);
  const results = [];
  const seenKeys = new Set();

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const prepared = batch
      .map((article) => ({
        article,
        text: buildAnalysisText(article),
        sourceName: article.source?.name || 'Unknown'
      }))
      .filter((item) => item.text.length >= 20);

    const analyses = await Promise.all(prepared.map((item) => analyzeArticle(item.text)));

    prepared.forEach((item, idx) => {
      const article = item.article;
      const text = item.text;
      const analysis = analyses[idx];
      const sourceName = item.sourceName;
      const sourceCredibility = getSourceCredibilityByName(sourceName);
      const verdictInfo = deriveBinaryVerdict(analysis, sourceCredibility, text.length);

      const articleUrl = article.url || '';
      const dedupKey = articleUrl && articleUrl !== '#'
        ? articleUrl
        : `${article.title || 'untitled'}|${article.publishedAt || ''}`;
      if (seenKeys.has(dedupKey)) return;
      seenKeys.add(dedupKey);

      const sentimentScore = Number(analysis?.details?.sentimentScore ?? 0);
      const linguisticFlags = analysis?.details?.linguisticFlags || analysis?.details?.flags || [];
      const featureBreakdown = analysis?.details?.featureBreakdown || {};

      results.push({
        title: article.title || 'Untitled',
        description: article.description || '',
        source: sourceName,
        url: articleUrl,
        imageUrl: article.urlToImage || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        analysisTextLength: text.length,
        analysis: analysis ? {
          prediction: verdictInfo.verdict,
          modelPrediction: verdictInfo.modelPrediction,
          confidence: analysis.confidence,
          reason: verdictInfo.reason,
          details: {
            ...analysis.details,
            sourceCredibility,
            sentimentScore,
            linguisticFlags,
            featureBreakdown
          }
        } : {
          prediction: sourceCredibility < 50 ? 'FAKE' : 'REAL',
          modelPrediction: 'UNKNOWN',
          confidence: 0,
          reason: 'ML service unavailable; fallback verdict from source credibility',
          details: {
            sourceCredibility,
            sentimentScore: 0,
            linguisticFlags: [],
            featureBreakdown: {}
          }
        }
      });
    });
  }

  trendingCache = results.slice(0, MAX_CACHE_SIZE);
  lastFetchTime = new Date();
  console.log(`[NewsFetcher] Analyzed ${trendingCache.length} articles`);

  return trendingCache;
};

/**
 * Get cached trending results
 */
const getTrending = (filter = 'ALL') => {
  const normalizedFilter = String(filter || 'ALL').toUpperCase();

  let filteredArticles = trendingCache;
  if (normalizedFilter === 'FAKE') {
    filteredArticles = trendingCache.filter((item) => item?.analysis?.prediction === 'FAKE');
  } else if (normalizedFilter === 'REAL') {
    filteredArticles = trendingCache.filter((item) => item?.analysis?.prediction === 'REAL');
  }

  return {
    articles: filteredArticles,
    lastUpdated: lastFetchTime,
    count: filteredArticles.length
  };
};

/**
 * Demo articles when no API key is configured
 */
const getDemoArticles = () => [
  {
    title: 'Scientists Discover New Method to Detect Misinformation Using AI',
    description: 'Researchers at MIT have developed a new artificial intelligence system that can identify fake news articles with 95% accuracy, according to a peer-reviewed study published in Nature.',
    source: { name: 'Science Daily' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  },
  {
    title: 'SHOCKING: Celebrity Secretly Controls the Weather Using Ancient Technology!!!',
    description: 'You won\'t believe what this A-list celebrity has been hiding! Sources say they have access to secret weather control devices that the government doesn\'t want you to know about!',
    source: { name: 'ClickBait Central' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  },
  {
    title: 'India\'s GDP Growth Rate Reaches 7.2% in Q3, Exceeds Expectations',
    description: 'The Indian economy grew at 7.2% in the third quarter, surpassing analysts\' expectations of 6.8%, according to data released by the Ministry of Statistics.',
    source: { name: 'Economic Times' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  },
  {
    title: 'BREAKING: Doctors HATE This One Weird Trick That Cures Everything!',
    description: 'A mysterious compound discovered in a remote village has been suppressed by Big Pharma. They don\'t want you to know about this miracle cure that fixes ALL diseases overnight!',
    source: { name: 'Health Secrets Revealed' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  },
  {
    title: 'Bollywood Star Announces New Film Collaboration with International Director',
    description: 'Popular Bollywood actor announced a new movie project in partnership with an acclaimed international director. The film is expected to begin production next month.',
    source: { name: 'Hindustan Times' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  },
  {
    title: 'EXPOSED: Secret Government Program to Monitor All Social Media Users!',
    description: 'Leaked documents reveal a massive surveillance program that has been secretly tracking every social media post you make! Share this before they delete it!',
    source: { name: 'Truth Uncovered' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  },
  {
    title: 'New Study Links Regular Exercise to Improved Mental Health Outcomes',
    description: 'A comprehensive study published in The Lancet involving 50,000 participants found that regular physical exercise significantly reduces symptoms of anxiety and depression.',
    source: { name: 'Reuters Health' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  },
  {
    title: 'UNBELIEVABLE: Man Discovers Ancient Artifact That Proves Aliens Built the Pyramids!',
    description: 'An amateur archaeologist claims to have found undeniable proof that extraterrestrial beings constructed the pyramids. Mainstream scientists are trying to cover it up!',
    source: { name: 'Alien Truth News' },
    url: '#',
    urlToImage: '',
    publishedAt: new Date().toISOString()
  }
];

/**
 * Start the cron scheduler
 */
const startScheduler = (io) => {
  // Fetch immediately on startup
  fetchAndAnalyze().then(() => {
    if (io) {
      io.emit('trending-updated', getTrending());
    }
  });

  // Then every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await fetchAndAnalyze();
    if (io) {
      io.emit('trending-updated', getTrending());
    }
  });

  console.log('[NewsFetcher] Scheduler started (every 15 min)');
};

module.exports = { fetchAndAnalyze, getTrending, startScheduler };
