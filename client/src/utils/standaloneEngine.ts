import { NEXUS_100_QUESTIONS } from '../data/questions100.js';

// Independent Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NN26-${code}`;
}

// In-browser mock backend handler for GitHub Pages
export async function handleStandaloneApi(url: string, init?: RequestInit): Promise<Response | null> {
  const pathname = url.replace(/https?:\/\/[^\/]+/, '').split('?')[0];
  const searchParams = new URL(url, 'http://localhost').searchParams;
  const method = (init?.method || 'GET').toUpperCase();
  const body = init?.body ? JSON.parse(init.body as string) : {};

  // 1. Health check
  if (pathname === '/api/health') {
    return new Response(JSON.stringify({
      status: 'online',
      mode: 'standalone-github-pages',
      event: 'NEURAL NEXUS 2026',
      counts: { questions: NEXUS_100_QUESTIONS.length, teams: 0, answers: 0 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 2. Generate Team Code
  if (pathname === '/api/teams/generate-code') {
    return new Response(JSON.stringify({
      teamCode: generateCode()
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. Register Team
  if (pathname === '/api/teams/register' && method === 'POST') {
    const teamCode = body.team_code || generateCode();
    const sessionId = `sess_${Date.now()}`;
    const team = {
      id: teamCode,
      team_name: body.team_name,
      name: body.team_name,
      leader_name: body.leader_name,
      leader_roll: body.leader_roll,
      member2_name: body.member2_name,
      member2_roll: body.member2_roll,
      member3_name: body.member3_name,
      member3_roll: body.member3_roll,
      member4_name: body.member4_name,
      member4_roll: body.member4_roll,
      created_at: new Date().toISOString()
    };

    // Generate independent per-team shuffled sequence of 100 questions
    const shuffledIds = shuffle(NEXUS_100_QUESTIONS).map(q => q.id);

    const session = {
      sessionId,
      teamCode,
      currentIndex: 0,
      sequence: shuffledIds,
      totalScore: 0,
      correctCount: 0,
      totalTimeMs: 0,
      questionStartedAt: Date.now(),
      completed: false,
      answers: {} as Record<string, any>
    };

    localStorage.setItem(`nexus_team_${teamCode}`, JSON.stringify(team));
    localStorage.setItem(`nexus_sess_${teamCode}`, JSON.stringify(session));

    // Save to all teams list
    const allTeams = JSON.parse(localStorage.getItem('nexus_all_teams') || '[]');
    allTeams.push(team);
    localStorage.setItem('nexus_all_teams', JSON.stringify(allTeams));

    return new Response(JSON.stringify({
      message: 'Registration successful',
      teamCode,
      sessionId,
      team,
      eventState: 'LIVE'
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // 4. Team Session lookup
  if (pathname.startsWith('/api/teams/session')) {
    const code = pathname.split('/').pop()?.toUpperCase();
    const teamStr = localStorage.getItem(`nexus_team_${code}`);
    const sessStr = localStorage.getItem(`nexus_sess_${code}`);
    if (teamStr) {
      return new Response(JSON.stringify({
        team: JSON.parse(teamStr),
        session: sessStr ? JSON.parse(sessStr) : null,
        eventState: 'LIVE'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // 5. Fetch Current Question
  if (pathname === '/api/quiz/current') {
    const teamCode = (searchParams.get('teamCode') || '').toUpperCase();
    let sessStr = localStorage.getItem(`nexus_sess_${teamCode}`);

    if (!sessStr) {
      // Auto-initialize session if team registered
      const teamStr = localStorage.getItem(`nexus_team_${teamCode}`);
      if (!teamStr) {
        return new Response(JSON.stringify({ error: 'Team not found' }), { status: 404 });
      }
      const shuffledIds = shuffle(NEXUS_100_QUESTIONS).map(q => q.id);
      const newSess = {
        sessionId: `sess_${Date.now()}`,
        teamCode,
        currentIndex: 0,
        sequence: shuffledIds,
        totalScore: 0,
        correctCount: 0,
        totalTimeMs: 0,
        questionStartedAt: Date.now(),
        completed: false,
        answers: {} as Record<string, any>
      };
      localStorage.setItem(`nexus_sess_${teamCode}`, JSON.stringify(newSess));
      sessStr = JSON.stringify(newSess);
    }

    const sess = JSON.parse(sessStr);
    const totalQuestions = sess.sequence.length;

    if (sess.completed || sess.currentIndex >= totalQuestions) {
      const accuracy = totalQuestions > 0 ? Math.round((sess.correctCount / totalQuestions) * 100) : 0;
      const avgTime = sess.currentIndex > 0 ? Math.round((sess.totalTimeMs / sess.currentIndex) / 100) / 10 : 0;
      return new Response(JSON.stringify({
        eventState: 'LIVE',
        completed: true,
        teamCode,
        totalScore: sess.totalScore,
        correctCount: sess.correctCount,
        totalQuestions,
        accuracy,
        avgAnswerTime: avgTime
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const currentQId = sess.sequence[sess.currentIndex];
    const qData = NEXUS_100_QUESTIONS.find(q => q.id === currentQId) || NEXUS_100_QUESTIONS[0];

    const elapsedSeconds = (Date.now() - (sess.questionStartedAt || Date.now())) / 1000;
    const timeRemaining = Math.max(0, 120 - elapsedSeconds);

    return new Response(JSON.stringify({
      eventState: 'LIVE',
      completed: false,
      teamCode,
      currentIndex: sess.currentIndex + 1,
      totalQuestions,
      timeRemainingSeconds: Math.ceil(timeRemaining),
      totalDurationSeconds: 120,
      totalScore: sess.totalScore,
      selectedOption: sess.answers[currentQId]?.selectedOption || null,
      question: {
        id: qData.id,
        question_text: qData.question_text,
        option_a: qData.option_a,
        option_b: qData.option_b,
        option_c: qData.option_c,
        option_d: qData.option_d,
        category: qData.category,
        points: qData.points
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 6. Submit Answer
  if (pathname === '/api/quiz/submit-answer' && method === 'POST') {
    const teamCode = (body.teamCode || '').toUpperCase();
    const sessStr = localStorage.getItem(`nexus_sess_${teamCode}`);
    if (!sessStr) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });

    const sess = JSON.parse(sessStr);
    const currentQId = sess.sequence[sess.currentIndex];
    const qData = NEXUS_100_QUESTIONS.find(q => q.id === currentQId) || NEXUS_100_QUESTIONS[0];

    const elapsed = Math.min(120, Math.max(1, (Date.now() - sess.questionStartedAt) / 1000));
    const isCorrect = body.selectedOption === qData.correct_answer;

    // Fast answer speed scoring
    let points = 0;
    if (isCorrect) {
      if (elapsed <= 20) points = 10;
      else if (elapsed <= 40) points = 9;
      else if (elapsed <= 60) points = 8;
      else if (elapsed <= 80) points = 7;
      else if (elapsed <= 100) points = 6;
      else points = 5;
    }

    sess.answers[currentQId] = { selectedOption: body.selectedOption, isCorrect, points };
    sess.totalScore += points;
    sess.correctCount += (isCorrect ? 1 : 0);
    sess.totalTimeMs += Math.round(elapsed * 1000);
    sess.currentIndex += 1;
    sess.questionStartedAt = Date.now();
    if (sess.currentIndex >= sess.sequence.length) {
      sess.completed = true;
    }

    localStorage.setItem(`nexus_sess_${teamCode}`, JSON.stringify(sess));

    return new Response(JSON.stringify({
      success: true,
      pointsAwarded: points,
      isCorrect,
      totalScore: sess.totalScore,
      nextIndex: sess.currentIndex + 1,
      completed: sess.completed
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 7. Timeout
  if (pathname === '/api/quiz/timeout' && method === 'POST') {
    const teamCode = (body.teamCode || '').toUpperCase();
    const sessStr = localStorage.getItem(`nexus_sess_${teamCode}`);
    if (!sessStr) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });

    const sess = JSON.parse(sessStr);
    const currentQId = sess.sequence[sess.currentIndex];
    const qData = NEXUS_100_QUESTIONS.find(q => q.id === currentQId) || NEXUS_100_QUESTIONS[0];

    const selectedOption = body.selectedOption || 'TIMEOUT';
    const isCorrect = selectedOption === qData.correct_answer;
    const points = isCorrect ? 5 : 0;

    sess.answers[currentQId] = { selectedOption, isCorrect, points };
    sess.totalScore += points;
    sess.correctCount += (isCorrect ? 1 : 0);
    sess.totalTimeMs += 120000;
    sess.currentIndex += 1;
    sess.questionStartedAt = Date.now();
    if (sess.currentIndex >= sess.sequence.length) {
      sess.completed = true;
    }

    localStorage.setItem(`nexus_sess_${teamCode}`, JSON.stringify(sess));

    return new Response(JSON.stringify({
      success: true,
      timedOut: true,
      pointsAwarded: points,
      isCorrect,
      totalScore: sess.totalScore,
      nextIndex: sess.currentIndex + 1,
      completed: sess.completed
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 8. Results
  if (pathname.startsWith('/api/quiz/results/')) {
    const teamCode = pathname.split('/').pop()?.toUpperCase() || '';
    const teamStr = localStorage.getItem(`nexus_team_${teamCode}`);
    const sessStr = localStorage.getItem(`nexus_sess_${teamCode}`);
    const team = teamStr ? JSON.parse(teamStr) : null;
    const sess = sessStr ? JSON.parse(sessStr) : null;

    const totalQuestions = sess ? sess.sequence.length : 100;
    const score = sess ? sess.totalScore : 0;
    const correct = sess ? sess.correctCount : 0;
    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const avgTime = sess && sess.currentIndex > 0 ? Math.round((sess.totalTimeMs / sess.currentIndex) / 100) / 10 : 0;

    return new Response(JSON.stringify({
      teamCode,
      teamName: team?.team_name || teamCode,
      totalScore: score,
      correctAnswers: correct,
      totalQuestions,
      accuracy,
      avgAnswerTimeSeconds: avgTime,
      completed: sess ? sess.completed : true
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 9. Leaderboard
  if (pathname === '/api/leaderboard') {
    const allTeams = JSON.parse(localStorage.getItem('nexus_all_teams') || '[]');
    const leaderboard = allTeams.map((t: any, idx: number) => {
      const sessStr = localStorage.getItem(`nexus_sess_${t.id}`);
      const sess = sessStr ? JSON.parse(sessStr) : null;
      const qCompleted = sess ? sess.currentIndex : 0;
      const correct = sess ? sess.correctCount : 0;
      const accuracy = qCompleted > 0 ? Math.round((correct / qCompleted) * 100) : 0;
      const avgTime = qCompleted > 0 ? Math.round((sess.totalTimeMs / qCompleted) / 100) / 10 : 0;

      return {
        rank: idx + 1,
        teamCode: t.id,
        teamName: t.team_name || t.name,
        questionsCompleted: qCompleted,
        totalQuestions: 100,
        correctAnswers: correct,
        totalScore: sess ? sess.totalScore : 0,
        averageAnswerTime: avgTime,
        accuracy: `${accuracy}%`,
        accuracyNum: accuracy,
        completed: sess ? sess.completed : false
      };
    }).sort((a: any, b: any) => b.totalScore - a.totalScore);

    // Re-assign ranks
    leaderboard.forEach((item: any, i: number) => { item.rank = i + 1; });

    return new Response(JSON.stringify({
      showLeaderboard: true,
      leaderboard
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 10. Admin stats/login
  if (pathname === '/api/auth/login') {
    return new Response(JSON.stringify({
      message: 'Login successful',
      token: 'admin-standalone-token',
      admin: { id: 'admin-1', username: 'admin' }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname === '/api/admin/dashboard' || pathname === '/api/admin/stats') {
    const allTeams = JSON.parse(localStorage.getItem('nexus_all_teams') || '[]');
    return new Response(JSON.stringify({
      totalTeams: allTeams.length,
      activeSessions: allTeams.length,
      completedSessions: 0,
      waitingTeams: 0,
      totalAnswers: 0,
      totalQuestions: 100,
      activeQuestions: 100,
      avgScore: 0,
      eventStatus: 'LIVE',
      settings: { total_questions: 100, question_time_seconds: 120, max_points: 10 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname === '/api/admin/questions') {
    return new Response(JSON.stringify({
      total: NEXUS_100_QUESTIONS.length,
      questions: NEXUS_100_QUESTIONS,
      categories: ['Basic AI Tools']
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return null;
}
