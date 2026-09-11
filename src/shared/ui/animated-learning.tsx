export function AnimatedLearning() {
  return (
    <div
      className="learning-animation"
      aria-label="Анимированная визуализация учебного пути"
    >
      <div className="learning-orbit learning-orbit-one" />
      <div className="learning-orbit learning-orbit-two" />
      <div className="learning-core">
        <span>1 200 ₽</span>
        <small>любое занятие · 60 минут</small>
      </div>
      <span className="learning-dot learning-dot-one" />
      <span className="learning-dot learning-dot-two" />
      <span className="learning-dot learning-dot-three" />
      <p>Учёба движется вперёд</p>
    </div>
  );
}
