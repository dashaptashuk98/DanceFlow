export type UserRole = "Студент" | "Администратор";

export interface User {
  user_id: number;
  first_name: string;
  login: string;
  email: string;
  role: UserRole;
}

export interface Training {
  training_id: number;
  style_id: number;
  instructor_id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  level: string;
  style_name: string;
  instructor_name: string;
  specialization?: string;
}

export interface Booking {
  booking_id: number;
  user_id: number;
  training_id: number;
  subscription_id: number;
  date: string;
  status: string;
  title?: string;
  training_time?: string;
  location?: string;
  level?: string;
  style_name?: string;
  instructor_name?: string;
  attendance_status?: string | null;
  first_name?: string;
  login?: string;
  email?: string;
  attendance_id?: number | null;
}

export interface Subscription {
  subscription_id: number;
  user_id: number;
  type: string;
  total_lessons: number;
  lessons_used: number;
  start_date: string;
  end_date: string;
  remaining_lessons: number;
  status_label: string;
  first_name?: string;
  login?: string;
}

export interface Instructor {
  instructor_id: number;
  first_name: string;
  specialization: string;
  phone: string;
}

export interface Style {
  style_id: number;
  name: string;
  description: string | null;
}

export interface Analytics {
  overview: {
    students_count: number;
    confirmed_bookings: number;
    attended: number;
    missed: number;
    total_payments: number;
    active_subscriptions?: number;
  };
  byStyle: { style_name: string; visits: number }[];
  topClients: {
    user_id: number;
    first_name: string;
    login: string;
    visits: number;
  }[];
  attendanceTrend?: { date: string; visits: number }[];
  revenueByMonth?: { month: string; amount: number }[];
}
