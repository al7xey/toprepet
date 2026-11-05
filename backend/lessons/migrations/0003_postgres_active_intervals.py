"""Database backstop for active tutor intervals; SQLite uses the service-level lock/check."""
from django.db import migrations


def forward(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    # Deployment role needs btree_gist provisioned by the database owner.
    schema_editor.execute('CREATE EXTENSION IF NOT EXISTS btree_gist')
    schema_editor.execute("""
        ALTER TABLE lessons_lesson ADD CONSTRAINT lesson_active_tutor_no_overlap
        EXCLUDE USING gist (
            tutor_id WITH =,
            tsrange(
                start AT TIME ZONE 'UTC',
                (start AT TIME ZONE 'UTC') + duration_min * interval '1 minute',
                '[)'
            ) WITH &&
        ) WHERE (status IN ('pending', 'confirmed'))
        DEFERRABLE INITIALLY DEFERRED
    """)


def backward(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('ALTER TABLE lessons_lesson DROP CONSTRAINT IF EXISTS lesson_active_tutor_no_overlap')


class Migration(migrations.Migration):
    dependencies = [('lessons', '0002_lesson_booking_fingerprint_and_more')]
    operations = [migrations.RunPython(forward, backward)]
