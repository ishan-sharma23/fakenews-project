"""
Fake News Detection ML Service
Using Voting Classifier (Random Forest + Logistic Regression + Naive Bayes)
with NLP (TF-IDF) preprocessing
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from model.predictor import FakeNewsPredictor
import os

app = Flask(__name__)
CORS(app)

# Initialize predictor
predictor = FakeNewsPredictor()

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
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
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        text = data['text']
        
        if len(text.strip()) < 10:
            return jsonify({'error': 'Text too short for analysis'}), 400
        
        # Get prediction
        result = predictor.predict(text)
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({'error': 'Prediction failed', 'message': str(e)}), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the model"""
    return jsonify({
        'model_type': 'Voting Classifier',
        'estimators': ['Random Forest', 'Logistic Regression', 'Multinomial Naive Bayes'],
        'nlp': 'TF-IDF Vectorizer',
        'voting': 'soft',
        'is_trained': predictor.is_trained
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
