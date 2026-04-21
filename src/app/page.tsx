"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth, storage } from '@/lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc,
  updateDoc, deleteDoc, doc, serverTimestamp, getDocs, limit
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut
} from 'firebase/auth';

/* ── Icons ─── */
const IconUser = () => <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
const IconSearch = () => <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>;
const IconMenu = () => <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
const IconBookmark = () => <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
const GoogleLogo = () => (
  <svg className="google-icon" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/* ── Helpers ─── */
const KR_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const KR_DAYS_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function generateDates() {
  const arr: { full: string; day: number; dow: string; month: number }[] = [];
  const today = new Date();
  for (let i = -30; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    arr.push({
      full: d.toISOString().split('T')[0],
      day: d.getDate(),
      dow: KR_DAYS_FULL[d.getDay()],
      month: d.getMonth() + 1
    });
  }
  return arr;
}

function formatTitle(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return { month: d.getMonth() + 1, date: d.getDate(), dow: KR_DAYS_FULL[d.getDay()] };
}

function fmtDate(ts: any) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/* Time auto-format: "1624" → "16시 24분" */
function formatTimeInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2);
    return `${hh}시 ${mm}분`;
  }
  return digits;
}

/* Convert File → WebP Blob */
async function toWebP(file: File, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        blob ? resolve(blob) : reject(new Error('변환 실패'));
      }, 'image/webp', quality);
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = url;
  });
}

