> **Ámbito: GLOBAL.** Este documento es la evidencia detrás de
> `~/.claude/rules/ui-forms-and-modals.md`, que aplica a TODO proyecto.
> Nació de un rediseño de García Lorca (sep-2026), así que las secciones
> "Implicación para García Lorca" son el ejemplo trabajado, no el límite:
> léelas como la aplicación concreta de una regla que aplica en general.

# Investigación: modales, cajones y formularios de alta (2024–2026)

**Verificado:** 2026-10-09 · **Revisar antes de:** 2027-01-07 · Investigación original
2026-09-15; la §7 (actualización 2026-10-09) **prevalece** sobre las secciones anteriores
donde las contradiga.

**Contexto.** App web de gestión escolar en español, usada en escritorio por personal
administrativo no técnico —con frecuencia gente mayor— que captura registros repetitivos
(ciclos, niveles, días festivos, actividades, tabuladores de colegiatura). Hoy **toda** el
alta ocurre en un cajón lateral derecho. Meta del dueño: menos clics, máxima claridad,
"que no se vea amontonado".

Cada afirmación lleva fuente; lo que es juicio mío va marcado como
*criterio profesional, sin fuente*.

---

## 1. Estado del arte de modales, diálogos y cajones

El consenso 2024–2026 es uniforme: **el modal es para tareas cortas, no para capturar
registros.**

- **NN/g** admite modales para advertencias críticas y para pedir información crítica para
  continuar el proceso, pero si la tarea "requiere múltiples pasos, probablemente justifica
  dedicarle una página completa". Cierra con: *"no one likes to be interrupted, but if you
  must, make sure it's worth the cost."*
- **GOV.UK** no documenta un componente modal. Su patrón es *question pages* / "one thing
  per page": partir cada pregunta en su propia página porque los usuarios de baja confianza
  lo encuentran más fácil, y maneja mejor errores, ramas y guardado de progreso. Agrupar
  preguntas solo cuando la investigación con usuarios lo respalde.
- **Shopify Polaris**: los modales "pueden ser disruptivos y deben usarse con criterio y de
  forma escasa"; no usarlos para formularios complejos; máximo uno a la vez.
- **IBM Carbon**, el más operativo: cuatro tamaños con **altura máxima por tamaño**; si
  desborda, subir de tamaño, y *"si la altura del modal grande aún no es suficiente,
  entonces probablemente se necesita una página completa"*. El cuerpo hace scroll vertical
  con header y footer fijos; nunca scroll horizontal. Y lo más pertinente para nosotros:
  *"si un usuario necesita realizar una tarea repetidamente, considere hacer la tarea
  completable en la página principal"*.
- **Material 3** manda el *full-screen dialog* justo para tareas complejas y formularios con
  muchos campos. **Apple HIG**: *"Aim to keep modal tasks simple, short, and narrowly
  focused."* **Atlassian** define el modal como "tarea de corto plazo": ancho fijo, altura
  según contenido, y a partir de cierto umbral el cuerpo hace scroll con header y footer
  fijos.
- **AWS Cloudscape** es el único que documenta el alta completa (*single page create*):
  sección primaria corta, "one-click to create" con buenos defaults, el resto en una sección
  expandible, y **simetría de datos** — el orden de los campos se reutiliza como orden de
  columnas de la tabla.
- **GitHub Primer**: el cajón es una *posición* del mismo `Dialog` (`position="right"`,
  bottom-sheet en viewport angosto), no un componente aparte.

**Implicación para García Lorca**
- El cajón se queda **solo** para altas de ≤ ~6 campos (festivo, actividad, nivel).
- Ciclo escolar y tabulador de colegiaturas pasan a **página propia** con breadcrumb y
  título "Crear ciclo escolar".
- Altura máxima al cajón, scroll **solo** en el cuerpo: encabezado y footer siempre fijos.
- Prohibido el scroll horizontal; si no cabe, es señal de que va a página.
- Un solo cajón/modal a la vez; nunca anidados.
- El orden de campos del alta = el orden de columnas de la tabla del módulo.

---

## 2. Formularios: velocidad y reducción de errores

