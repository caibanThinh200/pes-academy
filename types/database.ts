export type UserRole = 'admin' | 'player';
export type Position = 'field' | 'gk';
export type MatchStatus = 'voting' | 'checkin' | 'review' | 'completed';
export type VoteStatus = 'joined' | 'declined';
export type CheckinStatus = 'pending' | 'present' | 'absent_penalized';
export type EventType = 'goal' | 'save';
export type EventStatus = 'pending_review' | 'confirmed' | 'rejected';

export type User = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  position: Position;
  jersey_number: number | null;
  total_goals: number;
  total_saves: number;
  penalty_count: number;
  created_at?: string;
};

export type Match = {
  id: string;
  title: string;
  match_date: string; // ISO 8601 string
  location: string;
  status: MatchStatus;
  video_url: string | null;
  created_at?: string;
};

export type Attendance = {
  id: string;
  match_id: string;
  user_id: string;
  vote_status: VoteStatus;
  checkin_status: CheckinStatus;
  created_at?: string;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  timestamp_sec: number;
  timestamp_formatted?: string;
  event_type: EventType;
  assigned_user_id: string | null;
  confidence_score: number;
  status: EventStatus;
  visual_cue?: string | null;
  created_at?: string;
};

export type MatchEventRow = Omit<MatchEvent, 'timestamp_formatted'>;

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'jersey_number'> & {
          id?: string;
          created_at?: string;
          jersey_number?: number | null;
        };
        Update: Partial<User>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Match>;
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: Omit<Attendance, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Attendance>;
        Relationships: [];
      };
      match_events: {
        Row: MatchEventRow;
        Insert: Omit<MatchEventRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<MatchEventRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      position: Position;
      match_status: MatchStatus;
      vote_status: VoteStatus;
      checkin_status: CheckinStatus;
      event_type: EventType;
      event_status: EventStatus;
    };
  };
}
