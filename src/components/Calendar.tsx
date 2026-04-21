"use client";

import React, { useState } from 'react';

interface CalendarProps {
    onDateClick: (date: Date) => void;
    postDates: string[];
    specialDates: string[];
}

export default function Calendar({ onDateClick, postDates, specialDates }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const totalDays = daysInMonth(year, month);
    const offset = firstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    const isToday = (d: number | null) => {
        if (!d) return false;
        const today = new Date();
        return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    };

    const hasPost = (d: number | null) => {
        if (!d) return false;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return postDates.includes(dateStr);
    };

    return (
        <div className="calendar-container">
            <div className="calendar-nav">
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span onClick={() => setCurrentMonth(new Date(year - 1, month, 1))}>&lt;&lt;</span>
                    <span onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>&lt;</span>
                </div>
                <span style={{ cursor: 'default' }}>{year}.{month + 1}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>&gt;</span>
                    <span onClick={() => setCurrentMonth(new Date(year + 1, month, 1))}>&gt;&gt;</span>
                </div>
            </div>
            <div className="calendar-grid">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} style={{ textAlign: 'center', color: '#999' }}>{d}</div>
                ))}
                {days.map((d, index) => (
                    <div
                        key={index}
                        className={`cal-day ${isToday(d) ? 'today' : ''} ${hasPost(d) ? 'has-post' : ''}`}
                        onDoubleClick={() => d && onDateClick(new Date(year, month, d))}
                    >
                        {d}
                    </div>
                ))}
            </div>
        </div>
    );
}
