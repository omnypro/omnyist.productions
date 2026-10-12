const segmenter = new Intl.Segmenter();

export function monogram(name: string): string {
  for (const { segment } of segmenter.segment(name)) {
    return segment;
  }
  return "";
}
