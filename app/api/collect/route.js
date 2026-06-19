import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
function isValidDate(startDate, endDate, todayStr) {
    const end = (endDate || startDate || '').replace(/-/g, '');
    if (!end) return true; 
    return end >= todayStr;
}
function getSafeTag(tag, xmlString) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xmlString.match(regex);
    return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '';
}
function extractArea(address) {
    if (!address) return '기타';
    if (address.includes('서울')) return '서울';
    if (address.includes('부산')) return '부산';
    if (address.includes('대구')) return '대구';
    if (address.includes('인천')) return '인천';
    if (address.includes('대전')) return '대전';
    if (address.includes('울산')) return '울산';
    if (address.includes('세종')) return '세종';
    if (address.includes('광주') || address.includes('전남') || address.includes('전라남도')) return '전남광주';
    if (address.includes('경기')) return '경기';
    if (address.includes('강원')) return '강원';
    if (address.includes('충북') || address.includes('충청북도')) return '충북';
    if (address.includes('충남') || address.includes('충청남도')) return '충남';
    if (address.includes('전북') || address.includes('전라북도')) return '전북';
    if (address.includes('경북') || address.includes('경상북도')) return '경북';
    if (address.includes('경남') || address.includes('경상남도')) return '경남';
    if (address.includes('제주')) return '제주';
    return '기타';
}

// 💡 공연 데이터(KOPIS) 네이버 검색 링크로 수정
async function fetchKopis() {
    const KOPIS_KEY = '928033e0198e4bdcb10e255f2ec72f85';
    const dStart = new Date(); 
    const stdate = `${dStart.getFullYear()}${String(dStart.getMonth() + 1).padStart(2, '0')}${String(dStart.getDate()).padStart(2, '0')}`;
    const dEnd = new Date(); dEnd.setDate(dEnd.getDate() + 30);
    const eddate = `${dEnd.getFullYear()}${String(dEnd.getMonth() + 1).padStart(2, '0')}${String(dEnd.getDate()).padStart(2, '0')}`;
    const regions = { '11': '서울', '26': '부산', '27': '대구', '41': '경기' }; 
    const results = [];
    for (const [code, regionName] of Object.entries(regions)) {
        const url = `http://www.kopis.or.kr/openApi/restful/pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&cpage=1&rows=100&signgucode=${code}`;
        try {
            const res = await fetch(url); const xmlText = await res.text();
            const matches = [...xmlText.matchAll(/<db>([\s\S]*?)<\/db>/gi)];
            matches.forEach(match => {
                const mt20id = getSafeTag('mt20id', match[1]);
                const startStr = getSafeTag('prfpdfrom', match[1]).replace(/\./g, '');
                const endStr = getSafeTag('prfpdto', match[1]).replace(/\./g, '');
                const title = getSafeTag('prfnm', match[1]);
                if (title && isValidDate(startStr, endStr, stdate)) {
                    results.push({
                        id: `kopis-${mt20id}`, title: title, category: "공연",
                        location: getSafeTag('fcltynm', match[1]), start_date: startStr, end_date: endStr, 
                        price: "상세페이지 참조", source: "KOPIS", area: extractArea(regionName), 
                        url: `https://search.naver.com/search.naver?query=${encodeURIComponent(title)}` // 🚀 네이버 검색으로 강제 변경
                    });
                }
            });
        } catch (err) { }
    }
    return results;
}

// 💡 축제 데이터 (이미 네이버 검색 적용 중)
async function fetchStdFestivals(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`;
    const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            json.response.body.items.forEach(item => {
                const start = (item.fstvlStartDate || '').replace(/-/g, '');
                const end = (item.fstvlEndDate || '').replace(/-/g, '');
                if (isValidDate(start, end, todayStr)) {
                    results.push({
                        id: `stdfest-${item.fstvlNm}`, title: item.fstvlNm, category: "축제",
                        location: item.opar || item.rdnmadr || '장소 확인', start_date: start, end_date: end,
                        price: item.auspcInsttNm ? `${item.auspcInsttNm} 주관` : "확인 필요", source: "전국문화축제",
                        area: extractArea(item.rdnmadr || item.lnmadr), url: `https://search.naver.com/search.naver?query=${encodeURIComponent(item.fstvlNm)}`
                    });
                }
            });
        }
    } catch (e) { }
    return results;
}

