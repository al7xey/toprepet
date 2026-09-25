import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Directions } from '../../widgets/directions/directions';
import { HowItWorks } from '../../widgets/how-it-works/how-it-works';
import { Teachers } from '../../widgets/teachers/teachers';
import { FreeIntro } from '../../widgets/free-intro/free-intro';
import { Pricing } from '../../widgets/pricing/pricing';
import Faq from '../../widgets/faq/faq';

function Intro({ title, text }: { title: string; text: string }) {
  return <div className="container"><header className="page-heading"><h1>{title}</h1><p>{text}</p></header></div>;
}

function PageLink({ to, children }: { to: string; children: ReactNode }) {
  return <div className="container"><Link className="button button-primary" to={to}>{children}</Link></div>;
}

export function TeachersPage() {
  return <><Intro title="Репетиторы TopRepet" text="Подберите преподавателя под свою цель, предмет и формат подготовки."/><Teachers/><PageLink to="/free-intro/">Бесплатное знакомство</PageLink></>;
}

export function DirectionsPage() {
  return <><Intro title="Направления занятий" text="Школьные предметы, домашние задания, подготовка к ОГЭ и ЕГЭ, занятия для начальных классов."/><Directions/><PageLink to="/lessons/">Выбрать занятие</PageLink></>;
}

export function HowItWorksPage() {
  return <><Intro title="Как работает TopRepet" text="Выберите цель, познакомьтесь с преподавателем и занимайтесь по индивидуальному плану."/><HowItWorks/><FreeIntro/><PageLink to="/free-intro/">Узнать о знакомстве</PageLink></>;
}

export function PricePage() {
  return <><Intro title="Стоимость занятий" text="Узнайте стоимость индивидуального занятия и начните с бесплатного знакомства."/><Pricing/><PageLink to="/free-intro/">Бесплатное знакомство</PageLink></>;
}

export function FaqPage() {
  return <><Intro title="Частые вопросы" text="Ответы о занятиях, оплате и бесплатном знакомстве с преподавателем."/><Faq/><PageLink to="/contact/">Не нашли ответ? Напишите менеджеру</PageLink></>;
}
