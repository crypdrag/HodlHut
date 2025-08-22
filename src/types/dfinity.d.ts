declare module '@dfinity/principal' {
  export class Principal {
    static fromText(text: string): Principal;
    static anonymous(): Principal;
    toText(): string;
    toString(): string;
    compareTo(other: Principal): number;
    toUint8Array(): Uint8Array;
    static fromUint8Array(arr: Uint8Array): Principal;
  }
}

declare module '@dfinity/agent' {
  export class HttpAgent {
    constructor(options?: any);
    call(canisterId: Principal, options: any): Promise<any>;
    query(canisterId: Principal, options: any): Promise<any>;
    status(): Promise<any>;
    fetchRootKey(): Promise<void>;
  }
  
  export class Actor {
    static createActor(interfaceFactory: any, configuration: any): any;
    static agentOf(actor: any): HttpAgent | undefined;
    static canisterIdOf(actor: any): Principal | undefined;
  }
  
  export interface ActorConfig {
    canisterId: string | Principal;
    agent?: HttpAgent;
  }
}

declare module '@dfinity/auth-client' {
  export class AuthClient {
    static create(options?: any): Promise<AuthClient>;
    login(options?: any): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
    getIdentity(): any;
  }
}