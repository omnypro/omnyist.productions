export interface Point {
  x: number;
  y: number;
}

export interface RecordedIcon {
  /** The icon's center in viewport coordinates when it was clicked. */
  viewport: Point;
  /** The icon's center in page coordinates when it was clicked. */
  page: Point;
}

export interface OriginInput {
  goingHome: boolean;
  /** True when the navigation opens the new page at its top, as a link click does. */
  landsAtTop: boolean;
  icon?: RecordedIcon;
  /** The center of the element that was clicked, when there was one. */
  source?: Point;
  viewportCenter: Point;
}

export function pickOrigin(input: OriginInput): Point {
  const { goingHome, landsAtTop, icon, source, viewportCenter } = input;
  if (icon) {
    return goingHome && landsAtTop ? icon.page : icon.viewport;
  }
  return source ?? viewportCenter;
}
