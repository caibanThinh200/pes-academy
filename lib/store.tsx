'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  User,
  Match,
  Attendance,
  MatchEvent,
  MatchEventRow,
  CheckinStatus,
  VoteStatus,
  MatchStatus,
} from '@/types/database';
import { INITIAL_USERS, INITIAL_MATCHES, INITIAL_ATTENDANCE, INITIAL_EVENTS } from './mock-data';
import { supabase, isSupabaseConfigured } from './supabase';
import { formatTimestamp } from './utils';
import { logout } from '@/app/actions/auth';

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
  | { type: 'TOGGLE_VOTE'; payload: { matchId: string; userId: string; id: string } }
  | { type: 'SET_CHECKIN'; payload: { matchId: string; userId: string; status: CheckinStatus; id: string } }
  | { type: 'CREATE_MATCH'; payload: { id: string; created_at: string; title: string; match_date: string; location: string; video_url?: string | null } }
  | { type: 'UPDATE_MATCH_VIDEO_URL'; payload: { matchId: string; videoUrl: string | null } }
  | { type: 'SET_MATCH_STATUS'; payload: { matchId: string; status: MatchStatus } }
  | { type: 'FINALIZE_CHECKIN'; payload: { matchId: string } }
  | { type: 'UPDATE_EVENT'; payload: { eventId: string; updates: Partial<MatchEvent> } }
  | { type: 'CONFIRM_EVENT'; payload: { eventId: string; userId: string } }
  | { type: 'DISMISS_EVENT'; payload: { eventId: string } }
  | { type: 'SET_MATCH_EVENTS'; payload: { matchId: string; events: MatchEvent[] } }
  | { type: 'RESET_DATA' };

const DEFAULT_OFFLINE_USER =
  INITIAL_USERS.find((u) => u.role === 'admin') ?? INITIAL_USERS[0];

const INITIAL_STATE: AppState = {
  users: INITIAL_USERS,
  matches: INITIAL_MATCHES,
  attendance: INITIAL_ATTENDANCE,
  events: INITIAL_EVENTS,
  currentUserId: isSupabaseConfigured
    ? ''
    : (DEFAULT_OFFLINE_USER?.id ?? '00000000-0000-0000-0000-000000000027'),
  role: isSupabaseConfigured ? 'player' : (DEFAULT_OFFLINE_USER?.role ?? 'admin'),
};

const STORAGE_KEY = 'pes_academy_store_v4';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureUuid(id?: string): string {
  return id && UUID_REGEX.test(id) ? id : crypto.randomUUID();
}

function toMatchEventRow(event: MatchEvent): MatchEventRow {
  const { timestamp_formatted: _ignored, ...row } = event;
  void _ignored;
  return {
    ...row,
    id: ensureUuid(row.id),
  };
}

function logSupabaseError(operation: string, error: unknown) {
  if (error) {
    console.error(`[Supabase] ${operation} failed:`, error);
  }
}

