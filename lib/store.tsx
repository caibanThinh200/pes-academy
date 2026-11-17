'use client';

import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { User, Match, Attendance, MatchEvent, CheckinStatus, VoteStatus, MatchStatus } from '@/types/database';
import { INITIAL_USERS, INITIAL_MATCHES, INITIAL_ATTENDANCE, INITIAL_EVENTS } from './mock-data';

interface AppState {
  users: User[];
  matches: Match[];
  attendance: Attendance[];
  events: MatchEvent[];
  currentUserId: string;
  role: 'player' | 'admin';
}

type Action =
  | { type: 'HYDRATE'; payload: Partial<AppState> }
  | { type: 'SET_ROLE'; payload: 'player' | 'admin' }
  | { type: 'SET_CURRENT_USER'; payload: string }
  | { type: 'TOGGLE_VOTE'; payload: { matchId: string; userId: string } }
  | { type: 'SET_CHECKIN'; payload: { matchId: string; userId: string; status: CheckinStatus } }
  | { type: 'CREATE_MATCH'; payload: { title: string; match_date: string; location: string } }
  | { type: 'SET_MATCH_STATUS'; payload: { matchId: string; status: MatchStatus } }
  | { type: 'FINALIZE_CHECKIN'; payload: { matchId: string } }
  | { type: 'UPDATE_EVENT'; payload: { eventId: string; updates: Partial<MatchEvent> } }
  | { type: 'CONFIRM_EVENT'; payload: { eventId: string; userId: string } }
  | { type: 'DISMISS_EVENT'; payload: { eventId: string } }
  | { type: 'SET_MATCH_EVENTS'; payload: { matchId: string; events: MatchEvent[] } }
  | { type: 'RESET_DATA' };

const INITIAL_STATE: AppState = {
  users: INITIAL_USERS,
  matches: INITIAL_MATCHES,
  attendance: INITIAL_ATTENDANCE,
  events: INITIAL_EVENTS,
  currentUserId: INITIAL_USERS[0]?.id || '00000000-0000-0000-0000-000000000001',
  role: 'player',
};

