import LLMAbstractionLayer from './LLMAbstractionLayer.js';
import { HybridLLMService } from './HybridLLMService.js';

/**
 * Service Factory - creates appropriate service instances based on configuration
 */
class ServiceFactoryImpl {
  constructor() {
    this.mode = import.meta.env.VITE_MODE || 'local';
    this.hasWorkerApi = !!import.meta.env.VITE_WORKER_API_URL;
    this.llmServiceInstance = null; // Singleton instance
    
    // Only log once during first initialization
    if (!ServiceFactoryImpl._initialized) {
      console.log('🏭 ServiceFactory initialized:', {
        mode: this.mode,
        hasWorkerApi: this.hasWorkerApi,
        workerUrl: this.hasWorkerApi ? '✅ Connected' : '❌ Not configured'
      });
      ServiceFactoryImpl._initialized = true;
    }
  }

  /**
   * Create LLM service instance (singleton pattern)
   */
  createLLMService() {
    // Return existing instance if available
    if (this.llmServiceInstance) {
      return this.llmServiceInstance;
    }

    if (this.mode === 'cloud' && this.hasWorkerApi) {
      console.log('🚀 Creating HybridLLMService (Local AI + Worker Infrastructure)');
      this.llmServiceInstance = new HybridLLMService();
    } else {
      console.log('🔧 Using local LLMAbstractionLayer');
      this.llmServiceInstance = LLMAbstractionLayer; // This is already an instance
    }
    
    return this.llmServiceInstance;
  }

  /**
   * Check if cloud features are available
   */
  isCloudModeEnabled() {
    return this.mode === 'cloud' && this.hasWorkerApi;
  }

  /**
   * Get service mode
   */
  getMode() {
    return this.mode;
  }

  /**
   * Get feature availability
   */
  getFeatures() {
    const isCloud = this.isCloudModeEnabled();
    
    return {
      semanticSearch: isCloud,
      vectorStorage: isCloud,
      persistentStorage: isCloud,
      backgroundExecution: isCloud,
      projectManagement: isCloud,
      exportToCloud: isCloud,
      multiLanguageReports: true, // Available in both modes
      realTimeExecution: !isCloud, // Local mode has real-time, cloud mode uses polling
    };
  }
}

// Initialize static property
ServiceFactoryImpl._initialized = false;

// Create singleton instance
const factory = new ServiceFactoryImpl();

/**
 * Singleton access to service factory and LLM service
 */
export class ServiceFactory {
  static getInstance() {
    return factory.createLLMService();
  }
  
  static getFactory() {
    return factory;
  }
}

export const serviceFactory = factory;