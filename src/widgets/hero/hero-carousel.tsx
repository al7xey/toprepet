import { useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '../../../components/ui/carousel';

const slides = [
  { src: '/images/hero-slide-1-1200.webp', alt: 'Скидка 300 рублей по промокоду ОСЕНЬ' },
  { src: '/images/hero-slide-2-1200.webp', alt: 'Ученик читает книгу' },
  { src: '/images/hero-slide-3-1200.webp', alt: 'Ученица занимается за ноутбуком' },
  { src: '/images/hero-slide-4-1200.webp', alt: 'Ученик занимается с книгой' },
  { src: '/images/hero-slide-5-1200.webp', alt: 'Выпускник в академической шапочке' },
];

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: number | undefined;
    let interacting = false;
    const clearTimer = () => window.clearTimeout(timer);
    const scheduleNext = () => {
      clearTimer();
      if (document.visibilityState !== 'visible' || interacting) return;
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') api.scrollNext();
      }, 4500);
    };
    const handlePointerDown = () => {
      interacting = true;
      clearTimer();
    };
    const handlePointerUp = () => {
      interacting = false;
      scheduleNext();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        interacting = false;
        clearTimer();
        // Finish any active transition before background animation is suspended.
        api.scrollTo(api.selectedScrollSnap(), true);
      } else {
        scheduleNext();
      }
    };
    scheduleNext();
    api.on('select', scheduleNext);
    api.on('reInit', scheduleNext);
    api.on('pointerDown', handlePointerDown);
    api.on('pointerUp', handlePointerUp);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearTimer();
      api.off('select', scheduleNext);
      api.off('reInit', scheduleNext);
      api.off('pointerDown', handlePointerDown);
      api.off('pointerUp', handlePointerUp);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [api]);

  return (
    <Carousel
      className="hero-carousel"
      tabIndex={0}
      wheelGestures
      setApi={setApi}
      opts={{ loop: true, align: 'start' }}
      aria-label="Изображения TopRepet"
    >
      <CarouselContent className="hero-carousel-track">
        {slides.map((slide, index) => (
          <CarouselItem
            className="hero-carousel-slide"
            key={slide.src}
            aria-label={`${index + 1} из ${slides.length}`}
          >
            <img
              src={slide.src}
              srcSet={`${slide.src.replace('-1200.webp', '-640.webp')} 640w, ${slide.src} 1200w`}
              sizes="(min-width: 760px) min(560px, calc((100vw - 104px) / 2)), calc(100vw - 28px)"
              alt={slide.alt}
              width="1200"
              height="900"
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
