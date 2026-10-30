import type { Page } from "playwright";

export interface Observation {
  url: string;
  title: string;
  scroll: string;
  focused: string;
  elements: string;
  screenshot: Buffer;
}

// What the persona "sees": a viewport screenshot plus a numbered list of the
// interactive elements currently on screen. Acting on a number (ref) is far
// more reliable than guessing pixel coordinates, and the list doubles as a
// check of what a screen reader would announce for each control.
export async function observe(page: Page): Promise<Observation> {
  const data = await page.evaluate(() => {
    document.querySelectorAll("[data-ux-ref]").forEach(el => el.removeAttribute("data-ux-ref"));
    const selector = "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=menuitem], [role=option], [tabindex]:not([tabindex='-1'])";
    const vw = window.innerWidth, vh = window.innerHeight;
    const lines: string[] = [];
    let ref = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
      if (el.closest("[aria-hidden=true], [inert]")) continue;
      // Skip a control nested in another listed control (e.g. icon inside a button).
      if (el.parentElement?.closest(selector)?.hasAttribute("data-ux-ref")) continue;
      ref += 1;
      el.setAttribute("data-ux-ref", String(ref));
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role") ?? (tag === "a" ? "link" : tag === "select" ? "dropdown" : tag === "textarea" ? "textbox" : tag === "input" ? `input:${(el as HTMLInputElement).type}` : tag);
      const labelledBy = el.getAttribute("aria-labelledby")?.split(/\s+/).map(id => document.getElementById(id)?.innerText ?? "").join(" ");
      const input = el as HTMLInputElement;
      const fieldLabel = input.labels?.[0]?.innerText;
      const name = (el.getAttribute("aria-label") || labelledBy || fieldLabel || el.innerText || input.placeholder || el.getAttribute("title") || el.querySelector("img")?.alt || "").replace(/\s+/g, " ").trim().slice(0, 90);
      const extras: string[] = [];
      if (tag === "a") {
        const href = el.getAttribute("href") ?? "";
        extras.push(href.startsWith("http") && !href.startsWith(location.origin) ? `external: ${new URL(href).hostname}` : `→ ${href.replace(location.origin, "").slice(0, 60)}`);
      }
      if (tag === "input" && (input.type === "checkbox" || input.type === "radio")) extras.push(input.checked ? "checked" : "unchecked");
      else if ((tag === "input" || tag === "textarea") && input.value) extras.push(`value: "${input.value.slice(0, 40)}"`);
      if (tag === "select") extras.push(`selected: "${(el as HTMLSelectElement).selectedOptions[0]?.text ?? ""}"; options: ${Array.from((el as HTMLSelectElement).options).map(o => o.text).slice(0, 12).join(" | ")}`);
      if (el.getAttribute("aria-expanded")) extras.push(`expanded=${el.getAttribute("aria-expanded")}`);
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") extras.push("disabled");
      if (r.width < 24 || r.height < 24) extras.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}px`);
      lines.push(`[${ref}] ${role} "${name || "(no accessible name)"}"${extras.length ? ` (${extras.join("; ")})` : ""}`);
      if (ref >= 80) break;
    }

    const a = document.activeElement as HTMLElement | null;
    let focused = "nothing (page body)";
    if (a && a !== document.body) {
      const s = getComputedStyle(a);
      const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
      const label = (a.getAttribute("aria-label") || a.innerText || (a as HTMLInputElement).placeholder || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const ar = a.getBoundingClientRect();
      const onScreen = ar.bottom > 0 && ar.top < vh;
      focused = `${a.tagName.toLowerCase()} "${label}"${a.dataset.uxRef ? ` [${a.dataset.uxRef}]` : ""}; focus outline ${ring ? "visible" : "NOT visible"}${onScreen ? "" : "; off screen"}`;
    }

    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    const pct = Math.round((window.scrollY / max) * 100);
    return {
      title: document.title,
      scroll: document.documentElement.scrollHeight <= vh + 4 ? "whole page fits on screen" : `${pct}% down the page`,
      focused,
      elements: lines.join("\n") || "(no interactive elements on screen)",
    };
  });

  // CSS-pixel screenshot: a phone screen stays phone-sized for the model
  // instead of 3x device pixels, which keeps image tokens down.
  const screenshot = await page.screenshot({ type: "jpeg", quality: 60, scale: "css", animations: "disabled", caret: "initial" });
  return { url: page.url(), screenshot, ...data };
}

export function describe(o: Observation, baseOrigin: string) {
  const path = o.url.startsWith(baseOrigin) ? o.url.slice(baseOrigin.length) || "/" : o.url;
  return [
    `Page: ${path}  —  "${o.title}"`,
    `Position: ${o.scroll}`,
    `Keyboard focus: ${o.focused}`,
    "On-screen interactive elements:",
    o.elements,
  ].join("\n");
}
