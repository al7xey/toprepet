export function Icon({ name, style }: { name: string; style?: React.CSSProperties }) {
  return <i className={`i i-${name}`} aria-hidden="true" style={style} />;
}

export function achievementIcon(title: string) {
  if (/диплом|университет|институт|магистр|бакалавр|образован|педагог|специалитет/i.test(title)) return 'school';
  if (/язык|англий|cambridge|ielts|toefl|fce|b2|c1|c2/i.test(title)) return 'globe';
  if (/сертификат|курс|квалификац|методик/i.test(title)) return 'book';
  return 'star';
}
