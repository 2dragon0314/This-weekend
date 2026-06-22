import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 💡 Vercel의 작업 시간을 60초로 늘려주는 코드 (Timeout 방지)
export const maxDuration = 60;

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

function getSmartLink(providedUrl, title) {
    if (providedUrl && typeof providedUrl === 'string' && providedUrl.startsWith('http')) return providedUrl;
    return `https://search.naver.com/search.naver?query=${encodeURIComponent(title)}`;
}

// 💡 1. KOPIS 전용: 포스터 이미지(image_url) 추가
async function fetchKopis() {
    const KOPIS_KEY = '928033e0198e4bdcb10e255f2ec72f85';
    const dStart = new Date(); const stdate = `${dStart.getFullYear()}${String(dStart.getMonth() + 1).padStart(2, '0')}${String(dStart.getDate()).padStart(2, '0')}`;
    const dEnd = new Date(); dEnd.setDate(dEnd.getDate() + 30); const eddate = `${dEnd.getFullYear()}${String(dEnd.getMonth() + 1).padStart(2, '0')}${String(dEnd.getDate()).padStart(2, '0')}`;
    const regions = { '11': '서울', '26': '부산', '27': '대구', '41': '경기' }; 
    let allResults = [];

    for (const [code, regionName] of Object.entries(regions)) {
        const url = `http://www.kopis.or.kr/openApi/restful/pblprfr?service=${KOPIS_KEY}&stdate=${stdate}&eddate=${eddate}&cpage=1&rows=30&signgucode=${code}`;
        try {
            const res = await fetch(url); const xmlText = await res.text();
            const matches = [...xmlText.matchAll(/<db>([\s\S]*?)<\/db>/gi)];
            
            const kopisPromises = matches.map(async match => {
                const mt20id = getSafeTag('mt20id', match[1]); 
                const startStr = getSafeTag('prfpdfrom', match[1]).replace(/\./g, '');
                const endStr = getSafeTag('prfpdto', match[1]).replace(/\./g, ''); 
                const title = getSafeTag('prfnm', match[1]);
                const poster = getSafeTag('poster', match[1]); // 💡 포스터 주소 추출
                
                if (title && isValidDate(startStr, endStr, stdate)) {
                    let finalUrl = '';
                    try {
                        const detailUrl = `http://www.kopis.or.kr/openApi/restful/pblprfr/${mt20id}?service=${KOPIS_KEY}`;
                        const detailRes = await fetch(detailUrl);
                        const detailXml = await detailRes.text();
                        const relurlMatch = detailXml.match(/<relurl>([\s\S]*?)<\/relurl>/i);
                        if (relurlMatch && relurlMatch[1]) {
                            finalUrl = relurlMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
                        }
                    } catch(e) {}

                    if (!finalUrl || !finalUrl.startsWith('http')) {
                        finalUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(title + ' 예매')}`;
                    }

                    return { 
                        id: `kopis-${mt20id}`, title: title, category: "공연", 
                        location: getSafeTag('fcltynm', match[1]), start_date: startStr, end_date: endStr, 
                        price: "상세페이지 참조", source: "KOPIS", area: extractArea(regionName), 
                        url: finalUrl,
                        image_url: poster // 💡 데이터베이스에 이미지 저장
                    };
                }
                return null;
            });
            const regionResults = await Promise.all(kopisPromises);
            allResults = [...allResults, ...regionResults.filter(item => item !== null)];
        } catch (err) { }
    }
    return allResults;
}

// 💡 2. 네이버 지역(Local) 검색 추가: 공식 업체, 원데이클래스, 공방 등 공식 웹사이트 연결
async function fetchNaverLocalOfficial(clientId, clientSecret) {
    if (!clientId || !clientSecret) return [];
    
    // 주요 거점 위주로 검색
    const regionConfigs = [
        { search: '서울', area: '서울' }, { search: '부산', area: '부산' }, { search: '경기', area: '경기' }
    ];
    // 아이들이 체험할 만한 실제 업종 키워드
    const keywords = [
        { q: '어린이 원데이클래스', cat: '원데이클래스' },
        { q: '키즈 체험 공방', cat: '체험/야외' }
    ];

    const d = new Date(); const startStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    d.setMonth(d.getMonth() + 1); const endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    
    const results = [];

    for (const config of regionConfigs) {
        for (const kw of keywords) {
            const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(`${config.search} ${kw.q}`)}&display=5&sort=random`;
            try {
                const res = await fetch(url, { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } });
                const data = await res.json();
                if (data.items) {
                    data.items.forEach((item, idx) => {
                        const cleanTitle = item.title.replace(/<[^>]*>?/g, ''); // 태그 제거
                        // 공식 링크(item.link)가 없으면 네이버 플레이스 검색으로 연결
                        const officialLink = item.link && item.link.startsWith('http') ? item.link : `https://map.naver.com/v5/search/${encodeURIComponent(cleanTitle)}`;
                        
                        results.push({
                            id: `naver-local-${config.search}-${kw.cat}-${idx}`, 
                            title: `[공식] ${cleanTitle}`, 
                            category: kw.cat, 
                            location: item.roadAddress || item.address || "위치 확인", 
                            start_date: startStr, 
                            end_date: endStr, 
                            price: "업체 문의", 
                            source: "네이버 등록업체", 
                            area: config.area, 
                            url: officialLink,
                            image_url: "" // 지역 검색은 이미지를 안 주므로 비워둠
                        });
                    });
                }
            } catch (e) {}
        }
    }
    return results;
}

// 💡 3. 한국관광공사 (이미지 추가)
async function fetchTourApi(key, todayStr) {
    const url = `https://apis.data.go.kr/B551011/KorService1/searchFestival1?serviceKey=${key}&numOfRows=100&pageNo=1&MobileOS=ETC&MobileApp=KidsApp&_type=json&eventStartDate=${todayStr}`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json(); const items = json.response?.body?.items?.item;
        if (items) {
            const arr = Array.isArray(items) ? items : [items];
            arr.forEach(item => results.push({ 
                id: `tour-${item.contentid}`, title: item.title, category: "축제", 
                location: item.addr1 || '상세페이지 참조', start_date: item.eventstartdate || '', end_date: item.eventenddate || '', 
                price: "상세페이지 참조", source: "한국관광공사", area: extractArea(item.addr1), url: getSmartLink('', item.title),
                image_url: item.firstimage || '' // 💡 축제 썸네일 추가
            }));
        }
    } catch (e) { } return results;
}

// 기존 네이버 블로그 검색 (핫플 추천용 유지)
async function fetchNaverBlogs(clientId, clientSecret) {
    if (!clientId || !clientSecret) return [];
    const regionConfigs = [{ search: '서울', area: '서울' }, { search: '부산', area: '부산' }, { search: '대구', area: '대구' }, { search: '제주', area: '제주' }];
    const d = new Date(); const startStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    d.setMonth(d.getMonth() + 1); const endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const fetchPromises = regionConfigs.map(async (config, index) => {
        const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(`${config.search} 주말 아이와 가볼만한 곳`)}&display=5&sort=sim`;
        try {
            const res = await fetch(url, { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } });
            const data = await res.json();
            if (data.items) {
                return data.items.map((item, itemIndex) => ({
                    id: `naver-blog-${config.search}-${itemIndex}`, title: `[핫플] ` + item.title.replace(/<[^>]*>?/g, ''), category: "블로그 추천", location: "블로그 본문 확인", start_date: startStr, end_date: endStr, price: "무료~유료", source: "네이버 블로그", area: config.area, url: item.link, image_url: ""
                }));
            }
        } catch (e) {} return [];
    });
    const resultsArray = await Promise.all(fetchPromises); return resultsArray.flat();
}

async function fetchStdFestivals(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            json.response.body.items.forEach(item => {
                const start = (item.fstvlStartDate || '').replace(/-/g, ''); const end = (item.fstvlEndDate || '').replace(/-/g, '');
                if (isValidDate(start, end, todayStr)) results.push({ id: `stdfest-${item.fstvlNm}`, title: item.fstvlNm, category: "축제", location: item.opar || item.rdnmadr || '장소 확인', start_date: start, end_date: end, price: item.auspcInsttNm ? `${item.auspcInsttNm} 주관` : "확인 필요", source: "전국문화축제", area: extractArea(item.rdnmadr || item.lnmadr), url: getSmartLink(item.homepageUrl, item.fstvlNm), image_url: "" });
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
                if (item.lctreNm && isValidDate(start, end, todayStr)) results.push({ id: `stdedu-${item.lctreNm}`, title: item.lctreNm, category: "교육", location: item.edcPlc || '장소 확인', start_date: start, end_date: end, price: item.lctreCost === '0' ? '무료' : (item.lctreCost || '유료'), source: "전국평생학습", area: extractArea(item.rdnmadr || item.edcPlc), url: getSmartLink(item.edcInsttUrl || item.homepageUrl, item.lctreNm), image_url: "" });
            });
        }
    } catch (e) { } return results;
}
async function fetchMuseums(key, todayStr) {
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_museum_artgr_info_api?serviceKey=${key}&pageNo=1&numOfRows=100&type=json`; const results = [];
    try {
        const res = await fetch(url); const json = await res.json();
        if (json.response?.body?.items) {
            const d = new Date(); d.setFullYear(d.getFullYear() + 1); const nextYearStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            json.response.body.items.forEach(item => results.push({ id: `museum-${item.fcltyNm}`, title: item.fcltyNm, category: "전시/관람", location: item.rdnmadr || item.lnmadr || '장소 확인', start_date: todayStr, end_date: nextYearStr, price: item.childChrge === '0' ? '어린이 무료' : (item.childChrge ? `어린이 ${item.childChrge}원` : '요금 확인'), source: "전국박물관미술관", area: extractArea(item.rdnmadr || item.lnmadr), url: getSmartLink(item.homepageUrl, item.fcltyNm), image_url: "" }));
        }
    } catch (e) { } return results;
}

export async function GET() {
    try {
        const DATA_KEY = process.env.NEXT_PUBLIC_DATA_KEY; 
        const NAVER_ID = process.env.NAVER_CLIENT_ID;
        const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;
        const todayStr = getTodayStr();

        const results = await Promise.allSettled([
            fetchKopis(),
            fetchStdFestivals(DATA_KEY, todayStr),
            fetchStdEdu(DATA_KEY, todayStr),
            fetchTourApi(DATA_KEY, todayStr),
            fetchMuseums(DATA_KEY, todayStr),
            fetchNaverBlogs(NAVER_ID, NAVER_SECRET),
            fetchNaverLocalOfficial(NAVER_ID, NAVER_SECRET) // 💡 네이버 공식 업체(지역) 검색 추가!
        ]);

        let allEvents = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value.length > 0) {
                allEvents = [...allEvents, ...res.value];
            }
        });

        const uniqueEvents = Array.from(new Map(allEvents.map(item => [item.id, item])).values());
        if (uniqueEvents.length === 0) return NextResponse.json({ success: true, message: "수집된 데이터가 없습니다." });

        const { data, error } = await supabase.from('events').upsert(uniqueEvents, { onConflict: 'id' });
        if (error) throw error;

        return NextResponse.json({ 
            success: true, 
            message: `성공! KOPIS(포스터), 관광공사, 네이버공식업체 포함 총 ${uniqueEvents.length}개 적재 완료.` 
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}