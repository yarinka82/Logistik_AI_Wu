import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

app = Celery("logistik")

# Берём настройки CELERY_* из Django settings.py (CELERY_BROKER_URL и т.д.)
app.config_from_object("django.conf:settings", namespace="CELERY")

# Автоматически находит tasks.py во всех INSTALLED_APPS + в самом worker/
app.autodiscover_tasks(packages=["worker"])


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")