- **Una columna.** Baymard: los layouts multicolumna hacen que los participantes "completen
  campos innecesarios o no relacionados" o "se salten u omitan campos requeridos", porque
  las columnas "jalan la atención en múltiples direcciones". Única excepción: 2–3 campos en
  una misma línea cuando pertenecen a la **misma entidad lógica** (ciudad/estado/CP,
  vencimiento/CVV) — distinto de un layout de dos columnas, que "nunca se recomienda". Esto
  condena el `column-count: 2` actual: el flujo tipo periódico manda el campo 5 arriba a la
  derecha y rompe el orden de lectura y de tabulación (*lo del tab order es criterio
  profesional, sin fuente*).
- **Etiqueta arriba del campo.** Penzo (2006, eye-tracking): con la etiqueta encima el ojo
  salta al campo en ~50 ms, **10× más rápido** que con etiquetas a la izquierda. Matiz
  honesto: Das et al. (2008) no reprodujo la diferencia de velocidad; lo que sobrevive es
  que la asociación etiqueta–campo debe ser obvia.
- **Validación al salir del campo, no al teclear.** Wroblewski/Etre (A List Apart, 2009,
  estudio pequeño — no es de Baymard): **+22% éxito, −22%
  errores, +31% satisfacción, −42% tiempo de captura, −47% fijaciones oculares**. Baymard
  precisa el *cuándo*: validar en `blur` o al alcanzar la longitud correcta; validar
  mientras se teclea produce el clásico *"why are you telling me my email address is wrong,
  I haven't had a chance to fill it all out yet!"*. El error debe borrarse **al instante**
  (nivel de tecla) cuando el dato ya es válido.
- **Divulgación progresiva** (Nielsen): mostrar de entrada solo lo importante; el mero hecho
  de que algo aparezca al inicio le comunica al usuario que importa.
- **Defaults** (Cloudscape): buenos valores por defecto en tantos campos como sea posible,
  para que baste presionar Crear.

**Implicación para García Lorca**
- Eliminar `column-count: 2`. Una sola columna, sin excepción.
- Pares horizontales solo para fecha inicio / fecha fin y monto / moneda.
- Etiqueta visible arriba del campo, siempre. Cero placeholder como etiqueta.
- Validar en `blur`; limpiar el error por tecla en cuanto el valor sea válido.
- Sección "Opciones avanzadas" colapsada para lo que no necesita el 80% de los casos.
- Precargar defaults: ciclo activo, nivel del contexto, fecha de hoy, moneda MXN.

---

## 3. "Menos clics": lo que funciona y lo que no

- **La regla de los 3 clics es falsa.** NN/g: "no ha sido respaldada por datos en ningún
  estudio publicado"; el estudio de Porter (UIE) mostró que el abandono **no** aumenta más
  allá de 3 clics ni baja la satisfacción, y hubo usuarios que visitaron hasta 25 páginas
  antes de terminar. Lo que importa es el olor a información: etiquetas claras y caminos
  organizados. Corolario: "menos clics" debe leerse como **menos decisiones y menos
  esperas**, no como meter todo en una pantalla.
- **Edición en línea en tabla.** Cloudscape la recomienda "en vistas donde la información se
  actualiza con frecuencia". Requisitos que documenta: indicación visual de celda editable,
  validación contextual, poder guardar o descartar, botón de refrescar, y **desordenar la
  columna** al editar con orden activo para que la fila no se le desaparezca al usuario.
- **"Guardar y agregar otro".** Salesforce lo estandariza como *Save & New*. El patrón
  *add another thing* de DWP/GOV.UK, con investigación detrás, prefiere lista-resumen +
  "agregar otro" sobre clonar campos en pantalla, porque clonar "causa problemas de
  rendimiento y validación y dificulta corregir errores".
- **Deshacer en vez de confirmar.** Tendencia documentada: ejecutar y ofrecer *undo*; la
  interfaz no duda del usuario y este no sale de su flujo. El diálogo se reserva para lo
  destructivo o irreversible (Carbon: *danger modal*).
- **Teclado primero.** El command palette (Cmd/Ctrl+K) es el patrón 2026 para herramientas
  donde se repite la misma tarea decenas de veces al día. Pero es una **afordancia oculta**:
  acelerador para el experto, nunca el único camino (*criterio profesional, sin fuente*).

