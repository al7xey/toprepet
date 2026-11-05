from pathlib import Path

from django.conf import settings
from django.core.checks import Error, Tags, register


@register(Tags.security)
def private_storage_check(app_configs, **kwargs):
    public = Path(settings.MEDIA_ROOT).resolve()
    private = Path(settings.PRIVATE_MEDIA_ROOT).resolve()
    if public == private or private.is_relative_to(public) or public.is_relative_to(private):
        return [Error('PRIVATE_MEDIA_ROOT and public MEDIA_ROOT must be separate directories.', id='core.E001')]
    return []


@register(Tags.security)
def proxy_configuration_check(app_configs, **kwargs):
    import ipaddress
    errors = []
    for cidr in settings.TRUSTED_PROXY_CIDRS:
        try:
            network = ipaddress.ip_network(cidr)
            if network.prefixlen == 0:
                raise ValueError('Unrestricted proxy trust')
        except ValueError:
            errors.append(Error('TRUSTED_PROXY_CIDRS must contain bounded valid networks.', id='core.E002'))
    return errors
