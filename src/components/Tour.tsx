import { Icon } from './Icons';

interface TourProps {
  step: number;
  total: number;
  title: string;
  text: string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function TourOverlay({ step, total, title, text, onNext, onPrev, onClose }: TourProps) {
  return (
    <div className="tour" role="dialog" aria-label="Обучение">
      <div className="tour__head">
        <span className="eyebrow">
          Обучение · шаг {step + 1} из {total}
        </span>
        <button className="icon-btn" onClick={onClose} aria-label="Завершить обучение">
          <Icon name="close" size={15} />
        </button>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="tour__progress" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i <= step ? 'is-done' : ''} />
        ))}
      </div>
      <div className="tour__actions">
        <button className="btn btn--ghost" onClick={onPrev} disabled={step === 0}>
          Назад
        </button>
        <button className="btn btn--primary" onClick={onNext}>
          {step === total - 1 ? 'Начать исследование' : 'Далее'}
          <Icon name="chevron" size={14} />
        </button>
      </div>
    </div>
  );
}
