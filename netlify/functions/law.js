// 법제처 국가법령정보 Open API(판례) 프록시. Claude/AI API 미사용.
// 환경변수: LAW_OC(법제처 OC 인증키, 권장), ALLOW_ORIGIN(다른 도메인에서 호출할 때만)
const OK = {
  search: ['query','search','display','page','org','curt','JO','sort','prncYd','nb','date','datSrcNm','gana'],
  detail: ['ID']
};
exports.handler = async (e) => {
  const q = e.queryStringParameters || {};
  const oc = process.env.LAW_OC || q.oc;
  const h = { 'Content-Type': 'application/json; charset=utf-8' };
  if (process.env.ALLOW_ORIGIN) h['Access-Control-Allow-Origin'] = process.env.ALLOW_ORIGIN;
  const out = (c, o) => ({ statusCode: c, headers: h, body: JSON.stringify(o) });
  if (!oc) return out(400, { error: 'OC 인증키가 없습니다. 설정에서 입력하거나 Netlify 환경변수 LAW_OC를 지정하세요.' });
  const kind = q.action === 'detail' ? 'detail' : 'search';
  const u = new URL('https://www.law.go.kr/DRF/' + (kind === 'detail' ? 'lawService.do' : 'lawSearch.do'));
  u.searchParams.set('OC', oc);
  u.searchParams.set('target', 'prec');
  u.searchParams.set('type', 'JSON');
  for (const k of OK[kind]) if (q[k]) u.searchParams.set(k, q[k]);
  try {
    const site = process.env.SITE_URL || 'https://' + (e.headers['x-forwarded-host'] || e.headers.host);
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: site + '/', Origin: site } });
    const t = await r.text();
    try {
      JSON.parse(t);
      h['Cache-Control'] = 'public, max-age=300';
      return { statusCode: 200, headers: h, body: t };
    } catch {
      return out(502, {
        error: '법제처가 JSON이 아닌 응답을 보냈습니다. OC 값과 Open API 신청 시 등록한 도메인/IP를 확인하세요.',
        hint: t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
      });
    }
  } catch (err) {
    return out(502, { error: '법제처 서버에 연결하지 못했습니다: ' + err.message });
  }
};
