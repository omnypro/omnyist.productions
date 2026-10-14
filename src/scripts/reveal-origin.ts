import type { TransitionBeforePreparationEvent } from "astro:transitions/client";
import {
  pickOrigin,
  pickReveal,
  type Point,
  type RecordedIcon,
  type Reveal,
} from "../lib/reveal-origin";

const root = document.documentElement;
let icon: RecordedIcon | undefined;
let origin: Point = { x: 0, y: 0 };
let reveal: Reveal = "grow";

function centerOf(element: Element): Point {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function applyOrigin(): void {
  root.dataset.reveal = reveal;
  root.style.setProperty("--reveal-x", `${origin.x}px`);
  root.style.setProperty("--reveal-y", `${origin.y}px`);
  root.style.setProperty(
    "--reveal-r",
    `${Math.ceil(Math.hypot(window.innerWidth, window.innerHeight))}px`,
  );
}

document.addEventListener("astro:before-preparation", (event) => {
  const navigation = event as TransitionBeforePreparationEvent;
  const { from, to, sourceElement, navigationType } = navigation;
  const leavingHome = from.pathname === "/" && to.pathname !== "/";
  const goingHome = from.pathname !== "/" && to.pathname === "/";

  if (leavingHome && sourceElement) {
    const viewport = centerOf(
      sourceElement.querySelector("[data-product-icon]") ?? sourceElement,
    );
    icon = {
      viewport,
      page: { x: viewport.x + window.scrollX, y: viewport.y + window.scrollY },
    };
  }
  if (goingHome && navigation.direction === "forward") {
    navigation.direction = "back";
  }

  reveal = pickReveal({
    leavingWebsite: document.querySelector("[data-website-window]") !== null,
    clickedWebsiteBar: sourceElement?.closest("[data-website-bar]") != null,
  });

  origin = pickOrigin({
    goingHome,
    landsAtTop: navigationType !== "traverse",
    icon,
    source: sourceElement ? centerOf(sourceElement) : undefined,
    viewportCenter: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  });
  applyOrigin();
});

document.addEventListener("astro:after-swap", applyOrigin);
