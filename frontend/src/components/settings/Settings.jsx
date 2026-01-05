import React, { useState } from 'react';
import { 
  Cog6ToothIcon,
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'about', name: 'About', icon: QuestionMarkCircleIcon }
  ];

  return (
    <div className="px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Settings
      </h1>

      {/* Section Navigation */}
      <div className="flex space-x-1 mb-6 overflow-x-auto">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`tab-mobile ${activeSection === section.id ? 'active' : ''}`}
            >
              <Icon className="h-4 w-4 mb-1" />
              {section.name}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="card-mobile">
        {activeSection === 'general' && <GeneralSettings />}
        {activeSection === 'profile' && <ProfileSettings />}
        {activeSection === 'notifications' && <NotificationSettings />}
        {activeSection === 'security' && <SecuritySettings />}
        {activeSection === 'about' && <AboutSettings />}
      </div>
    </div>
  );
};

const GeneralSettings = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      General Settings
    </h3>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Theme
      </label>
      <select className="input-mobile">
        <option>Light</option>
        <option>Dark</option>
        <option>Auto</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Language
      </label>
      <select className="input-mobile">
        <option>English</option>
        <option>Spanish</option>
        <option>French</option>
      </select>
    </div>

    <div>
      <label className="flex items-center">
        <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
        <span className="ml-2 text-sm text-gray-700">
          Enable push notifications
        </span>
      </label>
    </div>
  </div>
);

const ProfileSettings = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Profile Settings
    </h3>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Username
      </label>
      <input
        type="text"
        defaultValue="admin"
        className="input-mobile"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Email
      </label>
      <input
        type="email"
        defaultValue="admin@nogaslabs.com"
        className="input-mobile"
      />
    </div>

    <button className="btn-primary w-full">
      Save Changes
    </button>
  </div>
);

const NotificationSettings = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Notification Settings
    </h3>
    
    <div className="space-y-3">
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Task completed</span>
        <input type="checkbox" className="rounded border-gray-300 text-primary-600" defaultChecked />
      </label>
      
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Security alerts</span>
        <input type="checkbox" className="rounded border-gray-300 text-primary-600" defaultChecked />
      </label>
      
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Repository updates</span>
        <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
      </label>
    </div>
  </div>
);

const SecuritySettings = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      Security Settings
    </h3>
    
    <button className="btn-primary w-full mb-3">
      Change Password
    </button>
    
    <button className="btn-secondary w-full mb-3">
      Enable Two-Factor Authentication
    </button>
    
    <button className="btn-secondary w-full">
      View Login History
    </button>
  </div>
);

const AboutSettings = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      About
    </h3>
    
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-primary-600 font-bold text-2xl">NG</span>
      </div>
      
      <h4 className="text-lg font-semibold text-gray-900 mb-2">
        No-Gas-Labs™ Ops Intelligence
      </h4>
      <p className="text-sm text-gray-500 mb-4">
        Version 1.0.0
      </p>
      
      <div className="space-y-2 text-xs text-gray-600">
        <p>© 2024 No-Gas-Labs™</p>
        <p>All rights reserved</p>
        <p>Built with React & Capacitor</p>
      </div>
    </div>
  </div>
);

export default Settings;