const BASE_URL = 'http://localhost:8080/api';

async function testApis() {
  const userId = 'pminsu2';
  const boardCode = 'ONRGP8';
  
  console.log('=== Testing API Endpoints ===\n');
  
  // Test 1: Get user boards
  console.log('1. Testing GET /users/{userId}/boards');
  try {
    const res1 = await fetch(`${BASE_URL}/users/${userId}/boards`, {
      headers: { 'X-Anonymous-Id': crypto.randomUUID() }
    });
    const data1 = await res1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log('Status:', res1.status, '\n');
  } catch (e) {
    console.error('Error:', e.message, '\n');
  }
  
  // Test 2: Get board details
  console.log('2. Testing GET /boards/{boardCode}');
  try {
    const res2 = await fetch(`${BASE_URL}/boards/${boardCode}`, {
      headers: { 'X-Anonymous-Id': crypto.randomUUID() }
    });
    const data2 = await res2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));
    console.log('Status:', res2.status, '\n');
  } catch (e) {
    console.error('Error:', e.message, '\n');
  }
  
  // Test 3: Get chores for today
  const today = new Date().toISOString().split('T')[0];
  console.log('3. Testing GET /boards/{boardCode}/chores?date=' + today);
  try {
    const res3 = await fetch(`${BASE_URL}/boards/${boardCode}/chores?date=${today}`, {
      headers: { 'X-Anonymous-Id': crypto.randomUUID() }
    });
    const data3 = await res3.json();
    console.log('Response:', JSON.stringify(data3, null, 2));
    console.log('Status:', res3.status, '\n');
  } catch (e) {
    console.error('Error:', e.message, '\n');
  }
  
  // Test 4: Test new RESTful participant endpoint
  console.log('4. Testing POST /boards/{boardCode}/participants (new format)');
  try {
    const res4 = await fetch(`${BASE_URL}/boards/${boardCode}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Anonymous-Id': crypto.randomUUID()
      },
      body: JSON.stringify({ userId: userId })
    });
    const data4 = await res4.json();
    console.log('Response:', JSON.stringify(data4, null, 2));
    console.log('Status:', res4.status, '\n');
  } catch (e) {
    console.error('Error:', e.message, '\n');
  }
}

testApis();
