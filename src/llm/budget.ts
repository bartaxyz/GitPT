// Jeden zdroj pravdy pro výpočet, kolik tokenů promptu se vejde do okna.
// Sdílí ho produkce (summarizeDiff.ts) i benchmark (harness.mjs), aby se
// nemohly rozejít (viz EDITORS-84 / EDITORS-92).

/** Rezerva: necháme 10 % použitelného okna jako bezpečnostní polštář. */
export const MARGIN = 0.9;

/**
 * Maximální počet tokenů promptu, který se vejde do `window`,
 * když si necháme `reserved` tokenů na odpověď modelu.
 */
export const fitBudget = (window: number, reserved: number): number =>
  Math.floor((window - reserved) * MARGIN);
