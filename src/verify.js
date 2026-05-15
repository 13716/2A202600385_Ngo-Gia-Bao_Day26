const baseUrl = 'http://localhost:3000';
const fetchJson = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const text = await res.text();
  console.log(`\n>>> ${url}\nStatus: ${res.status}`);
  try {
    console.log(JSON.parse(text));
  } catch {
    console.log(text);
  }
};

(async () => {
  await fetchJson(`${baseUrl}/mcp/schema`);
  await fetchJson(`${baseUrl}/mcp/tool/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection: 'users', filter: { country: 'VN' }, fields: ['id', 'name'], limit: 5 })
  });
  await fetchJson(`${baseUrl}/mcp/tool/aggregate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection: 'orders',
      pipeline: [
        { $match: { status: 'paid' } },
        { $group: { by: 'status', count: { $sum: 1 } } }
      ]
    })
  });
})();
