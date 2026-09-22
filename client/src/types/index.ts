export interface Team {
  id: string;
  name: string;
  leader_name: string;
  leader_roll: string;
  member2_name?: string;
  member2_roll?: string;
  member3_name?: string;
  member3_roll?: string;
  member4_name?: string;
  member4_roll?: string;
  is_disqualified: number;
  is_finalist: number;
  created_at: string;
}

export interface EventSettings {
  id: string;
  name: string;
  tagline: string;
  department: string;
  target_audience?: string;
  date_text?: string;
  venue_text?: string;
  min_team_size: number;
  max_team_size: number;
  status: 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  show_leaderboard: number;
  show_results_immediately: number;
  default_marks: number;
  default_negative_marks: number;
  rules_text: string;
}

export interface Round {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  type: 'MCQ' | 'VISUAL' | 'RAPID_FIRE' | 'BUZZER' | 'TRUE_FALSE';
  duration_minutes: number;
  question_count: number;
  marks_per_question: number;
  negative_marking: number;
  start_time?: string | null;
  end_time?: string | null;
  status: 'DRAFT' | 'READY' | 'LIVE' | 'ENDED' | 'RESULTS';
  order_index: number;
  allow_backward_nav: number;
  allow_unanswered: number;
  is_final_round: number;
}

export interface Question {
  id: string;
  round_id: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  options: string[];
  marks: number;
  negative_marks: number;
  question_order: number;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  score: number;
  timeTaken: number;
  roundsPlayed?: number;
}

export interface BuzzerSession {
  id: string;
  round_id: string;
  question_id?: string;
  question_text?: string;
  is_active: number;
  buzzed_team_id?: string | null;
  buzzed_team_name?: string | null;
  buzzed_at?: string | null;
  status: 'IDLE' | 'ACTIVE' | 'LOCKED' | 'ACCEPTED' | 'WRONG';
  history_json: string;
}

export interface SpecialAward {
  id: string;
  award_title: string;
  team_id?: string;
  team_name?: string;
  notes?: string;
}
