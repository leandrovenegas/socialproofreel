'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TemplateConfig {
  typography: {
    family: string;
    size: number;
    weight: string;
  };
  colors: {
    primary: string;
    secondary: string;
    overlay_opacity: number;
  };
  layout: {
    alignment: 'top' | 'center' | 'bottom';
  };
  effects: {
    blur: number;
    overlay_darkness: number;
  };
}

const defaultConfig: TemplateConfig = {
  typography: {
    family: "'Inter', sans-serif",
    size: 24,
    weight: 'bold',
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#1E293B',
    overlay_opacity: 0.4,
  },
  layout: {
    alignment: 'bottom',
  },
  effects: {
    blur: 8,
    overlay_darkness: 0.6,
  },
};

interface TemplateContextType {
  config: TemplateConfig;
  setConfig: (config: TemplateConfig) => void;
  updateConfig: (section: keyof TemplateConfig, values: any) => void;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export function TemplateProvider({ 
  children, 
  initialConfig 
}: { 
  children: ReactNode; 
  initialConfig?: TemplateConfig 
}) {
  const [config, setConfig] = useState<TemplateConfig>(initialConfig || defaultConfig);

  const updateConfig = (section: keyof TemplateConfig, values: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values,
      },
    }));
  };

  return (
    <TemplateContext.Provider value={{ config, setConfig, updateConfig }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate() {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplate must be used within a TemplateProvider');
  }
  return context;
}
