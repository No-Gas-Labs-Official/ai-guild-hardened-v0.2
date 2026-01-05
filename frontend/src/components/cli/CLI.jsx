import React, { useState, useEffect } from 'react';
import { 
  ComputerDesktopIcon, 
  PlayIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const CLI = () => {
  const [commands, setCommands] = useState([]);
  const [selectedCommand, setSelectedCommand] = useState('');
  const [commandArgs, setCommandArgs] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);

  useEffect(() => {
    loadCommands();
  }, []);

  const loadCommands = async () => {
    try {
      const response = await apiService.getCLICommands();
      setCommands(response.data.commands || []);
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
  };

  const executeCommand = async () => {
    if (!selectedCommand) return;

    setLoading(true);
    try {
      const response = await apiService.executeCLICommand({
        command: selectedCommand,
        args: commandArgs.split(' ').filter(arg => arg)
      });
      
      setResult(JSON.stringify(response.data.result, null, 2));
      setCommandHistory(prev => [
        `${selectedCommand} ${commandArgs}`,
        ...prev.slice(0, 9)
      ]);
      setCommandArgs('');
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Command Line Interface
      </h1>

      {/* Command Selection */}
      <div className="card-mobile mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Command
        </h3>
        
        <select
          value={selectedCommand}
          onChange={(e) => setSelectedCommand(e.target.value)}
          className="input-mobile mb-4"
        >
          <option value="">Choose a command...</option>
          {commands.map((cmd) => (
            <option key={cmd.name} value={cmd.name}>
              {cmd.name} - {cmd.description}
            </option>
          ))}
        </select>

        {/* Command Input */}
        <input
          type="text"
          placeholder="Command arguments..."
          value={commandArgs}
          onChange={(e) => setCommandArgs(e.target.value)}
          className="input-mobile mb-4"
        />

        <button
          onClick={executeCommand}
          disabled={loading || !selectedCommand}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <div className="spinner-sm mr-2"></div>
              Executing...
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4 mr-2" />
              Execute Command
            </>
          )}
        </button>
      </div>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div className="card-mobile mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Commands
          </h3>
          <div className="space-y-2">
            {commandHistory.map((cmd, index) => (
              <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                {cmd}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command Result */}
      {result && (
        <div className="card-mobile">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Output
            </h3>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="btn-secondary text-sm"
            >
              Copy
            </button>
          </div>
          <pre className="text-xs font-mono bg-gray-100 p-3 rounded overflow-x-auto">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CLI;