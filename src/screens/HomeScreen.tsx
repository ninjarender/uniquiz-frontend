import { FloatingShapes, HOME_SHAPES, Logo } from '../shared/ui';

/** D1 shell — the auth card arrives with task fe-0002. */
export function HomeScreen() {
  return (
    <div className="grad-bg relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden">
      <FloatingShapes shapes={HOME_SHAPES} />
      <Logo />
      <div className="relative max-w-[340px] text-center text-[12.5px] leading-relaxed text-[#cdbfef]">
        Тестування без списування: індивідуальні варіанти, відповіді генерує ШІ,
        вміст під спойлерами
      </div>
    </div>
  );
}
