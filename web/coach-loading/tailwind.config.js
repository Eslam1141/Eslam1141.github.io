/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  corePlugins: {
    // Preflight is a global element-selector reset — bundling it would
    // leak into the host vanilla-CSS app this widget is injected into.
    // Utility classes are unaffected by this: they only apply to
    // elements that carry them.
    preflight: false,
  },
  theme: { extend: {} },
  plugins: [],
};
