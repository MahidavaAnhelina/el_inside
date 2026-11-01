"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProductId } from "@/lib/products";

type Selection = { kind: "catalog" | "custom"; product: ProductId | "" };
const WorkshopContext = createContext<{
  selection: Selection;
  select: (selection: Selection) => void;
} | null>(null);
export function useWorkshop() {
  const value = useContext(WorkshopContext);
  if (!value) throw new Error("WorkshopProvider is required");
  return value;
}
export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [selection, select] = useState<Selection>({
    kind: "catalog",
    product: "",
  });
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    function animate(
      element: Element | null,
      frames: Keyframe[],
      duration = 500,
      delay = 0,
    ) {
      if (!element || preference.matches) return;
      const animation = element.animate(frames, {
        duration,
        delay,
        easing: "cubic-bezier(.16,1,.3,1)",
        fill: "backwards",
      });
      animations.add(animation);
      animation.finished.then(
        () => animations.delete(animation),
        () => animations.delete(animation),
      );
    }
    const reveal = [
      { opacity: 0.4, transform: "translateY(14px)" },
      { opacity: 1, transform: "translateY(0)" },
    ];
    animate(root.current?.querySelector(".hero-copy") ?? null, reveal);
    animate(
      root.current?.querySelector(".main-photo") ?? null,
      [
        { opacity: 0.6, clipPath: "inset(0 0 9% 0)" },
        { opacity: 1, clipPath: "inset(0 0 0 0)" },
      ],
      700,
    );
    animate(
      root.current?.querySelector(".little-photo") ?? null,
      [
        { opacity: 0.4, transform: "translateY(-14px) rotate(-10deg)" },
        { opacity: 1, transform: "translateY(0) rotate(-6deg)" },
      ],
      650,
      100,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            animate(entry.target, reveal);
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll(".about, .how")
      .forEach((element) => observer.observe(element));
    const cancel = () => animations.forEach((animation) => animation.cancel());
    const onChange = () => {
      if (preference.matches) cancel();
    };
    preference.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      cancel();
      preference.removeEventListener("change", onChange);
    };
  }, []);
  return (
    <WorkshopContext.Provider value={{ selection, select }}>
      <div ref={root}>{children}</div>
    </WorkshopContext.Provider>
  );
}
