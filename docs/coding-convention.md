# Coding Convention
# Kanban Board

## 1. 파일 구성

| 규칙 | 예시 |
|------|------|
| 파일명은 소문자 kebab-case | `index.html`, `style.css`, `app.js`, `storage.js` |
| HTML / CSS / JS 는 반드시 분리 | `<style>`, `<script>` 인라인 사용 금지 |
| 스토리지 로직은 `storage.js`에 격리 | `app.js`에서 직접 `localStorage` 호출 금지 |
| 각 파일은 하나의 책임만 가짐 | `app.js`: UI 로직, `storage.js`: 저장소 추상화 |

---

## 2. HTML

```html
<!-- 좋음: 시맨틱 태그 사용 -->
<header>, <main>, <section>, <button>

<!-- 나쁨: 의미 없는 div 남용 -->
<div class="header">, <div class="btn">
```

- `id`는 JS에서 단일 요소를 선택할 때만 사용한다.
- `class`는 스타일 및 반복 요소에 사용한다.
- `data-*` 속성으로 JS 상태를 DOM에 보관한다.

**카드에 필수 포함할 data 속성:**
```html
<div class="card"
     draggable="true"
     data-id="{uuid}"
     data-user-id="{userId}"
     data-column-id="{columnId}"
     data-created-at="{ISO8601}">
```

- 접근성: 버튼에 `aria-label` 필수 (`<button aria-label="카드 삭제">`).
- 들여쓰기: 스페이스 2칸.

---

## 3. CSS

### 선택자
```css
/* 좋음: 클래스 선택자 */
.card { }
.card.dragging { }
.column.drag-over { }

/* 나쁨: 태그 직접 선택 (재사용 불가) */
div { }
section p { }
```

- 전역 스타일은 파일 상단에, 컴포넌트 스타일은 컴포넌트 단위로 그룹화한다.
- 상태 변형 클래스(`.dragging`, `.drag-over`, `.active`)는 해당 기본 클래스 바로 아래에 작성한다.
- 들여쓰기: 스페이스 2칸.
- 속성 순서: `display` → `position` → `box model(width/height/padding/margin)` → `border` → `background` → `color/font` → `transition`.

### 네이밍
```
컴포넌트:     .board, .column, .card, .modal
하위 요소:    .column-header, .card-list, .card-count
상태:         .dragging, .drag-over, .active
기능 버튼:    .add-card-btn, .delete-btn
유틸리티:     .drop-placeholder, .modal-overlay, .modal-actions
유저 영역:    .user-area, .user-badge, .user-avatar, .user-name
```

---

## 4. JavaScript

### 변수·함수 네이밍
```js
// 변수: camelCase
let draggedCard = null;
let targetListId = null;
let currentUser = null;   // 항상 앱 전체에서 단일 참조

// 함수: camelCase 동사+명사
function initGuestUser() { }     // 사용자 초기화
function createCard(text, userId) { }
function addDeleteButton(card) { }
function updateCounts() { }
function getBoardData() { }      // 현재 DOM 상태를 데이터 객체로 직렬화
function confirmAdd() { }
function closeModal() { }
function getDragAfterElement(list, y) { }
function renderBoard(data) { }   // 데이터 → DOM 렌더링
```

### 사용자 상태 (`currentUser`)
```js
// 앱 전체에서 단일 전역 상태
let currentUser = null;

// 초기화 시 반드시 설정
currentUser = initGuestUser();

// 접근 패턴
currentUser.id       // 스토리지 키, 카드 생성 시 사용
currentUser.isGuest  // 인증 여부 분기
currentUser.name     // 헤더 표시용

// 나쁨: userId를 직접 하드코딩
Storage.save('anonymous', data);

// 좋음: currentUser를 통해 참조
Storage.save(currentUser.id, data);
```

### 스토리지 추상화 (`Storage` 모듈)
```js
// 좋음: Storage 모듈을 통해서만 저장/로드
const data = await Storage.load(currentUser.id);
await Storage.save(currentUser.id, getBoardData());

// 나쁨: app.js에서 localStorage 직접 호출
localStorage.setItem('kanban_board', JSON.stringify(data));
localStorage.getItem('kanban_board');
```

Storage 모듈은 항상 `async/await` 인터페이스를 유지한다.
현재는 localStorage (동기)이지만, Supabase 전환 시 비동기가 되므로
지금부터 `await`로 호출해야 전환 시 app.js를 수정하지 않아도 된다.

### localStorage 키 규칙
```js
// 사용자별 격리 키 — 반드시 userId 포함
`kanban_board_${userId}`   // 보드 데이터
`kanban_guest_id`          // 게스트 ID (전역, 사용자 식별 전용)

// 나쁨: 사용자 구분 없는 단일 키
`kanban_board`
```

### 함수 설계 원칙
- 함수는 하나의 역할만 수행한다 (단일 책임).
- DOM을 반환하는 함수(`createCard`, `createPlaceholder`)는 `create` 접두사를 사용한다.
- 현재 DOM 상태를 데이터 객체로 변환하는 함수는 `get` 접두사를 사용한다 (`getBoardData`).
- 이벤트 핸들러는 직접 로직을 담지 않고 전용 함수를 호출한다.

```js
// 좋음
modalConfirm.addEventListener('click', confirmAdd);

// 나쁨
modalConfirm.addEventListener('click', () => {
  // 20줄의 로직...
});
```

### 이벤트 위임
```js
// 좋음: 루트 요소에 단일 리스너
board.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
});

// 나쁨: 개별 카드마다 리스너 등록
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('dragstart', handler);
});
```

### 조건 처리
```js
// 빠른 탈출로 중첩 줄이기
function handler(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  // 메인 로직
}
```

### 들여쓰기 및 포맷
- 들여쓰기: 스페이스 2칸.
- 세미콜론 필수.
- 문자열: 작은따옴표(`'`) 사용 (템플릿 리터럴 필요 시 백틱).
- `const` 우선, 재할당 필요 시 `let`, `var` 사용 금지.

---

## 5. 주석

주석은 **왜(why)** 를 설명할 때만 작성한다.

```js
// 좋음: 비자명한 이유 설명
setTimeout(() => card.classList.add('dragging'), 0);
// setTimeout 없이는 dragstart 이미지가 dragging 상태로 캡처됨

// 좋음: 미래 전환 지점 명시
// v2.0: Supabase Auth 도입 시 이 함수 내부만 교체
async function load(userId) { ... }

// 나쁨: 코드를 그대로 설명
// 카드에 dragging 클래스 추가
card.classList.add('dragging');
```

---

## 6. Git 커밋 메시지

```
feat: 새로운 기능 추가
fix: 버그 수정
style: 스타일 변경 (기능 변화 없음)
refactor: 리팩터링 (기능 변화 없음)
docs: 문서 작성/수정
chore: 빌드, 설정 변경
```

예시:
```
feat: 게스트 사용자 식별 모듈 구현 (crypto.randomUUID 기반)
feat: Storage 추상화 모듈 추가 (localStorage, 사용자별 키 격리)
fix: 빈 컬럼에 드롭 시 카드가 삽입되지 않는 버그 수정
docs: PRD v1.1 — 다중 사용자 대비 구조 반영
```
