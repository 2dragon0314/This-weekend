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

function getSmartLink(providedUrl, title, isPerformance = false) {
    if (providedUrl && typeof providedUrl === 'string' && providedUrl.startsWith('http')) return providedUrl;
    if (isPerformance) return `https://tickets.interpark.com/contents/search?keyword=${encodeURIComponent(title)}`;
    return `https://search.naver.com/search.naver?query=${encodeURIComponent(title)}`;
}

// ===== 기존 공공데이터 수집 함수들 (요약 처리) =====
// (KOPIS, 축제, 교육, 관광, 부산, 박물관, 휴양림, 농촌, 캠핑장 - 이전과 동일하게 작동)
// 코드가 너무 길어지는 것을 방지하기 위해 내부 로직은 유지한 채 하나로 묶었습니다.
async function fetchPublicDataAll(DATA_KEY, todayStr) {
    // (이전 코드에 있던 9개 fetch 함수들을 여기서 모두 호출한다고 가정 - 실제로는 아래 Promise.all에서 병렬 처리합니다)
    return []; 
}

// 💡 새로 추가된 네이버 수집 함수
async function fetchNaverBlogs(clientId, clientSecret) {
    if (!clientId || !clientSecret) return [];
    
    const regionConfigs = [
        { search: '서울', area: '서울' }, { search: '부산', area: '부산' },
        { search: '대구', area: '대구' }, { search: '인천', area: '인천' },
        { search: '광주', area: '전남광주' }, { search: '대전', area: '대전' },
        { search: '울산', area: '울산' }, { search: '세종', area: '세종' },
        { search: '경기', area: '경기' }, { search: '강원', area: '강원' },
        { search: '충북', area: '충북' }, { search: '충남', area: '충남' },
        { search: '전북', area: '전북' }, { search: '전남', area: '전남광주' },
        { search: '경북', area: '경북' }, { search: '경남', area: '경남' },
        { search: '제주', area: '제주' }
    ];

    const d = new Date();
    const startStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    d.setMonth(d.getMonth() + 1);
    const endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

    const fetchPromises = regionConfigs.map(async (config, index) => {
        const keyword = `${config.search} 주말 아이와 가볼만한 곳`;
        const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=5&sort=sim`;
        try {
            const res = await fetch(url, { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } });
            const data = await res.json();
            if (data.items) {
                return data.items.map((item, itemIndex) => ({
                    id: `naver-${config.search}-${itemIndex}`, 
                    title: `[${config.search} 추천] ` + item.title.replace(/<[^>]*>?/g, ''),
                    category: "블로그 추천", location: "상세페이지 확인", 
                    start_date: startStr, end_date: endStr, price: "무료~유료", 
                    source: "네이버 검색", area: config.area, url: item.link
                }));
            }
        } catch (e) {}
        return [];
    });

    const resultsArray = await Promise.all(fetchPromises);
    return resultsArray.flat();
}

// 공공 API 함수들 원본 (생략 없이 그대로 유지)
async function fetchKopis() {
    const KOPIS_KEY = '928033e0198e4bdcb10e255f2ec72f85';
    const dStart = new Date(); const stdate = `${dStart.getFullYear()}${String(dStart.getMonth() + 1).padStart(2, '0')}${String(dStart.getDate()).padStart(2, '0')}`;
    const dEnd = new Date(); dEnd.setDate(dEnd.getDate() + 30); const eddate = `${dEnd.getFullYear()}${String(dEnd.getMonth() + 1).padStart(2, '0')}${String(dEnd.getDate()).padStart(2, '0')}`;
    const regions = { '11': '서울', '26': '부산', '27': '대구', '41': '경기' }; 
    const results = [];
    for (const [code, regionName] of Object.entries(regions)) {
        const url = `http://www.kopis.or.kr/openApi/restful/pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&cpage=1&rows=100&signgucode=${code}`;
        try {
            const res = await fetch(url); const xmlText = await res.text();
            const matches = [...xmlText.matchAll(/<db>([\s\S]*?)<\/db>/gi)];
            matches.forEach(match => {
                const mt20id = getSafeTag('mt20id', match[1]); const startStr = getSafeTag('prfpdfrom', match[1]).replace(/\./g, '');
                const endStr = getSafeTag('prfpdto', match[1]).replace(/\./g, ''); const title = getSafeTag('prfnm', match[1]);
                if (title && isValidDate(startStr, endStr, stdate)) {
                    results.push({ id: `kopis-${mt20id}`, title: title, category: "공연", location: getSafeTag('fcltynm', match[1]), start_date: startStr, end_date: endStr, price: "상세페이지 참조", source: "KOPIS", area: extractArea(regionName), url: getSmartLink('', title, true) });
                }
            });
        } catch (err) { }
    }
    return results;
}
async function fetchStdFestivals(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            json.response.body.items.forEach(item => {
                const start = (item.fstvlStartDate || '').replace(/-/g, ''); const end = (item.fstvlEndDate || '').replace(/-/g, '');
                if (isValidDate(start, end, todayStr)) results.push({ id: `stdfest-${item.fstvlNm}`, title: item.fstvlNm, category: "축제", location: item.opar || item.rdnmadr || '장소 확인', start_date: start, end_date: end, price: item.auspcInsttNm ? `${item.auspcInsttNm} 주관` : "확인 필요", source: "전국문화축제", area: extractArea(item.rdnmadr || item.lnmadr), url: getSmartLink(item.homepageUrl, item.fstvlNm) });
            });
        }
    } catch (e) { } return results;
}
async function fetchStdEdu(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_lifelong_lrn_lctre_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            json.response.body.items.forEach(item => {
                const start = (item.edcStartDaycnt || '').replace(/-/g, ''); const end = (item.edcEndDaycnt || '').replace(/-/g, '');
                if (item.lctreNm && isValidDate(start, end, todayStr)) results.push({ id: `stdedu-${item.lctreNm}`, title: item.lctreNm, category: "교육", location: item.edcPlc || '장소 확인', start_date: start, end_date: end, price: item.lctreCost === '0' ? '무료' : (item.lctreCost || '유료'), source: "전국평생학습", area: extractArea(item.rdnmadr || item.edcPlc), url: getSmartLink(item.edcInsttUrl || item.homepageUrl, item.lctreNm) });
            });
        }
    } catch (e) { } return results;
}
async function fetchTourApi(key, todayStr) {
    const url = `https://apis.data.go.kr/B551011/KorService1/searchFestival1?serviceKey=${key}&numOfRows=100&pageNo=1&MobileOS=ETC&MobileApp=KidsApp&_type=json&eventStartDate=${todayStr}`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json(); const items = json.response?.body?.items?.item;
        if (items) {
            const arr = Array.isArray(items) ? items : [items];
            arr.forEach(item => results.push({ id: `tour-${item.contentid}`, title: item.title, category: "축제", location: item.addr1 || '상세페이지 참조', start_date: item.eventstartdate || '', end_date: item.eventenddate || '', price: "상세페이지 참조", source: "한국관광공사", area: extractArea(item.addr1), url: getSmartLink('', item.title) }));
        }
    } catch (e) { } return results;
}
async function fetchBusanApi(key, todayStr) {
    const festUrl = `http://apis.data.go.kr/6260000/FestivalService/getFestivalKr?serviceKey=${key}&pageNo=1&numOfRows=50&resultType=json`;
    const cultUrl = `http://apis.data.go.kr/6260000/BusanCultureInfoService/getBusanCulture?serviceKey=${key}&pageNo=1&numOfRows=50&resultType=json`; const results = [];
    const fetchData = async (url, cat) => {
        try {
            const res = await fetch(url); const json = await res.json(); const items = json.getFestivalKr?.item || json.getBusanCulture?.item || [];
            items.forEach(item => results.push({ id: `busan-${item.UC_SEQ || item.res_no}`, title: item.TITLE || item.res_title, category: cat, location: item.PLACE || item.res_loc || '부산', start_date: todayStr, end_date: todayStr, price: item.USAGE_FEE || item.res_fee || '상세페이지 참조', source: "부산광역시", area: "부산", url: getSmartLink(item.HOMEPAGE_URL || item.res_url, item.TITLE || item.res_title) }));
        } catch (e) { }
    };
    await Promise.all([fetchData(festUrl, "축제"), fetchData(cultUrl, "원데이클래스")]); return results;
}
async function fetchMuseums(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_museum_artgr_info_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            const d = new Date(); d.setFullYear(d.getFullYear() + 1); const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            json.response.body.items.forEach(item => results.push({ id: `museum-${item.fcltyNm}`, title: item.fcltyNm, category: "전시/관람", location: item.rdnmadr || item.lnmadr || '장소 확인', start_date: todayStr, end_date: nextYearStr, price: item.childChrge === '0' ? '어린이 무료' : (item.childChrge ? `어린이 ${item.childChrge}원` : '요금 확인'), source: "전국박물관미술관", area: extractArea(item.rdnmadr || item.lnmadr), url: getSmartLink(item.homepageUrl, item.fcltyNm) }));
        }
    } catch (e) { } return results;
}
async function fetchRecreationalForests(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_frest_recreat_info_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            const d = new Date(); d.setFullYear(d.getFullYear() + 1); const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            json.response.body.items.forEach(item => results.push({ id: `forest-${item.frestNm}`, title: `🌲 ${item.frestNm}`, category: "캠핑/휴양", location: item.rdnmadr || item.lnmadr || '위치 확인', start_date: todayStr, end_date: nextYearStr, price: item.useChrge || '홈페이지 참조', source: "전국휴양림", area: extractArea(item.rdnmadr || item.lnmadr), url: getSmartLink(item.homepageUrl, item.frestNm) }));
        }
    } catch (e) { } return results;
}
async function fetchRuralVillages(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_rur_exper_recrt_vllg_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            const d = new Date(); d.setFullYear(d.getFullYear() + 1); const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            json.response.body.items.forEach(item => results.push({ id: `rural-${item.vllgNm}`, title: `🚜 ${item.vllgNm} 농촌체험마을`, category: "체험/야외", location: item.rdnmadr || item.lnmadr || '위치 확인', start_date: todayStr, end_date: nextYearStr, price: item.exprProgrmNm ? `체험: ${item.exprProgrmNm}` : '프로그램 별도 확인', source: "농촌체험마을", area: extractArea(item.rdnmadr || item.lnmadr), url: getSmartLink(item.homepageUrl, item.vllgNm) }));
        }
    } catch (e) { } return results;
}
async function fetchLocalCampgrounds(key, todayStr) {
    const jeonnamUrl = `http://api.data.go.kr/openapi/tn_pubr_public_campgn_api?serviceKey=${key}&pageNo=1&numOfRows=50&type=json`; 
    const gyeongnamUrl = `http://api.data.go.kr/openapi/tn_pubr_public_campgn_api?serviceKey=${key}&pageNo=2&numOfRows=50&type=json`; const results = [];
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const fetchData = async (url, localTag) => {
        try {
            const res = await fetch(url); const json = await res.json(); const items = json.response?.body?.items || [];
            items.forEach(item => {
                const addr = item.rdnmadr || item.lnmadr || '';
                if (addr.includes('전남') || addr.includes('전라남도') || addr.includes('경남') || addr.includes('경상남도')) {
                    results.push({ id: `camp-${item.facltNm}`, title: `⛺ ${item.facltNm}`, category: "캠핑/휴양", location: addr || '위치 확인', start_date: todayStr, end_date: nextYearStr, price: item.useChrge || '상세페이지 참조', source: localTag, area: extractArea(addr), url: getSmartLink(item.homepageUrl, item.facltNm) });
                }
            });
        } catch (e) { }
    };
    await Promise.all([fetchData(jeonnamUrl, "전남_텐트촌"), fetchData(gyeongnamUrl, "경남_야영장")]); return results;
}

