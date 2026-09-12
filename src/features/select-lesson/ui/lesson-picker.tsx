import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import {
  goals,
  subjects,
  foundationSubjects,
  exams,
  examSubjects,
  availableGrades,
  selectionDescription,
  type LessonSelection,
  type Goal,
} from '../../../entities/lesson';
import {
  setGoal,
  setSubject,
  setGrade,
  setExam,
  resetSelection,
} from '../model/slice';
import { ChoiceGroup } from '../../../shared/ui/choice-group';
import { ActionLink } from '../../../shared/ui/action-link';
import { PRICE_LABEL } from '../../../shared/config/site';
export function LessonPicker({
  initialGoal,
  initialSubject = '',
  initialExam = '',
}: {
  initialGoal: Goal;
  initialSubject?: string;
  initialExam?: string;
}) {
  const dispatch = useDispatch();
  const selection = useSelector(
    (state: { lesson: LessonSelection }) => state.lesson,
  );
  useEffect(() => {
    dispatch(setGoal(initialGoal));
    if (initialSubject) dispatch(setSubject(initialSubject));
    if (initialExam) dispatch(setExam(initialExam));
  }, [dispatch, initialGoal, initialSubject, initialExam]);
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
        {selection.goal !== 'exam' ? (
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
        ) : null}
      </div>
      <aside className="selection-summary" aria-labelledby="selection-title">
        <h2 id="selection-title">Ваши занятия</h2>
        <div className="selection-facts" aria-live="polite">
          <p>{goals.find((g) => g.id === selection.goal)!.label}</p>
          <strong>{selection.subject || 'Предмет можно уточнить'}</strong>
          <span>
            {selection.goal === 'exam' ? selection.exam + ' · ' : ''}
            {selection.grade
              ? selection.grade === 'До школы'
                ? 'До школы'
                : selection.grade + ' класс'
              : 'Класс можно уточнить'}
          </span>
        </div>
        <div className="summary-price">
          <strong>{PRICE_LABEL}</strong>
          <span>/ 60 минут</span>
        </div>
        <p className="summary-free">Первое занятие бесплатно</p>
        <ActionLink topic={selectionDescription(selection)}>
          Написать в Telegram
        </ActionLink>
        <p className="summary-note">
          Наличие преподавателя и расписание уточним в переписке.
        </p>
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
