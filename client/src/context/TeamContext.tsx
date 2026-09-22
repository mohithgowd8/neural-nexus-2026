import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext.js';

export interface Team {
  id: string; // Team Code e.g. NN26-A7K4
  team_name: string;
  name?: string;
  leader_name: string;
  leader_roll: string;
  member2_name: string;
  member2_roll: string;
  member3_name?: string;
  member3_roll?: string;
  member4_name?: string;
  member4_roll?: string;
  created_at?: string;
}

interface TeamContextType {
  team: Team | null;
  teamCode: string | null;
  sessionId: string | null;
  setTeamSession: (team: Team, sessionId: string) => void;
  logoutTeam: () => void;
  refreshTeam: () => Promise<void>;
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextType>({
  team: null,
  teamCode: null,
  sessionId: null,
  setTeamSession: () => {},
  logoutTeam: () => {},
  refreshTeam: async () => {},
  isLoading: true
});

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const savedTeam = localStorage.getItem('nexus_team');
    const savedCode = localStorage.getItem('nexus_team_code');
    const savedSessionId = localStorage.getItem('nexus_session_id');

    if (savedTeam && savedCode) {
      try {
        setTeam(JSON.parse(savedTeam));
        setTeamCode(savedCode);
        setSessionId(savedSessionId || null);
      } catch (e) {
        localStorage.removeItem('nexus_team');
        localStorage.removeItem('nexus_team_code');
        localStorage.removeItem('nexus_session_id');
      }
    }
    setIsLoading(false);
  }, []);

  // Sync team with socket room
  useEffect(() => {
    if (socket && teamCode) {
      socket.emit('JOIN_ROOM', { role: 'team', teamCode, teamId: teamCode });
    }
  }, [socket, teamCode]);

  const setTeamSession = (newTeam: Team, newSessionId: string) => {
    setTeam(newTeam);
    setTeamCode(newTeam.id);
    setSessionId(newSessionId);
    localStorage.setItem('nexus_team', JSON.stringify(newTeam));
    localStorage.setItem('nexus_team_code', newTeam.id);
    localStorage.setItem('nexus_session_id', newSessionId);
  };

  const logoutTeam = () => {
    setTeam(null);
    setTeamCode(null);
    setSessionId(null);
    localStorage.removeItem('nexus_team');
    localStorage.removeItem('nexus_team_code');
    localStorage.removeItem('nexus_session_id');
  };

  const refreshTeam = async () => {
    if (!teamCode) return;
    try {
      const res = await fetch(`/api/teams/session/${teamCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.team) {
          setTeam(data.team);
          localStorage.setItem('nexus_team', JSON.stringify(data.team));
        }
      }
    } catch (e) {
      console.error('Failed to refresh team session:', e);
    }
  };

  return (
    <TeamContext.Provider
      value={{
        team,
        teamCode,
        sessionId,
        setTeamSession,
        logoutTeam,
        refreshTeam,
        isLoading
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => useContext(TeamContext);
