"""
Fake News Detection ML Service
Using Voting Classifier (Random Forest + Logistic Regression + Naive Bayes)
with NLP (TF-IDF) preprocessing
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from model.predictor import FakeNewsPredictor
import os
import uuid
import datetime
import logging

import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

prediction_counter = 0
service_start_time = datetime.datetime.utcnow()

app = Flask(__name__)
CORS(app)

# Initialize predictor
predictor = FakeNewsPredictor()


def _uptime_seconds():
    return (datetime.datetime.utcnow() - service_start_time).total_seconds()


def _req_id():
    return getattr(g, 'req_id', str(uuid.uuid4())[:8])


@app.before_request
def attach_request_id():
    g.req_id = str(uuid.uuid4())[:8]

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    logger.info("req_id=%s endpoint=/ status=healthy", _req_id())
    return jsonify({
        'status': 'healthy',
        'service': 'fakenews-ml',
        'model': 'voting-classifier'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict if news is fake or real
    
    Request Body:
        { "text": "news article content..." }
    
    Response:
        {
            "prediction": "FAKE" | "REAL",
            "confidence": 0-100,
            "details": {
                "votes": { "rf": "FAKE", "lr": "REAL", "nb": "FAKE" },
                "probabilities": { "fake": 0.75, "real": 0.25 }
            }
        }
    """
    global prediction_counter

    try:
        req_id = _req_id()
        data = request.get_json(silent=True) or {}

        text = data.get('text', '') or ''
        url = data.get('url', '') or ''

        if (not text or not text.strip()) and url:
            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'lxml')
                paragraphs = [p.get_text(' ', strip=True) for p in soup.find_all('p')]
                text = ' '.join(paragraphs)[:5000]
            except Exception as fetch_err:
                logger.error("req_id=%s endpoint=/predict url_fetch_error=%s", req_id, str(fetch_err))
                return jsonify({'error': 'Failed to fetch URL content', 'message': str(fetch_err), 'req_id': req_id}), 400

        if not text or not text.strip():
            return jsonify({'error': 'Text is required', 'req_id': req_id}), 400

        if len(text.strip()) < 10:
            return jsonify({'error': 'Text too short for analysis', 'req_id': req_id}), 400

        # Get prediction
        result = predictor.predict(text)
        prediction_counter += 1
        logger.info(
            "req_id=%s endpoint=/predict prediction=%s confidence=%.2f total_predictions=%d",
            req_id,
            result.get('prediction'),
            float(result.get('confidence', 0.0)),
            prediction_counter,
        )

        return jsonify(result)

    except Exception as e:
        req_id = _req_id()
        logger.error("req_id=%s endpoint=/predict error=%s", req_id, str(e))
        return jsonify({'error': 'Prediction failed', 'message': str(e), 'req_id': req_id}), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the model"""
    vocab_size = 0
    if predictor.is_trained and predictor.vectorizer is not None and hasattr(predictor.vectorizer, 'vocabulary_'):
        vocab_size = len(predictor.vectorizer.vocabulary_)

    return jsonify({
        'model_type': 'Voting Classifier',
        'estimators': ['Random Forest', 'Logistic Regression', 'Multinomial Naive Bayes'],
        'nlp': 'TF-IDF Vectorizer',
        'voting': 'soft',
        'is_trained': predictor.is_trained,
        'total_predictions': prediction_counter,
        'uptime_seconds': round(_uptime_seconds(), 2),
        'vocab_size': vocab_size,
        'feature_pipeline': [
            'preprocess_text',
            'tfidf_vectorizer',
            'linguistic_features',
            'voting_classifier',
        ],
        'newsapi_configured': bool(os.environ.get('NEWSAPI_KEY')),
    })


@app.route('/stream', methods=['POST'])
def stream_predictions():
    global prediction_counter

    req_id = _req_id()
    try:
        data = request.get_json(silent=True) or {}
        api_key = (data.get('api_key') or os.environ.get('NEWSAPI_KEY') or '').strip()
        query = (data.get('query') or 'fake news').strip()
        page_size = int(data.get('page_size', 10))

        if not api_key:
            return jsonify({'error': 'NewsAPI key is required', 'req_id': req_id}), 400

        articles = predictor.fetch_realtime_articles(api_key, query, page_size)
        results = []
        for article in articles:
            result = predictor.predict(article.get('content', ''))
            result['title'] = article.get('title', '')
            result['source'] = article.get('source', '')
            result['url'] = article.get('url', '')
            result['publishedAt'] = article.get('publishedAt', '')
            results.append(result)

        prediction_counter += len(results)
        fake_count = sum(1 for r in results if r.get('prediction') == 'FAKE')
        real_count = sum(1 for r in results if r.get('prediction') == 'REAL')
        avg_confidence = round(
            (sum(float(r.get('confidence', 0.0)) for r in results) / max(len(results), 1)),
            2,
        )

        logger.info(
            "req_id=%s endpoint=/stream query=%s total=%d fake=%d real=%d",
            req_id,
            query,
            len(results),
            fake_count,
            real_count,
        )

        return jsonify(
            {
                'results': results,
                'total': len(results),
                'fake_count': fake_count,
                'real_count': real_count,
                'avg_confidence': avg_confidence,
                'fetched_at': datetime.datetime.utcnow().isoformat() + 'Z',
            }
        )
    except Exception as e:
        logger.error("req_id=%s endpoint=/stream error=%s", req_id, str(e))
        return jsonify({'error': 'Stream prediction failed', 'message': str(e), 'req_id': req_id}), 500


@app.route('/realtime/status', methods=['GET'])
def realtime_status():
    return jsonify(
        {
            'status': 'ok',
            'is_trained': predictor.is_trained,
            'total_predictions': prediction_counter,
            'uptime_seconds': round(_uptime_seconds(), 2),
            'newsapi_configured': bool(os.environ.get('NEWSAPI_KEY')),
            'service': 'fakenews-ml',
            'version': '2.0.0',
        }
    )


@app.errorhandler(404)
def handle_404(_error):
    req_id = _req_id()
    return (
        jsonify(
            {
                'error': 'Not found',
                'req_id': req_id,
                'available_endpoints': [
                    '/',
                    '/predict',
                    '/model-info',
                    '/stream',
                    '/realtime/status',
                ],
            }
        ),
        404,
    )


@app.errorhandler(500)
def handle_500(error):
    req_id = _req_id()
    logger.error("req_id=%s endpoint=%s internal_error=%s", req_id, request.path, str(error))
    return jsonify({'error': 'Internal server error', 'message': str(error), 'req_id': req_id}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    logger.info("Starting fakenews-ml service on port %d", port)
    app.run(host='0.0.0.0', port=port, debug=debug)
