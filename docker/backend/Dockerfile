FROM python:3.12-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

# Install system dependencies and uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files
COPY backend/pyproject.toml backend/uv.lock ./

# Install Python dependencies using uv sync to /opt/venv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
RUN uv sync --frozen --extra dev --no-editable

# Copy the application
COPY backend/ .

# Expose port
EXPOSE 8000

# Activate venv in PATH for all commands
ENV PATH="/opt/venv/bin:$PATH"

# Start development server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