**Implicación para García Lorca**
- Botón secundario **"Guardar y crear otro"** en todo alta repetitiva: conserva ciclo/nivel,
  limpia el resto, devuelve el foco al primer campo.
- Fila "+ Agregar" editable en línea en tabulador de colegiaturas y calendario de festivos.
- Enter envía; Cmd/Ctrl+Enter envía desde cualquier campo; Esc cierra, con confirmación solo
  si hay cambios sin guardar.
- Borrado sin diálogo + toast "Deshacer" (≥ 8 s) para lo reversible; diálogo solo para
  irreversibles (cerrar ciclo, eliminar tabulador con cargos).
- No vender "3 clics": vender orden de lectura único, defaults y un solo botón primario.

---

## 4. Accesibilidad y usuarios no expertos

- **WAI-ARIA APG, patrón dialog (modal).** `role="dialog"` + `aria-modal="true"`; etiquetado
  con `aria-labelledby` al título visible. Tab/Shift+Tab **ciclan dentro** del diálogo; Esc
  cierra; al abrir el foco entra al diálogo; al cerrar, *"el foco regresa al elemento que
  invocó el diálogo"*. Marcarlo modal solo si el código realmente bloquea el fondo **y** el
  estilo lo oscurece.
- **WCAG 2.2**, criterios nuevos que muerden aquí:
  **2.4.11 Focus Not Obscured (AA)** — "cuando un componente recibe el foco del teclado, el
  componente no queda enteramente oculto por contenido creado por el autor"; falla típica:
  footers fijos, exactamente el footer pegajoso del cajón.
  **3.3.7 Redundant Entry (A)** — no volver a pedir datos ya capturados en el proceso.
  **2.5.8 Target Size (AA)** y **3.3.8 Accessible Authentication (AA)**.
- **Usuarios mayores.** NN/g (3 rondas en 18 años, 123 participantes de 65+): la capacidad
  de usar sitios web **decae ~0.8% por año entre los 25 y los 60**. Barreras persistentes:
  tipografía chica, objetivos diminutos, formatos de entrada inflexibles y mensajes de error
  poco claros. "Internet es hostil con la gente de mala vista".
- **Densidad.** Cloudscape obliga a que el modo **cómodo sea el default**, porque el
  espaciado reducido "puede dificultar la legibilidad para usuarios con discapacidad visual
  y la interacción con objetivos cercanos para usuarios con discapacidad física".

**Implicación para García Lorca**
- Auditar el cajón contra APG: `aria-modal`, trampa de foco, Esc, foco inicial en el primer
  campo y **retorno de foco** al botón que lo abrió.
- Al mostrar un error, hacer scroll de modo que el campo enfocado quede por encima del
  footer fijo (2.4.11).
- Objetivos ≥ 44×44 px, texto de formulario ≥ 16 px, nada de gris claro en etiquetas.
- Aceptar formatos flexibles en fechas y montos (con o sin separadores, "/" o "-").
- Densidad cómoda por default; compacta solo como preferencia guardada.
- No re-preguntar el ciclo dentro del cajón si ya está elegido en la pantalla (3.3.7).

---

## 5. Tendencias visuales 2026 para superficies de captura

**Ayuda medible:** una columna con etiqueta arriba (§2); densidad configurable con default
cómodo (Cloudscape); sección primaria corta + "configuración adicional" expandible
(Cloudscape, que es divulgación progresiva aplicada al alta); y el side/bottom sheet como
*posición* de un mismo diálogo accesible (Primer), no tres implementaciones.

**Decoración, o peor.** **Glassmorphism**: NN/g reconoce que funciona en los sistemas de
Apple y Microsoft y sobre todo en realidad mixta, pero advierte que produce "problemas de
legibilidad del texto, con el texto demasiado claro o demasiado oscuro o fondos demasiado
ocupados", y que los componentes translúcidos se ven afectados de forma impredecible por lo
que tienen detrás; el modo oscuro **expone** esa debilidad. Un panel de vidrio sobre una
tabla de 400 alumnos es ruido con contraste variable: no va detrás de un formulario. El
blur progresivo y las metáforas espaciales en escritorio son adorno; el movimiento sirve
solo para comunicar de dónde salió el cajón y para el toast de deshacer; el modo oscuro es
legítimo como preferencia pero no es lo que pide el usuario real y duplica el costo de
validar contraste (*los tres últimos: criterio profesional, sin fuente*).

