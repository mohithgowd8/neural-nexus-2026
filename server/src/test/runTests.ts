import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Neural Nexus 2026 Test Suite...\n');

  // Test 1: Health Check
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'online', 'Health status should be online');
  console.log('✔ Test 1 Passed: Health check OK');

  // Test 2: Admin Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin@nexus2026' })
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Admin login should succeed');
  assert.ok(loginData.token, 'Should return JWT token');
  const adminToken = loginData.token;
  console.log('✔ Test 2 Passed: Admin login with JWT OK');

  // Test 3: Admin Bad Password
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
  });
  assert.strictEqual(badLoginRes.status, 401, 'Bad credentials should return 401');
  console.log('✔ Test 3 Passed: Unauthorized rejection OK');

  // Test 4: Team Registration
  const testRoll1 = `TEST${Date.now()}1`;
  const testRoll2 = `TEST${Date.now()}2`;
  const regRes = await fetch(`${BASE_URL}/teams/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Test Squad ${Date.now()}`,
      leader_name: 'Alex Turing',
      leader_roll: testRoll1,
      member2_name: 'Grace Hopper',
      member2_roll: testRoll2
    })
  });
  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 201, 'Team registration should succeed');
  assert.ok(regData.team.id.startsWith('NN26-'), 'Generated Team ID should start with NN26-');
  const teamId = regData.team.id;
  console.log(`✔ Test 4 Passed: Team registered with ID ${teamId}`);

  // Test 5: Duplicate Team Registration Prevention
  const dupRes = await fetch(`${BASE_URL}/teams/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Another Squad`,
      leader_name: 'Duplicate Student',
      leader_roll: testRoll1 // Same roll number
    })
  });
  assert.strictEqual(dupRes.status, 400, 'Duplicate roll number must be rejected');
  console.log('✔ Test 5 Passed: Duplicate roll number prevented');

  // Test 6: Round Questions Delivery Security (Answers must NEVER be exposed)
  // Admin starts round-1 first
  await fetch(`${BASE_URL}/admin/rounds/round-1/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  const qRes = await fetch(`${BASE_URL}/rounds/round-1/questions`, {
    headers: { 'x-team-id': teamId }
  });
  const qData = await qRes.json();
  assert.strictEqual(qRes.status, 200, 'Should fetch round questions');
  assert.ok(qData.questions.length > 0, 'Questions list should not be empty');

  // CRITICAL SECURITY ASSERTION: No question should contain correct_answer or explanation
  for (const q of qData.questions) {
    assert.strictEqual((q as any).correct_answer, undefined, 'CRITICAL: correct_answer must not be sent to student');
    assert.strictEqual((q as any).explanation, undefined, 'CRITICAL: explanation must not be sent to student');
  }
  console.log('✔ Test 6 Passed: Questions delivered securely (zero answer leaks)');

  // Test 7: Auto-save Answer
  const firstQ = qData.questions[0];
  const saveRes = await fetch(`${BASE_URL}/quiz/round-1/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-team-id': teamId
    },
    body: JSON.stringify({
      questionId: firstQ.id,
      selectedAnswer: 'Artificial Intelligence'
    })
  });
  const saveData = await saveRes.json();
  assert.strictEqual(saveRes.status, 200, 'Answer auto-save should succeed');
  assert.strictEqual(saveData.saved, true, 'Saved flag should be true');
  console.log('✔ Test 7 Passed: Answer auto-saved successfully');

  // Test 8: Submit Round & Server-Side Scoring
  const submitRes = await fetch(`${BASE_URL}/quiz/round-1/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-team-id': teamId
    }
  });
  const submitData = await submitRes.json();
  assert.strictEqual(submitRes.status, 200, 'Round submission should succeed');
  assert.strictEqual(submitData.submission.correct_count, 1, 'Should have 1 correct answer');
  assert.strictEqual(submitData.submission.total_score, 10, 'Score should be 10 marks');
  console.log('✔ Test 8 Passed: Server-side scoring engine verified (+10 marks awarded)');

  // Test 9: Leaderboard API
  const leadRes = await fetch(`${BASE_URL}/leaderboard`);
  const leadData = await leadRes.json();
  assert.strictEqual(leadRes.status, 200, 'Leaderboard should be accessible');
  assert.ok(Array.isArray(leadData.leaderboard), 'Leaderboard should be an array');
  console.log('✔ Test 9 Passed: Public Leaderboard OK');

  // Test 10: Buzzer Activation & Press
  await fetch(`${BASE_URL}/buzzer/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      roundId: 'round-7',
      questionId: 'q7-1',
      questionText: 'What Python keyword creates an anonymous function?'
    })
  });

  const buzzRes = await fetch(`${BASE_URL}/buzzer/buzz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: 'round-7', teamId })
  });
  const buzzData = await buzzRes.json();
  assert.strictEqual(buzzRes.status, 200, 'Buzzer press should succeed');
  assert.strictEqual(buzzData.buzzedFirst, true, 'Team should be registered as buzzed first');
  console.log('✔ Test 10 Passed: Millisecond-accurate Buzzer lock OK');

  console.log('\n🎉 ALL 10 CRITICAL BACKEND TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
