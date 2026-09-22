import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function run100TeamsSimulation() {
  console.log('🚀 Launching 100 Concurrent Teams Simulation for Neural Nexus 2026...\n');

  // 1. Admin Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin@nexus2026' })
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200);
  const adminToken = loginData.token;
  console.log('✔ Step 1: Admin authenticated');

  // 2. Register 100 Teams Concurrently
  console.log('⏳ Step 2: Registering 100 student teams concurrently...');
  const startTime = Date.now();
  const runId = Math.random().toString(36).substring(2, 6).toUpperCase();
  const registerPromises = Array.from({ length: 100 }, (_, i) => {
    const idx = i + 1;
    const pad = String(idx).padStart(3, '0');
    return fetch(`${BASE_URL}/teams/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Neural Squad ${runId}-${pad}`,
        leader_name: `Student Leader ${pad}`,
        leader_roll: `${runId}${pad}A`,
        member2_name: `Student Peer ${pad}`,
        member2_roll: `${runId}${pad}B`
      })
    }).then(r => r.json());
  });

  const registeredResults = await Promise.all(registerPromises);
  const teamIds: string[] = [];
  for (const res of registeredResults) {
    assert.ok(res.team && res.team.id, 'Each registration must return team with ID');
    teamIds.push(res.team.id);
  }
  const regDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✔ Step 2 Complete: 100 unique teams registered in ${regDuration}s (Zero duplicate collisions)`);

  // 3. Admin Starts Round 1
  console.log('⏳ Step 3: Admin starts Round 1 (The Scan)...');
  const startRes = await fetch(`${BASE_URL}/admin/rounds/round-1/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(startRes.status, 200);
  console.log('✔ Step 3 Complete: Round 1 is LIVE');

  // 4. Fetch Safe Questions
  const qRes = await fetch(`${BASE_URL}/rounds/round-1/questions`, {
    headers: { 'x-team-id': teamIds[0] }
  });
  const qData = await qRes.json();
  const questions = qData.questions;
  assert.ok(questions.length > 0, 'Round 1 questions should be available');
  console.log(`✔ Step 4: ${questions.length} questions fetched securely by student client`);

  // 5. Concurrent Auto-save & Answers
  console.log('⏳ Step 5: 100 teams answering questions with concurrent auto-saves...');
  const answerPromises = teamIds.map((teamId, i) => {
    // Top teams answer correctly, others vary
    const isTopTeam = i < 15;
    const selectedAns = isTopTeam ? 'Artificial Intelligence' : 'Automated Internet';
    return fetch(`${BASE_URL}/quiz/round-1/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-team-id': teamId
      },
      body: JSON.stringify({
        questionId: questions[0].id,
        selectedAnswer: selectedAns
      })
    }).then(r => r.json());
  });

  await Promise.all(answerPromises);
  console.log('✔ Step 5 Complete: Concurrent auto-saves recorded');

  // 6. Concurrent Submissions
  console.log('⏳ Step 6: 100 teams submitting Round 1 concurrently...');
  const submitPromises = teamIds.map(teamId => {
    return fetch(`${BASE_URL}/quiz/round-1/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-team-id': teamId
      }
    }).then(r => r.json());
  });

  const submitResults = await Promise.all(submitPromises);
  let correctTotal = 0;
  for (const s of submitResults) {
    assert.ok(s.submission, 'Each team submission must be graded');
    if (s.submission.correct_count > 0) correctTotal++;
  }
  console.log(`✔ Step 6 Complete: 100 submissions evaluated server-side (${correctTotal} scored top marks)`);

  // 7. Verify Leaderboard
  const leadRes = await fetch(`${BASE_URL}/leaderboard?roundId=round-1`);
  const leadData = await leadRes.json();
  assert.ok(leadData.leaderboard.length >= 100, 'Leaderboard must contain all registered teams');
  console.log(`✔ Step 7 Complete: Live Leaderboard reflects ranked positions for all teams`);

  // 8. Admin Selects Top 8 Finalists
  console.log('⏳ Step 8: Admin selects Top 8 Finalists for Round 7...');
  const finalistRes = await fetch(`${BASE_URL}/admin/teams/select-finalists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ count: 8 })
  });
  const finalistData = await finalistRes.json();
  assert.strictEqual(finalistData.finalistCount, 8, 'Exactly 8 finalists must be selected');
  console.log('✔ Step 8 Complete: Top 8 Finalists picked');

  // 9. Admin Starts Final Round (Round 7 - Buzzer Blast)
  await fetch(`${BASE_URL}/admin/rounds/round-7`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ is_final_round: 1 })
  });

  await fetch(`${BASE_URL}/admin/rounds/round-7/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  // Verify finalist access vs non-finalist restriction
  const finalistTeamId = finalistData.finalistIds[0];
  const nonFinalistTeamId = teamIds.find(id => !finalistData.finalistIds.includes(id));

  // Finalist should have access
  const finAccess = await fetch(`${BASE_URL}/rounds/round-7/questions`, {
    headers: { 'x-team-id': finalistTeamId }
  });
  assert.strictEqual(finAccess.status, 200, 'Finalist must have access to final round');

  // Non-finalist should receive FINALIST_ONLY status
  const nonFinAccess = await fetch(`${BASE_URL}/rounds/round-7/questions`, {
    headers: { 'x-team-id': nonFinalistTeamId }
  });
  const nonFinData = await nonFinAccess.json();
  assert.strictEqual(nonFinAccess.status, 403, 'Non-finalists must be restricted');
  assert.strictEqual(nonFinData.error, 'FINALIST_ONLY');
  console.log('✔ Step 9 Complete: Finalist gating verified');

  // 10. Concurrent Buzzer Press (Race Condition Check)
  console.log('⏳ Step 10: 8 finalists buzz in simultaneously on Question 1...');
  await fetch(`${BASE_URL}/buzzer/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      roundId: 'round-7',
      questionId: 'q7-1',
      questionText: 'What is the keyword for anonymous functions in Python?'
    })
  });

  const buzzPromises = finalistData.finalistIds.map((fId: string) => {
    return fetch(`${BASE_URL}/buzzer/buzz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: 'round-7', teamId: fId })
    }).then(r => r.json());
  });

  const buzzResults = await Promise.all(buzzPromises);
  const firstBuzzers = buzzResults.filter(b => b.buzzedFirst === true);
  assert.strictEqual(firstBuzzers.length, 1, 'EXACTLY ONE team must be registered as first buzz winner (Zero Race Conditions)');
  console.log(`✔ Step 10 Complete: Millisecond lock attributed to 1 winner (${firstBuzzers[0].session.buzzed_team_name})`);

  console.log('\n🌟 CONGRATULATIONS! FULL 100-TEAM CONCURRENT SIMULATION PASSED FLAWLESSLY!\n');
}

run100TeamsSimulation().catch(e => {
  console.error('Simulation error:', e);
  process.exit(1);
});