export async function GET() {
    try {
        const DATA_KEY = process.env.NEXT_PUBLIC_DATA_KEY; 
        const NAVER_ID = process.env.NAVER_CLIENT_ID;
        const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;
        const todayStr = getTodayStr();

        // 🚀 모든 공공데이터 + 네이버 블로그 검색을 동시에 실행!
        const results = await Promise.allSettled([
            fetchKopis(),
            fetchStdFestivals(DATA_KEY, todayStr),
            fetchStdEdu(DATA_KEY, todayStr),
            fetchTourApi(DATA_KEY, todayStr),
            fetchBusanApi(DATA_KEY, todayStr),
            fetchMuseums(DATA_KEY, todayStr),
            fetchRecreationalForests(DATA_KEY, todayStr),
            fetchRuralVillages(DATA_KEY, todayStr),
            fetchLocalCampgrounds(DATA_KEY, todayStr),
            fetchNaverBlogs(NAVER_ID, NAVER_SECRET) // <- 네이버 수집기 합류!
        ]);

        let allEvents = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value.length > 0) {
                allEvents = [...allEvents, ...res.value];
            }
        });

        // 중복 제거 및 DB 적재
        const uniqueEvents = Array.from(new Map(allEvents.map(item => [item.id, item])).values());
        if (uniqueEvents.length === 0) return NextResponse.json({ success: true, message: "수집된 데이터가 없습니다." });

        const { data, error } = await supabase.from('events').upsert(uniqueEvents, { onConflict: 'id' });
        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            message: `성공! 공공데이터와 네이버 블로그 포함, 총 ${uniqueEvents.length}개의 데이터 적재 완료.` 
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}