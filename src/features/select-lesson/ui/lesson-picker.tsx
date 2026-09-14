import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  goals,
  subjects,
  foundationSubjects,
  exams,
  examSubjects,
  availableGrades,
  type LessonSelection,
  type Goal,
} from '../../../entities/lesson';
import {
  setGoal,
  setSubject,
  setGrade,
  setExam,
  resetSelection,
  setPromoCode,
} from '../model/slice';
import { ChoiceGroup } from '../../../shared/ui/choice-group';
import { PRICE_LABEL } from '../../../shared/config/site';
import { PromoCode } from '../../promo-code';
export function LessonPicker({
  initialGoal,
  initialSubject = '',
  initialExam = '',
}: {
  initialGoal?: Goal;
  initialSubject?: string;
  initialExam?: string;
}) {
  const dispatch = useDispatch();
  const [, setParams] = useSearchParams();
  const selection = useSelector(
    (state: { lesson: LessonSelection }) => state.lesson,
  );
  useEffect(() => {
    if (!initialGoal && !initialSubject && !initialExam) return;
    if (initialGoal) dispatch(setGoal(initialGoal));
    if (initialSubject) dispatch(setSubject(initialSubject));
    if (initialExam) dispatch(setExam(initialExam));
    // Consume a card's preset so browser Back cannot overwrite later choices.
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      ['goal', 'subject', 'exam'].forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [dispatch, initialGoal, initialSubject, initialExam, setParams]);
  const items =
    selection.goal === 'foundation'
      ? foundationSubjects
      : selection.goal === 'exam'
        ? examSubjects
        : subjects;
  const grades = availableGrades(
    selection.goal,
    selection.subject,
    selection.exam,
  );
  return (
    <div className="lesson-layout">
      <div className="lesson-options">
        <section className="option-section">
          <h2>Какая помощь нужна?</h2>
          <ChoiceGroup
            label="Цель занятий"
            value={selection.goal}
            options={goals.map((g) => ({ value: g.id, label: g.label }))}
            onChange={(v) => dispatch(setGoal(v))}
            className="goal-options"
          />
        </section>
        {selection.goal === 'exam' ? (
          <section className="option-section">
            <h2>Экзамен</h2>
            <ChoiceGroup
              label="Экзамен"
              value={selection.exam}
              options={exams.map((v) => ({ value: v, label: v }))}
              onChange={(v) => dispatch(setExam(v))}
            className="exam-options"
          />
          <p className="availability-note">Сейчас готовим к экзаменам только по информатике. По другим предметам ищем преподавателей.</p>
          </section>
        ) : null}
        <section className="option-section">
          <h2>{selection.goal === 'foundation' ? 'Направление' : 'Предмет'}</h2>
          <ChoiceGroup
            label={selection.goal === 'foundation' ? 'Направление' : 'Предмет'}
            value={selection.subject}
            options={items.map((v) => ({ value: v, label: v }))}
            onChange={(v) => dispatch(setSubject(v))}
            className="subject-options"
          />
        </section>
          <section className="option-section">
            <h2>Класс</h2>
            <ChoiceGroup
              label="Класс"
              value={selection.grade}
              options={grades.map((v) => ({
                value: v,
                label: v === 'До школы' ? v : v + ' класс',
              }))}
              onChange={(v) => dispatch(setGrade(v))}
              className="grade-options"
            />
          </section>
      </div>
      <aside className="selection-summary" aria-labelledby="selection-title">
        <h2 id="selection-title">Ваши занятия</h2>
        <dl className="selection-facts" aria-live="polite">
          <div><dt>Направление</dt><dd>{goals.find((g) => g.id === selection.goal)!.label}</dd></div>
          <div><dt>Предмет</dt><dd>{selection.subject || 'Не выбран'}</dd></div>
          <div><dt>{selection.goal === 'exam' ? 'Экзамен' : 'Класс'}</dt>
            <dd>{selection.goal === 'exam' ? selection.exam : selection.grade || 'Не выбран'}</dd></div>
          {selection.goal === 'exam' && <div><dt>Класс</dt><dd>{selection.grade || 'Не выбран'}</dd></div>}
        </dl>
        <PromoCode value={selection.promoCode} onChange={(value) => dispatch(setPromoCode(value))} />
        <div className="summary-price">
          <strong>{PRICE_LABEL}</strong>
          <span>/ 60 минут</span>
        </div>
        <p className="summary-free">Бесплатное знакомство: 20 минут и индивидуальный план</p>
        <Link className="button button-primary" to="/lessons#contact">Выбрать мессенджер</Link>
        <button
          className="reset-selection"
          type="button"
          onClick={() => dispatch(resetSelection())}
        >
          Сбросить выбор
        </button>
      </aside>
    </div>
  );
}
