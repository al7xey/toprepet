export type Role = 'student' | 'tutor' | 'admin';

export interface Profile {
  id: string;
  role: Role;
  name: string;
  email: string;
  tz: string;
}

export const ROLE_HOME: Record<Role, string> = { student: '/cabinet/', tutor: '/tutor/', admin: '/admin/' };
export const ROLE_SETTINGS: Record<Role, string> = {
  student: '/cabinet/settings/',
  tutor: '/tutor/settings/',
  admin: '/admin/',
};
