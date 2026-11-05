import { Network, type ConnectionStatus } from '@capacitor/network';

export type NetworkChangeCallback = (status: ConnectionStatus) => void;

export class NetworkService {
  private static listeners: NetworkChangeCallback[] = [];
  private static isInitialized = false;
  private static currentStatus: ConnectionStatus = {
    connected: true,
    connectionType: 'unknown',
  };

  /**
   * Initializes network listener.
   */
  static async initialize(): Promise<ConnectionStatus> {
    if (this.isInitialized) return this.currentStatus;

    try {
      this.currentStatus = await Network.getStatus();

      Network.addListener('networkStatusChange', (status) => {
        const wasOffline = !this.currentStatus.connected;
        this.currentStatus = status;

        this.listeners.forEach((cb) => cb(status));

        if (wasOffline && status.connected) {
          window.dispatchEvent(new CustomEvent('network:online'));
        } else if (!status.connected) {
          window.dispatchEvent(new CustomEvent('network:offline'));
        }
      });

      this.isInitialized = true;
    } catch (err) {
      console.warn('Network listener error, assuming online:', err);
      this.currentStatus = { connected: true, connectionType: 'wifi' };
    }

    return this.currentStatus;
  }

  /**
   * Returns current network status.
   */
  static async getStatus(): Promise<ConnectionStatus> {
    try {
      this.currentStatus = await Network.getStatus();
    } catch {
      // fallback
    }
    return this.currentStatus;
  }

  /**
   * Check if device currently has active network connection.
   */
  static async isConnected(): Promise<boolean> {
    const status = await this.getStatus();
    return status.connected;
  }

  /**
   * Add listener for network status changes.
   */
  static onStatusChange(callback: NetworkChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}

