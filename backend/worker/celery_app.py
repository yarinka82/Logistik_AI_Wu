import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

app = Celery("logistik")

# Take CELERY_* settings from Django settings.py (CELERY_BROKER_URL, etc.)
app.config_from_object("django.conf:settings", namespace="CELERY")

# Automatically finds tasks.py in all INSTALLED_APPS + in the worker/
app.autodiscover_tasks(packages=["worker"])


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")