/**
 * Connector Registry
 * 
 * Manages connector instances per clientId and source.
 * Supports multi-source routing.
 */

import type { CustomerConnector } from "./connector.js";
import type { CapabilityMap } from "./capability.schema.js";

/**
 * Single-source connector registry (Step 1).
 */
export interface ConnectorRegistry {
  /**
   * Get connector for a clientId.
   * @throws Error if clientId not registered
   */
  getConnector(clientId: string): CustomerConnector;
  
  /**
   * Register a connector for a clientId.
   */
  register(clientId: string, connector: CustomerConnector): void;
  
  /**
   * Check if clientId has a registered connector.
   */
  hasConnector(clientId: string): boolean;
}

/**
 * Multi-source connector registry (Step 3).
 */
export interface MultiSourceConnectorRegistry {
  /**
   * Get connector for clientId and source.
   * @throws Error if clientId or source not registered
   */
  getConnector(clientId: string, source: string): CustomerConnector;
  
  /**
   * Register connector for clientId and source.
   */
  register(clientId: string, source: string, connector: CustomerConnector): void;
  
  /**
   * Get all sources for a clientId.
   */
  getSources(clientId: string): string[];
  
  /**
   * Check if source exists for clientId.
   */
  hasSource(clientId: string, source: string): boolean;
}

/**
 * Capability Registry
 * 
 * Manages capability maps per clientId.
 */
export interface CapabilityRegistry {
  /**
   * Get capability map for a clientId.
   * @returns CapabilityMap or undefined if not registered
   */
  getCapabilities(clientId: string): CapabilityMap | undefined;
  
  /**
   * Register capabilities for a clientId.
   */
  register(clientId: string, capabilities: CapabilityMap): void;
  
  /**
   * Check if operationId is allowlisted for clientId.
   */
  isOperationAllowed(clientId: string, operationId: string): boolean;
  
  /**
   * Get operation schema for validation.
   */
  getOperationSchema(clientId: string, operationId: string): OperationSchema | undefined;
  
  /**
   * Get source for operationId.
   * @throws Error if operationId not found or source not specified
   */
  getSourceForOperation(clientId: string, operationId: string): string;
}

export type OperationSchema = {
  type: "object";
  properties: Record<string, {
    type: string;
    required?: boolean;
    enum?: string[];
    minLength?: number;
    format?: string;
  }>;
};

/**
 * In-memory implementation of MultiSourceConnectorRegistry.
 */
export class InMemoryMultiSourceConnectorRegistry implements MultiSourceConnectorRegistry {
  private connectors = new Map<string, Map<string, CustomerConnector>>(); // clientId → source → connector

  getConnector(clientId: string, source: string): CustomerConnector {
    const sources = this.connectors.get(clientId);
    if (!sources) {
      throw new Error(`No connectors registered for clientId: ${clientId}`);
    }
    
    const connector = sources.get(source);
    if (!connector) {
      throw new Error(`No connector registered for clientId: ${clientId}, source: ${source}`);
    }
    
    return connector;
  }

  register(clientId: string, source: string, connector: CustomerConnector): void {
    if (!this.connectors.has(clientId)) {
      this.connectors.set(clientId, new Map());
    }
    this.connectors.get(clientId)!.set(source, connector);
  }

  getSources(clientId: string): string[] {
    const sources = this.connectors.get(clientId);
    return sources ? Array.from(sources.keys()) : [];
  }

  hasSource(clientId: string, source: string): boolean {
    const sources = this.connectors.get(clientId);
    return sources?.has(source) ?? false;
  }
}

/**
 * In-memory implementation of CapabilityRegistry.
 */
export class InMemoryCapabilityRegistry implements CapabilityRegistry {
  private capabilities = new Map<string, CapabilityMap>();

  getCapabilities(clientId: string): CapabilityMap | undefined {
    return this.capabilities.get(clientId);
  }

  register(clientId: string, capabilities: CapabilityMap): void {
    if (capabilities.clientId !== clientId) {
      throw new Error(`Capability clientId mismatch: expected ${clientId}, got ${capabilities.clientId}`);
    }
    this.capabilities.set(clientId, capabilities);
  }

  isOperationAllowed(clientId: string, operationId: string): boolean {
    const capabilities = this.capabilities.get(clientId);
    if (!capabilities) {
      return false;
    }
    return operationId in capabilities.operations;
  }

  getOperationSchema(clientId: string, operationId: string): OperationSchema | undefined {
    const capabilities = this.capabilities.get(clientId);
    if (!capabilities) {
      return undefined;
    }
    const operation = capabilities.operations[operationId];
    return operation?.paramsSchema;
  }

  getSourceForOperation(clientId: string, operationId: string): string {
    const capabilities = this.capabilities.get(clientId);
    if (!capabilities) {
      throw new Error(`No capabilities found for clientId: ${clientId}`);
    }
    
    const operation = capabilities.operations[operationId];
    if (!operation) {
      throw new Error(`Operation ${operationId} not allowed for clientId: ${clientId}`);
    }
    
    if (!operation.source) {
      throw new Error(`Operation ${operationId} has no source mapping for clientId: ${clientId}`);
    }
    
    return operation.source;
  }
}

