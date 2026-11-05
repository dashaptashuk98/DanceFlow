export type UserRole = 'Студент' | 'Администратор';

export interface User {
  user_id: number;
  first_name: string;
  login: string;
  email: string;
  role: UserRole;
}

export interface AuthRequestUser {
  userId: number;
  role: UserRole;
  login: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthRequestUser;
    }
  }
}
