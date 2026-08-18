FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Defaults to 7860 (HF Spaces' expected port) but honors $PORT if the host injects one
# (Koyeb, Render, Railway, etc. all set PORT) — same image works across every platform.
EXPOSE 7860
ENV PORT=7860

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
