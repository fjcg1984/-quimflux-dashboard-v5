/* QUIMFLUX — punto único de entrada para UI y estilos del dashboard.
   Vite empaqueta estos recursos juntos para GitHub Pages. */
import './login-fix.css';
import './despachos-crud.css';
import './recepciones.css';
import './dashboard-v6-ui.css';
import './quimflux-theme.css';
import './dashboard-final.css';
import './dashboard-redesign.css';

/*
  La navegación y el contenido funcional pertenecen a main.js.
  Los scripts de UI que reescribían #app/#content o mantenían observers
  redundantes están desactivados para evitar ciclos de renderizado.
  La nomenclatura Entradas/Salidas se resuelve en recepciones.js sin
  añadir otro observer global que recorra todo el DOM.
*/
