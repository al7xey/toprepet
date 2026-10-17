# TopRepet backend

Django + DRF. Подробности — в [docs/backend.md](../docs/backend.md).

```bash
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
python manage.py migrate && python manage.py seed_demo && python manage.py runserver
python -m pytest
```
