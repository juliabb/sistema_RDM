export interface Notification {
  id: number;
  title: string;
  message: string;
  // Campos opcionais para navegação (verificar com backend)
  requestId?: number;
  link?: string;
  read?: boolean;
  createdAt?: Date;
}
