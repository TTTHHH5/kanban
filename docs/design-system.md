# Design System
# Kanban Board

## 1. 색상 (Color)

### 브랜드 팔레트

| 토큰 | 값 | 용도 |
|------|----|------|
| `color-primary` | `#0052cc` | 헤더 배경, 확인 버튼, 드롭 테두리 |
| `color-primary-dark` | `#0747a6` | 확인 버튼 hover |
| `color-primary-light` | `#d4e4ff` | 드래그 오버 컬럼 배경 |
| `color-primary-pale` | `#e6f0ff` | drop-placeholder 배경 |

### 중립 팔레트

| 토큰 | 값 | 용도 |
|------|----|------|
| `color-bg` | `#f0f2f5` | 페이지 배경 |
| `color-column-bg` | `#ebecf0` | 컬럼 배경 |
| `color-card-bg` | `#ffffff` | 카드 배경 |
| `color-border` | `#dfe1e6` | 입력 테두리, 카드 수 배지 배경 |
| `color-muted` | `#d4d8e0` | hover 배경, 취소 버튼 hover |
| `color-badge-bg` | `#dfe1e6` | 카드 수 배지 |

### 텍스트 팔레트

| 토큰 | 값 | 용도 |
|------|----|------|
| `color-text-primary` | `#172b4d` | 본문 텍스트 |
| `color-text-secondary` | `#5e6c84` | 컬럼 제목, 부가 텍스트 |
| `color-text-muted` | `#42526e` | 취소 버튼 텍스트, 게스트 배지 |
| `color-text-on-primary` | `#ffffff` | 파란 배경 위 텍스트 |

### 위험 팔레트

| 토큰 | 값 | 용도 |
|------|----|------|
| `color-danger-bg` | `#ffebe6` | 삭제 버튼 hover 배경 |
| `color-danger` | `#de350b` | 삭제 버튼 hover 텍스트 |

---

## 2. 타이포그래피 (Typography)

| 요소 | font-size | font-weight | 비고 |
|------|-----------|-------------|------|
| 페이지 제목 (h1) | `1.4rem` | 700 | letter-spacing: 0.5px |
| 컬럼 제목 (h2) | `0.95rem` | 700 | uppercase, letter-spacing: 0.6px |
| 카드 텍스트 (p) | `0.9rem` | 400 | line-height: 1.5 |
| 버튼 텍스트 | `0.875rem` | 600 | — |
| 카드 수 배지 | `0.75rem` | 700 | — |
| 모달 제목 (h3) | `1rem` | 700 | — |
| 유저 이름 | `0.875rem` | 500 | 헤더 우측 영역 |

**폰트 패밀리**: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`

---

## 3. 간격 (Spacing)

| 토큰 | 값 | 용도 |
|------|----|------|
| `space-xs` | `4px` | 컬럼 헤더 내부 패딩 |
| `space-sm` | `8px` | 카드 간격, 버튼 패딩 |
| `space-md` | `12px` | 컬럼 패딩, 카드 패딩 (세로) |
| `space-lg` | `16px` | 보드 gap, 헤더 패딩 |
| `space-xl` | `24px` | 보드 패딩, 모달 패딩 |

---

## 4. 테두리 & 그림자 (Border & Shadow)

| 항목 | 값 |
|------|----|
| 카드 기본 그림자 | `0 1px 3px rgba(0,0,0,0.12)` |
| 카드 hover 그림자 | `0 4px 12px rgba(0,0,0,0.16)` |
| 모달 그림자 | `0 8px 30px rgba(0,0,0,0.2)` |
| 헤더 그림자 | `0 2px 6px rgba(0,0,0,0.2)` |
| 컬럼 border-radius | `10px` |
| 카드 border-radius | `6px` |
| 버튼 border-radius | `6px` |
| 모달 border-radius | `10px` |
| 아바타 border-radius | `50%` |
| drag-over 테두리 | `2px dashed #0052cc` |
| placeholder 테두리 | `2px dashed #0052cc` |

---

## 5. 컴포넌트 명세

