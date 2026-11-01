export function Icon({
  name,
}: {
  name: "arrow" | "heart" | "upload" | "info" | "check" | "thread";
}) {
  return (
    <svg aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}
