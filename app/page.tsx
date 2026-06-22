"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// 수파베이스 연결 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
const [events, setEvents] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [selectedArea, setSelectedArea] = useState("전국");
const [selectedCategory, setSelectedCategory] = useState("전체");
const [searchQuery, setSearchQuery] = useState("");
const [appliedSearch, setAppliedSearch] = useState("");

// 오늘 날짜 및 기본 한 달 뒤 날짜 세팅 (백틱 오류 수정 완료)
const today = new Date();
const todayFormatted = ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')};

const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);
const nextMonthFormatted = ${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')};

const [startDate, setStartDate] = useState(todayFormatted);
const [endDate, setEndDate] = useState(nextMonthFormatted);

const areas = [
"전국", "서울", "부산", "대구", "인천", "전남광주", "대전",
"울산", "세종", "경기", "강원", "충북", "충남", "전북", "경북", "경남", "제주"
];

const categories = [
"전체", "공연", "전시/관람", "축제", "교육", "체험/야외", "캠핑/휴양", "블로그 추천"
];

useEffect(() => {
fetchEvents();
}, []);

async function fetchEvents() {
setLoading(true);
try {
const { data, error } = await supabase
.from("events")
.select("*")
.order("start_date", { ascending: true });

  if (error) throw error;
  setEvents(data || []);
} catch (error) {
  console.error("데이터를 불러오는 중 오류 발생:", error);
} finally {
  setLoading(false);
}


}

const handleSearch = (e: React.FormEvent) => {
e.preventDefault();
setAppliedSearch(searchQuery);
};

const filteredEvents = events.filter((event) => {
const matchArea = selectedArea === "전국" || event.area === selectedArea;
// trim()을 추가하여 DB의 공백으로 인한 블로그 카테고리 인식 오류 방지
const matchCategory = selectedCategory === "전체" || event.category?.trim() === selectedCategory;
const matchSearch = appliedSearch === "" || event.title.includes(appliedSearch) || event.location.includes(appliedSearch);

// 날짜 기간 겹침 확인 로직
const evStart = event.start_date || "00000000";
const evEnd = event.end_date || "99999999";
const filterStart = startDate.replace(/-/g, "");
const filterEnd = endDate.replace(/-/g, "");

const matchDate = (!filterStart || evEnd >= filterStart) && (!filterEnd || evStart <= filterEnd);

return matchArea && matchCategory && matchSearch && matchDate;


});

return (



    <header className="mb-8 text-center sm:text-left">
      {/* 확정된 프로젝트명과 부제로 원상복구 */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 mb-2">
        이번 주말
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        아이와 어디갈까요?
      </p>
      <div className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 inline-block px-3 py-1 rounded-md">
        오늘 기준일: {today.getFullYear()}년 {today.getMonth() + 1}월 {today.getDate()}일
      </div>
    </header>

    {/* 기간 검색 기능 복구 */}
    <div className="mb-6 flex flex-wrap items-center gap-4 justify-center sm:justify-start">
      <div>
        <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">검색 시작일</label>
        <input 
          type="date" 
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <span className="text-gray-400 mt-5">~</span>
      <div>
        <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">검색 종료일</label>
        <input 
          type="date" 
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <form onSubmit={handleSearch} className="mb-8 flex gap-2 max-w-2xl mx-auto sm:mx-0">
      <input
        type="text"
        // 타겟층에 맞춘 정확한 플레이스홀더 반영
        placeholder="교육, 박람회, 전시, 공연, 지역축제, 문화, 원데이클래스 검색..."
        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button 
        type="submit" 
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
      >
        검색
      </button>
    </form>

    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">지역 선택</h2>
      <div className="flex flex-wrap gap-2">
        {areas.map((area) => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedArea === area
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {area}
          </button>
        ))}
      </div>
    </div>

    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">나들이 종류</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {cat === "블로그 추천" ? "🔥 핫플(블로그)" : cat}
          </button>
        ))}
      </div>
    </div>

    {loading ? (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ) : filteredEvents.length === 0 ? (
      <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <span className="text-4xl mb-4 block">👀</span>
        <p className="text-gray-500 dark:text-gray-400 text-lg">해당 조건에 맞는 나들이 정보가 없어요.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div 
            key={event.id} 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
          >
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                  {event.category}
                </span>
                <span className="text-xs text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {event.area}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2 line-clamp-2 break-keep">
                {event.title}
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5 mb-4">
                <p className="flex items-start gap-1.5">
                  <span className="text-gray-400">📍</span>
                  <span className="line-clamp-1">{event.location}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-gray-400">💰</span>
                  <span>{event.price}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-gray-400">🔖</span>
                  <span className="text-xs text-gray-500">출처: {event.source}</span>
                </p>
              </div>
            </div>
            
            <div className="px-5 pb-5 mt-auto">
              {event.url ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-blue-700 dark:text-blue-300 font-semibold rounded-xl transition-colors"
                >
                  상세정보 / 예매하기
                </a>
              ) : (
                <button 
                  disabled
                  className="block w-full text-center py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-400 font-semibold rounded-xl cursor-not-allowed"
                >
                  링크 없음
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</div>


);
}