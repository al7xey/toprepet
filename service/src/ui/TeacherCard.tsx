import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tutorPath, type CatalogItem } from '../api/catalog';
import { photoUrl } from '../api/tutor';
import { fmtMoney } from '../lib/money';
import { first } from '../lib/names';

/** TeacherCard (mockup `catalog`): 4:5 photo, glass plate with subjects and «Имя · от 2 000 ₽»; the whole card is the link, no button. */
export function TeacherCard({ t, search = '' }: { t: CatalogItem; search?: string }) {
  const [broken, setBroken] = useState(false);
  const url = broken ? null : photoUrl(t.photoPath);
  const subjects = t.subjects.join(', ');
  const price = t.priceFrom ? ` · от ${fmtMoney(t.priceFrom)}` : '';
  return (
    <Link className={`tc${url ? ' has' : ''}`} to={`${tutorPath(t)}${search}`} aria-label={`${t.name}: ${subjects}${price.replace(' · ', ', ')}`}>
      {url ? <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} /> : null}
      <span className="gl" aria-hidden="true">
        <b className="ticker">{subjects}</b>
        <span>
          {first(t.name)}
          {price}
        </span>
      </span>
    </Link>
  );
}
