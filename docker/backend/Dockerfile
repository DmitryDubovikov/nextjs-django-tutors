FROM python:3.12-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements/base.txt requirements/base.txt
COPY backend/requirements/dev.txt requirements/dev.txt
RUN pip install --upgrade pip && \
    pip install -r requirements/dev.txt

# Copy the application
COPY backend/ .

# Expose port
EXPOSE 8000

# Start development server with uvicorn (for async support)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
