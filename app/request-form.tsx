'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { directions, isContactValid } from '@/lib/request-validation';
export default function RequestForm({ direction, onDirectionChange }: { direction:string; onDirectionChange:(value:string)=>void }) {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle'|'loading'|'success'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const requestId = useRef<string | null>(null);
  const submitting = useRef(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')||'').trim();
    const contact = String(data.get('contact')||'').trim();
    if(name.length < 2) {setError('Укажите имя: минимум 2 символа.'); return;}
    if(!isContactValid(contact)) {setError('Укажите телефон из 10–15 цифр или Telegram: @username (от 5 символов).');return;}
    if(!consent) {setError('Подтвердите согласие на использование контактов для ответа на заявку.');return;}
    submitting.current = true;
    setStatus('loading');
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:requestId.current,name,contact,direction,message:String(data.get('message')||'').trim(),consent,website:String(data.get('website')||'')}) });
      const result = await response.json() as {error?:string;reference:string};
      if(!response.ok) throw new Error(result.error || 'Не удалось сохранить заявку. Попробуйте ещё раз.');
      setReference(result.reference); setStatus('success');
    } catch (err) {setError(err instanceof Error ? err.message : 'Нет связи с сайтом. Попробуйте ещё раз.');setStatus('idle');}
    finally {submitting.current = false;}
  }
  if(status==='success') return <div className="form-success" role="status" aria-live="polite"><Check/><h3>Заявка сохранена</h3><p>Спасибо! Вы указали направление «{direction}». Ваши контакты сохранены вместе с заявкой для организации знакомства.</p><small>Номер заявки: {reference}</small><button className="button dark-button" onClick={()=>{setStatus('idle');setConsent(false);requestId.current=null;}}>Отправить ещё одну заявку <ArrowUpRight size={18}/></button></div>;
  return <form className="request-form" onSubmit={submit} aria-label="Заявка на знакомство">
    <div className="form-field"><label htmlFor="name">Как к вам обращаться *</label><input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Ваше имя" /></div>
    <div className="form-field"><label htmlFor="contact">Телефон или Telegram *</label><input id="contact" name="contact" required maxLength={60} autoComplete="tel" placeholder="+7 (999) 123-45-67 или @username" aria-describedby="contact-hint"/><small id="contact-hint">Если вы школьник, можно указать контакт родителя.</small></div>
    <div className="form-field"><label id="direction-label" htmlFor="direction">Направление *</label><Select value={direction} onValueChange={value=>value && onDirectionChange(value)} items={directions.map(d=>({value:d,label:d}))}><SelectTrigger id="direction" aria-labelledby="direction-label"><SelectValue/></SelectTrigger><SelectContent>{directions.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
    <div className="form-field"><label htmlFor="message">С чем нужна помощь <span className="optional">· необязательно</span></label><textarea id="message" name="message" maxLength={1000} placeholder="Класс, предмет, цель занятий…"/></div>
    <div hidden aria-hidden="true"><label htmlFor="website">Сайт</label><input id="website" name="website" autoComplete="off" tabIndex={-1}/></div>
    <div className="consent"><Checkbox id="consent" checked={consent} onCheckedChange={setConsent}/><label htmlFor="consent">Разрешаю использовать моё имя, контакт и описание задачи для ответа на заявку и организации знакомства с репетитором.</label></div>
    <p className="privacy-copy">Данные заявки сохраняются на сайте и не публикуются.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="button primary" disabled={status==='loading'} type="submit">{status==='loading'?'Сохраняем заявку…':'Записаться на знакомство'} <ArrowUpRight size={20}/></button>
  </form>;
}