### Header
```
header
  display: flex
  justify-content: space-between
  align-items: center
  background: #0052cc
  padding: 16px 24px

  좌측: h1 (제품명)
  우측: .user-area (유저 정보 영역)
```

### Landing Page

랜딩 페이지(`index.html`)의 카드 UI. `landing.css`로 스타일이 분리된다.

```
body
  background: linear-gradient(135deg, #0052cc → #0747a6 → #172b4d)

.landing-card
  background: #fff
  border-radius: 16px
  max-width: 420px
  padding: 48px 40px
  box-shadow: 0 20px 60px rgba(0,0,0,0.3)

.btn-google
  background: #fff, border: 1.5px solid #dadce0, color: #3c4043

.btn-github
  background: #24292e, color: #fff

.divider — "또는 이메일로 계속하기" 구분선

.email-form
  input: border: 1.5px solid #dfe1e6, focus → #0052cc

.btn-email
  background: #0052cc (로그인 확인 버튼)

.toggle-mode — "계정이 없으신가요?" + 회원가입 링크
```

### User Area (`.user-area`) — v2.0 구현 완료

헤더 우측에 위치하는 사용자 정보 영역. 아바타 + 이름 + 로그아웃 버튼으로 구성.

```
.user-area
  display: flex, align-items: center, gap: 10px

  .user-avatar (소셜 프로필 이미지)
    width: 32px, height: 32px
    border-radius: 50%
    border: 2px solid rgba(255,255,255,0.5)

  .user-avatar--placeholder (이미지 없을 때 이니셜 원)
    background: rgba(255,255,255,0.25)
    font-weight: 700

  .user-name
    color: #fff, font-size: 0.875rem

  .logout-btn
    background: rgba(255,255,255,0.15)
    border-radius: 6px, padding: 5px 12px
    hover → rgba(255,255,255,0.28)
```

### Board
```
.board
  display: flex
  gap: 16px
  padding: 24px
  overflow-x: auto
  align-items: flex-start
```

### Column
```
.column
  width: 280px (고정)
  background: #ebecf0
  border-radius: 10px
  padding: 12px

상태 변형:
  .column.drag-over → background: #d4e4ff, outline: 2px dashed #0052cc
```

### Card
```
.card
  background: #ffffff
  border-radius: 6px
  padding: 12px 14px
  cursor: grab
  box-shadow: 0 1px 3px rgba(0,0,0,0.12)

상태 변형:
  :hover → box-shadow 강화
  .dragging → opacity: 0.4, transform: rotate(2deg) scale(1.02), cursor: grabbing
```

### Drop Placeholder
```
.drop-placeholder
  height: 60px
  border: 2px dashed #0052cc
  border-radius: 6px
  background: #e6f0ff
```

### Card Count Badge
```
.card-count
  background: #dfe1e6
  border-radius: 10px
  padding: 2px 8px
  min-width: 24px
  font-size: 0.75rem
  font-weight: 700
```

### Delete Button
```
.delete-btn
  기본: display: none
  카드 hover 시: display: block
  위치: position: absolute, top: 6px, right: 8px
  크기: font-size: 1rem

  :hover → background: #ffebe6, color: #de350b
```

### Add Card Button
```
.add-card-btn
  background: none
  width: 100%
  text-align: left
  color: #5e6c84

  :hover → background: #d4d8e0, color: #172b4d
```

### Modal
```
.modal-overlay
  position: fixed, inset: 0
  background: rgba(0,0,0,0.45)
  기본: display: none
  .active → display: flex (center)

.modal
  width: 340px
  padding: 24px
  border-radius: 10px
```

---

## 6. 인터랙션 & 트랜지션

| 대상 | 속성 | duration |
|------|------|----------|
| `.column` | background | 0.2s |
| `.card` | box-shadow, transform, opacity | 0.15s |
| `.add-card-btn` | background, color | 0.15s |
| `modal textarea` | border-color | 0.15s |
| `.delete-btn` (hover) | background, color | 즉시 |
| `.user-badge` | opacity | 0.2s |
