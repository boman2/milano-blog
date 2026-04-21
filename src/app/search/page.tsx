"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const TAG_KR: Record<string, string> = { gold: '기억', silver: '일상', bronze: '반성' };
const TAG_CLASS: Record<string, string> = { gold: 'gold', silver: 'silver', bronze: 'bronze' };

function highlight(text: string, q: string) {
    if (!q || !text) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((p, i) =>
        regex.test(p) ? <mark key={i} className="search-highlight">{p}</mark> : p
    );
}

function SearchInner() {
    const router = useRouter();
    const params = useSearchParams();
    const [q, setQ] = useState(params.get('q') || '');
    const [input, setInput] = useState(params.get('q') || '');
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    /* Load all posts */
    useEffect(() => {
        (async () => {
            setLoading(true);
            const snap = await getDocs(query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc')));
            setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        })();
    }, []);

    const results = q.trim()
        ? posts.filter(p =>
            [p.title, p.subtitle, p.content].some(f =>
                f?.toLowerCase().includes(q.toLowerCase())
            )
        )
        : [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setQ(input.trim());
        router.replace(`/search?q=${encodeURIComponent(input.trim())}`, { scroll: false });
    };

    return (
        <div className="search-page">
            {/* Header */}
            <div className="search-header">
                <button className="search-back" onClick={() => router.back()} title="뒤로">←</button>
                <form className="search-input-wrap" onSubmit={handleSearch}>
                    <div className="search-icon-inner">
                        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>
                    </div>
                    <input
                        className="search-input-big"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="제목, 내용으로 검색..."
                        autoFocus
                    />
                </form>
            </div>

            {/* Results */}
            <div className="search-results">
                {loading && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        검색 중...
                    </div>
                )}

                {!loading && q && (
                    <div className="search-count">
                        <strong>"{q}"</strong> 검색 결과 {results.length}건
                    </div>
                )}

                {!loading && q && results.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <div>검색 결과가 없습니다.</div>
                        <div style={{ marginTop: 8, fontSize: '0.8rem' }}>다른 키워드로 검색해 보세요.</div>
                    </div>
                )}

                {!loading && results.map(post => (
                    <div key={post.id} className="post-card" style={{ marginBottom: 1 }}>
                        <div className="post-time-col">
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {post.date?.slice(5).replace('-', '/')}
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: 4 }}>{post.time || '—'}</div>
                        </div>
                        <div>
                            <div className="post-title">{highlight(post.title || '', q)}</div>
                            <div className="post-subtitle">{highlight(post.subtitle || '', q)}</div>
                            {post.content && (
                                <div className="post-content">{highlight(post.content || '', q)}</div>
                            )}
                            {post.images?.length > 0 && (
                                <div className="post-images" style={{ marginTop: 8 }}>
                                    {post.images.slice(0, 3).map((src: string, i: number) => (
                                        <img key={i} className="thumb" src={src} alt="" style={{ maxWidth: 80 }} />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="post-actions-col">
                            <div className={`medal-dot ${TAG_CLASS[post.tag] || 'gold'}`}>
                                {TAG_KR[post.tag] || '기억'}
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && !q && (
                    <div className="empty-state">
                        <div className="empty-icon">🔍</div>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>검색어를 입력하세요.</div>

                        <div style={{ marginTop: 20, textAlign: 'left', width: '100%', maxWidth: '300px', margin: '20px auto 0' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>인기 검색어</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {['오늘', '기록', '생각', '회고', '블로그', '시작'].map(word => (
                                    <button
                                        key={word}
                                        className="nav-btn"
                                        style={{ background: 'var(--white)', border: '1px solid var(--border)', padding: '5px 12px' }}
                                        onClick={() => { setInput(word); setQ(word); }}
                                    >
                                        #{word}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#888' }}>로딩 중...</div>}>
            <SearchInner />
        </Suspense>
    );
}
