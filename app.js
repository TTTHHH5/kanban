// ── 전역 상태 ─────────────────────────────────────────────────

let currentUser = null;
let draggedCard = null;
let placeholder = null;
let targetListId = null;

const board = document.querySelector('.board');
const modalOverlay = document.getElementById('modal-overlay');
const cardInput = document.getElementById('card-input');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

// ── 사용자 식별 ───────────────────────────────────────────────

function initGuestUser() {
  let guestId = localStorage.getItem('kanban_guest_id');
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('kanban_guest_id', guestId);
  }
  return { id: guestId, name: 'Guest', email: null, isGuest: true };
}

function renderUserBadge() {
  const userArea = document.querySelector('.user-area');
  if (!userArea) return;
  userArea.innerHTML = `<span class="user-badge">${currentUser.name}</span>`;
}

// ── 보드 데이터 직렬화 ────────────────────────────────────────

function getBoardData() {
  return {
    columns: ['todo', 'in-progress', 'done'].map((columnId) => ({
      id: columnId,
      cards: [...document.querySelectorAll(`#${columnId}-list .card`)].map((card, index) => ({
        id: card.dataset.id,
        userId: card.dataset.userId,
        text: card.querySelector('p').textContent,
        columnId,
        order: index,
        createdAt: card.dataset.createdAt,
      })),
    })),
  };
}

// ── 보드 렌더링 ───────────────────────────────────────────────

function renderBoard(data) {
  data.columns.forEach((col) => {
    const list = document.getElementById(`${col.id}-list`);
    if (!list) return;
    list.innerHTML = '';
    col.cards.forEach((cardData) => {
      list.appendChild(
        createCard(cardData.text, cardData.userId, cardData.id, cardData.createdAt)
      );
    });
  });
}

// ── Drag & Drop ──────────────────────────────────────────────

function createPlaceholder() {
  const el = document.createElement('div');
  el.className = 'drop-placeholder';
  return el;
}

function removePlaceholder() {
  if (placeholder && placeholder.parentNode) {
    placeholder.parentNode.removeChild(placeholder);
  }
  placeholder = null;
}

board.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  draggedCard = card;
  placeholder = createPlaceholder();
  // setTimeout 없이는 dragstart 이미지가 dragging 상태로 캡처됨
  setTimeout(() => card.classList.add('dragging'), 0);
});

board.addEventListener('dragend', () => {
  if (!draggedCard) return;
  draggedCard.classList.remove('dragging');
  removePlaceholder();
  draggedCard = null;
  updateCounts();
});

board.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (!draggedCard) return;

  const list = e.target.closest('.card-list');
  if (!list) return;

  const afterCard = getDragAfterElement(list, e.clientY);

  if (placeholder && placeholder.parentNode === list) {
    if (afterCard == null) {
      if (list.lastElementChild !== placeholder) list.appendChild(placeholder);
    } else {
      if (afterCard !== placeholder) list.insertBefore(placeholder, afterCard);
    }
  } else {
    removePlaceholder();
    placeholder = createPlaceholder();
    if (afterCard == null) {
      list.appendChild(placeholder);
    } else {
      list.insertBefore(placeholder, afterCard);
    }
  }
});

board.addEventListener('drop', async (e) => {
  e.preventDefault();
  if (!draggedCard || !placeholder || !placeholder.parentNode) return;

  placeholder.parentNode.insertBefore(draggedCard, placeholder);
  removePlaceholder();
  draggedCard.classList.remove('dragging');
  draggedCard = null;
  updateCounts();
  await Storage.save(currentUser.id, getBoardData());
});

// 컬럼 drag-over 하이라이트
document.querySelectorAll('.column').forEach((col) => {
  col.addEventListener('dragenter', () => col.classList.add('drag-over'));
  col.addEventListener('dragleave', (e) => {
    if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });
  col.addEventListener('drop', () => col.classList.remove('drag-over'));
});

function getDragAfterElement(list, y) {
  const draggableCards = [...list.querySelectorAll('.card:not(.dragging)')];
  return draggableCards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// ── 카드 수 카운터 ────────────────────────────────────────────

function updateCounts() {
  document.querySelectorAll('.column').forEach((col) => {
    const count = col.querySelectorAll('.card').length;
    col.querySelector('.card-count').textContent = count;
  });
}

// ── 삭제 버튼 ─────────────────────────────────────────────────

function addDeleteButton(card) {
  const btn = document.createElement('button');
  btn.className = 'delete-btn';
  btn.textContent = '✕';
  btn.setAttribute('aria-label', '카드 삭제');
  btn.addEventListener('click', async () => {
    card.remove();
    updateCounts();
    await Storage.save(currentUser.id, getBoardData());
  });
  card.appendChild(btn);
}

// ── 카드 생성 ─────────────────────────────────────────────────

function createCard(text, userId, id, createdAt) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = id || crypto.randomUUID();
  card.dataset.userId = userId || currentUser.id;
  card.dataset.createdAt = createdAt || new Date().toISOString();
  const p = document.createElement('p');
  p.textContent = text;
  card.appendChild(p);
  addDeleteButton(card);
  return card;
}

// ── 카드 추가 모달 ────────────────────────────────────────────

document.querySelectorAll('.add-card-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    targetListId = btn.dataset.column;
    cardInput.value = '';
    modalOverlay.classList.add('active');
    cardInput.focus();
  });
});

modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

cardInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    confirmAdd();
  }
  if (e.key === 'Escape') closeModal();
});

modalConfirm.addEventListener('click', confirmAdd);

async function confirmAdd() {
  const text = cardInput.value.trim();
  if (!text || !targetListId) return;

  const list = document.getElementById(targetListId);
  list.appendChild(createCard(text, currentUser.id));
  updateCounts();
  await Storage.save(currentUser.id, getBoardData());
  closeModal();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  targetListId = null;
}

// ── 초기화 ────────────────────────────────────────────────────

async function init() {
  currentUser = initGuestUser();
  renderUserBadge();

  const data = await Storage.load(currentUser.id);
  if (data && data.columns) {
    renderBoard(data);
  } else {
    // 저장 데이터 없음 → HTML 기본 카드에 data 속성 부여 후 삭제 버튼 추가
    document.querySelectorAll('.card').forEach((card) => {
      card.dataset.id = crypto.randomUUID();
      card.dataset.userId = currentUser.id;
      card.dataset.createdAt = new Date().toISOString();
      addDeleteButton(card);
    });
  }

  updateCounts();
}

init();
