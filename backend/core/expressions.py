from django.db.models import BooleanField, Func
from django.db.models.functions import Lower


class UnicodeLower(Lower):
    def as_sqlite(self, compiler, connection, **extra_context):
        return super().as_sql(compiler, connection, function='unicode_lower', **extra_context)


class JsonText(Func):
    """Readable JSON array for search (SQLite JSON encoding may escape Cyrillic)."""
    function = 'json_text'
    def as_postgresql(self, compiler, connection, **extra_context):
        expr, params = compiler.compile(self.source_expressions[0])
        return f'({expr})::text', params


class ArraySubjectMatches(Func):
    output_field = BooleanField()
    def as_sql(self, compiler, connection, **extra_context):
        expr, expr_params = compiler.compile(self.source_expressions[0])
        value, value_params = compiler.compile(self.source_expressions[1])
        if connection.vendor == 'postgresql':
            rows = f'jsonb_array_elements_text({expr}) AS item(value)'
            prefix = f'left({value}, length(item.value))'
        else:
            rows = f'json_each({expr}) AS item'
            prefix = f'substr({value}, 1, length(item.value))'
        # Compiler SQL only; user values stay in params (regression tested).
        return f'EXISTS(SELECT 1 FROM {rows} WHERE item.value <> \'\' AND {prefix} = item.value)', [*expr_params, *value_params]  # nosec B608


class ArrayIncludes(ArraySubjectMatches):
    def as_sql(self, compiler, connection, **extra_context):
        expr, expr_params = compiler.compile(self.source_expressions[0])
        value, value_params = compiler.compile(self.source_expressions[1])
        rows = f'jsonb_array_elements_text({expr}) AS item(value)' if connection.vendor == 'postgresql' else f'json_each({expr}) AS item'
        # Compiler SQL only; user values stay in params (regression tested).
        return f'EXISTS(SELECT 1 FROM {rows} WHERE item.value = {value})', [*expr_params, *value_params]  # nosec B608
