import { describe, expect, test } from "bun:test";
import { pickOrigin, pickReveal } from "./reveal-origin";

const viewportCenter = { x: 500, y: 400 };
const icon = { viewport: { x: 100, y: 50 }, page: { x: 100, y: 450 } };

describe("pickOrigin", () => {
  test("uses the icon's viewport position when leaving home", () => {
    expect(
      pickOrigin({ goingHome: false, landsAtTop: false, icon, viewportCenter }),
    ).toEqual({ x: 100, y: 50 });
  });

  test("uses the icon's page position when a link brings the reader home at the top", () => {
    expect(
      pickOrigin({ goingHome: true, landsAtTop: true, icon, viewportCenter }),
    ).toEqual({ x: 100, y: 450 });
  });

  test("uses the icon's viewport position when history restores the old scroll", () => {
    expect(
      pickOrigin({ goingHome: true, landsAtTop: false, icon, viewportCenter }),
    ).toEqual({ x: 100, y: 50 });
  });

  test("falls back to the clicked element when no icon was recorded", () => {
    expect(
      pickOrigin({
        goingHome: true,
        landsAtTop: true,
        source: { x: 7, y: 8 },
        viewportCenter,
      }),
    ).toEqual({ x: 7, y: 8 });
  });

  test("falls back to the viewport center when nothing is known", () => {
    expect(
      pickOrigin({ goingHome: true, landsAtTop: false, viewportCenter }),
    ).toEqual(viewportCenter);
  });
});

describe("pickReveal", () => {
  test("slides the bar when a website's bar was clicked", () => {
    expect(pickReveal({ leavingWebsite: false, clickedWebsiteBar: true })).toBe(
      "bar",
    );
  });

  test("slides the bar back when leaving a website page", () => {
    expect(pickReveal({ leavingWebsite: true, clickedWebsiteBar: false })).toBe(
      "bar",
    );
  });

  test("grows from the icon for software", () => {
    expect(
      pickReveal({ leavingWebsite: false, clickedWebsiteBar: false }),
    ).toBe("grow");
  });
});
