export function BrandName({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-wordmark ${className}`.trim()}>El_Inside</span>
  );
}

export function BrandText({ children }: { children: string }) {
  return (
    <>
      {children
        .split(/(el_inside)/gi)
        .map((part, index) => (index % 2 ? <BrandName key={index} /> : part))}
    </>
  );
}
