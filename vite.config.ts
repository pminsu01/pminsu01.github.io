import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages 배포를 위한 base 경로 설정
  base: '/',
  build: {
    // 빌드 결과물이 저장될 폴더
    outDir: 'dist',
  },

  // HTTPS 개발 서버 설정
  // 서버가 HTTPS이므로 클라이언트도 HTTPS로 실행해야 Secure 쿠키가 전달됨
  server: {
    https: true, // Vite 내장 self-signed certificate 사용
    port: 5173,
  },
});

