import { navigateTo } from '../utils/navigation';

export class PrivacyPolicy {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="privacy-policy-page">
        <div class="privacy-policy-container">
          <div class="privacy-policy-header">
            <button class="back-button" data-action="back">◀</button>
            <h1>개인정보처리방침</h1>
          </div>
          <div class="privacy-policy-content">
            <div class="policy-intro">
              <p><strong>Chores Board</strong>(이하 "회사" 또는 "당사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다. 본 개인정보처리방침은 당사가 제공하는 서비스(Chores Board) 이용과 관련하여 수집, 이용, 보관, 삭제되는 개인정보의 처리 방침을 안내하기 위한 것입니다.</p>
            </div>

            <section class="policy-section">
              <h2>1. 개인정보의 수집 항목 및 이용 목적</h2>
              <table class="policy-table">
                <thead>
                  <tr>
                    <th>수집 항목</th>
                    <th>수집 시점</th>
                    <th>이용 목적</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>이메일</td>
                    <td>회원가입 시</td>
                    <td>사용자 인증, 계정 관리, 알림 발송</td>
                  </tr>
                  <tr>
                    <td>닉네임</td>
                    <td>회원가입 시</td>
                    <td>서비스 내 사용자 식별 및 표시</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="policy-section">
              <h2>2. 개인정보의 보유 및 이용 기간</h2>
              <ul>
                <li>사용자가 서비스 이용을 지속하는 동안 개인정보를 보유 및 이용합니다.</li>
                <li>사용자가 계정 삭제 또는 개인정보 삭제를 요청한 경우, 해당 개인정보는 <strong>즉시 삭제</strong>됩니다.</li>
                <li>삭제된 개인정보는 복구할 수 없으며, 데이터 복원은 불가능합니다.</li>
              </ul>
            </section>

            <section class="policy-section">
              <h2>3. 개인정보의 제3자 제공</h2>
              <p>당사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.<br>
              다만, 다음의 경우에는 예외로 합니다.</p>
              <ul>
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령에 의거하거나, 수사기관의 요청이 있는 경우</li>
              </ul>
            </section>

            <section class="policy-section">
              <h2>4. 개인정보의 처리 위탁</h2>
              <p>당사는 개인정보 처리를 외부 업체에 위탁하지 않습니다.<br>
              (향후 위탁이 발생할 경우, 위탁 대상 및 업무 내용을 본 방침에 고지합니다.)</p>
            </section>

            <section class="policy-section">
              <h2>5. 이용자의 권리 및 행사 방법</h2>
              <p>이용자는 언제든지 본인의 개인정보를 조회하거나 수정할 수 있으며, 삭제를 요청할 수 있습니다.</p>
              <p>개인정보 삭제 요청은 아래 페이지의 안내에 따라 진행하실 수 있습니다.<br>
              👉 <a href="https://github.com/pminsu01/pminsu01.github.io/blob/main/user_security.md" target="_blank" rel="noopener noreferrer">데이터 삭제 안내 보기</a></p>
              <p>요청이 확인되면 계정과 관련된 모든 데이터가 <strong>즉시 삭제</strong>되며, 삭제된 데이터는 복구할 수 없습니다.</p>
            </section>

            <section class="policy-section">
              <h2>6. 개인정보의 안전성 확보 조치</h2>
              <p>당사는 이용자의 개인정보를 안전하게 관리하기 위하여 다음과 같은 조치를 취하고 있습니다.</p>
              <ul>
                <li>비밀번호 및 인증 절차를 통한 계정 보호</li>
                <li>서버 접근 권한 최소화 및 접근 기록 관리</li>
                <li>주기적인 보안 점검 및 취약점 개선</li>
              </ul>
            </section>

            <section class="policy-section">
              <h2>7. 개인정보 보호책임자</h2>
              <table class="policy-table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>내용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>개인정보 보호책임자</td>
                    <td>MSP (Chores Board 개발팀)</td>
                  </tr>
                  <tr>
                    <td>이메일</td>
                    <td><a href="mailto:choresboards@gmail.com">choresboards@gmail.com</a></td>
                  </tr>
                  <tr>
                    <td>문의 가능 시간</td>
                    <td>평일 09:00 ~ 18:00</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="policy-section">
              <h2>8. 개인정보처리방침의 변경</h2>
              <p>본 개인정보처리방침은 법령, 정책 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시 본문에 명시된 링크를 통해 최신 버전을 확인하실 수 있습니다.</p>
              <p class="effective-date">시행일자: <strong>2025년 10월 26일</strong></p>
            </section>

            <div class="policy-footer">
              <p>© 2025 MSP. All rights reserved.</p>
            </div>
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