async function uploadImage(blob: Blob): Promise<string> {
  const sRef = storageRef(storage, `blog_images/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
  const snap = await uploadBytes(sRef, blob, { contentType: 'image/webp' });
  return getDownloadURL(snap.ref);
}

/* Tags */
const TAG_KR: Record<string, string> = { gold: '기억', silver: '일상', bronze: '반성' };
const TAG_CLASS: Record<string, string> = { gold: 'gold', silver: 'silver', bronze: 'bronze' };

/* Samples */
const SAMPLE_POSTS = [
  {
    title: '오늘의 생각', subtitle: '작은 것에서 시작되는 큰 변화',
    content: '매일 조금씩 나아가는 것이 중요하다. 큰 목표를 한 번에 이루려 하지 말고, 오늘 할 수 있는 가장 작은 행동을 먼저 하자.',
    time: '09:30', date: '2026-04-21', tag: 'gold', images: []
  },
  {
    title: '블로그 시작!', subtitle: '밀라노 코르티나 스타일로 새 출발',
    content: '드디어 새 블로그를 마련했다. 앞으로 매일 기록을 남기며 성장해 나갈 계획이다.',
    time: '12:00', date: '2026-04-21', tag: 'silver', images: []
  },
  {
    title: '어제의 회고', subtitle: '잘 한 점, 아쉬운 점 돌아보기',
    content: '어제는 운동을 빠뜨렸지만 독서는 1시간을 채웠다. 내일은 아침 루틴을 지키는 것이 목표.',
    time: '21:00', date: '2026-04-20', tag: 'bronze', images: []
  },
];

const SAMPLE_TODOS = [
  { text: '블로그 UI 디자인 확정하기', category: '기획중', priority: '중요', done: false },
  { text: 'Firebase Cloud Storage 연동 테스트', category: '기획중', priority: '보통', done: false },
  { text: '포스트 작성 기능 구현', category: '진행중', priority: '중요', done: false },
  { text: '모바일 반응형 CSS 적용', category: '진행중', priority: '보통', done: false },
  { text: '샘플 데이터 입력 완료', category: '완료', priority: '보통', done: true },
];

/* Date window */
const VISIBLE = 7;
function itemOpacity(idx: number, center: number) {
  return ([1, 0.82, 0.58, 0.3][Math.abs(idx - center)] ?? 0.3);
}

/* ══════════════════ MAIN ══════════════════ */
export default function Home() {
  const router = useRouter();
  const dates = generateDates();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIdx = dates.findIndex(d => d.full === todayStr);

  const [activeDate, setActiveDate] = useState(todayStr);
  const [windowStart, setWindowStart] = useState(Math.max(0, todayIdx - Math.floor(VISIBLE / 2)));
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showTodoSheet, setShowTodoSheet] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [showMobileCal, setShowMobileCal] = useState(false);
  const [todoInput, setTodoInput] = useState('');
  const [todoCat, setTodoCat] = useState<'기획중' | '진행중'>('기획중');
  const [todoPri, setTodoPri] = useState<'중요' | '보통'>('보통');
  const [seeded, setSeeded] = useState(false);

  /* Auth */
  useEffect(() => { return onAuthStateChanged(auth, u => setUser(u)); }, []);

  /* Posts */
  useEffect(() => {
    const q = query(collection(db, 'blog_posts'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  /* Todos */
  useEffect(() => {
    const q = query(collection(db, 'blog_todos'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap => setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  /* Seed */
  useEffect(() => {
    if (seeded) return;
    (async () => {
      const pSnap = await getDocs(query(collection(db, 'blog_posts'), limit(1)));
      if (pSnap.empty) for (const p of SAMPLE_POSTS) await addDoc(collection(db, 'blog_posts'), { ...p, createdAt: serverTimestamp() });
      const tSnap = await getDocs(query(collection(db, 'blog_todos'), limit(1)));
      if (tSnap.empty) for (const t of SAMPLE_TODOS) await addDoc(collection(db, 'blog_todos'), { ...t, createdAt: serverTimestamp() });
      setSeeded(true);
    })();
  }, [seeded]);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!openMenu) return;
    const handler = () => setOpenMenu(null);
    window.addEventListener('click', handler, true);
    return () => window.removeEventListener('click', handler, true);
  }, [openMenu]);

  const selectDate = (full: string, idx: number) => {
    setActiveDate(full);
    setWindowStart(Math.max(0, Math.min(idx - Math.floor(VISIBLE / 2), dates.length - VISIBLE)));
  };

  const canUp = windowStart > 0;
  const canDown = windowStart + VISIBLE < dates.length;
  const visibleDates = dates.slice(windowStart, windowStart + VISIBLE);

  const filteredPosts = posts.filter(p => p.date === activeDate);
  const titleParts = formatTitle(activeDate);

  /* Todo helpers */
  const activeTodos = todos.filter(t => t.done !== true && t.category !== '완료');
  const doneTodos = [...todos.filter(t => t.done === true || t.category === '완료')].reverse();
  const byCategory = (cat: string) => activeTodos.filter(t => t.category === cat);
  const sorted = (arr: any[]) => [...arr.filter(t => t.priority === '중요'), ...arr.filter(t => t.priority === '보통')];

  console.log('[Todo Debug] total:', todos.length, 'active:', activeTodos.length, 'done:', doneTodos.length);

  const addTodo = async () => {
    const text = todoInput.trim();
    if (!text) return;
    await addDoc(collection(db, 'blog_todos'), { text, category: todoCat, priority: todoPri, done: false, createdAt: serverTimestamp() });
    setTodoInput('');
  };

  const toggleTodo = (id: string, done: boolean) => {
    const nextDone = !done;
    const nextCat = nextDone ? '완료' : '진행중';
    updateDoc(doc(db, 'blog_todos', id), { done: nextDone, category: nextCat }).catch(console.error);
  };

  const deletePost = async (id: string) => {
    console.log('Attempting to delete post:', id);
    if (!user) { setShowLogin(true); return; }
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', id));
      console.log('Delete success');
    } catch (err) {
      console.error('Delete error:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="app-root" onClick={() => setOpenMenu(null)}>

      {/* HEADER */}
      <header className="top-header">
        <div className="header-aurora" />
        <nav className="header-nav">
          <button className="nav-btn active-nav">다시보기 시청</button>
          <button className="nav-btn">결과</button>
          <button className="nav-btn">메달</button>
        </nav>
        <div className="header-actions">
          {user ? (
            <div className="user-avatar" onClick={() => signOut(auth)} title="로그아웃">
              {user.photoURL ? <img src={user.photoURL} alt="u" referrerPolicy="no-referrer" /> : (user.displayName?.[0] || '?').toUpperCase()}
            </div>
          ) : (
            <button className="icon-btn" onClick={() => setShowLogin(true)} title="로그인" style={{ padding: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </button>
          )}
          <button className="icon-btn" title="검색" onClick={() => router.push('/search')} style={{ padding: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
          <button className="icon-btn" title="메뉴" style={{ padding: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16M4 6h16M4 18h16" /></svg>
          </button>
        </div>
      </header>

      <div className="body-layout">

        {/* PC: LEFT — Date Scroller */}
        <aside className="date-scroller">
          <div className="scroller-and-arrows">
            <button className="scroller-arrow up" onClick={() => setWindowStart(s => Math.max(0, s - 1))} disabled={!canUp}>∧</button>
            <div className="scroller-window">
              {visibleDates.map((d, i) => {
                const globalIdx = windowStart + i;
                const isActive = d.full === activeDate;
                const opacity = itemOpacity(i, Math.floor(VISIBLE / 2));
                return (
                  <div
                    key={d.full}
                    className={`date-item${isActive ? ' active' : ''}`}
                    style={{ opacity: isActive ? 1 : opacity }}
                    onClick={() => selectDate(d.full, globalIdx)}
                  >
                    <span className="d-day">{d.day}</span>
                    <span className="d-dow">{d.dow}</span>
                  </div>
                );
              })}
            </div>
            <button className="scroller-arrow down" onClick={() => setWindowStart(s => Math.min(dates.length - VISIBLE, s + 1))} disabled={!canDown}>∨</button>
          </div>
          <MiniCalendar activeDate={activeDate} onSelectDate={setActiveDate} posts={posts} />
        </aside>

        {/* CENTER */}
        <main className="main-content">
          <div className="mobile-date-header">
            <button className="date-dropdown-btn" onClick={() => setShowMobileCal(true)}>
              <span>{titleParts ? `${titleParts.month}월 ${titleParts.date}일` : '날짜 선택'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            <button className="filter-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
              필터
            </button>
          </div>
          <div className="content-hero" />
          <div className="content-scroll">
            {titleParts && (
              <h1 className="page-date-title">
                {titleParts.month}월 {titleParts.date}일, <em>{titleParts.dow}</em>
              </h1>
            )}

            {user && (
              <button className="write-btn" onClick={() => setShowPostForm(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                새 글 작성
              </button>
            )}

            {filteredPosts.length > 0 ? (
              <div>
                {filteredPosts.map(post => (
                  <div key={post.id} className="post-card">
                    <div className="post-time-col">
                      <div>{post.time || '—'}</div>
                      <div className="post-status-row"><div className="status-circle done" /></div>
                    </div>
                    <div>
                      <div className="post-title">{post.title}</div>
                      <div className="post-subtitle">{post.subtitle}</div>
                      {post.content && <div className="post-content">{post.content}</div>}
                      {post.images?.length > 0 && (
                        <div className="post-images">
                          {post.images.map((src: string, idx: number) => (
                            <img key={idx} className="thumb" src={src} alt="" onClick={() => setLightboxImg(src)} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="post-actions-col">
                      <button className="action-icon"><IconBookmark /></button>
                      <div className="edit-menu-wrap" onClick={e => e.stopPropagation()}>
                        <button
                          className="action-icon"
                          style={{ fontSize: '1rem', letterSpacing: '-1px' }}
                          onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === post.id ? null : post.id); }}
                        >⋮</button>
                        {openMenu === post.id && (
                          <div className="edit-menu" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                            <button type="button" className="edit-menu-item" onMouseDown={(e) => {
                              e.stopPropagation();
                              console.log('Edit Triggered:', post.id);
                              setEditPost(post);
                              setOpenMenu(null);
                            }}>수정</button>
                            <button type="button" className="edit-menu-item danger" onMouseDown={(e) => {
                              e.stopPropagation();
                              console.log('Delete Triggered:', post.id);
                              deletePost(post.id);
                              setOpenMenu(null);
                            }}>삭제</button>
                          </div>
                        )}
                      </div>
                      <div className={`medal-dot ${TAG_CLASS[post.tag] || 'gold'}`}>
                        {TAG_KR[post.tag] || '기억'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div>이 날의 기록이 없습니다.</div>
                <div style={{ marginTop: 8, fontSize: '0.8rem' }}>
                  {user ? '새 글 작성 버튼을 눌러주세요.' : '로그인 후 글을 작성할 수 있습니다.'}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT: TODO (PC) */}
        <aside className="right-panel">
          <TodoPanel
            activeTodos={activeTodos}
            doneTodos={doneTodos}
            todoInput={todoInput}
            todoCat={todoCat}
            todoPri={todoPri}
            showAllDone={showAllDone}
            setTodoInput={setTodoInput}
            setTodoCat={setTodoCat}
            setTodoPri={setTodoPri}
            addTodo={addTodo}
            toggleTodo={toggleTodo}
            setShowAllDone={setShowAllDone}
            byCategory={byCategory}
            sorted={sorted}
          />
        </aside>
      </div>

      {/* Mobile FAB */}
      <button className="todo-fab" onClick={() => setShowTodoSheet(true)}>✓</button>

      {/* Mobile Todo Sheet */}
      <div className={`todo-sheet-backdrop${showTodoSheet ? ' open' : ''}`} onClick={() => setShowTodoSheet(false)}>
        <div className="todo-sheet" onClick={e => e.stopPropagation()}>
          <div className="todo-sheet-handle" />
          <TodoPanel
            activeTodos={activeTodos}
            doneTodos={doneTodos}
            todoInput={todoInput}
            todoCat={todoCat}
            todoPri={todoPri}
            showAllDone={showAllDone}
            setTodoInput={setTodoInput}
            setTodoCat={setTodoCat}
            setTodoPri={setTodoPri}
            addTodo={addTodo}
            toggleTodo={toggleTodo}
            setShowAllDone={setShowAllDone}
            byCategory={byCategory}
            sorted={sorted}
          />
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImg(null)}>×</button>
          <img className="lightbox-img" src={lightboxImg} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLogin(false)}>×</button>
            <div className="modal-title">로그인</div>
            <div className="modal-sub">Google 계정으로 로그인하면<br />글 작성 및 할 일 관리가 가능합니다.</div>
            <button className="google-btn" onClick={() => { signInWithPopup(auth, new GoogleAuthProvider()).catch(console.error); setShowLogin(false); }}>
              <GoogleLogo /> Google 계정으로 로그인
            </button>
          </div>
        </div>
      )}

      {/* Post Form */}
      {showPostForm && <PostFormModal activeDate={activeDate} onClose={() => setShowPostForm(false)} />}

      {/* Edit Modal */}
      {editPost && <PostFormModal activeDate={activeDate} post={editPost} onClose={() => setEditPost(null)} />}

      {/* Mobile Calendar Modal */}
      {showMobileCal && (
        <div className="calendar-modal" onClick={() => setShowMobileCal(false)}>
          <div className="calendar-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <button className="sheet-close" onClick={() => setShowMobileCal(false)}>×</button>
            <div className="calendar-modal-content">
              <MiniCalendar
                activeDate={activeDate}
                onSelectDate={(d) => { setActiveDate(d); setShowMobileCal(false); }}
                posts={posts}
              />
              <div className="calendar-footer">
                날짜는 접속 지역 시간대에 맞춰 표시됩니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mini Calendar ─── */
const MiniCalendar = ({ activeDate, onSelectDate, posts }: { activeDate: string; onSelectDate: (d: string) => void; posts: any[] }) => {
  const datesWithPosts = new Set(posts.map(p => p.date));
  const d = new Date(activeDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="cal-day empty" />);
  for (let i = 1; i <= lastDate; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isActive = dateStr === activeDate;
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    days.push(
      <div
        key={i}
        className={`cal-day${isActive ? ' active' : ''}${isToday ? ' today' : ''}`}
        onClick={() => onSelectDate(dateStr)}
      >
        {i}
        {datesWithPosts.has(dateStr) && <div className="cal-dot" />}
      </div>
    );
  }
  return (
    <div className="mini-calendar">
      <div className="cal-header">
        <h3>{year}년 {month + 1}월</h3>
      </div>
      <div className="calendar-grid">
        {['월', '화', '수', '목', '금', '토', '일'].map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {days}
      </div>
    </div>
  );
};

const TodoPanel = ({
  activeTodos, doneTodos, todoInput, todoCat, todoPri, showAllDone,
  setTodoInput, setTodoCat, setTodoPri, addTodo, toggleTodo, setShowAllDone,
  byCategory, sorted
}: any) => {
  return (
    <>
      <div className="panel-title">
        TO DO
        {activeTodos.length > 0 && <span className="panel-title-badge">{activeTodos.length}</span>}
      </div>

      {/* Add form */}
      <div className="todo-add-form">
        <div className="todo-input-row">
          <input
            className="todo-input"
            placeholder="할 일을 입력하세요..."
            value={todoInput}
            onChange={e => setTodoInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) addTodo(); }}
          />
          <button className="todo-add-btn" onClick={addTodo}>＋</button>
        </div>
        <div className="todo-meta-row">
          <select className="todo-select" value={todoCat} onChange={e => setTodoCat(e.target.value as any)}>
            <option value="기획중">기획중</option>
            <option value="진행중">진행중</option>
          </select>
          <select className="todo-select" value={todoPri} onChange={e => setTodoPri(e.target.value as any)}>
            <option value="중요">중요</option>
            <option value="보통">보통</option>
          </select>
        </div>
      </div>

      {/* 기획중 */}
      {sorted(byCategory('기획중')).length > 0 && (
        <>
          <div className="todo-section-label">기획중 {byCategory('기획중').length}건</div>
          {sorted(byCategory('기획중')).map((t: any) => <TodoItem key={t.id} t={t} onToggle={toggleTodo} />)}
        </>
      )}

      {/* 진행중 */}
      {sorted(byCategory('진행중')).length > 0 && (
        <>
          <div className="todo-section-label" style={{ marginTop: 10 }}>진행중 {byCategory('진행중').length}건</div>
          {sorted(byCategory('진행중')).map((t: any) => <TodoItem key={t.id} t={t} onToggle={toggleTodo} />)}
        </>
      )}

      {/* 완료 */}
      {doneTodos.length > 0 && (
        <>
          <div className="todo-section-label" style={{ marginTop: 12 }}>
            완료 <span className="done-count">{doneTodos.length}</span>
          </div>
          {(showAllDone ? doneTodos : doneTodos.slice(0, 3)).map((t: any) => (
            <TodoItem key={t.id} t={t} onToggle={toggleTodo} />
          ))}
          {doneTodos.length > 3 && (
            <button className="see-all-btn" onClick={() => setShowAllDone(!showAllDone)}>
              {showAllDone ? '접기 ∧' : `모두보기 (${doneTodos.length}건) ∨`}
            </button>
          )}
        </>
      )}

      {activeTodos.length === 0 && doneTodos.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '28px 0' }}>
          할 일을 추가해 보세요 🎯
        </div>
      )}
    </>
  );
};

/* ── Todo Item ─── */
function TodoItem({ t, onToggle }: { t: any; onToggle: (id: string, done: boolean) => void }) {
  const catClass: Record<string, string> = { '기획중': 'planning', '진행중': 'doing', '완료': 'done-cat' };
  return (
    <div className={`todo-item${t.done ? ' done-item' : ''}`}>
      <div className={`todo-radio${t.done ? ' checked' : ''}`} onClick={() => onToggle(t.id, t.done)} />
      <div className="todo-text-wrap">
        <div className={`todo-text${t.done ? ' striked' : ''}`}>{t.text}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
          <span className={`cat-badge ${catClass[t.category] || 'planning'}`}>{t.category}</span>
          <span className={`pri-badge ${t.priority === '중요' ? 'high' : 'normal'}`}>{t.priority}</span>
          <span className="todo-date">{t.createdAt ? (t.createdAt.toDate ? t.createdAt.toDate().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '') : ''}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Post Form Modal ─── */
function PostFormModal({ activeDate, post, onClose }: { activeDate: string; post?: any; onClose: () => void }) {
  const isEdit = !!post;
  const [title, setTitle] = useState(post?.title || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [content, setContent] = useState(post?.content || '');
  const [time, setTime] = useState(post?.time || '');
  const [date, setDate] = useState(post?.date || activeDate);
  const [tag, setTag] = useState<string>(post?.tag || 'gold');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImgs, setExistingImgs] = useState<string[]>(post?.images || []);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target!.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };
  const removeExisting = (idx: number) => {
    setExistingImgs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const blob = await toWebP(files[i]);
        const url = await uploadImage(blob);
        newUrls.push(url);
      }
      const allImages = [...existingImgs, ...newUrls];

      const data = {
        title: title.trim(), subtitle: subtitle.trim(),
        content: content.trim(), time: time.trim(),
        date, tag, images: allImages,
      };

      if (isEdit) {
        await updateDoc(doc(db, 'blog_posts', post.id), data);
      } else {
        await addDoc(collection(db, 'blog_posts'), { ...data, createdAt: serverTimestamp() });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="post-form-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="form-title">{isEdit ? '글 수정' : '새 글 작성'}</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">날짜</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">시간 (예: 16시 24분)</label>
              <input type="text" className="form-input" value={time}
                onChange={e => setTime(formatTimeInput(e.target.value))}
                placeholder="1624 입력 시 자동 변환" maxLength={10} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="글 제목" required />
          </div>
          <div className="form-group">
            <label className="form-label">부제목</label>
            <input type="text" className="form-input" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="한 줄 설명" />
          </div>
          <div className="form-group">
            <label className="form-label">내용</label>
            <textarea className="form-textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="본문 내용..." />
          </div>
          <div className="form-group">
            <label className="form-label">태그</label>
            <select className="form-select" value={tag} onChange={e => setTag(e.target.value)}>
              <option value="gold">🧠 기억 — 소중한 기억</option>
              <option value="silver">☀️ 일상 — 오늘의 일상</option>
              <option value="bronze">💭 반성 — 되돌아보기</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">이미지 첨부 (자동 WebP 변환)</label>
            <div className="img-upload-area" onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                📎 클릭하여 이미지 선택 (여러 장 가능)
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                JPG, PNG, HEIC → WebP로 자동 변환
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)} />

            {(existingImgs.length > 0 || previews.length > 0) && (
              <div className="img-preview-grid">
                {/* Existing Images */}
                {existingImgs.map((src, i) => (
                  <div key={`ex-${i}`} className="img-preview-item">
                    <img src={src} alt="" />
                    <button className="img-remove" type="button" onClick={() => removeExisting(i)}>×</button>
                    <span className="img-tag-old">기존</span>
                  </div>
                ))}
                {/* New Previews */}
                {previews.map((src, i) => (
                  <div key={`new-${i}`} className="img-preview-item">
                    <img src={src} alt="" />
                    <button className="img-remove" type="button" onClick={() => removeFile(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-btns">
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? '저장 중...' : isEdit ? '수정 완료' : '게시하기'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}
