/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

// 1. Description of event data
interface NotifyDetail {
  message: string;
  severity: AlertColor;
}

// 2. Use type instead of empty interface
type NotifyEvent = CustomEvent<NotifyDetail>;

const Notifier: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');

  useEffect(() => {
    const handleNotify = (event: Event) => {
      const customEvent = event as NotifyEvent;
      if (customEvent.detail) {
        setMessage(customEvent.detail.message);
        setSeverity(customEvent.detail.severity);
        setOpen(true);
      }
    };

    window.addEventListener('notify', handleNotify);
    return () => window.removeEventListener('notify', handleNotify);
  }, []);

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Notifier;

// Basic calling function
function triggerToast(message: string, severity: AlertColor = 'info') {
  window.dispatchEvent(
    new CustomEvent<NotifyDetail>('notify', { detail: { message, severity } })
  );
}

// Helpers .success(), .error(), .warning(), .info()
export const toast = Object.assign(triggerToast, {
  success: (message: string) => triggerToast(message, 'success'),
  error: (message: string) => triggerToast(message, 'error'),
  warning: (message: string) => triggerToast(message, 'warning'),
  warn: (message: string) => triggerToast(message, 'warning'),
  info: (message: string) => triggerToast(message, 'info'),
});