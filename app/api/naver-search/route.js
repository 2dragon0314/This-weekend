import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const clientId = process.env.NAVER_CLIENT_ID;
        const clientSecret = process.env.NAVER_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ success: false, message: "키 확인 필요" });
        }

        // 1. 네이버 검색용 키워드와 우리 DB용 지역명(area)을 매칭
        // 대표님께서 짚어주신 '전남광주' 기준을 완벽하게 적용했습니다.
        const regionConfigs = [
            { search: '서울', area: '서울' },
            { search: '부산', area: '부산' },
            { search: '대구', area: '대구' },
            { search: '인천', area: '인천' },
            { search: '광주', area: '전남광주' }, // 광주 검색결과는 전남광주로 쏙!
            { search: '대전', area: '대전' },
            { search: '울산', area: '울산' },
            { search: '세종', area: '세종' },
            { search: '경기', area: '경기' },
            { search: '강원', area: '강원' },
            { search: '충북', area: '충북' },
            { search: '충남', area: '충남' },
            { search: '전북', area: '전북' },
            { search: '전남', area: '전남광주' }, // 전남 검색결과도 전남광주로 쏙!
            { search: '경북', area: '경북' },
            { search: '경남', area: '경남' },
            { search: '제주', area: '제주' }
        ];

        const d = new Date();
        const startStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        d.setMonth(d.getMonth() + 1);
        const endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

        // 2. 17번의 네이버 검색을 동시에 실행
        const fetchPromises = regionConfigs.map(async (config, index) => {
            const keyword = `${config.search} 주말 아이와 가볼만한 곳`;
            const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=5&sort=sim`;
            
            try {
                const res = await fetch(url, {
                    headers: {
                        'X-Naver-Client-Id': clientId,
                        'X-Naver-Client-Secret': clientSecret
                    }
                });
                const data = await res.json();
                
                if (data.items) {
                    return data.items.map((item, itemIndex) => ({
                        // id가 중복되지 않도록 search 키워드 활용
                        id: `naver-${config.search}-${itemIndex}`, 
                        title: `[${config.search} 추천] ` + item.title.replace(/<[^>]*>?/g, ''),
                        category: "블로그 추천",
                        location: "상세페이지(블로그 원문) 확인", 
                        start_date: startStr,
                        end_date: endStr,
                        price: "무료~유료", 
                        source: "네이버 검색",
                        area: config.area, // ★ DB에는 무조건 전남광주 등 지정된 이름으로 저장 ★
                        url: item.link
                    }));
                }
            } catch (e) {}
            return [];
        });

        const resultsArray = await Promise.all(fetchPromises);
        const allResults = resultsArray.flat();

        return NextResponse.json({ 
            success: true, 
            message: `전국 단위 검색 완료! (광주/전남은 '전남광주'로 통합)`, 
            count: allResults.length,
            data: allResults 
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}