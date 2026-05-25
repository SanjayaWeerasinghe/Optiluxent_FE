/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ── Color Palette ─────────────────────────────────────────────────────────
      // ALL components must use these tokens — never hardcode hex values.
      // Retheme the entire app by changing values here only.
      colors: {
        // Primary — Industrial Blue
        primary:                    '#00236f',
        'on-primary':               '#ffffff',
        'primary-container':        '#1e3a8a',
        'on-primary-container':     '#90a8ff',
        'primary-fixed':            '#dce1ff',
        'primary-fixed-dim':        '#b6c4ff',
        'on-primary-fixed':         '#00164e',
        'on-primary-fixed-variant': '#264191',
        'inverse-primary':          '#b6c4ff',

        // Secondary — Slate
        secondary:                    '#515f74',
        'on-secondary':               '#ffffff',
        'secondary-container':        '#d5e3fd',
        'on-secondary-container':     '#57657b',
        'secondary-fixed':            '#d5e3fd',
        'secondary-fixed-dim':        '#b9c7e0',
        'on-secondary-fixed':         '#0d1c2f',
        'on-secondary-fixed-variant': '#3a485c',

        // Tertiary — Dark Slate
        tertiary:                    '#222a3e',
        'on-tertiary':               '#ffffff',
        'tertiary-container':        '#384055',
        'on-tertiary-container':     '#a4acc5',
        'tertiary-fixed':            '#dae2fd',
        'tertiary-fixed-dim':        '#bec6e0',
        'on-tertiary-fixed':         '#131b2e',
        'on-tertiary-fixed-variant': '#3f465c',

        // Error — Rose
        error:              '#ba1a1a',
        'on-error':         '#ffffff',
        'error-container':  '#ffdad6',
        'on-error-container': '#93000a',

        // Surface tonal layers
        background:                   '#f7f9fb',
        'on-background':              '#191c1e',
        surface:                      '#f7f9fb',
        'on-surface':                 '#191c1e',
        'surface-variant':            '#e0e3e5',
        'on-surface-variant':         '#444651',
        'surface-dim':                '#d8dadc',
        'surface-bright':             '#f7f9fb',
        'surface-container-lowest':   '#ffffff',
        'surface-container-low':      '#f2f4f6',
        'surface-container':          '#eceef0',
        'surface-container-high':     '#e6e8ea',
        'surface-container-highest':  '#e0e3e5',
        'surface-tint':               '#4059aa',
        'inverse-surface':            '#2d3133',
        'inverse-on-surface':         '#eff1f3',

        // Outline
        outline:         '#757682',
        'outline-variant': '#c5c5d3',

        // Semantic status colours
        success: '#22c55e',  // Emerald — Approved, Paid, Passed, In-Stock
        warning: '#eab308',  // Amber   — Pending, Partial, Low-Stock
        info:    '#3b82f6',  // Sky     — In-Transit, In-Progress
      },

      // ── Border radius ─────────────────────────────────────────────────────────
      borderRadius: {
        DEFAULT: '0.125rem',
        lg:      '0.25rem',
        xl:      '0.5rem',
        full:    '9999px',
      },

      // ── Spacing tokens ────────────────────────────────────────────────────────
      spacing: {
        unit:                  '4px',
        'dense-padding-y':     '4px',
        'component-padding-x': '12px',
        'component-padding-y': '8px',
        gutter:                '16px',
        'container-margin':    '24px',
      },

      // ── Typography ────────────────────────────────────────────────────────────
      fontFamily: {
        'display-lg':   ['Inter', 'sans-serif'],
        'headline-md':  ['Inter', 'sans-serif'],
        'title-sm':     ['Inter', 'sans-serif'],
        'body-md':      ['Inter', 'sans-serif'],
        'body-sm':      ['Inter', 'sans-serif'],
        'table-header': ['Inter', 'sans-serif'],
        'label-mono':   ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-lg':   ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md':  ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title-sm':     ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-md':      ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm':      ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'table-header': ['12px', { lineHeight: '16px', fontWeight: '600' }],
        'label-mono':   ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
}
