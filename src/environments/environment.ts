export const environment = {
  production: false,
  // Con `ng serve --proxy-config proxy.conf.json` usar '/api' para evitar CORS.
  // Para apuntar directo al backend, usar 'http://localhost:8080/api'.
  apiBaseUrl: '/api',
};
