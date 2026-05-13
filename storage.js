// Storage 추상화 모듈
// app.js는 이 인터페이스만 호출한다.
// v2.0에서 Supabase로 전환 시 이 파일 내부만 교체하면 된다.

const Storage = {
  async load(userId) {
    const raw = localStorage.getItem(`kanban_board_${userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async save(userId, data) {
    const payload = { ...data, userId, updatedAt: new Date().toISOString() };
    localStorage.setItem(`kanban_board_${userId}`, JSON.stringify(payload));
  },
};
