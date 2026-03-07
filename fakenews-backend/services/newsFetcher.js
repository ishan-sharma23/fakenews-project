const cron = require('node-cron');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// In-memory cache of trending news with analysis
let trendingCache = [];
let lastFetchTime = null;

/**
 * Fetch news articles from NewsAPI
 */
const fetchNews = async (query = 'India news OR Bollywood OR technology', page = 1) => {
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
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) throw new Error(`ML service error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[NewsFetcher] ML analysis error:', error.message);
    return null;
  }
};

/**
 * Fetch news and analyze each article
 */
const fetchAndAnalyze = async (query) => {
  console.log('[NewsFetcher] Fetching and analyzing news...');

  const articles = await fetchNews(query);
  const results = [];

  for (const article of articles) {
    const text = `${article.title || ''} ${article.description || ''}`.trim();
    if (text.length < 20) continue;

    const analysis = await analyzeArticle(text);

    results.push({
      title: article.title || 'Untitled',
      description: article.description || '',
      source: article.source?.name || 'Unknown',
      url: article.url || '',
      imageUrl: article.urlToImage || '',
      publishedAt: article.publishedAt || new Date().toISOString(),
      analysis: analysis ? {
        prediction: analysis.prediction,
        confidence: analysis.confidence,
        details: analysis.details
      } : {
        prediction: 'UNKNOWN',
        confidence: 0,
        details: {}
      }
    });
  }

  trendingCache = results;
  lastFetchTime = new Date();
  console.log(`[NewsFetcher] Analyzed ${results.length} articles`);

  return results;
};

/**
 * Get cached trending results
 */
const getTrending = () => ({
  articles: trendingCache,
  lastUpdated: lastFetchTime,
  count: trendingCache.length
});

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
