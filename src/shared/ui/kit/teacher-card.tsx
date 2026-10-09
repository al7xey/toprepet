import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from './icon';

export interface TeacherCardData {
  id: string;
  name: string;
  subjects: string;
  meta: string;
  price: string;
  photo: string;
  photoSrcSet?: string;
  to: string;
}

/* UI kit teacher card: 4:5 photo, fixed-height glass plate (subjects / name + meta / price), heart over the photo. */
export function TeacherCard({ teacher }: { teacher: TeacherCardData }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="tr-tcard-wrap">
      <Link className="tr-tcard" to={teacher.to} aria-label={`${teacher.name}, ${teacher.subjects}`}>
        <img
          src={teacher.photo}
          srcSet={teacher.photoSrcSet}
          sizes="(min-width: 760px) 280px, 50vw"
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className="tr-tplate tr-glass" aria-hidden="true">
          <span className="subj">{teacher.subjects}</span>
          <span className="meta">{teacher.meta}</span>
          <span className="price">{teacher.price}</span>
        </span>
      </Link>
      <button
        className="tr-fav tr-glass-color"
        type="button"
        aria-label={`В избранное: ${teacher.name}`}
        aria-pressed={saved}
        onClick={() => setSaved((value) => !value)}
      >
        <Icon name="heart" />
      </button>
    </div>
  );
}

export function TeacherGrid({ teachers }: { teachers: readonly TeacherCardData[] }) {
  return (
    <div className="tr-tgrid">
      {teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
    </div>
  );
}