**Implicación para García Lorca**
- Cero translucidez o blur en fondos de formulario: superficie sólida, borde definido,
  sombra discreta.
- Tipografía: etiqueta 14 px semibold, input 16 px, ayuda 13 px con contraste ≥ 4.5:1.
- Motion solo en dos lugares: entrada/salida del cajón (≤ 200 ms) y toast de deshacer.
- Una preferencia de densidad por usuario, cómoda por default.
- Posponer modo oscuro hasta después de la entrega.

---

## 6. Qué NO hacer

1. **Modal dentro de modal / cajón dentro de cajón.** Polaris: máximo uno a la vez. Apple:
   tarea modal simple, corta y enfocada.
2. **Flujo periodístico de dos columnas (`column-count`)** — campos omitidos y campos
   innecesarios llenados (Baymard).
3. **Modal con scroll y botón Guardar escondido abajo.** Carbon: cuerpo con scroll, header y
   footer fijos; si aun así no cabe, página completa.
4. **Botón de envío deshabilitado hasta que todo sea válido.** Adam Silver y GOV.UK: bajo
   contraste, no recibe foco de teclado, y al corregir uno de varios errores el botón sigue
   apagado y la interfaz se siente rota. Cloudscape lo pone como regla:
   *"Don't disable the primary button, even if the user has not completed the required
   inputs."*
5. **Placeholder como etiqueta.** NN/g: carga la memoria de corto plazo, impide revisar antes
   de enviar, complica corregir, se confunde con datos autocompletados y no todos los
   lectores de pantalla lo anuncian.
6. **Validar mientras se teclea** (Baymard): le grita al usuario antes de que termine y lo
   entrena a ignorar los mensajes.
7. **Diálogo de confirmación para todo.** NN/g: usarlos para cualquier cosa entrena a la
   gente a descartarlos por reflejo, incluidos los que sí importan.
8. **Texto en los márgenes del modal** (Carbon: *"labels or text of any kind should never be
   in the modal margins"*) y **scroll horizontal** dentro del modal.

**Implicación para García Lorca**
- Barrer `column-count` de todo el CSS de formularios.
- Quitar la lógica de `disabled` del botón primario: validar al enviar y enfocar el primer
  campo con error.
- Quitar todo `placeholder` que hoy sustituya a una etiqueta.
- Footer fijo con un primario, un secundario ("Guardar y crear otro") y Cancelar como texto.
- Regla de arquitectura: si un alta necesita más de ~8 campos o scroll, se convierte en
  página. El cajón no crece.

---

## 7. Actualización 2026-10-09 (prevalece sobre lo anterior)

Verificación contra fuentes primarias. "Leída" = página abierta directamente;
"fragmento" = solo texto indexado por el buscador.

- **`<dialog>` nativo + `showModal()`** — Baseline ampliamente disponible desde 2022-03. Da
  top layer, fondo inerte y cierre con Esc; la especificación WHATWG guarda el elemento
  enfocado previo y le **regresa el foco** al cerrar. Foco inicial: el elemento con
  `autofocus`. Scott O'Hara (2023): el nativo "llegó al punto de inflexión" y en general es
  la mejor opción. La APG sigue describiendo solo el patrón ARIA hecho a mano (foco al primer
  elemento; a un encabezado estático con `tabindex="-1"` si el contenido es largo). *Leídas:
  MDN, WHATWG, APG, O'Hara.* → La regla pasa a "nativo primero".
- **`closedby`** — NO es Baseline (Safari estable sin soporte). **`command`/`commandfor`** —
  Baseline 2025, nuevo, desde 2025-12. **`inert`** — Baseline desde 2023-04.
  **`:user-invalid` / `:user-valid`** — Baseline desde 2023-11; aplican solo después de que
  el usuario interactuó o intentó enviar (no se verificó el disparo por blur en cada motor).
  **`field-sizing: content`** — Baseline 2026, nuevo, desde 2026-06. *Leídas: MDN.*
- **Tamaño de objetivo** — WCAG 2.2 · 2.5.8 (AA) = 24×24 CSS px con 5 excepciones;
  2.5.5 (AAA) = 44×44. Los 44 px de la regla son elección propia por usuarios mayores, no
  requisito AA. *Leídas: W3C Understanding.*
- **WCAG 3.0** — sigue en Working Draft (último 2026-03-03). *Fragmento.*
  **EN 301 549 V4.1.1** — publicada 2026-09-02, pasa a WCAG 2.2 AA; Deque espera la cita en
  el Diario Oficial de la UE ~2026-11-30 (meta, no confirmada); mientras, rige V3.2.1
  (WCAG 2.1). *Leída: Deque.* La European Accessibility Act aplica desde 2025-06-28
  (*sin fuente abierta en esta sesión*).
- **Resumen de errores (GOV.UK)** — siempre arriba, con el foco movido a él; cada error
  enlaza a su campo; los mensajes en línea se quedan con el mismo texto, prefijo oculto
  "Error:" y `aria-describedby`; anteponer "Error: " al título de la página. *Leídas.*
- **Botón deshabilitado y doble envío** — GOV.UK: evitar botones deshabilitados; usar
  `data-prevent-double-click` (ignora el segundo clic) más una protección en el servidor.
  Cloudscape: *"Don't apply disabled state to a form submission button."* Según la
  especificación HTML, el envío implícito con Enter no ocurre si el botón por defecto está
  deshabilitado. *Leídas.*
- **Toast con "Deshacer"** — Carbon: los toasts con acción "persisten hasta que el usuario
  los cierra". Material 3: un snackbar con acción no se cierra solo (*vía la nota de cambio
  de Flutter 3.38; la página de M3 no se pudo leer*). O'Hara: `role="status"`, evitar
  controles dentro del toast, la pausa al pasar el mouse o al enfocar no le sirve al cursor
  virtual de un lector de pantalla (WCAG 2.2.1); poner "Deshacer" también en un lugar
  persistente. *Leídas.* → Reemplaza el "toast ≥ 8 s" de la §3.
