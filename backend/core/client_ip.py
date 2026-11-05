import ipaddress

from django.conf import settings


def client_ip(request):
    """Trust forwarded hops only when the immediate peer is explicitly trusted."""
    try:
        peer = ipaddress.ip_address(request.META.get('REMOTE_ADDR', ''))
    except ValueError:
        return 'unknown'
    trusted = [ipaddress.ip_network(cidr) for cidr in settings.TRUSTED_PROXY_CIDRS]
    hops = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if not trusted or not any(peer in network for network in trusted) or len(hops) > 1024:
        return str(peer)
    try:
        chain = [ipaddress.ip_address(value.strip()) for value in hops.split(',')]
    except ValueError:
        return str(peer)
    if len(chain) > 16:
        return str(peer)
    current = peer
    for address in reversed(chain):
        if not any(current in network for network in trusted):
            break
        current = address
    return str(current)
