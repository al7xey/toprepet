from django.core.management.base import BaseCommand

from lessons.jobs import run_all


class Command(BaseCommand):
    help = 'Фоновые задания: истёкшие записи, автозавершение уроков, выплаты, истёкшие заявки. Запускать раз в минуту (cron).'

    def handle(self, *args, **options):
        self.stdout.write(str(run_all()))
