/* QUIMFLUX — punto único de entrada para UI y estilos. */
import './login-fix.css';
import './despachos-crud.css';
import './recepciones.css';
import './quimflux-theme.css';
import './dashboard-final.css';

/*
  Se eliminan las capas visuales V6/redesign que ya no son utilizadas por
  main.js. Tener varias generaciones de CSS globales cargadas a la vez
  permitía que reglas antiguas compitieran con el shell actual.

  El contenido funcional pertenece a main.js y a los módulos event-driven
  de Entradas/Salidas. No se usan observers ni intervalos globales.
*/
