/**
 * 한글 입력(IME Composition) 처리를 위한 헬퍼 함수들
 * 안드로이드 웹뷰에서 한글 입력 시 발생하는 문제 해결
 */

/**
 * 입력 필드에서 Enter 키를 감지하되, 한글 조합 중일 때는 무시
 * @param input - HTML Input Element
 * @param callback - Enter 키 입력 시 실행할 콜백
 */
export function setupEnterKeyHandler(input: HTMLInputElement, callback: () => void): void {
  let isComposing = false;

  // 한글 조합 시작
  input.addEventListener('compositionstart', () => {
    isComposing = true;
  });

  // 한글 조합 종료
  input.addEventListener('compositionend', () => {
    isComposing = false;
  });

  // Enter 키 처리
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      callback();
    }
  });
}

/**
 * 입력 필드의 실시간 값을 추적 (한글 조합 중에도 업데이트)
 * @param input - HTML Input Element
 * @param onChange - 값 변경 시 실행할 콜백
 */
export function setupInputChangeHandler(
  input: HTMLInputElement,
  onChange: (value: string) => void
): void {
  // input 이벤트: 모든 입력 변화 감지 (한글 조합 중에도 발생)
  input.addEventListener('input', () => {
    onChange(input.value);
  });

  // compositionupdate 이벤트: 한글 조합 중 실시간 업데이트
  input.addEventListener('compositionupdate', () => {
    // 조합 중인 텍스트도 즉시 반영
    const currentValue = input.value;
    onChange(currentValue);
  });
}

/**
 * 폼 제출 시 한글 조합이 완료될 때까지 대기
 * @param form - HTML Form Element
 * @param onSubmit - 제출 시 실행할 콜백
 */
export function setupFormSubmitHandler(
  form: HTMLFormElement,
  onSubmit: (e: Event) => void
): void {
  let isComposing = false;

  // 모든 입력 필드에 대해 조합 상태 추적
  const inputs = form.querySelectorAll('input[type="text"], input[type="email"], textarea');
  inputs.forEach(input => {
    input.addEventListener('compositionstart', () => {
      isComposing = true;
    });

    input.addEventListener('compositionend', () => {
      isComposing = false;
    });
  });

  form.addEventListener('submit', (e: Event) => {
    if (isComposing) {
      e.preventDefault();
      // 조합이 끝날 때까지 잠시 대기 후 재시도
      setTimeout(() => {
        if (!isComposing) {
          onSubmit(e);
        }
      }, 100);
    } else {
      onSubmit(e);
    }
  });
}

/**
 * 검색 입력 필드를 위한 디바운스 처리 (한글 조합 고려)
 * @param input - HTML Input Element
 * @param onSearch - 검색 실행 콜백
 * @param delay - 디바운스 지연 시간 (ms)
 */
export function setupSearchInput(
  input: HTMLInputElement,
  onSearch: (value: string) => void,
  delay: number = 300
): () => void {
  let timeoutId: number | null = null;
  let isComposing = false;

  const handleInput = () => {
    // 이전 타이머 취소
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 한글 조합 중이 아닐 때만 검색 실행
    if (!isComposing) {
      timeoutId = window.setTimeout(() => {
        onSearch(input.value);
      }, delay);
    }
  };

  const handleCompositionStart = () => {
    isComposing = true;
  };

  const handleCompositionEnd = () => {
    isComposing = false;
    // 조합이 끝나면 즉시 검색 실행
    handleInput();
  };

  input.addEventListener('input', handleInput);
  input.addEventListener('compositionstart', handleCompositionStart);
  input.addEventListener('compositionend', handleCompositionEnd);

  // Cleanup 함수 반환
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    input.removeEventListener('input', handleInput);
    input.removeEventListener('compositionstart', handleCompositionStart);
    input.removeEventListener('compositionend', handleCompositionEnd);
  };
}
