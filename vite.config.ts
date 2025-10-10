import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages 배포를 위한 base 경로 설정
  base: '/',
  build: {
    // 빌드 결과물이 저장될 폴더
    outDir: 'dist',
  },
});

