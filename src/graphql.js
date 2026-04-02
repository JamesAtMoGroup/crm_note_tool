const fetch = require('node-fetch');
const { getAuthToken } = require('./auth');

const READPOINT  = 'https://rhdb.kolable.com/v1/graphql';
const ENDPOINT   = 'https://phdb.kolable.com/v1/graphql';

async function executeGraphQL(query, variables, brandKey) {
  const isRead = query.trim().startsWith('query');
  const url = isRead ? READPOINT : ENDPOINT;

  const makeRequest = async (token) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    return res.json();
  };

  let token = await getAuthToken(brandKey);
  let data = await makeRequest(token);

  // Token 過期自動刷新重試
  if (data?.errors?.[0]?.extensions?.code === 'invalid-jwt') {
    token = await getAuthToken(brandKey, true);
    data = await makeRequest(token);
  }

  return data;
}

module.exports = { executeGraphQL };
