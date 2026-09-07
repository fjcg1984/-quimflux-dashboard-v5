/* QUIMFLUX — punto único de entrada para UI y estilos del dashboard.
   Vite empaqueta estos recursos juntos para GitHub Pages. */
import './login-fix.css';
import './despachos-crud.css';
import './recepciones.css';
import './dashboard-v6-ui.css';
import './quimflux-theme.css';
import './dashboard-final.css';
import './dashboard-redesign.css';
import './qf-nomenclatura.js';

/*
  La navegación y el contenido funcional pertenecen a main.js.
  Se mantienen los estilos V6, pero se desactivan los scripts que
  reescribían #app/#content y añadían observers/intervalos redundantes.
  Esto evita conflictos con el renderizado de main.js al cambiar de módulo.
*/