// 💡 교육 데이터 (이미 네이버 검색 적용 중)
async function fetchStdEdu(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_lifelong_lrn_lctre_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`;
    const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            json.response.body.items.forEach(item => {
                const start = (item.edcStartDaycnt || '').replace(/-/g, '');
                const end = (item.edcEndDaycnt || '').replace(/-/g, '');
                if (item.lctreNm && isValidDate(start, end, todayStr)) {
                    results.push({
                        id: `stdedu-${item.lctreNm}`, title: item.lctreNm, category: "교육",
                        location: item.edcPlc || '장소 확인', start_date: start, end_date: end,
                        price: item.lctreCost === '0' ? '무료' : (item.lctreCost || '유료'), source: "전국평생학습",
                        area: extractArea(item.rdnmadr || item.edcPlc), url: `https://search.naver.com/search.naver?query=${encodeURIComponent(item.lctreNm)}`
                    });
                }
            });
        }
    } catch (e) { }
    return results;
}

// 💡 관광공사 축제 데이터 네이버 검색으로 변경
async function fetchTourApi(key, todayStr) {
    const url = `https://apis.data.go.kr/B551011/KorService1/searchFestival1?serviceKey=${key}&numOfRows=100&pageNo=1&MobileOS=ETC&MobileApp=KidsApp&_type=json&eventStartDate=${todayStr}`;
    const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        const items = json.response?.body?.items?.item;
        if (items) {
            const arr = Array.isArray(items) ? items : [items];
            arr.forEach(item => {
                results.push({
                    id: `tour-${item.contentid}`, title: item.title, category: "축제",
                    location: item.addr1 || '상세페이지 참조', start_date: item.eventstartdate || '', end_date: item.eventenddate || '',
                    price: "상세페이지 참조", source: "한국관광공사", area: extractArea(item.addr1),
                    url: `https://search.naver.com/search.naver?query=${encodeURIComponent(item.title)}` // 🚀 수정
                });
            });
        }
    } catch (e) { }
    return results;
}

async function fetchBusanApi(key, todayStr) {
    const festUrl = `http://apis.data.go.kr/6260000/FestivalService/getFestivalKr?serviceKey=${key}&pageNo=1&numOfRows=50&resultType=json`;
    const cultUrl = `http://apis.data.go.kr/6260000/BusanCultureInfoService/getBusanCulture?serviceKey=${key}&pageNo=1&numOfRows=50&resultType=json`;
    const results = [];
    const fetchData = async (url, cat) => {
        try {
            const res = await fetch(url); const json = await res.json();
            const items = json.getFestivalKr?.item || json.getBusanCulture?.item || [];
            items.forEach(item => {
                const title = item.TITLE || item.res_title;
                results.push({
                    id: `busan-${item.UC_SEQ || item.res_no}`, title: title, category: cat,
                    location: item.PLACE || item.res_loc || '부산', start_date: todayStr, end_date: todayStr, 
                    price: item.USAGE_FEE || item.res_fee || '상세페이지 참조', source: "부산광역시", area: "부산",
                    url: `https://search.naver.com/search.naver?query=${encodeURIComponent(title)}` // 🚀 네이버 강제 적용
                });
            });
        } catch (e) { }
    };
    await Promise.all([fetchData(festUrl, "축제"), fetchData(cultUrl, "원데이클래스")]);
    return results;
}

async function fetchMuseums(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_museum_artgr_info_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`;
    const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            const d = new Date(); d.setFullYear(d.getFullYear() + 1);
            const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            json.response.body.items.forEach(item => {
                const childPrice = item.childChrge === '0' ? '어린이 무료' : (item.childChrge ? `어린이 ${item.childChrge}원` : '요금 확인');
                results.push({
                    id: `museum-${item.fcltyNm}`, title: item.fcltyNm, category: "전시/관람",
                    location: item.rdnmadr || item.lnmadr || '장소 확인', start_date: todayStr, end_date: nextYearStr,
                    price: childPrice, source: "전국박물관미술관", area: extractArea(item.rdnmadr || item.lnmadr),
                    url: `https://search.naver.com/search.naver?query=${encodeURIComponent(item.fcltyNm)}` // 🚀 수정
                });
            });
        }
    } catch (e) { }
    return results;
}

