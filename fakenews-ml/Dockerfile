FROM python:3.11-slim
WORKDIR /app

# spaCy needs gcc + g++ + build-essential
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Skip optional NLP corpus/model downloads during build.
# Runtime code already handles missing assets with graceful fallbacks.

COPY . .

# Create runtime model save dir; keep /app/model/saved_model untouched for bundled artifacts.
RUN mkdir -p /app/model/runtime_models

# Do not train during image build.
# The full WELFake dataset can exceed memory limits in Docker build environments.
# If no trained model is present at runtime, the service uses predictor fallback logic.

EXPOSE 5001
ENV FLASK_ENV=production
ENV PORT=5001
ENV MODEL_PATH=/app/model/runtime_models

CMD ["gunicorn","--bind","0.0.0.0:5001","--workers","2",\
     "--timeout","120","--log-level","info","app:app"]
