FROM python:3.12-slim

WORKDIR /app

# Abhängigkeiten zuerst (Layer-Cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App
COPY main.py .

# DB-Verzeichnis
RUN mkdir -p /data
ENV BW_DB=/data/buchungswerk.db

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