async function fetchLiveStateFromSupabase(): Promise<{
  users: User[];
  matches: Match[];
  attendance: Attendance[];
  events: MatchEvent[];
} | null> {
  if (!supabase) return null;

  try {
    const [usersRes, matchesRes, attendanceRes, eventsRes] = await Promise.all([
      supabase.from('users').select('*').order('name', { ascending: true }),
      supabase.from('matches').select('*').order('match_date', { ascending: false }),
      supabase.from('attendance').select('*'),
      supabase.from('match_events').select('*').order('timestamp_sec', { ascending: true }),
    ]);

    if (usersRes.error || matchesRes.error || attendanceRes.error || eventsRes.error) {
      console.warn('Failed to fetch initial state from Supabase:', {
        usersError: usersRes.error,
        matchesError: matchesRes.error,
        attendanceError: attendanceRes.error,
        eventsError: eventsRes.error,
      });
      return null;
    }

    const events: MatchEvent[] = (eventsRes.data || []).map((e) => {
      const timestampSec = Number(e.timestamp_sec);
      return {
        ...e,
        timestamp_sec: timestampSec,
        confidence_score: Number(e.confidence_score),
        timestamp_formatted: formatTimestamp(timestampSec),
      };
    });

    return {
      users: usersRes.data || [],
      matches: matchesRes.data || [],
      attendance: attendanceRes.data || [],
      events,
    };
  } catch (err) {
    console.warn('Failed to fetch initial state from Supabase:', err);
    return null;
  }
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };

    case 'TOGGLE_VOTE': {
      const { matchId, userId, id } = action.payload;
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
          id,
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
      const { matchId, userId, status, id } = action.payload;
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
            id,
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
        status: 'voting',
        ...action.payload,
        video_url: action.payload.video_url ?? null,
      };
      return {
        ...state,
        matches: [newMatch, ...state.matches],
      };
    }

    case 'UPDATE_MATCH_VIDEO_URL': {
      const { matchId, videoUrl } = action.payload;
      const newMatches = state.matches.map((m) =>
        m.id === matchId ? { ...m, video_url: videoUrl } : m
      );
      return { ...state, matches: newMatches };
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
  toggleVote: (matchId: string, userId: string) => void;
  setCheckin: (matchId: string, userId: string, status: CheckinStatus) => void;
  updateEvent: (eventId: string, updates: Partial<MatchEvent>) => void;
  confirmEvent: (eventId: string, userId: string) => void;
  dismissEvent: (eventId: string) => void;
  setMatchEvents: (matchId: string, events: MatchEvent[]) => void;
  createMatch: (
    data: Pick<Match, 'title' | 'match_date' | 'location'> & { video_url?: string | null }
  ) => void;
  updateMatchVideoUrl: (matchId: string, videoUrl: string | null) => void;
  setMatchStatus: (matchId: string, status: MatchStatus) => void;
  finalizeCheckin: (matchId: string) => void;
  resetDemoData: () => void;
  signOut: () => Promise<void>;
  currentUser: User | undefined;
  isHydrated: boolean;
}

const AppStoreContext = createContext<AppStoreContextType | null>(null);

