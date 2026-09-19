import { useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '../../../components/ui/carousel';

const slides = [
  { src: '/images/hero-slide-1.webp', darkSrc: '/images/hero-slide-dark-1.webp', alt: 'Скидка 300 рублей по промокоду ОСЕНЬ' },
  { src: '/images/hero-slide-2.webp', darkSrc: '/images/hero-slide-dark-2.webp', alt: 'Ученик читает книгу' },
  { src: '/images/hero-slide-3.webp', darkSrc: '/images/hero-slide-dark-3.webp', alt: 'Ученица занимается за ноутбуком' },
  { src: '/images/hero-slide-4.webp', darkSrc: '/images/hero-slide-dark-4.webp', alt: 'Ученик занимается с книгой' },
  { src: '/images/hero-slide-5.webp', darkSrc: '/images/hero-slide-dark-5.webp', alt: 'Выпускник в академической шапочке' },
];

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on('select', updateCurrent);
    api.on('reInit', updateCurrent);
    return () => {
      api.off('select', updateCurrent);
      api.off('reInit', updateCurrent);
    };
  }, [api]);

  useEffect(() => {
    if (!api || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => api.scrollNext(), 4500);
    return () => window.clearTimeout(timer);
  }, [api, current]);

  return (
    <Carousel
      className="hero-carousel"
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
            <picture>
              <source media="(prefers-color-scheme: dark)" srcSet={slide.darkSrc} />
              <img
                src={slide.src}
                alt={slide.alt}
                width="1200"
                height="900"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                draggable={false}
              />
            </picture>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