const STORAGE_KEY = 'pes_academy_store_v3';

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };

    case 'SET_ROLE':
      return { ...state, role: action.payload };

    case 'SET_CURRENT_USER':
      return { ...state, currentUserId: action.payload };

    case 'TOGGLE_VOTE': {
      const { matchId, userId } = action.payload;
      const existingIndex = state.attendance.findIndex(
        (a) => a.match_id === matchId && a.user_id === userId
      );

      let newAttendance: Attendance[];
      if (existingIndex >= 0) {
        const current = state.attendance[existingIndex];
        const nextVote: VoteStatus = current.vote_status === 'joined' ? 'declined' : 'joined';
        newAttendance = [...state.attendance];
        newAttendance[existingIndex] = {
          ...current,
          vote_status: nextVote,
        };
      } else {
        const newRecord: Attendance = {
          id: `att-${Date.now()}`,
          match_id: matchId,
          user_id: userId,
          vote_status: 'joined',
          checkin_status: 'pending',
        };
        newAttendance = [...state.attendance, newRecord];
      }
      return { ...state, attendance: newAttendance };
    }

    case 'SET_CHECKIN': {
      const { matchId, userId, status } = action.payload;
      const existingIndex = state.attendance.findIndex(
        (a) => a.match_id === matchId && a.user_id === userId
      );

      let newAttendance: Attendance[];
      if (existingIndex >= 0) {
        newAttendance = [...state.attendance];
        newAttendance[existingIndex] = {
          ...newAttendance[existingIndex],
          checkin_status: status,
        };
      } else {
        newAttendance = [
          ...state.attendance,
          {
            id: `att-${Date.now()}`,
            match_id: matchId,
            user_id: userId,
            vote_status: 'joined',
            checkin_status: status,
          },
        ];
      }
      return { ...state, attendance: newAttendance };
    }

    case 'CREATE_MATCH': {
      const newMatch: Match = {
        id: `match-${Date.now()}`,
        status: 'voting',
        video_url: null,
        created_at: new Date().toISOString(),
        ...action.payload,
      };
      return {
        ...state,
        matches: [newMatch, ...state.matches],
      };
    }

    case 'SET_MATCH_STATUS': {
      const { matchId, status } = action.payload;
      const newMatches = state.matches.map((m) =>
        m.id === matchId ? { ...m, status } : m
      );
      return { ...state, matches: newMatches };
    }

    case 'FINALIZE_CHECKIN': {
      const { matchId } = action.payload;
      const noShowUserIds = new Set<string>();

      const newAttendance = state.attendance.map((att) => {
        if (
          att.match_id === matchId &&
          att.vote_status === 'joined' &&
          att.checkin_status !== 'present'
        ) {
          noShowUserIds.add(att.user_id);
          return {
            ...att,
            checkin_status: 'absent_penalized' as CheckinStatus,
          };
        }
        return att;
      });

      const newUsers = state.users.map((u) => {
        if (noShowUserIds.has(u.id)) {
          return {
            ...u,
            penalty_count: (u.penalty_count || 0) + 1,
          };
        }
        return u;
      });

      const newMatches = state.matches.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            status: 'review' as MatchStatus,
          };
        }
        return m;
      });

      return {
        ...state,
        attendance: newAttendance,
        users: newUsers,
        matches: newMatches,
      };
    }

    case 'UPDATE_EVENT': {
      const { eventId, updates } = action.payload;
      const newEvents = state.events.map((e) =>
        e.id === eventId ? { ...e, ...updates } : e
      );
      return { ...state, events: newEvents };
    }

    case 'CONFIRM_EVENT': {
      const { eventId, userId } = action.payload;
      const targetEvent = state.events.find((e) => e.id === eventId);
      if (!targetEvent) return state;

      const prevStatus = targetEvent.status;
      const prevUserId = targetEvent.assigned_user_id;

      if (prevStatus === 'confirmed' && prevUserId === userId) {
        return state;
      }

      const newUsers = state.users.map((u) => {
        let goalsDelta = 0;
        let savesDelta = 0;

        if (prevStatus === 'confirmed' && prevUserId === u.id && prevUserId !== userId) {
          if (targetEvent.event_type === 'goal') goalsDelta -= 1;
          if (targetEvent.event_type === 'save') savesDelta -= 1;
        }

        if (u.id === userId) {
          if (targetEvent.event_type === 'goal') goalsDelta += 1;
          if (targetEvent.event_type === 'save') savesDelta += 1;
        }

        if (goalsDelta !== 0 || savesDelta !== 0) {
          return {
            ...u,
            total_goals: Math.max(0, u.total_goals + goalsDelta),
            total_saves: Math.max(0, u.total_saves + savesDelta),
          };
        }
        return u;
      });

      const newEvents = state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: 'confirmed' as const,
              assigned_user_id: userId,
            }
          : e
      );

      return {
        ...state,
        events: newEvents,
        users: newUsers,
      };
    }

    case 'DISMISS_EVENT': {
      const { eventId } = action.payload;
      const targetEvent = state.events.find((e) => e.id === eventId);
      if (!targetEvent) return state;

      const prevStatus = targetEvent.status;
      const prevUserId = targetEvent.assigned_user_id;

      let newUsers = state.users;
      if (prevStatus === 'confirmed' && prevUserId) {
        newUsers = state.users.map((u) => {
          if (u.id === prevUserId) {
            return {
              ...u,
              total_goals:
                targetEvent.event_type === 'goal'
                  ? Math.max(0, u.total_goals - 1)
                  : u.total_goals,
              total_saves:
                targetEvent.event_type === 'save'
                  ? Math.max(0, u.total_saves - 1)
                  : u.total_saves,
            };
          }
          return u;
        });
      }

      const newEvents = state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              status: 'rejected' as const,
              assigned_user_id: null,
            }
          : e
      );

      return {
        ...state,
        events: newEvents,
        users: newUsers,
      };
    }

    case 'SET_MATCH_EVENTS': {
      const { matchId, events: incomingEvents } = action.payload;
      const confirmedForThisMatch = state.events.filter(
        (e) => e.match_id === matchId && e.status === 'confirmed'
      );
      const otherMatchesEvents = state.events.filter((e) => e.match_id !== matchId);
      const confirmedIds = new Set(confirmedForThisMatch.map((e) => e.id));
      const freshIncoming = incomingEvents.filter((e) => !confirmedIds.has(e.id));

      return {
        ...state,
        events: [...otherMatchesEvents, ...confirmedForThisMatch, ...freshIncoming],
      };
    }

    case 'RESET_DATA':
      return INITIAL_STATE;

    default:
      return state;
  }
}

