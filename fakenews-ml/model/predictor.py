"""
Fake News Predictor using Voting Classifier
Components:
- TF-IDF Vectorizer (NLP)
- Random Forest Classifier
- Logistic Regression
- Multinomial Naive Bayes
- Voting Classifier (soft voting)
"""

import os
import re
import string
import importlib
import sys
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.base import BaseEstimator, ClassifierMixin, clone

# Try to import NLTK, but don't fail if not available
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.stem import PorterStemmer
    
    # Download required NLTK data
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
    
    NLTK_AVAILABLE = True
    STOP_WORDS = set(stopwords.words('english'))
    STEMMER = PorterStemmer()
except:
    NLTK_AVAILABLE = False
    STOP_WORDS = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                  'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                  'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
                  'from', 'as', 'into', 'through', 'during', 'before', 'after',
                  'above', 'below', 'between', 'under', 'again', 'further',
                  'then', 'once', 'here', 'there', 'when', 'where', 'why',
                  'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
                  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
                  'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
                  'because', 'until', 'while', 'about', 'against', 'this',
                  'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we',
                  'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'he',
                  'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they',
                  'them', 'their', 'what', 'which', 'who', 'whom'}
    STEMMER = None

# Optional dependencies with graceful fallback
try:
    spacy_lib = importlib.import_module('spacy')
    nlp = spacy_lib.load('en_core_web_sm')
    SPACY_AVAILABLE = True
except Exception:
    SPACY_AVAILABLE = False
    nlp = None

try:
    textblob_mod = importlib.import_module('textblob')
    TextBlob = textblob_mod.TextBlob
    TEXTBLOB_AVAILABLE = True
except Exception:
    TEXTBLOB_AVAILABLE = False
    TextBlob = None

try:
    textstat = importlib.import_module('textstat')
    TEXTSTAT_AVAILABLE = True
except Exception:
    TEXTSTAT_AVAILABLE = False
    textstat = None

try:
    import requests as req_lib

    REQUESTS_AVAILABLE = True
except Exception:
    REQUESTS_AVAILABLE = False

try:
    from scipy.sparse import hstack, csr_matrix

    SCIPY_AVAILABLE = True
except Exception:
    SCIPY_AVAILABLE = False


class TfidfSliceNB(BaseEstimator, ClassifierMixin):
    """Apply MultinomialNB only on TF-IDF columns to avoid negative feature issues."""

    def __init__(self, base_nb=None, n_tfidf_cols=None):
        self.base_nb = base_nb if base_nb is not None else MultinomialNB(alpha=0.1)
        self.n_tfidf_cols = n_tfidf_cols
        self.nb_ = None

    def fit(self, X, y):
        self.nb_ = clone(self.base_nb)
        n_cols = self.n_tfidf_cols if self.n_tfidf_cols is not None else X.shape[1]
        self.nb_.fit(X[:, :n_cols], y)
        self.classes_ = self.nb_.classes_
        return self

    def predict(self, X):
        n_cols = self.n_tfidf_cols if self.n_tfidf_cols is not None else X.shape[1]
        return self.nb_.predict(X[:, :n_cols])

    def predict_proba(self, X):
        n_cols = self.n_tfidf_cols if self.n_tfidf_cols is not None else X.shape[1]
        return self.nb_.predict_proba(X[:, :n_cols])


