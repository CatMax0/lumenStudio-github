/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        panel: {
          DEFAULT: '#252526',
          deep: '#1e1e1e',
          raised: '#2d2d30',
          hover: '#2a2d2e'
        },
        line: {
          DEFAULT: '#3f3f46',
          soft: '#2e2e33',
          hard: '#505058'
        },
        ink: {
          DEFAULT: '#cccccc',
          mute: '#858585',
          dim: '#5a5a5a'
        },
        accent: {
          DEFAULT: '#0090f1',
          dim: '#006bb3',
          warn: '#e0a020',
          danger: '#e25555'
        }
      },
      fontFamily: {
        sans: ['Inter', '"HarmonyOS Sans"', '"Source Han Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px'
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '15px'],
        sm: ['12px', '16px'],
        base: ['13px', '18px'],
        lg: ['14px', '20px'],
        xl: ['20px', '28px']
      }
    }
  },
  plugins: []
}
