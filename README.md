# Duelo 3D

Joc original de combat 1 contra 1 en tercera persona, inspirat en els duels de construcció i trets de 1v1.lol. Pots jugar contra un bot o amb una altra persona en una sala privada. Inclou fusell, escopeta, vida i escut, murs, rampes, terres i piràmides, personatges a escala humana amb animació de caminar i controls configurables.

## Jugar en aquest ordinador

Cal Node.js 18 o superior. Des de la carpeta del projecte, executa `npm start` (a Windows també pots fer doble clic a `JUGAR.cmd`) i obre `http://localhost:3000/`. No cal instal·lar dependències: el motor 3D és a `public/assets`.

## Partides amb dues persones

Tots dos jugadors han d'obrir el joc a la mateixa adreça. Un prem **Crear sala online** i comparteix el codi de sis caràcters o l'enllaç; l'altre introdueix el codi. El servidor WebSocket sincronitza posicions, construccions, trets, vida, escut, rondes i puntuació. Pots fer servir dos equips de la mateixa xarxa local amb la IP de l'ordinador que executa el servidor, si el port 3000 és accessible.

Per jugar per internet, publica aquesta carpeta com a servei web Node.js. `render.yaml` prepara un servei gratuït a Render, però Render necessita que el codi sigui en un repositori Git o en una imatge de contenidor accessible. En desplegar-lo, comparteix l'adreça `https://...onrender.com` amb l'altre jugador. La connexió del joc fa servir `wss://` automàticament quan la pàgina és HTTPS.

## Controls

WASD: moure's · ratolí: apuntar · clic esquerre: disparar · espai: saltar · Maj: córrer · 1/2: fusell/escopeta · Q: mur · E: rampa · R: terra · F: piràmide · Esc: pausa. Prem **Canviar controls** per reassignar les tecles, els botons del ratolí i la sensibilitat. Els canvis es guarden al navegador.

## Notes tècniques

La vida baixa amb cada impacte del fusell fins i tot quan queda escut. Els elements construïts bloquegen bales i es poden destruir. La resolució de renderització s'ajusta automàticament per mantenir la fluïdesa. El moviment es calcula al client per respondre de seguida, mentre que el servidor valida trets, dany i construccions; no és un sistema antitrampes competitiu. Els combatents són sprites fotogràfics animats, a escala d'uns 1,8 m, dins d'una arena tridimensional; no són models 3D articulats. Consulta `ASSETS.md` per l'origen dels recursos.

Three.js 0.186.0 es distribueix amb llicència MIT; consulta `public/assets/THREE-LICENSE.txt`.
