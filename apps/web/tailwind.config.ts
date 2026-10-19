import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Màu chủ đạo lấy theo đối tác (CSS variable set lúc đăng nhập SSO).
        primary: 'rgb(var(--primary) / <alpha-value>)',
      },
    },
  },
  plugins: [],
} satisfies Config;
