'use client';

import Aurora from './Aurora.source';

export default function AuroraExample() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-950">
      <div className="pointer-events-none absolute inset-0">
        <Aurora
          colorStops={['#7cff67', '#B497CF', '#5227FF']}
          blend={1}
          amplitude={1.0}
          speed={1.5}
        />
      </div>

      <div className="relative z-10 flex min-h-[420px] items-center justify-center p-8 text-center">
        <div className="max-w-xl rounded-2xl border border-white/10 bg-black/30 p-8 text-white shadow-2xl backdrop-blur-md">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-200">
            Вектор
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Aurora background
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/75">
            Reference-пример фонового жидкого градиента для будущего auth layout.
            Компонент должен быть декоративным, находиться позади формы и не
            перехватывать клики.
          </p>
        </div>
      </div>
    </div>
  );
}