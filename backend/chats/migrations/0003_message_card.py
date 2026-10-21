from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('chats', '0002_read_receipts_and_photos')]

    operations = [
        migrations.AddField(model_name='message', name='card', field=models.JSONField(blank=True, null=True)),
    ]
