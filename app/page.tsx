"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

interface EventData {
  id: string; title: string; category: string; location: string;
  start_date: string; end_date: string; price: string;
  source: string; area: string; url: string;
}

export default function Home() {
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);
  
  const getTodayFormatted = () => {
    const today = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `(오늘) ${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}, ${days[today.getDay()]}요일`;
  };

  const getTodayISO = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  
  const [selectedArea, setSelectedArea] = useState<string>('전체');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [targetDate, setTargetDate] = useState<string>(getTodayISO()); 
  const [appliedDate, setAppliedDate] = useState<string>(getTodayISO()); // 검색 버튼을 위한 상태 추가
  
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const areaList = ['전체', '서울', '부산', '대구', '인천', '대전', '울산', '세종', '전남광주', '경기', '강원', '충북', '충남', '전북', '경북', '경남', '제주'];
  const categoryList = ['전체', '공연', '축제', '교육', '원데이클래스', '전시/관람', '체험/야외', '캠핑/휴양'];

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (!error && data) {
        setAllEvents(data as EventData[]);
      }
      setIsLoading(false);
    }
    fetchEvents();
  }, []);

  // 💡 필터링 로직 수정 (종료된 행사 제외 + 적용된 날짜(appliedDate) 사용)
  useEffect(() => {
    let tempEvents = allEvents;

    if (selectedArea !== '전체') tempEvents = tempEvents.filter(e => e.area === selectedArea);
    if (selectedCategory !== '전체') tempEvents = tempEvents.filter(e => e.category === selectedCategory);
    
    if (appliedDate) {
      const targetStr = appliedDate.replace(/-/g, '');
      const todayStr = getTodayISO().replace(/-/g, '');
      
      tempEvents = tempEvents.filter(e => {
        const start = e.start_date || '';
        const end = e.end_date || start || '99999999'; // 종료일이 없으면 아주 먼 미래로 간주
        
        // 🚀 핵심: 오늘 날짜보다 종료일이 과거면 무조건 제외 (종료된 행사 필터링)
        if (end < todayStr) return false;
        
        // 오늘부터 검색한 날짜(targetStr) 사이에 시작하거나 겹치는 행사만 표시
        return start <= targetStr && end >= todayStr;
      });
    }

    setFilteredEvents(tempEvents);
    setVisibleCount(12);
  }, [selectedArea, selectedCategory, appliedDate, allEvents]);

  // 검색 버튼 클릭 핸들러
  const handleSearch = () => {
    setAppliedDate(targetDate);
  };

  return (
    <main style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <h1 style={{ color: '#0070f3', fontSize: '2.8rem', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '-1.5px' }}>이번 주말</h1>
        <h2 style={{ color: '#333', fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>아이와 어디 갈까요?</h2>
        <p style={{ color: '#666', marginTop: '15px', fontSize: '0.95rem' }}>
          원하는 지역과 날짜를 선택해 총 <strong>{filteredEvents.length}</strong>개의 나들이 정보를 확인해 보세요!
        </p>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '16px', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* 💡 날짜 필터 및 검색 버튼 추가 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', minWidth: '60px' }}>🗓 날짜:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#0070f3', fontWeight: 'bold' }}>{getTodayFormatted()}</span>
            <span style={{ color: '#555' }}>부터</span>
            <input 
              type="date" 
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)} 
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }} 
            />
            <span style={{ color: '#555' }}>까지</span>
            
            <button 
              onClick={handleSearch}
              style={{ padding: '8px 16px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              검색
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', minWidth: '60px' }}>📍 지역:</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {areaList.map(area => (
              <button key={area} onClick={() => setSelectedArea(area)} 
                style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: selectedArea === area ? '#0070f3' : '#d1d5db', backgroundColor: selectedArea === area ? '#e0f2fe' : '#fff', color: selectedArea === area ? '#0369a1' : '#4b5563', cursor: 'pointer', fontWeight: selectedArea === area ? 'bold' : 'normal', fontSize: '0.9rem', transition: '0.2s' }}>
                {area}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', minWidth: '60px' }}>🎈 분류:</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categoryList.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} 
                style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: selectedCategory === cat ? '#f59e0b' : '#d1d5db', backgroundColor: selectedCategory === cat ? '#fef3c7' : '#fff', color: selectedCategory === cat ? '#b45309' : '#4b5563', cursor: 'pointer', fontWeight: selectedCategory === cat ? 'bold' : 'normal', fontSize: '0.9rem', transition: '0.2s' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>데이터를 불러오는 중입니다... ⏳</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredEvents.slice(0, visibleCount).map((event) => (
              <div key={event.id} style={{ border: '1px solid #eee', borderRadius: '16px', padding: '20px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '8px' }}>{event.category}</div>
                <h2 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', lineHeight: '1.4', color: '#1a1a1a' }}>{event.title}</h2>
                <div style={{ fontSize: '0.9rem', color: '#555', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span>📍 {event.area} ({event.location})</span>
                  <span>📅 {event.start_date} ~ {event.end_date}</span>
                  <span>💰 {event.price}</span>
                </div>
                <a href={event.url} target="_blank" rel="noreferrer" 
                  style={{ display: 'block', marginTop: '20px', textAlign: 'center', backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 0', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  상세정보 / 예매하기
                </a>
              </div>
            ))}
          </div>

          {visibleCount < filteredEvents.length && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button onClick={() => setVisibleCount(prev => prev + 12)} style={{ padding: '12px 30px', backgroundColor: '#fff', border: '2px solid #0070f3', color: '#0070f3', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>더 보기 ⬇️</button>
            </div>
          )}
          
          {filteredEvents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888', backgroundColor: '#f8f9fa', borderRadius: '16px', marginTop: '20px' }}>
              <strong>조건에 맞는 이벤트가 없습니다.</strong><br/><br/>다른 지역이나 날짜, 분류를 선택해 보세요!
            </div>
          )}
        </>
      )}
    </main>
  );
}