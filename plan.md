# Kanban Board 구현 계획 (v1.1)

## 목표
HTML + CSS + JS 파일을 분리하고, **사용자별 데이터 격리 구조**를 갖춰 향후 Supabase 인증 연동 시 최소한의 수정으로 전환할 수 있는 칸반 보드를 구현한다.

---

## 파일 구조

```
day03/
├── index.html   — 보드 레이아웃 마크업 (헤더 .user-area 포함)
├── style.css    — 스타일시트 (헤더 flex, .user-badge 포함)
├── app.js       — 인터랙션 로직 (currentUser, DnD, 모달, Storage 연동)
├── storage.js   — Storage 추상화 모듈 (localStorage ↔ Supabase 교체 지점)
├── plan.md      — 구현 계획 (이 파일)
└── docs/        — PRD, TRD, DB Design, User Flow, Design System, Tasks, Convention
```

---

## 구현 항목

### 1. storage.js (신규)
- `Storage.load(userId)`: `kanban_board_{userId}` 키로 localStorage 읽기
- `Storage.save(userId, data)`: `kanban_board_{userId}` 키로 JSON 직렬화 저장
- `app.js`는 이 인터페이스만 호출. 내부 구현(localStorage/Supabase)을 알지 않는다.

### 2. index.html
- 3개 컬럼 구성: To Do / In Progress / Done
- 각 컬럼: `.column-header` (제목 + 카드 수) + `.card-list` + `+ 카드 추가` 버튼
- 카드 추가용 모달 (`.modal-overlay`) 포함
- 헤더에 `.user-area` 추가 (게스트 배지 렌더링 영역)
- `<script src="storage.js">` → `<script src="app.js">` 순서로 로드

### 3. style.css
- 전체 레이아웃: flexbox 기반 수평 보드
- 헤더: `display: flex; justify-content: space-between` — 좌측 제목, 우측 유저 배지
- `.user-badge`: 반투명 흰색 배경, 둥근 모서리 배지
- 컬럼: 고정 너비(280px), 배경색으로 구분
- 카드: 흰색 카드 + hover shadow 강조
- 드래그 중 카드: `.dragging` 클래스로 opacity + rotate 처리
- 드롭 대상 컬럼: `.drag-over` 클래스로 하이라이트
- 드롭 위치 표시: `.drop-placeholder` (점선 박스)
- 카드 삭제 버튼: hover 시만 표시
- 모달: `position: fixed` + overlay

### 4. app.js
- **사용자 식별**: `initGuestUser()` — `kanban_guest_id`로 게스트 UUID 관리, `currentUser` 전역 상태
- **유저 배지**: `renderUserBadge()` — `.user-area`에 Guest 배지 렌더링
- **보드 직렬화**: `getBoardData()` — DOM → 데이터 객체 변환 (userId, columnId, order 포함)
- **보드 복원**: `renderBoard(data)` — 저장 데이터 → DOM 렌더링
- **카드 생성**: `createCard(text, userId, id, createdAt)` — `data-id`, `data-user-id`, `data-created-at` 포함
- **드래그앤드롭** (HTML5 Drag & Drop API, 이벤트 위임)
  - `dragstart`: 드래그 카드 저장, placeholder 생성
  - `dragover`: Y 좌표로 삽입 위치 계산 → placeholder 이동
  - `drop`: 카드 삽입 → `Storage.save()` 호출
  - `dragend`: 정리 (placeholder 제거, 클래스 초기화)
- **카드 추가**: 모달 → `createCard()` → `Storage.save()`
- **카드 삭제**: ✕ 클릭 → `card.remove()` → `Storage.save()`
- **카드 수 카운트**: 변경 시마다 `updateCounts()` 호출
- **초기화**: `init()` — 게스트 ID 확인 → 저장 데이터 복원 또는 기본 카드 유지

---

## 기술 결정 사항

| 항목 | 선택 | 이유 |
|------|------|------|
| 드래그 방식 | HTML5 Drag & Drop API | 외부 라이브러리 없이 구현 가능 |
| 레이아웃 | Flexbox | 컬럼 수평 배치에 적합 |
| 모달 | 직접 구현 | 의존성 없이 간단히 처리 |
| 파일 분리 | HTML / CSS / JS / Storage 각 1개 | 관심사 분리, 유지보수 용이 |
| 사용자 식별 | `crypto.randomUUID()` 기반 게스트 ID | 브라우저 내장 API, 서버 불필요 |
| 스토리지 키 | `kanban_board_{userId}` | 사용자별 데이터 격리 |
| Storage 추상화 | `storage.js` 별도 모듈 | Supabase 전환 시 app.js 수정 없이 교체 가능 |

---

## 검증 방법

브라우저에서 `index.html`을 직접 열어 아래 항목을 확인한다.

### 기능 체크리스트

#### 사용자 식별
- [ ] 첫 방문 시 UUID가 `kanban_guest_id`로 localStorage에 저장된다
- [ ] 새로고침 후에도 동일한 게스트 ID가 유지된다
- [ ] 헤더 우측에 "Guest" 배지가 표시된다

#### 초기 렌더링
- [ ] 3개 컬럼(To Do / In Progress / Done)이 수평으로 표시된다
- [ ] 각 컬럼 헤더에 초기 카드 수가 정확히 표시된다 (To Do: 3, In Progress: 2, Done: 1)

#### 드래그앤드롭
- [ ] 카드를 드래그하면 반투명(opacity 0.4) + 회전 상태로 보인다
- [ ] 드래그 중 다른 컬럼 위에 올리면 컬럼이 파랗게 하이라이트된다
- [ ] 드래그 중 카드 사이에 점선 placeholder가 삽입 위치를 표시한다
- [ ] 드롭 후 카드가 placeholder 위치에 정확히 삽입된다
- [ ] 드롭 후 localStorage의 `kanban_board_{userId}`에 변경 사항이 저장된다
- [ ] 같은 컬럼 내 순서 변경도 정상 동작한다

#### 카드 추가
- [ ] "+ 카드 추가" 버튼 클릭 시 모달이 열리고 textarea에 포커스된다
- [ ] 텍스트 입력 후 확인 또는 Enter로 해당 컬럼에 카드가 추가된다
- [ ] 새 카드의 `data-user-id`가 현재 게스트 ID와 일치한다
- [ ] 빈 입력으로는 카드가 추가되지 않는다
- [ ] Esc 또는 오버레이 클릭으로 모달이 닫힌다

#### 카드 삭제
- [ ] 카드 hover 시 ✕ 버튼이 나타난다
- [ ] ✕ 클릭 시 카드가 삭제되고 localStorage에 반영된다

#### 데이터 영속성
- [ ] 카드 변경 후 새로고침 시 마지막 상태가 복원된다
- [ ] localStorage 키가 `kanban_board_{userId}` 형식인지 확인한다
- [ ] 다른 탭에서 다른 게스트 ID로 접속 시 독립된 데이터가 표시된다

#### 엣지 케이스
- [ ] 빈 컬럼에 드롭 시 카드가 정상 추가된다
- [ ] 카드를 원래 컬럼에 다시 드롭해도 문제없이 동작한다
- [ ] 카드를 전부 삭제한 컬럼에서도 카드 추가가 동작한다
