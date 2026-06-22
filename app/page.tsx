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
    const matchCategory = selectedCategory === "전체" || event.category === selectedCategory;
    const matchSearch = appliedSearch === "" || event.title.includes(appliedSearch) || event.location.includes(appliedSearch);
    
    return matchArea && matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 mb-2">
            이번 주말 나들이 🎈
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            아이와 함께 가기 좋은 전국 행사와 핫플레이스를 찾아보세요!
          </p>
        </header>

        <form onSubmit={handleSearch} className="mb-8 flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="공룡, 박물관, 팝업스토어 검색..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            type="submit" 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
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