class FakeNewsPredictor:
    """
    Fake News Detection using Voting Classifier
    
    Approach: NLP + Random Forest + Voting Classifier
    - Preprocesses text (lowercase, remove punctuation, stopwords, stemming)
    - Vectorizes using TF-IDF
    - Predicts using ensemble of RF, LR, and NB with soft voting
    """
    
    def __init__(self, model_path=None):
        model_dir = os.environ.get('MODEL_PATH', os.path.dirname(__file__))
        os.makedirs(model_dir, exist_ok=True)

        self.model_path = model_path or os.path.join(model_dir, 'voting_classifier.pkl')
        self.vectorizer_path = os.path.join(model_dir, 'tfidf_vectorizer.pkl')
        
        self.model = None
        self.vectorizer = None
        self.tfidf_feature_count = None
        self.is_trained = False
        
        # Try to load existing model
        self._load_model()
    
    def _preprocess_text(self, text):
        """
        NLP Preprocessing Pipeline:
        1. Convert to lowercase
        2. Remove URLs
        3. Remove punctuation
        4. Remove numbers
        5. Remove stopwords
        6. Apply stemming (if NLTK available)
        """
        # Lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text)
        
        # Remove HTML tags
        text = re.sub(r'<.*?>', '', text)
        
        # Remove punctuation
        text = text.translate(str.maketrans('', '', string.punctuation))
        
        # Remove numbers
        text = re.sub(r'\d+', '', text)

        # Remove extended unicode symbols (e.g., many emoji/codepoints outside BMP)
        text = re.sub(r'[\U00010000-\U0010ffff]', '', text, flags=re.UNICODE)

        if SPACY_AVAILABLE and nlp is not None:
            doc = nlp(text[:100000])
            text = ' '.join([t.lemma_ for t in doc if not t.is_space])

        text = ' '.join(text.split())
        
        # Note: stopword removal is handled by TF-IDF vectorizer (stop_words='english')
        # No manual stopword removal here to keep preprocessing consistent
        
        return text

    def _extract_linguistic_features(self, text):
        words = text.split()
        total_words = max(len(words), 1)

        if TEXTBLOB_AVAILABLE:
            tb = TextBlob(text)
            sentiment = float(tb.sentiment.polarity)
            subjectivity = float(tb.sentiment.subjectivity)
        else:
            sentiment = 0.0
            subjectivity = 0.5

        punct_ratio = (text.count('!') + text.count('?')) / max(len(text), 1)
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        mean_word_len = float(sum(len(w) for w in words) / total_words) if words else 0.0
        unique_ratio = float(len(set(words)) / total_words) if words else 0.0
        ner_density = float(len(nlp(text[:500]).ents) / 10.0) if SPACY_AVAILABLE and nlp is not None else 0.0
        readability = float(textstat.flesch_reading_ease(text) / 100.0) if TEXTSTAT_AVAILABLE else 0.5

        return np.array([[sentiment, subjectivity, punct_ratio, caps_ratio, mean_word_len, unique_ratio, ner_density, readability]])
    
    def _create_model(self):
        """
        Create the Voting Classifier with:
        - Random Forest (RF) - with regularization to prevent overfitting
        - Logistic Regression (LR) - with L2 regularization
        - Multinomial Naive Bayes (NB) - with smoothing
        
        Anti-overfitting measures:
        - Reduced tree depth and estimators
        - Added min_samples_split and min_samples_leaf
        - Strong regularization (C parameter)
        - Increased alpha for Naive Bayes smoothing
        """
        rf_clf = RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
        
        lr_clf = LogisticRegression(
            C=1.0,
            penalty='l2',
            solver='lbfgs',
            max_iter=2000,
            class_weight='balanced',
            random_state=42,
        )
        
        nb_clf = MultinomialNB(alpha=0.1)
        nb_wrapper = TfidfSliceNB(base_nb=nb_clf)
        
        voting_clf = VotingClassifier(
            estimators=[
                ('rf', rf_clf),
                ('lr', lr_clf),
                ('nb', nb_wrapper)
            ],
            voting='soft',
            weights=[2, 1, 1]
        )
        
        return voting_clf
    
    def _create_vectorizer(self):
        """
        Create TF-IDF Vectorizer for NLP
        
        Anti-overfitting measures:
        - Reduced max_features
        - Increased min_df (ignore rare words)
        - Reduced max_df (ignore too common words)
        """
        return TfidfVectorizer(
            max_features=50000,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,
            strip_accents='unicode',
            stop_words='english',
            lowercase=True
        )
    
    def _load_model(self):
        """Load trained model and vectorizer if they exist"""
        try:
            # Backward compatibility: older artifacts may reference classes under
            # top-level module name "predictor" instead of "model.predictor".
            sys.modules.setdefault('predictor', sys.modules[__name__])

            base_dir = os.path.dirname(__file__)
            configured_dir = os.path.dirname(self.model_path)
            candidate_dirs = []
            for d in [
                configured_dir,
                os.path.join(configured_dir, 'saved_model'),
                os.path.join(base_dir, 'saved_model'),
                base_dir,
            ]:
                if d and d not in candidate_dirs:
                    candidate_dirs.append(d)

            last_error = None
            for candidate_dir in candidate_dirs:
                model_candidate = os.path.join(candidate_dir, 'voting_classifier.pkl')
                vectorizer_candidate = os.path.join(candidate_dir, 'tfidf_vectorizer.pkl')
                if not (os.path.exists(model_candidate) and os.path.exists(vectorizer_candidate)):
                    continue

                try:
                    try:
                        model_blob = joblib.load(model_candidate)
                        self.vectorizer = joblib.load(vectorizer_candidate)
                    except Exception:
                        import pickle

                        with open(model_candidate, 'rb') as f:
                            model_blob = pickle.load(f)
                        with open(vectorizer_candidate, 'rb') as f:
                            self.vectorizer = pickle.load(f)

                    if isinstance(model_blob, dict) and 'model' in model_blob:
                        self.model = model_blob.get('model')
                        self.tfidf_feature_count = model_blob.get('tfidf_feature_count')
                    else:
                        self.model = model_blob
                        self.tfidf_feature_count = getattr(model_blob, 'tfidf_feature_count', None)

                    if self.tfidf_feature_count is None and self.vectorizer is not None:
                        self.tfidf_feature_count = len(self.vectorizer.get_feature_names_out())

                    self.model_path = model_candidate
                    self.vectorizer_path = vectorizer_candidate
                    self.is_trained = True
                    print(f"Model loaded successfully from {candidate_dir}")
                    return
                except Exception as load_error:
                    last_error = load_error

            if last_error:
                print(f"No usable trained model found. Last load error: {last_error}")
            else:
                print("No trained model found. Using fallback prediction.")
            self.is_trained = False
        except Exception as e:
            print(f"Error loading model: {e}")
            self.is_trained = False
    
    def train(self, texts, labels):
        """
        Train the Voting Classifier
        
        Args:
            texts: List of news article texts
            labels: List of labels (0 = REAL, 1 = FAKE)
        """
        print("Preprocessing texts...")
        processed_texts = [self._preprocess_text(t) for t in texts]
        
        print("Creating TF-IDF vectors...")
        self.vectorizer = self._create_vectorizer()
        X_tfidf = self.vectorizer.fit_transform(processed_texts)
        self.tfidf_feature_count = X_tfidf.shape[1]

        if SCIPY_AVAILABLE:
            ling = np.vstack([self._extract_linguistic_features(t) for t in processed_texts])
            X = hstack([X_tfidf, csr_matrix(ling)])
        else:
            X = X_tfidf
        
        print("Training Voting Classifier...")
        self.model = self._create_model()
        self.model.set_params(nb__n_tfidf_cols=self.tfidf_feature_count)
        self.model.fit(X, labels)
        
        # Save model and vectorizer
        joblib.dump(
            {
                'model': self.model,
                'tfidf_feature_count': self.tfidf_feature_count
            },
            self.model_path
        )
        joblib.dump(self.vectorizer, self.vectorizer_path)
        
        self.is_trained = True
        print("Model trained and saved successfully!")
    
    def predict(self, text):
        """
        Predict if news is FAKE or REAL
        
        Args:
            text: News article text
            
        Returns:
            dict with prediction, confidence, and details
        """
        # Preprocess
        processed_text = self._preprocess_text(text)
        
        # If no trained model, use fallback heuristic
        if not self.is_trained:
            return self._fallback_predict(text, processed_text)
        
        # Vectorize and append linguistic features (if scipy is available)
        X_tfidf = self.vectorizer.transform([processed_text])
        if SCIPY_AVAILABLE:
            ling = self._extract_linguistic_features(processed_text)
            X = hstack([X_tfidf, csr_matrix(ling)])
        else:
            X = X_tfidf
        
        # Get prediction and probabilities
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        # Get individual classifier predictions
        votes = {}
        for name, clf in self.model.named_estimators_.items():
            clf_pred = clf.predict(X)[0]
            votes[name] = 'FAKE' if clf_pred == 1 else 'REAL'
        
        # Format result
        pred_label = 'FAKE' if prediction == 1 else 'REAL'
        confidence = float(max(probabilities) * 100)

        if TEXTBLOB_AVAILABLE:
            tb = TextBlob(text)
            polarity = float(tb.sentiment.polarity)
            subjectivity = float(tb.sentiment.subjectivity)
        else:
            polarity = 0.0
            subjectivity = 0.5

        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        exclamation_ratio = (text.count('!') + text.count('?')) / max(len(text), 1)
        linguistic_flags = self._generate_linguistic_flags(text)
        
        return {
            'prediction': pred_label,
            'confidence': round(confidence, 2),
            'details': {
                'sentimentScore': round(polarity * 100, 2),
                'objectivityScore': round((1 - subjectivity) * 100),
                'clickbaitScore': round(probabilities[1] * 100) if pred_label == 'FAKE' else round(probabilities[1] * 50),
                'sourceCredibility': round((1 - probabilities[1]) * 100),
                'linguisticFlags': linguistic_flags,
                'featureBreakdown': {
                    'sentiment': round(polarity, 4),
                    'subjectivity': round(subjectivity, 4),
                    'caps_ratio': round(caps_ratio, 4),
                    'exclamation_ratio': round(exclamation_ratio, 4)
                },
                'flags': linguistic_flags,
                'votes': votes,
                'probabilities': {
                    'fake': round(float(probabilities[1]), 4),
                    'real': round(float(probabilities[0]), 4)
                }
            }
        }

    def _generate_linguistic_flags(self, text):
        flags = []
        text_lower = text.lower()
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        exclamations = text.count('!') + text.count('?')

        if TEXTBLOB_AVAILABLE:
            subjectivity = float(TextBlob(text).sentiment.subjectivity)
        else:
            subjectivity = 0.5

        if caps_ratio > 0.15:
            flags.append('Excessive capitalisation')
        if exclamations > 2:
            flags.append('Sensationalist punctuation')
        if subjectivity > 0.7:
            flags.append('Highly subjective language')
        if not re.search(r'according to|source:|cited|study|research|reported by', text_lower):
            flags.append('No source citations found')

        clickbait_words = [
            'shocking', 'unbelievable', 'you won\'t believe', 'breaking', 'secret',
            'exposed', 'what happens next', 'doctors hate'
        ]
        if any(w in text_lower for w in clickbait_words):
            flags.append('Clickbait language detected')

        return flags[:3]

    def fetch_realtime_articles(self, api_key, query='fake news', page_size=20):
        if not REQUESTS_AVAILABLE:
            return []

        try:
            response = req_lib.get(
                'https://newsapi.org/v2/everything',
                params={
                    'q': query,
                    'language': 'en',
                    'sortBy': 'publishedAt',
                    'pageSize': page_size,
                    'apiKey': api_key
                },
                timeout=15
            )

            if response.status_code == 401:
                print('Invalid key')
                return []
            if response.status_code == 429:
                print('Rate limit')
                return []
            if response.status_code != 200:
                print(f'NewsAPI error status: {response.status_code}')
                return []

            payload = response.json()
            articles = payload.get('articles', [])
            results = []
            for article in articles:
                content = article.get('content') or article.get('description') or article.get('title', '')
                results.append(
                    {
                        'title': article.get('title', ''),
                        'content': content,
                        'source': (article.get('source') or {}).get('name', ''),
                        'url': article.get('url', ''),
                        'publishedAt': article.get('publishedAt', '')
                    }
                )
            return results
        except Exception as e:
            print(f'Failed to fetch realtime articles: {e}')
            return []

    def predict_batch(self, articles):
        results = []
        for article in articles:
            result = self.predict(article.get('content', ''))
            result['title'] = article.get('title', '')
            result['source'] = article.get('source', '')
            result['url'] = article.get('url', '')
            result['publishedAt'] = article.get('publishedAt', '')
            results.append(result)
        return results
    
    def _fallback_predict(self, original_text, processed_text):
        """
        Fallback prediction using heuristics when model is not trained
        """
        # Clickbait patterns
        clickbait_patterns = [
            r'you won\'t believe', r'shocking', r'breaking', r'blow your mind',
            r'doctors hate', r'one weird trick', r'what happens next',
            r'they don\'t want you to know', r'exposed', r'secret'
        ]
        
        # Emotional words
        emotional_words = [
            'amazing', 'incredible', 'unbelievable', 'shocking', 'terrifying',
            'horrifying', 'devastating', 'explosive', 'bombshell', 'outrage'
        ]
        
        text_lower = original_text.lower()
        
        # Calculate scores
        clickbait_count = sum(1 for p in clickbait_patterns if re.search(p, text_lower))
        emotional_count = sum(1 for w in emotional_words if w in text_lower)
        caps_ratio = sum(1 for c in original_text if c.isupper()) / max(len(original_text), 1)
        
        # Calculate fake score
        fake_score = (clickbait_count * 15) + (emotional_count * 10) + (caps_ratio * 50)
        fake_prob = min(fake_score / 100, 0.95)
        
        if fake_prob > 0.5:
            prediction = 'FAKE'
            confidence = 50 + (fake_prob * 50)
        else:
            prediction = 'REAL'
            confidence = 50 + ((1 - fake_prob) * 50)
        
        flags = []
        if clickbait_count > 0:
            flags.append('Clickbait patterns detected')
        if emotional_count > 2:
            flags.append('Emotional language detected')
        if caps_ratio > 0.3:
            flags.append('Excessive capitalization')
        
        return {
            'prediction': prediction,
            'confidence': round(confidence, 2),
            'details': {
                'sentimentScore': 0,
                'objectivityScore': round((1 - fake_prob) * 100),
                'clickbaitScore': round(fake_prob * 100),
                'sourceCredibility': 50,
                'flags': flags if flags else ['Analysis based on heuristics (model not trained)'],
                'votes': {
                    'rf': prediction,
                    'lr': prediction,
                    'nb': prediction
                },
                'probabilities': {
                    'fake': round(fake_prob, 4),
                    'real': round(1 - fake_prob, 4)
                }
            }
        }
    
    def _generate_flags(self, text, prediction, fake_prob):
        """Generate warning flags based on analysis"""
        flags = []
        text_lower = text.lower()
        
        if fake_prob > 0.7:
            flags.append('High probability of misinformation')
        
        if re.search(r'[!?]{2,}', text):
            flags.append('Sensationalist punctuation detected')
        
        if not re.search(r'according to|source:|cited|study|research', text_lower):
            if len(text) > 200:
                flags.append('Missing source citations')
        
        clickbait_words = ['shocking', 'unbelievable', 'you won\'t believe', 'breaking']
        if any(w in text_lower for w in clickbait_words):
            flags.append('Clickbait language patterns detected')
        
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        if caps_ratio > 0.3:
            flags.append('Excessive capitalization detected')
        
        if prediction == 'REAL' and not flags:
            flags.append('Content appears credible')
        
        return flags


# For testing
if __name__ == '__main__':
    predictor = FakeNewsPredictor()
    
    test_text = """
    BREAKING NEWS! You won't believe what scientists discovered! 
    This shocking revelation will blow your mind! 
    Doctors hate this one weird trick that cures everything!
    """
    
    result = predictor.predict(test_text)
    print(f"Prediction: {result['prediction']}")
    print(f"Confidence: {result['confidence']}%")
    print(f"Flags: {result['details']['flags']}")
