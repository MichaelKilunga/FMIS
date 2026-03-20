export interface Task {
  id: number;
  tenant_id: number;
  assigned_to: number | null;
  assigned_by: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress: number;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  parent_id: number | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: number;
    name: string;
    avatar_url?: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  histories?: TaskHistory[];
}

export interface TaskHistory {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  overdue: number;
  productivity_score: number;
  trends: Array<{
    date: string;
    total: number;
    completed: number;
  }>;
}
