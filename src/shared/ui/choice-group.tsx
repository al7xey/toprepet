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
  allowDeselect = false,
}: {
  label: string;
  value: string;
  options: readonly Choice[];
  onChange: (value: string) => void;
  className?: string;
  allowDeselect?: boolean;
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
          onClick={(event) => {
            if (allowDeselect && value === option.value) {
              event.preventDefault();
              onChange('');
            }
          }}
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
