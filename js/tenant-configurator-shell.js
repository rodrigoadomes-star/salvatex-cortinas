// A identidade e a navegação do configurador são aplicadas por
// configurador-tenant-identity.js e nav-publico.js. Esta camada apenas evita
// que uma falha de rede mantenha a página oculta indefinidamente.
(() => {
  const reveal = () => document.documentElement.classList.remove('configurator-booting');
  setTimeout(reveal, 2500);
})();
