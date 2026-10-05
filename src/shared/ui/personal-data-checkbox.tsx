import { Link } from 'react-router-dom';

export function PersonalDataCheckbox({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="personal-data-checkbox"><input type="checkbox" required checked={checked} onChange={event => onChange(event.target.checked)} />
    <span>Я даю <Link to="/legal/personal-data-consent/" target="_blank" rel="noopener noreferrer">согласие на обработку персональных данных</Link></span>
  </label>;
}
