import re

CONTACTS_MESSAGE = 'Телефоны, ссылки и мессенджеры в сообщениях запрещены: общайтесь и платите внутри TopRepet, так мы сможем помочь, если что-то пойдёт не так.'

_PHONE = re.compile(r'(?:\+?\d[\s().-]*){10,}')
_LINKS = re.compile(r'https?://|\bt\.me/|\bwa\.me/|(?:^|\s)@[a-z0-9_]{3,}|\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b', re.IGNORECASE)


def has_contacts(text: str) -> bool:
    """Телефон, ссылка, мессенджер или почта в тексте. Те же правила, что у мока на фронтенде."""
    return bool(_PHONE.search(text) or _LINKS.search(text))