- **Momento de validar — no hay consenso.** Baymard (2024-01): validar en blur (o al
  completar la longitud); después del primer error, revalidar por tecla y limpiarlo en
  cuanto sea válido. GOV.UK: *"Do not validate when the user moves away from a field"*,
  solo al enviar. *Leídas.* → Decisión del dueño (2026-10-09): **híbrido** — obligatorio
  vacío solo al enviar; error de formato en blur una vez que el campo tiene valor; resumen
  de errores siempre al enviar.
- **Enter** — por la especificación HTML, Enter envía desde campos de una línea a través
  del botón por defecto; en `textarea` inserta salto de línea. Cmd/Ctrl+Enter es solo
  convención, sin fuente de estándar.
- **Modal vs. cajón vs. página (2025–2026)** — no se encontraron cambios nuevos de NN/g ni
  de los sistemas de diseño; sin verificar.
- **Umbral del cajón** — decisión del dueño (2026-10-09): cajón/modal para 5–6 campos (antes
  la regla decía 5–8, lo que contradecía la §1 de este documento).

### Fuentes de la §7
- MDN — `<dialog>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- WHATWG — The dialog element: https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
- Scott O'Hara — Use the dialog element (reasonably): https://www.scottohara.me/blog/2023/01/26/use-the-dialog-element.html
- MDN — `closedBy`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/closedBy
- MDN — Invoker Commands API: https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API
- MDN — `inert`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
- MDN — `:user-invalid`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:user-invalid
- MDN — `field-sizing`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing
- W3C — Understanding SC 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C — Understanding SC 2.5.5 Target Size (Enhanced): https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
- W3C — WCAG 3 news (2026-03-03): https://www.w3.org/WAI/news/2026-03-03/wcag3
- Deque — EN 301 549 V4.1.1 is final: https://www.deque.com/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/
- GOV.UK — Error summary: https://design-system.service.gov.uk/components/error-summary/
- GOV.UK — Error message: https://design-system.service.gov.uk/components/error-message/
- GOV.UK — Button (prevent double click): https://design-system.service.gov.uk/components/button/
- GOV.UK — Validation pattern: https://design-system.service.gov.uk/patterns/validation/
- Cloudscape — Disabled and read-only states: https://cloudscape.design/patterns/general/disabled-and-read-only-states/
- WHATWG — Implicit submission: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission
- Carbon — Notification pattern: https://carbondesignsystem.com/patterns/notification-pattern/
- Flutter — SnackBar with action behavior update: https://docs.flutter.dev/release/breaking-changes/snackbar-with-action-behavior-update
- Scott O'Hara — A toast to a11y toasts: https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html

---

## Fuentes

- NN/g — Modal & Nonmodal Dialogs: When (& When Not) to Use Them: https://www.nngroup.com/articles/modal-nonmodal-dialog/
- NN/g — The 3-Click Rule for Navigation Is False: https://www.nngroup.com/articles/3-click-rule/
- NN/g — Placeholders in Form Fields Are Harmful: https://www.nngroup.com/articles/form-design-placeholders/
- NN/g — Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g — Usability for Senior Citizens: https://www.nngroup.com/articles/usability-for-senior-citizens/
- NN/g — Glassmorphism: Definition and Best Practices: https://www.nngroup.com/articles/glassmorphism/
- GOV.UK Design System — Question pages: https://design-system.service.gov.uk/patterns/question-pages/
- GOV.UK Design Notes — One thing per page: https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/
- DWP Design System — Add another thing: https://design-system.dwp.gov.uk/patterns/add-another-thing/how-it-works
- Baymard Institute — Avoid Extensive Multicolumn Layouts: https://baymard.com/blog/avoid-multi-column-forms
- Baymard Institute — Usability Testing of Inline Form Validation: https://baymard.com/blog/inline-form-validation
- LukeW — Testing Real Time Feedback in Web Forms (estudio con Etre): https://www.lukew.com/ff/entry.asp?883=
- A List Apart — Inline Validation in Web Forms: https://alistapart.com/article/inline-validation-in-web-forms/
- Effortmark (Caroline Jarrett) — Label placement in forms: what's best? (Penzo 2006; Das et al. 2008): https://www.effortmark.co.uk/label-placement-forms-whats-best/
- IBM Carbon Design System — Modal, Usage: https://carbondesignsystem.com/components/modal/usage/
- Shopify Polaris — Modal: https://polaris.shopify.com/components/deprecated/modal
- Shopify — Using modals in your app (App Bridge): https://shopify.dev/docs/api/app-bridge/using-modals-in-your-app
- Atlassian Design System — Modal dialog, Usage: https://atlassian.design/components/modal-dialog/usage
- Material Design 3 — Dialogs: https://m3.material.io/components/dialogs/overview
- Apple Human Interface Guidelines — Modality: https://developer.apple.com/design/human-interface-guidelines/modality
- GitHub Primer — Dialog (side sheet / responsive positioning): https://primer.style/product/components/dialog/
- AWS Cloudscape — Single page create: https://cloudscape.design/patterns/resource-management/create/single-page-create/
- AWS Cloudscape — Inline edit: https://cloudscape.design/patterns/resource-management/edit/inline-edit/
- AWS Cloudscape — Density settings: https://cloudscape.design/patterns/general/density-settings/
- W3C WAI-ARIA APG — Dialog (Modal) Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- W3C — Understanding WCAG 2.2: https://www.w3.org/WAI/WCAG22/Understanding/
- W3C — Understanding SC 2.4.11 Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- Adam Silver — The problem with disabled buttons and what to do instead: https://adamsilver.io/blog/the-problem-with-disabled-buttons-and-what-to-do-instead/
- Adrian Roselli — Don't Disable Form Controls: https://adrianroselli.com/2024/02/dont-disable-form-controls.html
- Salesforce Dictionary — Save & New: https://salesforcedictionary.com/terms/save-new
- Josh Wayne — Confirm or undo? Which is the better option?: https://joshwayne.com/posts/confirm-or-undo/
- UX Patterns for Developers — Command Palette: https://uxpatterns.dev/patterns/advanced/command-palette

### Nota de método

No se pudo extraer el texto completo de la página *usage* de Atlassian, de la guía de
diálogos de Material 3 ni de Apple HIG (SPAs que bloquean la extracción); lo citado de esas
tres proviene de fragmentos indexados verificados por búsqueda, no de la lectura completa
de la página. Todo lo demás se leyó directo de la fuente.
