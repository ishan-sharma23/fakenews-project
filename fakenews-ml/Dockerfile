FROM python:3.11-slim
WORKDIR /app

# spaCy needs gcc + g++ + build-essential
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLP models BEFORE copying app code (better layer caching)
RUN python -m spacy download en_core_web_sm
RUN python -c "import nltk; nltk.download('stopwords',quiet=True); nltk.download('punkt',quiet=True)"
RUN python -c "from textblob import download_corpora; download_corpora()" || true

COPY . .

# Create model save dir (fixes Docker volume path mismatch)
RUN mkdir -p /app/model/saved_model

# Train on startup if dataset exists
RUN if [ -f data/WELFake_Dataset.csv ] && \
    [ ! -f model/saved_model/voting_classifier.pkl ]; then \
      python model/train.py --data data/WELFake_Dataset.csv; \
    elif [ ! -f model/saved_model/voting_classifier.pkl ]; then \
      python model/train.py --sample; \
    fi

EXPOSE 5001
ENV FLASK_ENV=production
ENV PORT=5001
ENV MODEL_PATH=/app/model/saved_model

CMD ["gunicorn","--bind","0.0.0.0:5001","--workers","2",\
     "--timeout","120","--log-level","info","app:app"]
