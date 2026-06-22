/* eslint-disable @next/next/no-img-element */
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
image_url: string; // 💡 이미지 주소 속성 추가
}

export default function Home() {
const [allEvents, setAllEvents] = useState<EventData[]>([]);
const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);

const getTodayFormatted = () => {
const today = new Date();
const days = ['일', '월', '화', '수', '목', '금', '토'];
return (오늘) ${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}, ${days[today.getDay()]}요일;
};

const getTodayISO = () => {
const today = new Date();
return ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')};
};

const [selectedArea, setSelectedArea] = useState('전체');
const [selectedCategory, setSelectedCategory] = useState('전체');
const [targetDate, setTargetDate] = useState(getTodayISO());
const [appliedDate, setAppliedDate] = useState(getTodayISO());

const [searchQuery, setSearchQuery] = useState('');
const [appliedQuery, setAppliedQuery] = useState('');

const [visibleCount, setVisibleCount] = useState(12);
const [isLoading, setIsLoading] = useState(true);

const areaList = ['전체', '서울', '부산', '대구', '인천', '대전', '울산', '세종', '전남광주', '경기', '강원', '충북', '충남', '전북', '경북', '경남', '제주'];
const categoryList = ['전체', '공연', '축제', '교육', '원데이클래스', '전시/관람', '체험/야외', '캠핑/휴양', '블로그 추천'];

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

useEffect(() => {
let tempEvents = allEvents;

if (selectedArea !== '전체') tempEvents = tempEvents.filter(e => e.area === selectedArea);
if (selectedCategory !== '전체') tempEvents = tempEvents.filter(e => e.category === selectedCategory);

if (appliedQuery) {
  tempEvents = tempEvents.filter(e => 
    e.title.includes(appliedQuery) || e.location.includes(appliedQuery)
  );
}

if (appliedDate) {
  const targetStr = appliedDate.replace(/-/g, '');
  const todayStr = getTodayISO().replace(/-/g, '');
  
  tempEvents = tempEvents.filter(e => {
    const start = e.start_date || '';
    const end = e.end_date || start || '99999999'; 
    
    if (end < todayStr) return false;
    return start <= targetStr && end >= todayStr;
  });
}

setFilteredEvents(tempEvents);
setVisibleCount(12);


}, [selectedArea, selectedCategory, appliedDate, appliedQuery, allEvents]);

const handleSearch = () => {
setAppliedDate(targetDate);
setAppliedQuery(searchQuery);
};

return (
<main style={{ backgroundColor: '#ffffff', color: '#1a1a1a', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
<div style={{ maxWidth: '1000px', margin: '0 auto' }}>

    <div style={{ textAlign: 'center', margin: '30px 0' }}>
      <h1 style={{ color: '#0070f3', fontSize: '2.8rem', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '-1.5px' }}>이번 주말</h1>
      <h2 style={{ color: '#333333', fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>아이와 어디 갈까요?</h2>
      <p style={{ color: '#666666', marginTop: '15px', fontSize: '1.05rem' }}>
        현재 조건으로 총 <strong style={{ color: '#0070f3', fontSize: '1.2rem' }}>{filteredEvents.length}</strong>개가 검색되었습니다.
      </p>
    </div>

    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '16px', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold', minWidth: '60px', color: '#000000' }}>🔍 검색:</label>
        <input 
          type="text" 
          placeholder="교육, 박람회, 전시, 공연, 지역축제, 문화, 원데이클래스 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, minWidth: '250px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', color: '#000000', backgroundColor: '#ffffff' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold', minWidth: '60px', color: '#000000' }}>🗓 날짜:</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#0070f3', fontWeight: 'bold' }}>{getTodayFormatted()}</span>
          <span style={{ color: '#555555' }}>부터</span>
          <input 
            type="date" 
            value={targetDate} 
            onChange={(e) => setTargetDate(e.target.value)} 
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', color: '#000000', backgroundColor: '#ffffff' }} 
          />
          <span style={{ color: '#555555' }}>까지</span>
          
          <button 
            onClick={handleSearch}
            style={{ marginLeft: '10px', padding: '8px 16px', backgroundColor: '#0070f3', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            적용하기
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold', minWidth: '60px', color: '#000000' }}>📍 지역:</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {areaList.map(area => (
            <button key={area} onClick={() => setSelectedArea(area)} 
              style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: selectedArea === area ? '#0070f3' : '#d1d5db', backgroundColor: selectedArea === area ? '#e0f2fe' : '#ffffff', color: selectedArea === area ? '#0369a1' : '#4b5563', cursor: 'pointer', fontWeight: selectedArea === area ? 'bold' : 'normal', fontSize: '0.9rem', transition: '0.2s' }}>
              {area}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold', minWidth: '60px', color: '#000000' }}>🎈 분류:</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categoryList.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} 
              style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: selectedCategory === cat ? '#f59e0b' : '#d1d5db', backgroundColor: selectedCategory === cat ? '#fef3c7' : '#ffffff', color: selectedCategory === cat ? '#b45309' : '#4b5563', cursor: 'pointer', fontWeight: selectedCategory === cat ? 'bold' : 'normal', fontSize: '0.9rem', transition: '0.2s' }}>
              {cat === '블로그 추천' ? '🔥 핫플(블로그)' : cat}
            </button>
          ))}
        </div>
      </div>
    </div>

    {isLoading ? (
      <div style={{ textAlign: 'center', padding: '40px', color: '#888888' }}>데이터를 불러오는 중입니다... ⏳</div>
    ) : (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredEvents.slice(0, visibleCount).map((event) => (
            <div key={event.id} style={{ border: '1px solid #eeeeee', borderRadius: '16px', padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
              
              {/* 💡 이미지 렌더링 영역 방어 로직 추가 (http 강제 변환 및 로딩 실패 처리) */}
              <div style={{ height: '180px', backgroundColor: '#f1f5f9', borderRadius: '12px', marginBottom: '15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {event.image_url ? (
                  <img 
                    src={event.image_url.replace('http://', 'https://')} 
                    alt={event.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} // 엑스박스 방지
                  />
                ) : (
                  <div style={{ fontSize: '3.5rem' }}>
                    {event.category === '공연' ? '🎭' : event.category === '축제' ? '🎉' : event.category === '전시/관람' ? '🖼️' : '🎈'}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '8px' }}>{event.category}</div>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', lineHeight: '1.4', color: '#1a1a1a' }}>{event.title}</h2>
              <div style={{ fontSize: '0.9rem', color: '#555555', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>📍 {event.area} ({event.location})</span>
                <span>📅 {event.start_date} ~ {event.end_date}</span>
                <span>💰 {event.price}</span>
              </div>
              <a href={event.url} target="_blank" rel="noreferrer" 
                style={{ display: 'block', marginTop: '20px', textAlign: 'center', backgroundColor: '#1a1a1a', color: '#ffffff', padding: '12px 0', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>
                상세정보 / 예매하기
              </a>
            </div>
          ))}
        </div>

        {visibleCount < filteredEvents.length && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={() => setVisibleCount(prev => prev + 12)} style={{ padding: '12px 30px', backgroundColor: '#ffffff', border: '2px solid #0070f3', color: '#0070f3', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>더 보기 ⬇️</button>
          </div>
        )}
        
        {filteredEvents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888888', backgroundColor: '#f8f9fa', borderRadius: '16px', marginTop: '20px' }}>
            <strong style={{ color: '#000000' }}>조건에 맞는 정보가 없습니다.</strong><br/><br/>다른 지역이나 날짜, 분류를 선택해 보세요!
          </div>
        )}
      </>
    )}
  </div>
</main>


);
}