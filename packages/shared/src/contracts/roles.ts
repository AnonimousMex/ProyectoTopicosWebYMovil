export const Roles = {
  CLIENTE: 'CLIENTE',
  REPARTIDOR: 'REPARTIDOR',
  ADMIN: 'ADMIN',
  /** Identidad usada en llamadas servicio → servicio. */
  SERVICE: 'SERVICE',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
export type UserRole = Exclude<Role, 'SERVICE'>;

export const RoleLabels: Record<UserRole, string> = {
  CLIENTE: 'Cliente',
  REPARTIDOR: 'Repartidor',
  ADMIN: 'Administrador',
};
