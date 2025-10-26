import { navigateTo } from '../utils/navigation';

export class UserSecurity {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="user-security-page">
        <div class="user-security-container">
          <div class="user-security-header">
            <button class="back-button" data-action="back">◀</button>
            <h1>데이터 삭제 안내</h1>
          </div>
          <div class="user-security-content">
            <div class="security-intro">
              <p><strong>앱 이름:</strong> Chores Board</p>
              <p><strong>개발자:</strong> Chores Board Team</p>
            </div>

            <section class="security-section">
              <h2>사용자 데이터 삭제 요청 방법</h2>
              <p>사용자가 데이터 삭제를 원하실 경우, 아래 정보를 포함하여 이메일로 요청해 주세요.</p>
              <ul>
                <li><strong>이메일 주소:</strong> <a href="mailto:choresboards@gmail.com">choresboards@gmail.com</a></li>
                <li><strong>필수 기재 정보:</strong> 앱에서 사용한 <strong>닉네임</strong> 및 <strong>이메일 주소</strong></li>
              </ul>
              <p class="security-notice">요청이 확인되면, <strong>해당 계정과 연결된 모든 데이터가 영구적으로 삭제</strong>됩니다.<br>
              삭제 완료 후에는 데이터 복원이 <strong>불가능</strong>합니다.</p>
            </section>

            <section class="security-section">
              <h2>삭제 및 보관되는 데이터 유형</h2>
              <div class="data-types">
                <div class="data-type-card deleted">
                  <h3>✓ 삭제되는 데이터</h3>
                  <ul>
                    <li>사용자가 생성한 집안일 보드</li>
                    <li>보드 내의 모든 집안일 항목 및 관련 기록</li>
                    <li>사용자 계정 정보</li>
                  </ul>
                </div>
                <div class="data-type-card retained">
                  <h3>✗ 보관되는 데이터</h3>
                  <p class="no-data">없음</p>
                </div>
              </div>
            </section>

            <section class="security-section contact-section">
              <h2>📞 문의</h2>
              <p>데이터 관리 또는 개인정보 관련 문의는 언제든<br>
              <a href="mailto:choresboards@gmail.com">choresboards@gmail.com</a> 으로 연락해 주세요.</p>
            </section>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  private attachListeners(): void {
    const backButton = this.container.querySelector('[data-action="back"]');
    if (backButton) {
      backButton.addEventListener('click', () => {
        // Check if user came from within the app
        if (window.history.length > 1) {
          window.history.back();
        } else {
          navigateTo('/');
        }
      });
    }
  }

  destroy(): void {
    // Cleanup if needed
  }
}