async function fetchRecreationalForests(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_frest_recreat_info_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`;
    const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            const d = new Date(); d.setFullYear(d.getFullYear() + 1);
            const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            json.response.body.items.forEach(item => {
                results.push({
                    id: `forest-${item.frestNm}`, title: `🌲 ${item.frestNm}`, category: "캠핑/휴양",
                    location: item.rdnmadr || item.lnmadr || '위치 확인', start_date: todayStr, end_date: nextYearStr,
                    price: item.useChrge || '홈페이지 참조', source: "전국휴양림", area: extractArea(item.rdnmadr || item.lnmadr),
                    url: `https://search.naver.com/search.naver?query=${encodeURIComponent(item.frestNm)}` // 🚀 수정
                });
            });
        }
    } catch (e) { }
    return results;
}

async function fetchRuralVillages(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_rur_exper_recrt_vllg_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`;
    const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            const d = new Date(); d.setFullYear(d.getFullYear() + 1);
            const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            json.response.body.items.forEach(item => {
                results.push({
                    id: `rural-${item.vllgNm}`, title: `🚜 ${item.vllgNm} 농촌체험마을`, category: "체험/야외",
                    location: item.rdnmadr || item.lnmadr || '위치 확인', start_date: todayStr, end_date: nextYearStr,
                    price: item.exprProgrmNm ? `체험: ${item.exprProgrmNm}` : '프로그램 별도 확인', source: "농촌체험마을", area: extractArea(item.rdnmadr || item.lnmadr),
                    url: `https://search.naver.com/search.naver?query=${encodeURIComponent(item.vllgNm)}` // 🚀 수정
                });
            });
        }
    } catch (e) { }
    return results;
}

async function fetchLocalCampgrounds(key, todayStr) {
    const jeonnamUrl = `http://api.data.go.kr/openapi/tn_pubr_public_campgn_api?serviceKey=${key}&pageNo=1&numOfRows=50&type=json`; 
    const gyeongnamUrl = `http://api.data.go.kr/openapi/tn_pubr_public_campgn_api?serviceKey=${key}&pageNo=2&numOfRows=50&type=json`; 
    const results = [];
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const fetchData = async (url, localTag) => {
        try {
            const res = await fetch(url); const json = await res.json();
            const items = json.response?.body?.items || [];
            items.forEach(item => {
                const addr = item.rdnmadr || item.lnmadr || '';
                if (addr.includes('전남') || addr.includes('전라남도') || addr.includes('경남') || addr.includes('경상남도')) {
                    results.push({
                        id: `camp-${item.facltNm}`, title: `⛺ ${item.facltNm}`, category: "캠핑/휴양",
                        location: addr || '위치 확인', start_date: todayStr, end_date: nextYearStr, 
                        price: item.useChrge || '상세페이지 참조', source: localTag, area: extractArea(addr),
                        url: `https://search.naver.com/search.naver?query=${encodeURIComponent(item.facltNm)}` // 🚀 수정
                    });
                }
            });
        } catch (e) { }
    };
    await Promise.all([fetchData(jeonnamUrl, "전남_텐트촌"), fetchData(gyeongnamUrl, "경남_야영장")]);
    return results;
}

export async function GET() {
    try {
        const DATA_KEY = 'bd208a4254cef2afe7489ec760de3021685c818dbc713220d4ca01ba5ce639b7';
        const todayStr = getTodayStr();
        const results = await Promise.allSettled([
            fetchKopis(),
            fetchStdFestivals(DATA_KEY, todayStr),
            fetchStdEdu(DATA_KEY, todayStr),
            fetchTourApi(DATA_KEY, todayStr),
            fetchBusanApi(DATA_KEY, todayStr),
            fetchMuseums(DATA_KEY, todayStr),
            fetchRecreationalForests(DATA_KEY, todayStr),
            fetchRuralVillages(DATA_KEY, todayStr),
            fetchLocalCampgrounds(DATA_KEY, todayStr)
        ]);

        let allEvents = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value.length > 0) {
                allEvents = [...allEvents, ...res.value];
            }
        });

        const uniqueEvents = Array.from(new Map(allEvents.map(item => [item.id, item])).values());

        if (uniqueEvents.length === 0) {
            return NextResponse.json({ success: true, message: "수집된 데이터가 없습니다." });
        }

        const { data, error } = await supabase.from('events').upsert(uniqueEvents, { onConflict: 'id' });
        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            message: `성공! 중복 제거 후 총 ${uniqueEvents.length}개의 데이터 적재 완료.` 
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}