import { Link } from 'react-router-dom';
import type { Tutor } from '../api/types';

/** Real catalogue portraits provide context without unrelated decorative illustrations. */
export function HeroTutors({ tutors }: { tutors: Tutor[] }) {
  return <div className="trh-portrait-pair">
    {tutors.slice(0, 2).map((tutor) => (
      <Link key={tutor.id} className="trh-portrait" to={`/teachers/${tutor.id}`} aria-label={`Анкета: ${tutor.name}`}>
        <img src={tutor.photo} srcSet={tutor.photoSrcSet} sizes="(min-width: 761px) 300px, 45vw" width={960} height={1280} alt={tutor.name} fetchPriority="high" />
        <span className="trh-portrait-caption"><b>{tutor.name}</b><span>{tutor.cardSubjects}</span></span>
      </Link>
    ))}
  </div>;
}
