import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switch-group" role="group" aria-label="Theme selector">
      <button
        type="button"
        className={`theme-switch-btn ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Light theme"
        aria-pressed={theme === 'light'}
      >
        <Sun size={15} />
      </button>
      <button
        type="button"
        className={`theme-switch-btn ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        title="System preference"
        aria-pressed={theme === 'system'}
      >
        <Laptop size={15} />
      </button>
      <button
        type="button"
        className={`theme-switch-btn ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Midnight Navy dark theme"
        aria-pressed={theme === 'dark'}
      >
        <Moon size={15} />
      </button>
    </div>
  );
};
