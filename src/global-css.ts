import { css } from 'lit'

export const globalVariables = css`
  /* @link https://utopia.fyi/type/calculator?c=320,16,1.2,1240,18,1.25,5,3,&s=0.75|0.5|0.25,1.5|2|3|4|6,s-l&g=s,l,xl,12 */
  /* Step -3: 9.2593px → 9.216px */
  --step--3: clamp(0.576rem, 0.5796rem + -0.0047vw, 0.5787rem);
  /* Step -2: 11.1111px → 11.52px */
  --step--2: clamp(0.6944rem, 0.6856rem + 0.0444vw, 0.72rem);
  /* Step -1: 13.3333px → 14.4px */
  --step--1: clamp(0.8333rem, 0.8101rem + 0.1159vw, 0.9rem);
  /* Step 0: 16px → 18px */
  --step-0: clamp(1rem, 0.9565rem + 0.2174vw, 1.125rem);
  /* Step 1: 19.2px → 22.5px */
  --step-1: clamp(1.2rem, 1.1283rem + 0.3587vw, 1.4063rem);
  /* Step 2: 23.04px → 28.125px */
  --step-2: clamp(1.44rem, 1.3295rem + 0.5527vw, 1.7578rem);
  /* Step 3: 27.648px → 35.1563px */
  --step-3: clamp(1.728rem, 1.5648rem + 0.8161vw, 2.1973rem);

  /* @link https://utopia.fyi/space/calculator?c=320,16,1.2,1240,18,1.25,5,1,&s=0.75|0.5|0.25,1.5|2|3|4|6,s-l&g=s,l,xl,12 */
  /* Space 3xs: 4px → 5px */
  --space-3xs: clamp(0.25rem, 0.2283rem + 0.1087vw, 0.3125rem);
  /* Space 2xs: 8px → 9px */
  --space-2xs: clamp(0.5rem, 0.4783rem + 0.1087vw, 0.5625rem);
  /* Space xs: 12px → 14px */
  --space-xs: clamp(0.75rem, 0.7065rem + 0.2174vw, 0.875rem);
  /* Space s: 16px → 18px */
  --space-s: clamp(1rem, 0.9565rem + 0.2174vw, 1.125rem);
  /* Space m: 24px → 27px */
  --space-m: clamp(1.5rem, 1.4348rem + 0.3261vw, 1.6875rem);
  /* Space l: 32px → 36px */
  --space-l: clamp(2rem, 1.913rem + 0.4348vw, 2.25rem);
  /* Space xl: 48px → 54px */
  --space-xl: clamp(3rem, 2.8696rem + 0.6522vw, 3.375rem);
  /* Space 2xl: 64px → 72px */
  --space-2xl: clamp(4rem, 3.8261rem + 0.8696vw, 4.5rem);
  /* Space 3xl: 96px → 108px */
  --space-3xl: clamp(6rem, 5.7391rem + 1.3043vw, 6.75rem);

  /* One-up pairs */
  /* Space 3xs-2xs: 4px → 9px */
  --space-3xs-2xs: clamp(0.25rem, 0.1413rem + 0.5435vw, 0.5625rem);
  /* Space 2xs-xs: 8px → 14px */
  --space-2xs-xs: clamp(0.5rem, 0.3696rem + 0.6522vw, 0.875rem);
  /* Space xs-s: 12px → 18px */
  --space-xs-s: clamp(0.75rem, 0.6196rem + 0.6522vw, 1.125rem);
  /* Space s-m: 16px → 27px */
  --space-s-m: clamp(1rem, 0.7609rem + 1.1957vw, 1.6875rem);
  /* Space m-l: 24px → 36px */
  --space-m-l: clamp(1.5rem, 1.2391rem + 1.3043vw, 2.25rem);
  /* Space l-xl: 32px → 54px */
  --space-l-xl: clamp(2rem, 1.5217rem + 2.3913vw, 3.375rem);
  /* Space xl-2xl: 48px → 72px */
  --space-xl-2xl: clamp(3rem, 2.4783rem + 2.6087vw, 4.5rem);
  /* Space 2xl-3xl: 64px → 108px */
  --space-2xl-3xl: clamp(4rem, 3.0435rem + 4.7826vw, 6.75rem);

  /* Custom pairs */
  /* Space s-l: 16px → 36px */
  --space-s-l: clamp(1rem, 0.5652rem + 2.1739vw, 2.25rem);

  /* --adn-volume-width: clamp(3.125rem, -0.4464rem + 17.8571vw, 6.25rem); */
`

// Light-mode overrides for the shared `--_*` design tokens. The base dark
// values live in each component's `:host` block, so this only needs to flip the
// palette for the light theme (explicit `theme="light"`) and for `theme="auto"`
// when the visitor's OS/browser prefers a light color scheme.
export const themePalette = css`
  :host([theme="light"]) {
    --_bg: var(--adn-bg, #f4f4f5);
    --_bg-light: var(--adn-bg-light, #e4e4e7);
    --_color-font: var(--adn-color-font, #1c1c1e);
    --_color-font-muted: var(--adn-color-font-muted, #52525b);
    --_border-color: var(--adn-border-color, #d4d4d8);
    --_color-highlight: var(--adn-color-highlight, rgba(0, 0, 0, 0.06));
    /* Darker greyscale accent so controls read on the light background. */
    --_color-accent: var(--adn-color-accent, #52525b);
    --_color-accent-rgb: var(--adn-color-accent-rgb, 82, 82, 91);
  }

  @media (prefers-color-scheme: light) {
    :host([theme="auto"]) {
      --_bg: var(--adn-bg, #f4f4f5);
      --_bg-light: var(--adn-bg-light, #e4e4e7);
      --_color-font: var(--adn-color-font, #1c1c1e);
      --_color-font-muted: var(--adn-color-font-muted, #52525b);
      --_border-color: var(--adn-border-color, #d4d4d8);
      --_color-highlight: var(--adn-color-highlight, rgba(0, 0, 0, 0.06));
      --_color-accent: var(--adn-color-accent, #52525b);
      --_color-accent-rgb: var(--adn-color-accent-rgb, 82, 82, 91);
    }
  }
`

export const globalReset = css`
  *, *:before, *:after {
    box-sizing: border-box;
  }

  @media (prefers-reduced-motion: no-preference) {
    interpolate-size: allow-keywords;
  }

  img,canvas, svg {
    display: block;
    max-width: 100%;
  }

  input, button {
    font: inherit;
  }
`
