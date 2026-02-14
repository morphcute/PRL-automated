async function testPageViewAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/stats/views', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page: 'home' }),
    });
    
    const data = await response.json();
    console.log('Response:', response.status, data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPageViewAPI();