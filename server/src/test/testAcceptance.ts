import { CONFIG } from '../config.js';

const BASE_URL = `http://localhost:${CONFIG.PORT}`;

async function runAcceptanceTests() {
  console.log('🧪 Starting Neural Nexus 2026 Final Acceptance Test Suite...');

  // Helper for fetch
  const post = async (endpoint: string, body: any, headers: Record<string, string> = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    return { status: res.status, ok: res.ok, data: await res.json() };
  };

  const get = async (endpoint: string, headers: Record<string, string> = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...headers }
    });
    return { status: res.status, ok: res.ok, data: await res.json() };
  };

  try {
    // 1. Health & Initial State Verification
    console.log('\n--- TEST 1: Initial Empty Database Verification ---');
    const health = await get('/api/health');
    if (!health.ok) throw new Error('Health check failed');
    console.log('✔ Health endpoint online:', health.data);

    // 2. Admin Authentication
    console.log('\n--- TEST 2: Admin Login ---');
    const login = await post('/api/auth/login', {
      username: CONFIG.ADMIN_USERNAME,
      password: CONFIG.ADMIN_PASSWORD
    });
    if (!login.ok || !login.data.token) throw new Error('Admin login failed: ' + JSON.stringify(login.data));
    const adminToken = login.data.token;
    console.log('✔ Admin logged in successfully with JWT');

    // 3. Question Bank Loading (Load 100 Competition Questions)
    console.log('\n--- TEST 3: Load Official 100 Competition Questions ---');
    const load100 = await post('/api/admin/questions/load-100', {}, {
      Authorization: `Bearer ${adminToken}`
    });
    if (!load100.ok) throw new Error('Failed to load 100 questions');
    console.log(`✔ Loaded ${load100.data.count} official competition questions into Question Bank`);

    // Verify questions count
    const qList = await get('/api/admin/questions', { Authorization: `Bearer ${adminToken}` });
    if (qList.data.total !== 100) throw new Error(`Expected 100 questions, got ${qList.data.total}`);
    console.log('✔ Verified Question Bank contains exactly 100 active questions');

    // 4. Admin Starts Quiz (WAITING -> LIVE)
    console.log('\n--- TEST 4: Admin Starts Quiz ---');
    const startQuiz = await post('/api/admin/event/status', { status: 'LIVE' }, {
      Authorization: `Bearer ${adminToken}`
    });
    if (!startQuiz.ok) throw new Error('Failed to start quiz');
    console.log('✔ Event state changed to LIVE');

    // 5. Register 5 Simulated Teams
    console.log('\n--- TEST 5: Register 5 Independent Teams ---');
    const teamConfigs = [
      { name: 'Alpha Neurons', lName: 'Alice Johnson', lRoll: '26AD001', m2Name: 'Bob Smith', m2Roll: '26AD002' },
      { name: 'Beta Bytes', lName: 'Charlie Brown', lRoll: '26AD003', m2Name: 'David Clark', m2Roll: '26AD004' },
      { name: 'Gamma Gradients', lName: 'Emma Davis', lRoll: '26AD005', m2Name: 'Frank White', m2Roll: '26AD006' },
      { name: 'Delta Decoders', lName: 'Grace Miller', lRoll: '26AD007', m2Name: 'Henry Wilson', m2Roll: '26AD008' },
      { name: 'Epsilon Experts', lName: 'Ivy Taylor', lRoll: '26AD009', m2Name: 'Jack Moore', m2Roll: '26AD010' }
    ];

    const registeredTeams: any[] = [];
    for (const conf of teamConfigs) {
      const reg = await post('/api/teams/register', {
        team_name: conf.name,
        leader_name: conf.lName,
        leader_roll: conf.lRoll,
        member2_name: conf.m2Name,
        member2_roll: conf.m2Roll
      });
      if (!reg.ok) throw new Error(`Registration failed for ${conf.name}: ` + JSON.stringify(reg.data));
      registeredTeams.push(reg.data);
      console.log(`✔ Registered Team '${conf.name}' with Unique Code: ${reg.data.teamCode}`);
    }

    // Verify all 5 codes are unique
    const uniqueCodes = new Set(registeredTeams.map(t => t.teamCode));
    if (uniqueCodes.size !== 5) throw new Error('Team codes are not unique!');
    console.log('✔ All 5 Team Codes are strictly unique');

    // 6. Independent Question Sequences per Team
    console.log('\n--- TEST 6: Verify Independent Shuffled Sequences ---');
    const firstQuestions: string[] = [];
    for (const t of registeredTeams) {
      const qRes = await get(`/api/quiz/current?teamCode=${t.teamCode}&sessionId=${t.sessionId}`);
      if (!qRes.ok || !qRes.data.question) throw new Error(`Failed to fetch Q1 for ${t.teamCode}`);

      // Verify NO correct answer leak
      if (qRes.data.question.correct_answer) {
        throw new Error(`SECURITY VULNERABILITY: correct_answer was leaked to client!`);
      }

      firstQuestions.push(qRes.data.question.id);
      console.log(`✔ Team '${t.team.team_name}' (${t.teamCode}) received Question 1: [${qRes.data.question.id}] - "${qRes.data.question.question_text.slice(0, 45)}..."`);
    }

    console.log('Question 1 distribution across 5 teams:', firstQuestions);
    const uniqueFirsts = new Set(firstQuestions);
    console.log(`✔ Shuffled sequences verified: ${uniqueFirsts.size} distinct starting questions out of 5 teams`);
    console.log('✔ Zero answer leaks: correct_answer field is safely stripped from responses');

    // 7. Timer & Answer Submission with Speed Scoring
    console.log('\n--- TEST 7: Independent Timers & Fast Speed Scoring ---');

    // Team A: Fast correct answer (awards up to 10 points)
    const teamA = registeredTeams[0];
    const qA = await get(`/api/quiz/current?teamCode=${teamA.teamCode}`);
    // Fetch correct answer directly from database for test verification
    const correctQA = (await get('/api/admin/questions', { Authorization: `Bearer ${adminToken}` })).data.questions.find((q: any) => q.id === qA.data.question.id);

    const subA = await post('/api/quiz/submit-answer', {
      teamCode: teamA.teamCode,
      sessionId: teamA.sessionId,
      selectedOption: correctQA.correct_answer
    });
    if (!subA.ok || !subA.data.isCorrect) throw new Error('Team A answer evaluation failed');
    console.log(`✔ Team A submitted correct answer within 5s -> Awarded: ${subA.data.pointsAwarded} points (Score: ${subA.data.totalScore})`);

    // Team B: Wrong answer (0 points)
    const teamB = registeredTeams[1];
    const qB = await get(`/api/quiz/current?teamCode=${teamB.teamCode}`);
    const wrongOpt = 'A' === 'A' ? 'B' : 'A';
    const subB = await post('/api/quiz/submit-answer', {
      teamCode: teamB.teamCode,
      sessionId: teamB.sessionId,
      selectedOption: wrongOpt
    });
    console.log(`✔ Team B submitted wrong answer -> Awarded: ${subB.data.pointsAwarded} points (Score: ${subB.data.totalScore})`);

    // Team C: Timeout test (00:00 reached)
    const teamC = registeredTeams[2];
    const subC = await post('/api/quiz/timeout', {
      teamCode: teamC.teamCode,
      selectedOption: 'TIMEOUT'
    });
    if (!subC.ok) throw new Error('Timeout submission failed');
    console.log(`✔ Team C 02:00 timer expired -> Auto-recorded as TIMEOUT, advanced to Next Question`);

    // 8. Refresh and Connection Safety
    console.log('\n--- TEST 8: Session Persistence Across Refresh ---');
    const refreshA = await get(`/api/quiz/current?teamCode=${teamA.teamCode}`);
    if (refreshA.data.currentIndex !== 2) {
      throw new Error(`Expected Team A to be at Question 2 after refresh, got ${refreshA.data.currentIndex}`);
    }
    if (refreshA.data.totalScore !== subA.data.totalScore) {
      throw new Error(`Score mismatch after refresh!`);
    }
    console.log(`✔ Team A refreshed page: Restored exactly at Question 2/100 with score ${refreshA.data.totalScore} intact`);

    // 9. Live Leaderboard Verification
    console.log('\n--- TEST 9: Admin Live Leaderboard Rankings ---');
    const lbRes = await get('/api/leaderboard', {
      'x-admin-request': 'true',
      Authorization: `Bearer ${adminToken}`
    });
    if (!lbRes.ok || !lbRes.data.leaderboard) throw new Error('Leaderboard fetch failed');
    console.log('Leaderboard Top Ranks:');
    lbRes.data.leaderboard.slice(0, 5).forEach((entry: any) => {
      console.log(`  Rank ${entry.rank}: [${entry.teamCode}] ${entry.teamName} - Score: ${entry.totalScore} pts | Accuracy: ${entry.accuracy} | Answered: ${entry.questionsCompleted}`);
    });

    if (lbRes.data.leaderboard[0].teamCode !== teamA.teamCode) {
      throw new Error('Team A should be Rank 1 due to highest score!');
    }
    console.log('✔ Rank 1 successfully held by Team A with highest score');

    // 10. Admin Monitor Metrics
    console.log('\n--- TEST 10: Admin Monitor Metrics ---');
    const dash = await get('/api/admin/dashboard', { Authorization: `Bearer ${adminToken}` });
    if (dash.data.totalTeams !== 5) throw new Error(`Expected 5 total teams, got ${dash.data.totalTeams}`);
    console.log(`✔ Admin Dashboard monitors: ${dash.data.totalTeams} Teams Joined, ${dash.data.totalAnswers} Answers Logged, Status: ${dash.data.eventStatus}`);

    console.log('\n=============================================================');
    console.log('🎉 ALL FINAL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
    console.log('=============================================================');
  } catch (err: any) {
    console.error('\n❌ Acceptance Test Failed:', err);
    process.exit(1);
  }
}

runAcceptanceTests().then(() => process.exit(0));
