# Logistik_AI_Wu — Daily Workflow

## 1. Start of day: bring up the full stack

    cd ###\Logistik_AI_Wu
    docker compose up -d

This starts all services:
- PostgreSQL (db)
- Redis
- MinIO
- Django app
- Celery worker

All containers run in the background.

## 2. Django logs (runtime, errors, autoreload)

    docker compose logs -f app

Ctrl+C stops log viewing.  
The container continues running.

## 3. Django management commands (inside running container)

Use exec because containers are already running via up -d:

    docker compose exec app python manage.py makemigrations
    docker compose exec app python manage.py migrate
    docker compose exec app python manage.py createsuperuser
    docker compose exec app python manage.py shell

## 4. Editing backend code

Local directory:

    backend/
        users/models.py
        settings.py
        ...

is mounted into the container:

    ./backend:/app

Django inside the container uses autoreload.  
To observe reloads and errors:

    docker compose logs -f app

## 5. End of day: stop all services

    docker compose down

PostgreSQL data is stored in the pgdata volume.  
Next up -d will reuse existing data.

# Frontend workflow (unchanged)

Frontend runs locally, outside Docker:

    cd frontend
    npm run dev

GDAL is not required.  
Docker does not affect the frontend.





====📝 Ліцензія===
Цей проект є власністю компанії Digital IT Hub Würzburg e .V. Всі права захищені.

