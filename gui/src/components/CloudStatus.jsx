import { useState, useEffect } from 'react';
import { useWorkflow, useCloudFeatures } from '../context/WorkflowContext';
import { workerApiService } from '../services/WorkerApiService';

const CloudStatus = () => {
  const { state } = useWorkflow();
  const { isCloudMode, features } = useCloudFeatures();
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [authStatus, setAuthStatus] = useState('checking');
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    const checkCloudStatus = async () => {
      try {
        // Test basic connectivity
        const health = await workerApiService.healthCheck();
        setConnectionStatus('connected');
        console.log('Health check successful:', health);

        // Test authentication
        if (workerApiService.isAuthenticated()) {
          const authResult = await workerApiService.testAuth();
          if (authResult.authenticated) {
            setAuthStatus('authenticated');
            setProjectCount(authResult.projectCount);
          } else {
            setAuthStatus('failed');
            console.error('Auth test failed:', authResult.error);
          }
        } else {
          setAuthStatus('no-token');
        }
      } catch (error) {
        console.error('Cloud status check failed:', error);
        setConnectionStatus('failed');
        setAuthStatus('failed');
      }
    };

    if (isCloudMode) {
      checkCloudStatus();
    }
  }, [isCloudMode]);

  if (!isCloudMode) {
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-blue-700 font-medium">Local Mode</span>
        </div>
        <p className="text-blue-600 text-sm mt-1">Using direct Gemini API calls</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'authenticated':
        return 'green';
      case 'checking':
        return 'yellow';
      case 'failed':
      case 'no-token':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status, type) => {
    if (type === 'connection') {
      switch (status) {
        case 'connected': return 'Connected to Worker API';
        case 'checking': return 'Connecting...';
        case 'failed': return 'Connection failed';
        default: return 'Unknown';
      }
    } else {
      switch (status) {
        case 'authenticated': return `Authenticated (${projectCount} projects)`;
        case 'checking': return 'Checking auth...';
        case 'failed': return 'Authentication failed';
        case 'no-token': return 'No API token';
        default: return 'Unknown';
      }
    }
  };

  return (
    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center mb-2">
        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
        <span className="text-green-700 font-medium">Cloud Mode</span>
        <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
          Worker API
        </span>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center text-sm">
          <div className={`w-2 h-2 bg-${getStatusColor(connectionStatus)}-500 rounded-full mr-2`}></div>
          <span className="text-gray-700">{getStatusText(connectionStatus, 'connection')}</span>
        </div>
        
        <div className="flex items-center text-sm">
          <div className={`w-2 h-2 bg-${getStatusColor(authStatus)}-500 rounded-full mr-2`}></div>
          <span className="text-gray-700">{getStatusText(authStatus, 'auth')}</span>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Features: {features.semanticSearch ? '🔍 Search' : ''} 
        {features.vectorStorage ? ' 📊 Vectors' : ''} 
        {features.persistentStorage ? ' 💾 Storage' : ''}
        {features.backgroundExecution ? ' ⚡ Background' : ''}
      </div>
    </div>
  );
};

export default CloudStatus;