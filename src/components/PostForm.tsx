"use client";

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface PostFormProps {
    onClose: () => void;
}

export default function PostForm({ onClose }: PostFormProps) {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [time, setTime] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [tag, setTag] = useState('personal'); // personal, family, work
    const [imageUrl, setImageUrl] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'enhanced_posts'), {
                title,
                subtitle,
                time,
                date,
                tag,
                image: imageUrl,
                createdAt: serverTimestamp()
            });
            onClose();
        } catch (err) {
            console.error(err);
            alert('저장 실패 (데이터 구성을 확인해 주세요)');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="form-modal" onClick={e => e.stopPropagation()} style={{ border: '4px solid var(--secondary)' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--secondary)', fontWeight: '900' }}>NEW BLOG POST</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>시간 (HH:MM)</label>
                        <input type="text" value={time} onChange={e => setTime(e.target.value)} placeholder="00:30" required />
                    </div>
                    <div className="input-group">
                        <label>날짜</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>제목 (굵게)</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="스피드스케이팅" required />
                    </div>
                    <div className="input-group">
                        <label>부제목 (상세 설명)</label>
                        <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="남자 1500m" />
                    </div>
                    <div className="input-group">
                        <label>태그 (중요도/분류)</label>
                        <select value={tag} onChange={e => setTag(e.target.value)} style={{ padding: '0.6rem', border: '1px solid #ddd', borderRadius: '4px', width: '100%' }}>
                            <option value="personal">개인 (금메달)</option>
                            <option value="family">가족 (은메달)</option>
                            <option value="work">업무 (동메달)</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>이미지 URL</label>
                        <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                    </div>

                    <div className="btn-group">
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--secondary)' }}>작업 완료</button>
                        <button type="button" className="btn btn-outline" onClick={onClose}>취소</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
