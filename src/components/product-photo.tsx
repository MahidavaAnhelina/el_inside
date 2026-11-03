import dimensions from "@/lib/product-image-dimensions.json";

const imageDimensions: Record<
  string,
  {
    width: number;
    height: number;
    thumbnailWidth: number;
    thumbnailHeight: number;
  }
> = dimensions;

export function ProductPhoto({
  image,
  alt,
  sizes,
  loading = "lazy",
}: {
  image: string;
  alt: string;
  sizes: string;
  loading?: "lazy" | "eager";
}) {
  const { width, height, thumbnailWidth } = imageDimensions[image];
  const thumbnail = image.replace(".webp", "-thumb.webp");
  return (
    // These local variants are already optimized; serve their actual pixel widths.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/assets/${thumbnail}`}
      srcSet={
        thumbnailWidth < width
          ? `/assets/${thumbnail} ${thumbnailWidth}w, /assets/${image} ${width}w`
          : `/assets/${image} ${width}w`
      }
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={loading}
      decoding="async"
    />
  );
}