interface AppStoreContextType extends AppState {
  setRole: (role: 'player' | 'admin') => void;
  setCurrentUserId: (id: string) => void;
  toggleVote: (matchId: string, userId: string) => void;
  setCheckin: (matchId: string, userId: string, status: CheckinStatus) => void;
  updateEvent: (eventId: string, updates: Partial<MatchEvent>) => void;
  confirmEvent: (eventId: string, userId: string) => void;
  dismissEvent: (eventId: string) => void;
  setMatchEvents: (matchId: string, events: MatchEvent[]) => void;
  createMatch: (data: { title: string; match_date: string; location: string }) => void;
  setMatchStatus: (matchId: string, status: MatchStatus) => void;
  finalizeCheckin: (matchId: string) => void;
  resetDemoData: () => void;
  currentUser: User | undefined;
  isHydrated: boolean;
}

const AppStoreContext = createContext<AppStoreContextType | null>(null);

const isClient = () => true;
const isServer = () => false;
const subscribe = () => () => {};

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const isHydrated = useSyncExternalStore(subscribe, isClient, isServer);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        dispatch({ type: 'HYDRATE', payload: parsed });
      }
    } catch (e) {
      console.warn('Failed to hydrate state from localStorage', e);
    }
  }, []);

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save state to localStorage', e);
      }
    }
  }, [state, isHydrated]);

  const setRole = useCallback((role: 'player' | 'admin') => dispatch({ type: 'SET_ROLE', payload: role }), []);
  const setCurrentUserId = useCallback((id: string) => dispatch({ type: 'SET_CURRENT_USER', payload: id }), []);
  const toggleVote = useCallback(
    (matchId: string, userId: string) => dispatch({ type: 'TOGGLE_VOTE', payload: { matchId, userId } }),
    []
  );
  const setCheckin = useCallback(
    (matchId: string, userId: string, status: CheckinStatus) =>
      dispatch({ type: 'SET_CHECKIN', payload: { matchId, userId, status } }),
    []
  );
  const updateEvent = useCallback(
    (eventId: string, updates: Partial<MatchEvent>) =>
      dispatch({ type: 'UPDATE_EVENT', payload: { eventId, updates } }),
    []
  );
  const confirmEvent = useCallback(
    (eventId: string, userId: string) =>
      dispatch({ type: 'CONFIRM_EVENT', payload: { eventId, userId } }),
    []
  );
  const dismissEvent = useCallback(
    (eventId: string) => dispatch({ type: 'DISMISS_EVENT', payload: { eventId } }),
    []
  );
  const setMatchEvents = useCallback(
    (matchId: string, events: MatchEvent[]) =>
      dispatch({ type: 'SET_MATCH_EVENTS', payload: { matchId, events } }),
    []
  );
  const createMatch = useCallback(
    (data: { title: string; match_date: string; location: string }) =>
      dispatch({ type: 'CREATE_MATCH', payload: data }),
    []
  );
  const setMatchStatus = useCallback(
    (matchId: string, status: MatchStatus) =>
      dispatch({ type: 'SET_MATCH_STATUS', payload: { matchId, status } }),
    []
  );
  const finalizeCheckin = useCallback(
    (matchId: string) => dispatch({ type: 'FINALIZE_CHECKIN', payload: { matchId } }),
    []
  );
  const resetDemoData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    dispatch({ type: 'RESET_DATA' });
  }, []);

  const currentUser = useMemo(() => {
    return state.users.find((u) => u.id === state.currentUserId) || state.users[0];
  }, [state.users, state.currentUserId]);

  const value = useMemo(
    () => ({
      ...state,
      setRole,
      setCurrentUserId,
      toggleVote,
      setCheckin,
      updateEvent,
      confirmEvent,
      dismissEvent,
      setMatchEvents,
      createMatch,
      setMatchStatus,
      finalizeCheckin,
      resetDemoData,
      currentUser,
      isHydrated,
    }),
    [
      state,
      setRole,
      setCurrentUserId,
      toggleVote,
      setCheckin,
      updateEvent,
      confirmEvent,
      dismissEvent,
      setMatchEvents,
      createMatch,
      setMatchStatus,
      finalizeCheckin,
      resetDemoData,
      currentUser,
      isHydrated,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
}
