import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
interface Choice {
  value: string;
  label: string;
}
export function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  options: readonly Choice[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string' && options.some((o) => o.value === next))
          onChange(next);
      }}
      className={'choice-group ' + className}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={
            'choice-option' + (value === option.value ? ' is-selected' : '')
          }
        >
          <RadioGroupItem
            value={option.value}
            inputRef={(input) => {
              input?.setAttribute('aria-hidden', 'true');
            }}
            className="choice-radio"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
