import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db/database.js';

let ioInstance: SocketIOServer | null = null;
const connectedTeams = new Map<string, string>(); // teamCode -> socketId

export function initSocketIO(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    // Join rooms based on role
    socket.on('JOIN_ROOM', (data: { role: string; teamCode?: string; teamId?: string }) => {
      const code = (data.teamCode || data.teamId || '').toUpperCase();
      if (data.role === 'admin') {
        socket.join('admin_room');
      } else if (data.role === 'display') {
        socket.join('display_room');
      } else if (data.role === 'team' && code) {
        socket.join('team_room');
        socket.join(`team_${code}`);
        connectedTeams.set(code, socket.id);
        broadcastConnectionStats();
      }
    });

    // Anti-cheat: tab switch detection log
    socket.on('TAB_SWITCH_DETECTED', async (data: { teamCode?: string; teamId?: string; currentIndex?: number }) => {
      const code = (data.teamCode || data.teamId || '').toUpperCase();
      if (code) {
        const team = await db.get('SELECT team_name FROM teams WHERE id = ?', [code]);
        const teamName = team ? team.team_name : code;
        await db.run(
          'INSERT INTO event_logs (event_type, team_code, details, timestamp) VALUES (?, ?, ?, ?)',
          ['TAB_SWITCH_DETECTED', code, `Team ${teamName} (${code}) switched browser tabs during question #${data.currentIndex || 1}`, new Date().toISOString()]
        );
        // Alert admin in real-time
        io.to('admin_room').emit('ADMIN_ALERT', {
          type: 'TAB_SWITCH',
          teamCode: code,
          teamName,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      for (const [code, socketId] of connectedTeams.entries()) {
        if (socketId === socket.id) {
          connectedTeams.delete(code);
          break;
        }
      }
      broadcastConnectionStats();
    });
  });
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized');
  }
  return ioInstance;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export function broadcastEventStatus(status: string) {
  if (!ioInstance) return;
  ioInstance.emit('EVENT_STATUS_CHANGED', { status });
  if (status === 'LIVE') {
    ioInstance.emit('QUIZ_STARTED', { status: 'LIVE', timestamp: new Date().toISOString() });
  } else if (status === 'COMPLETED') {
    ioInstance.emit('QUIZ_COMPLETED', { status: 'COMPLETED', timestamp: new Date().toISOString() });
  }
}

export function broadcastLeaderboardUpdate(leaderboardData: any) {
  if (!ioInstance) return;
  ioInstance.emit('LEADERBOARD_UPDATED', leaderboardData);
}

export function broadcastConnectionStats() {
  if (!ioInstance) return;
  const connectedCount = connectedTeams.size;
  ioInstance.to('admin_room').emit('CONNECTION_STATS', {
    connectedParticipants: connectedCount,
    connectedTeams: Array.from(connectedTeams.keys())
  });
}
