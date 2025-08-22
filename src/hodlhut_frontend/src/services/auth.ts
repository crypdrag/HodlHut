import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Internet Identity URL for local development
const II_URL = 'http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943';

export class AuthService {
  private authClient: AuthClient | null = null;

  async init() {
    this.authClient = await AuthClient.create();
    
    if (await this.authClient.isAuthenticated()) {
      await this.setupActor();
    }
  }

  async login(): Promise<boolean> {
    if (!this.authClient) {
      await this.init();
    }

    return new Promise((resolve) => {
      this.authClient?.login({
        identityProvider: II_URL,
        onSuccess: async () => {
          await this.setupActor();
          resolve(true);
        },
        onError: (error) => {
          console.error('Login failed:', error);
          resolve(false);
        },
      });
    });
  }

  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.authClient) {
      await this.init();
    }
    return this.authClient?.isAuthenticated() ?? false;
  }

  async getPrincipal(): Promise<Principal | null> {
    if (!this.authClient) {
      await this.init();
    }
    
    const identity = this.authClient?.getIdentity();
    return identity?.getPrincipal() ?? null;
  }

  private async setupActor() {
    if (!this.authClient) return;

    const identity = this.authClient.getIdentity();
    const agent = new HttpAgent({
      identity,
      host: 'http://localhost:4943',
    });

    // Fetch root key for local development
    if (process.env.NODE_ENV !== 'production') {
      await agent.fetchRootKey();
    }

    // TODO: Setup actor for backend canister interaction
    // This will be used to interact with the HutFactory canister
  }
}

// Singleton instance
export const authService = new AuthService();