const isClient = () => true;
const isServer = () => false;
const subscribe = () => () => { };

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const stateRef = useRef(state);
  const skipInitialPersistRef = useRef(true);
  const isHydrated = useSyncExternalStore(subscribe, isClient, isServer);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        const {
          data: { user },
        } = await client.auth.getUser();
        if (cancelled) return;

        if (!user) {
          dispatch({
            type: 'HYDRATE',
            payload: {
              currentUserId: '',
              role: 'player',
            },
          });
          return;
        }

        const liveData = await fetchLiveStateFromSupabase();
        if (cancelled) return;

        if (!liveData) {
          dispatch({
            type: 'HYDRATE',
            payload: {
              currentUserId: user.id,
              role: 'player',
            },
          });
          return;
        }

        const resolvedUsers =
          liveData.users.length > 0 ? liveData.users : INITIAL_STATE.users;
        const resolvedMatches =
          liveData.users.length === 0 && liveData.matches.length === 0
            ? INITIAL_STATE.matches
            : liveData.matches;
        const resolvedAttendance =
          liveData.users.length === 0 && liveData.attendance.length === 0
            ? INITIAL_STATE.attendance
            : liveData.attendance;
        const resolvedEvents =
          liveData.users.length === 0 && liveData.events.length === 0
            ? INITIAL_STATE.events
            : liveData.events;

        const resolvedRole =
          resolvedUsers.find((u) => u.id === user.id)?.role ?? 'player';

        dispatch({
          type: 'HYDRATE',
          payload: {
            users: resolvedUsers,
            matches: resolvedMatches,
            attendance: resolvedAttendance,
            events: resolvedEvents,
            currentUserId: user.id,
            role: resolvedRole,
          },
        });
      })().catch(() => {});
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<AppState>;
          const hydratedUsers =
            Array.isArray(parsed.users) && parsed.users.length > 0
              ? parsed.users
              : INITIAL_USERS;
          const fallbackUser =
            hydratedUsers.find((u) => u.role === 'admin') ?? hydratedUsers[0];
          dispatch({
            type: 'HYDRATE',
            payload: {
              ...parsed,
              users: hydratedUsers,
              currentUserId: fallbackUser?.id ?? INITIAL_STATE.currentUserId,
              role: fallbackUser?.role ?? 'admin',
            },
          });
        }
      } catch (e) {
        console.warn('Failed to hydrate state from localStorage', e);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || isSupabaseConfigured) return;
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }, [state, isHydrated]);

  const toggleVote = useCallback((matchId: string, userId: string) => {
    const existing = stateRef.current.attendance.find(
      (a) => a.match_id === matchId && a.user_id === userId
    );
    const nextVote: VoteStatus = existing
      ? existing.vote_status === 'joined'
        ? 'declined'
        : 'joined'
      : 'joined';
    const id = ensureUuid(existing?.id);

    dispatch({ type: 'TOGGLE_VOTE', payload: { matchId, userId, id } });

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('attendance')
        .upsert(
          {
            id,
            match_id: matchId,
            user_id: userId,
            vote_status: nextVote,
            checkin_status: existing?.checkin_status ?? 'pending',
          },
          { onConflict: 'match_id,user_id' }
        )
        .then(({ error }) => logSupabaseError('toggleVote', error));
    }
  }, []);

  const setCheckin = useCallback((matchId: string, userId: string, status: CheckinStatus) => {
    const existing = stateRef.current.attendance.find(
      (a) => a.match_id === matchId && a.user_id === userId
    );
    const id = ensureUuid(existing?.id);

    dispatch({ type: 'SET_CHECKIN', payload: { matchId, userId, status, id } });

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('attendance')
        .upsert(
          {
            id,
            match_id: matchId,
            user_id: userId,
            vote_status: existing?.vote_status ?? 'joined',
            checkin_status: status,
          },
          { onConflict: 'match_id,user_id' }
        )
        .then(({ error }) => logSupabaseError('setCheckin', error));
    }
  }, []);

  const updateEvent = useCallback((eventId: string, updates: Partial<MatchEvent>) => {
    dispatch({ type: 'UPDATE_EVENT', payload: { eventId, updates } });

    if (isSupabaseConfigured && supabase) {
      const { timestamp_formatted: _ignored, ...dbUpdates } = updates;
      void _ignored;
      if (Object.keys(dbUpdates).length > 0) {
        supabase
          .from('match_events')
          .update(dbUpdates)
          .eq('id', eventId)
          .then(({ error }) => logSupabaseError('updateEvent', error));
      }
    }
  }, []);

  const confirmEvent = useCallback((eventId: string, userId: string) => {
    const targetEvent = stateRef.current.events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    const prevStatus = targetEvent.status;
    const prevUserId = targetEvent.assigned_user_id;
    const wasAlreadyConfirmed = prevStatus === 'confirmed';

    if (wasAlreadyConfirmed && prevUserId === userId) {
      return;
    }

    const prevUser =
      wasAlreadyConfirmed && prevUserId && prevUserId !== userId
        ? stateRef.current.users.find((u) => u.id === prevUserId)
        : undefined;
    const nextUser = stateRef.current.users.find((u) => u.id === userId);

    dispatch({ type: 'CONFIRM_EVENT', payload: { eventId, userId } });

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        const { error: eventError } = await client
          .from('match_events')
          .update({ status: 'confirmed', assigned_user_id: userId })
          .eq('id', eventId);
        logSupabaseError('confirmEvent.match_events', eventError);

        const userUpdates: PromiseLike<{ error: unknown }>[] = [];
        if (prevUser) {
          userUpdates.push(
            client
              .from('users')
              .update(
                targetEvent.event_type === 'goal'
                  ? { total_goals: Math.max(0, prevUser.total_goals - 1) }
                  : { total_saves: Math.max(0, prevUser.total_saves - 1) }
              )
              .eq('id', prevUser.id)
          );
        }
        if (nextUser) {
          userUpdates.push(
            client
              .from('users')
              .update(
                targetEvent.event_type === 'goal'
                  ? { total_goals: nextUser.total_goals + 1 }
                  : { total_saves: nextUser.total_saves + 1 }
              )
              .eq('id', nextUser.id)
          );
        }

        if (userUpdates.length > 0) {
          const results = await Promise.all(userUpdates);
          results.forEach(({ error }) => logSupabaseError('confirmEvent.users', error));
        }
      })();
    }
  }, []);

  const dismissEvent = useCallback((eventId: string) => {
    const targetEvent = stateRef.current.events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    const wasConfirmed = targetEvent.status === 'confirmed';
    const prevUserId = targetEvent.assigned_user_id;
    const prevUser =
      wasConfirmed && prevUserId
        ? stateRef.current.users.find((u) => u.id === prevUserId)
        : undefined;

    dispatch({ type: 'DISMISS_EVENT', payload: { eventId } });

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        const { error: eventError } = await client
          .from('match_events')
          .update({ status: 'rejected', assigned_user_id: null })
          .eq('id', eventId);
        logSupabaseError('dismissEvent.match_events', eventError);

        if (prevUser) {
          const { error: userError } = await client
            .from('users')
            .update(
              targetEvent.event_type === 'goal'
                ? { total_goals: Math.max(0, prevUser.total_goals - 1) }
                : { total_saves: Math.max(0, prevUser.total_saves - 1) }
            )
            .eq('id', prevUser.id);
          logSupabaseError('dismissEvent.users', userError);
        }
      })();
    }
  }, []);

  const setMatchEvents = useCallback((matchId: string, incomingEvents: MatchEvent[]) => {
    const normalizedEvents: MatchEvent[] = incomingEvents.map((e) => {
      const timestampSec = Number(e.timestamp_sec);
      return {
        ...e,
        id: ensureUuid(e.id),
        match_id: matchId,
        timestamp_sec: timestampSec,
        confidence_score: Number(e.confidence_score),
        timestamp_formatted: e.timestamp_formatted || formatTimestamp(timestampSec),
      };
    });

    const confirmedIds = new Set(
      stateRef.current.events
        .filter((e) => e.match_id === matchId && e.status === 'confirmed')
        .map((e) => e.id)
    );
    const freshIncoming = normalizedEvents.filter((e) => !confirmedIds.has(e.id));

    dispatch({ type: 'SET_MATCH_EVENTS', payload: { matchId, events: normalizedEvents } });

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        const { error: delError } = await client
          .from('match_events')
          .delete()
          .eq('match_id', matchId)
          .neq('status', 'confirmed');
        logSupabaseError('setMatchEvents.delete', delError);

        if (!delError && freshIncoming.length > 0) {
          const rowsToInsert = freshIncoming.map((e) => {
            const row = toMatchEventRow(e);
            return {
              id: row.id,
              match_id: row.match_id,
              timestamp_sec: row.timestamp_sec,
              event_type: row.event_type,
              assigned_user_id: row.assigned_user_id,
              confidence_score: row.confidence_score,
              status: row.status,
              visual_cue: row.visual_cue ?? null,
            };
          });
          const { error: insError } = await client
            .from('match_events')
            .insert(rowsToInsert);
          logSupabaseError('setMatchEvents.insert', insError);
        }
      })();
    }
  }, []);

  const createMatch = useCallback(
    (data: Pick<Match, 'title' | 'match_date' | 'location'> & { video_url?: string | null }) => {
      const id = crypto.randomUUID();
      const created_at = new Date().toISOString();
      const normalizedVideoUrl = data.video_url?.trim() || null;

      dispatch({
        type: 'CREATE_MATCH',
        payload: {
          id,
          created_at,
          title: data.title,
          match_date: data.match_date,
          location: data.location,
          video_url: normalizedVideoUrl,
        },
      });

      if (isSupabaseConfigured && supabase) {
        supabase
          .from('matches')
          .insert({
            id,
            title: data.title,
            match_date: data.match_date,
            location: data.location,
            status: 'voting',
            video_url: normalizedVideoUrl,
            created_at,
          })
          .then(({ error }) => logSupabaseError('createMatch', error));
      }
    },
    []
  );

  const updateMatchVideoUrl = useCallback((matchId: string, videoUrl: string | null) => {
    const normalizedUrl = videoUrl?.trim() || null;
    dispatch({
      type: 'UPDATE_MATCH_VIDEO_URL',
      payload: { matchId, videoUrl: normalizedUrl },
    });

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('matches')
        .update({ video_url: normalizedUrl })
        .eq('id', matchId)
        .then(({ error }) => {
          if (error) console.error('[Supabase] updateMatchVideoUrl failed:', error.message);
        });
    }
  }, []);

  const setMatchStatus = useCallback((matchId: string, status: MatchStatus) => {
    dispatch({ type: 'SET_MATCH_STATUS', payload: { matchId, status } });

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('matches')
        .update({ status })
        .eq('id', matchId)
        .then(({ error }) => logSupabaseError('setMatchStatus', error));
    }
  }, []);

  const finalizeCheckin = useCallback((matchId: string) => {
    const noShowUserIds = stateRef.current.attendance
      .filter(
        (att) =>
          att.match_id === matchId &&
          att.vote_status === 'joined' &&
          att.checkin_status !== 'present'
      )
      .map((att) => att.user_id);

    const affectedUsers = stateRef.current.users.filter((u) =>
      noShowUserIds.includes(u.id)
    );

    dispatch({ type: 'FINALIZE_CHECKIN', payload: { matchId } });

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      (async () => {
        if (noShowUserIds.length > 0) {
          const { error: attError } = await client
            .from('attendance')
            .update({ checkin_status: 'absent_penalized' })
            .eq('match_id', matchId)
            .in('user_id', noShowUserIds);
          logSupabaseError('finalizeCheckin.attendance', attError);

          const userResults = await Promise.all(
            affectedUsers.map((u) =>
              client
                .from('users')
                .update({ penalty_count: (u.penalty_count || 0) + 1 })
                .eq('id', u.id)
            )
          );
          userResults.forEach(({ error }) => logSupabaseError('finalizeCheckin.users', error));
        }

        const { error: matchError } = await client
          .from('matches')
          .update({ status: 'review' })
          .eq('id', matchId);
        logSupabaseError('finalizeCheckin.matches', matchError);
      })();
    }
  }, []);

  const resetDemoData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      Promise.all([client.auth.getUser(), fetchLiveStateFromSupabase()])
        .then(([{ data: { user } }, liveData]) => {
          if (!liveData || liveData.users.length === 0) {
            dispatch({ type: 'RESET_DATA' });
            return;
          }

          const sessionUserId = user?.id ?? stateRef.current.currentUserId;
          const sessionRole =
            liveData.users.find((u) => u.id === sessionUserId)?.role ?? 'player';

          dispatch({
            type: 'HYDRATE',
            payload: {
              users: liveData.users,
              matches:
                liveData.matches.length > 0 ? liveData.matches : INITIAL_STATE.matches,
              attendance: liveData.attendance,
              events: liveData.events,
              role: sessionRole,
              currentUserId: sessionUserId,
            },
          });
        })
        .catch(() => {
          dispatch({ type: 'RESET_DATA' });
        });
    } else {
      dispatch({ type: 'RESET_DATA' });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // ignore server action errors during sign-out cleanup
    }
    try {
      await supabase?.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  }, []);

  const currentUser = useMemo(() => {
    if (isSupabaseConfigured) {
      return state.users.find((u) => u.id === state.currentUserId);
    }
    return (
      state.users.find((u) => u.id === state.currentUserId) ||
      state.users.find((u) => u.role === 'admin') ||
      state.users[0]
    );
  }, [state.users, state.currentUserId]);

  const value = useMemo(
    () => ({
      ...state,
      toggleVote,
      setCheckin,
      updateEvent,
      confirmEvent,
      dismissEvent,
      setMatchEvents,
      createMatch,
      updateMatchVideoUrl,
      setMatchStatus,
      finalizeCheckin,
      resetDemoData,
      signOut,
      currentUser,
      isHydrated,
    }),
    [
      state,
      toggleVote,
      setCheckin,
      updateEvent,
      confirmEvent,
      dismissEvent,
      setMatchEvents,
      createMatch,
      updateMatchVideoUrl,
      setMatchStatus,
      finalizeCheckin,
      resetDemoData,
      signOut,
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
