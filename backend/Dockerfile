FROM python:3.11-slim

WORKDIR /app

# System deps for psycopg2 / scientific stack builds.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Mirrors the conda-managed packages from environment.yml (pandas, numpy,
# scikit-learn, psycopg2, sqlalchemy, pytest) since this container doesn't
# use conda -- requirements.txt + this line together equal environment.yml.
RUN pip install --no-cache-dir \
    pandas numpy scikit-learn psycopg2-binary sqlalchemy pytest \
    -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
