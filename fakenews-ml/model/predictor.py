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
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

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


class FakeNewsPredictor:
    """
    Fake News Detection using Voting Classifier
    
    Approach: NLP + Random Forest + Voting Classifier
    - Preprocesses text (lowercase, remove punctuation, stopwords, stemming)
    - Vectorizes using TF-IDF
    - Predicts using ensemble of RF, LR, and NB with soft voting
    """
    
    def __init__(self, model_path=None):
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), 'voting_classifier.pkl'
        )
        self.vectorizer_path = os.path.join(
            os.path.dirname(__file__), 'tfidf_vectorizer.pkl'
        )
        
        self.model = None
        self.vectorizer = None
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
        
        # Note: stopword removal is handled by TF-IDF vectorizer (stop_words='english')
        # No manual stopword removal here to keep preprocessing consistent
        
        return text
    
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
        # Random Forest with regularization to prevent overfitting
        rf_clf = RandomForestClassifier(
            n_estimators=30,           # Reduced for speed
            max_depth=8,               # Limits tree complexity
            min_samples_split=10,      # Requires more samples to split (regularization)
            min_samples_leaf=5,        # Minimum samples in leaf nodes
            max_features='sqrt',       # Use sqrt of features (reduces overfitting)
            class_weight='balanced',   # Handle class imbalance
            random_state=42,
            n_jobs=1
        )
        
        # Logistic Regression with strong L2 regularization
        lr_clf = LogisticRegression(
            C=0.1,                     # Strong regularization (smaller C = more regularization)
            penalty='l2',              # L2 regularization
            solver='lbfgs',
            max_iter=1000,
            class_weight='balanced',   # Handle class imbalance
            random_state=42,
            n_jobs=1
        )
        
        # Naive Bayes with higher smoothing
        nb_clf = MultinomialNB(
            alpha=1.0                  # Increased from 0.1 (more smoothing = less overfitting)
        )
        
        # Voting Classifier (soft voting for probability-based decisions)
        voting_clf = VotingClassifier(
            estimators=[
                ('rf', rf_clf),
                ('lr', lr_clf),
                ('nb', nb_clf)
            ],
            voting='soft',
            n_jobs=1
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
            max_features=3000,         # Good feature count
            ngram_range=(1, 1),        # Unigrams only (bigrams too slow for large datasets)
            min_df=3,                  # Minimum document frequency
            max_df=0.9,               # Ignore words in > 90% of docs
            sublinear_tf=True,
            strip_accents='unicode',   # Normalize text
            stop_words='english',      # Use built-in English stop words
            lowercase=True
        )
    
    def _load_model(self):
        """Load trained model and vectorizer if they exist"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
                try:
                    self.model = joblib.load(self.model_path)
                    self.vectorizer = joblib.load(self.vectorizer_path)
                except Exception:
                    import pickle
                    with open(self.model_path, 'rb') as f:
                        self.model = pickle.load(f)
                    with open(self.vectorizer_path, 'rb') as f:
                        self.vectorizer = pickle.load(f)
                self.is_trained = True
                print("Model loaded successfully")
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
        X = self.vectorizer.fit_transform(processed_texts)
        
        print("Training Voting Classifier...")
        self.model = self._create_model()
        self.model.fit(X, labels)
        
        # Save model and vectorizer
        joblib.dump(self.model, self.model_path)
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
        
        # Vectorize
        X = self.vectorizer.transform([processed_text])
        
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
        
        return {
            'prediction': pred_label,
            'confidence': round(confidence, 2),
            'details': {
                'sentimentScore': 0,  # Placeholder for compatibility
                'objectivityScore': round((1 - probabilities[1]) * 100),
                'clickbaitScore': round(probabilities[1] * 100) if pred_label == 'FAKE' else round(probabilities[1] * 50),
                'sourceCredibility': round((1 - probabilities[1]) * 100),
                'flags': self._generate_flags(text, pred_label, probabilities[1]),
                'votes': votes,
                'probabilities': {
                    'fake': round(float(probabilities[1]), 4),
                    'real': round(float(probabilities[0]), 4)
                }
            }
        }
    
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
