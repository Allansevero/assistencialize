
// Este script roda dentro de cada webview antes de qualquer conteúdo do site
window.addEventListener('DOMContentLoaded', () => {
  // Remove a flag de automação que o Google detecta
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });

  // Esconde o Electron
  delete window.Electron;
  delete window.ipcRenderer;
});

// Sobrescreve funções que podem ser usadas para detecção
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications' ?
    Promise.resolve({ state: Notification.permission }) :
    originalQuery(parameters)
);
