from django.db import migrations


def publish_pending_profiles(apps, schema_editor):
    tutor = apps.get_model('tutors', 'Tutor')
    tutor.objects.using(schema_editor.connection.alias).filter(status='review').update(status='published')


class Migration(migrations.Migration):
    dependencies = [('tutors', '0003_document_file_cleanup')]
    operations = [migrations.RunPython(publish_pending_profiles, migrations.RunPython.noop)]
