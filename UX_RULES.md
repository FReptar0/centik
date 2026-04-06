# UX_RULES.md — MisFinanzas: Reglas de UX/UI

## 1. Principios de Experiencia

- **Registro en 30 segundos:** La operación más frecuente (registrar un gasto) debe completarse en máximo 30 segundos y 4 taps/clicks. Cualquier fricción en este flujo mata la adopción.
- **La información correcta en el momento correcto:** Cada pantalla muestra exactamente lo que el usuario necesita en ese contexto. El Dashboard resume; las páginas internas detallan. No repetir datos entre vistas.
- **Feedback inmediato:** Toda acción del usuario recibe confirmación visual en menos de 200ms. Si una operación toma más tiempo, mostrar un estado de carga.
- **Prevenir errores, no castigarlos:** Validar mientras el usuario escribe, no al enviar. Ofrecer defaults inteligentes. Las acciones destructivas requieren confirmación explícita.

---

## 2. Arquitectura de Información

### 2.1 Jerarquía de Navegación

```
Dashboard         → Vista general, KPIs, gráficas, últimos movimientos
├── Movimientos   → Registro y listado de transacciones (core loop)
├── Deudas        → Estado actual de deudas con métricas
├── Presupuesto   → Configuración y avance por categoría
├── Ingresos      → Fuentes de ingreso configuradas
├── Activos       → Inversiones y activos en unidades de valor (v2.0)
├── Historial     → Resumen anual mes a mes
└── Configuración → Categorías, unidades de valor (v2.0)
```

### 2.2 Regla del Contexto Financiero

En cualquier pantalla de la app, el usuario debe poder responder estas preguntas sin navegar a otra vista:

- **Dashboard:** "¿Cómo voy este mes?" → KPIs + gráficas
- **Movimientos:** "¿En qué gasté?" → Lista filtrable + registro rápido
- **Deudas:** "¿Cuánto debo y a quién?" → Cards con métricas por deuda
- **Presupuesto:** "¿Me estoy pasando?" → Barras de progreso por categoría
- **Ingresos:** "¿Cuánto gano?" → Fuentes con equivalente mensual
- **Historial:** "¿Cómo me fue en el año?" → Tabla pivote 12 meses

---

## 3. Layout y Navegacion

### 3.1 Sidebar (Desktop >=1024px)

- Ancho fijo: 240px
- Posicion: fixed, altura completa
- Fondo: `--color-surface` (#0A0A0A)
- Contenido: logo/nombre arriba, items de navegacion al centro, info secundaria abajo
- Item activo: fondo `--color-accent` al 15% de opacidad y texto en `--color-accent` (chartreuse)
- Items inactivos: `--color-text-secondary` (#999999), hover cambia a `--color-text-primary`
- Label visible en cada item (no colapsar a solo iconos en desktop)

### 3.2 Bottom Tab Bar (Mobile <768px)

- Posicion: fixed bottom, altura 64px
- Fondo: `--color-surface` (#0A0A0A)
- 5 items: Inicio, Movimientos, Deudas, Presupuesto, Mas
- **Icon-only:** sin text labels debajo de los iconos. Iconos de 20px en `--color-text-secondary` (#999999) para items inactivos
- **Indicador activo:** dot de 4px en `--color-accent` (chartreuse) posicionado 8px debajo del icono activo. El icono NO cambia de color al estar activo — solo el dot comunica el estado. Referencia cruzada: STYLE_GUIDE.md > Identidad Visual > Status Dot para la especificacion del dot y su animacion `status-pulse` de 2.5s
- **FAB separado:** boton circular de 48px con fondo `--color-accent` (chartreuse), texto/icono en negro puro (#000000), posicionado flotando sobre el centro del tab bar. Exclusivamente para creacion de transacciones
- **Overflow "Mas":** al hacer tap en el icono "Mas" se abre un bottom sheet (siguiendo la spec de STYLE_GUIDE.md > Componentes Base > Modales > Mobile) con los items restantes: Ingresos, Historial, Categorias, Configuracion. Cada item muestra icono (20px) + label en nivel Body (14px, `--color-text-primary`). El sheet se cierra al seleccionar un item o con gesto de deslizar hacia abajo

### 3.3 Header de Pagina

Cada pagina tiene un header consistente:
- Titulo de la pagina en nivel Heading (20px, Satoshi Semibold) en `--color-text-primary`
- Subtitulo con el periodo actual ("Abril 2026") en `--color-text-secondary`
- Accion principal a la derecha (ej: boton "Registrar" en Movimientos, "Editar" en Presupuesto)

### 3.4 Indicador de Periodo

- Visible en el header, muestra el mes/ano actual
- En movil: tap para abrir selector de periodo
- El periodo actual tiene un status dot (4px, `--color-accent`, pulsando segun animacion `status-pulse` de 2.5s) junto al nombre del periodo para senalar "periodo en vivo". Referencia cruzada: STYLE_GUIDE.md > Identidad Visual > Status Dot
- Los periodos cerrados se muestran con un icono de candado
- Al seleccionar un periodo cerrado, la UI entra en modo solo lectura (botones de accion deshabilitados, banner informativo)

---

## 4. Patrones de Interacción

### 4.1 Registro Rapido de Transaccion

Este es el flujo mas critico de toda la app. Debe completarse en menos de 30 segundos y 4 taps.

**Flujo optimo (4 pasos):**

1. **Tap en FAB circular chartreuse** → Abre bottom sheet (85% de la pantalla, desliza hacia arriba).
   - Spec: drag handle (40px ancho, 4px alto, `--color-border-divider`) centrado en la parte superior.
   - Boton X en esquina superior izquierda para cerrar. Boton "GUARDAR" en esquina superior derecha en `--color-accent` (chartreuse), nivel Label (12px, uppercase, letter-spacing +2px).
   - Referencia cruzada: STYLE_GUIDE.md > Componentes Base > Modales > Mobile (bottom sheet) para la spec completa del contenedor.

2. **Area hero de monto con dot-matrix:**
   - Zona superior del sheet con fondo textura dot-matrix. Referencia cruzada: STYLE_GUIDE.md > Identidad Visual > Textura Dot-Matrix para la implementacion del patron SVG de 8x8px.
   - Input de monto grande, monoespaciado (IBM Plex Mono, nivel Display ~36px), "$" silenciado en `--color-text-tertiary` a tamano menor. Digitos en `--color-text-primary` (#E8E8E8).
   - Debajo del monto: toggle pills Gasto/Ingreso (default: Gasto). Estilo: referencia cruzada a STYLE_GUIDE.md > Componentes Base > Buttons > Toggle pills. Activo: fondo chartreuse con texto negro. Inactivo: ghost/transparente con texto `--color-text-secondary`.

3. **Selector de categoria circular con ring de acento:**
   - Layout: grid de 4 columnas x 2 filas para las 8 categorias default. Grid fijo porque todas las opciones son visibles simultaneamente — sin opciones ocultas detras de scroll.
   - Cada categoria: icono circular (40px) con contenedor de color de categoria al 12% de opacidad. Label debajo en nivel Meta (11px, `--color-text-secondary`). Referencia cruzada: STYLE_GUIDE.md > Iconografia > Contenedores de Icono para spec de tamano y color.
   - Estado seleccionado: ring de 2px en `--color-accent` (chartreuse) alrededor del circulo del icono.

4. **Custom dark numpad** (debajo del grid de categorias):
   - Grid layout: 4 columnas x 4 filas.
   - Row 1: `1`, `2`, `3`, backspace icon (Lucide `Delete`)
   - Row 2: `4`, `5`, `6`, `.` (punto decimal)
   - Row 3: `7`, `8`, `9`, `00`
   - Row 4: vacio, `0`, vacio, vacio
   - Superficie: teclas en `--color-surface-elevated` (#141414) sobre fondo `--color-surface` (#0A0A0A).
   - Key specs: min touch target 48px, font IBM Plex Mono nivel Heading (20px), `--color-text-primary`.
   - Key press feedback: background `--color-surface-hover` (#1A1A1A), transition 100ms.

**Campos opcionales:**
- Colapsados por default en una seccion "Mas detalles" debajo del numpad.
- Descripcion, forma de pago, notas, fecha (default: hoy).
- Inputs estilo underline-only con floating labels. Referencia cruzada: STYLE_GUIDE.md > Componentes Base > Inputs.

**Comportamiento al guardar:**
- Tap "GUARDAR" → breve checkmark animation (200ms): el texto del boton transiciona a un icono check (Lucide `Check`) en `--color-positive`, luego el sheet se cierra con animacion slide-down (300ms).
- Toast de confirmacion aparece: formato "Comida -$150.00" con icono check. Referencia cruzada: seccion 8.1 Toasts para posicion y duracion.
- Si la lista de movimientos esta visible, el nuevo item aparece con efecto pixel-dissolve (revelacion por scanlines). Referencia cruzada: STYLE_GUIDE.md > Identidad Visual > Micro-Animacion Pixel-Dissolve.

### 4.2 Edición Inline vs Modal

- **Inline editing:** Para cambios simples de un solo valor (actualizar saldo de deuda, cambiar monto de presupuesto). El usuario hace click en el valor, se transforma en input, Enter o blur para guardar, Esc para cancelar.
- **Modal:** Para crear/editar entidades completas (transacciones, deudas, fuentes de ingreso). Formulario completo con botones Guardar/Cancelar.

### 4.3 Eliminación y Acciones Destructivas

- Eliminar siempre requiere confirmación
- Formato: inline confirmation — el botón cambia a "¿Seguro? Confirmar / Cancelar" en lugar de abrir un modal de confirmación
- Auto-revert: si no se confirma en 3 segundos, vuelve al estado original
- Las acciones de eliminar nunca están al alcance accidental del pulgar en móvil (no junto al botón de editar)

### 4.4 Filtros y Búsqueda

- En Movimientos: barra de filtros horizontal con chips por categoría (multi-select) + selector de rango de fechas + tipo (gasto/ingreso)
- Los filtros activos se muestran como chips con botón X para remover
- "Limpiar filtros" visible cuando hay filtros activos
- La URL refleja los filtros aplicados (query params) para permitir compartir o bookmark

### 4.5 Listas y Scrolling

- Las listas largas usan scroll virtual o paginación (no cargar más de 50 items a la vez)
- Pull-to-refresh en móvil para actualizar datos
- Sticky header en tablas para que los encabezados de columna siempre sean visibles
- Skeleton loading para items que están cargando (no spinners genéricos)

---

## 5. Estados de UI

### 5.1 Empty States

Cuando una seccion no tiene datos, mostrar:
- Icono (24px) en `--color-text-tertiary` relacionado a la seccion. Referencia: STYLE_GUIDE.md > Iconografia > Tamanos.
- Texto descriptivo corto explicando que va aqui
- CTA (boton pill primary) para la accion que resuelve el estado vacio. Referencia: STYLE_GUIDE.md > Componentes Base > Buttons.

Ejemplo para Movimientos sin transacciones:
```
[icono Receipt, 24px, --color-text-tertiary]
"Sin movimientos este mes"
[Boton pill: "Registrar primer movimiento"]
```

No dejar secciones en blanco. Un empty state bien disenado guia al usuario.

### 5.2 Loading States

- **Page level:** Skeleton screens que replican la estructura de la pagina (shapes en `--color-surface-elevated` pulsando, barras de texto placeholder)
- **Component level:** Skeleton del componente especifico (ej: chart area con gradiente pulsante en `--color-surface-elevated`)
- **Inline:** Para actualizaciones de datos parciales, atenuar el contenido al 50% de opacidad con `pointer-events: none`
- **Buttons:** Al procesar, el boton muestra spinner inline (16px) y deshabilita el click. El texto cambia a "Guardando..." o similar

### 5.3 Error States

- **Form validation:** Mensaje de error debajo del input en `--color-negative`, nivel Meta (11px). La linea inferior del input cambia a `--color-negative`. Referencia: STYLE_GUIDE.md > Componentes Base > Inputs > Estado error.
- **API errors:** Toast notification con fondo `--color-negative-subtle`, duracion 5 segundos, con boton "Reintentar" si aplica
- **Not found:** Pantalla completa con empty state y CTA para volver

### 5.4 Success States

- **Mutations (crear/editar/eliminar):** Toast notification con fondo `--color-positive-subtle`, duracion 3 segundos
- **Formato del toast:** icono de check + texto corto que confirma la accion ("Gasto registrado: Comida -$150.00")
- No usar modales de exito — son disruptivos para el flujo

---

## 6. Responsive Design

### 6.1 Breakpoints

```
Mobile:    < 768px    → Layout de una columna, bottom tab bar (icon-only, seccion 3.2)
Tablet:    768-1023px → Layout de una columna, sidebar colapsable
Desktop:   >=1024px   → Sidebar fija + contenido principal
```

### 6.2 Adaptaciones por Breakpoint

**Dashboard KPIs:**
- Mobile: Grid de 2 columnas
- Tablet: Grid de 3 columnas
- Desktop: Grid de 3-4 columnas (flex-wrap)
- KPI cards usan `--color-surface-elevated` con padding 24px. Montos en IBM Plex Mono (`--font-mono`). Referencia: STYLE_GUIDE.md > Componentes Base > Cards.

**Graficas:**
- Mobile: Apiladas verticalmente, ancho completo
- Desktop: Grid de 2 columnas donde la composicion lo permita
- Graficas sin grid lines, stroke 1.5px, puntos solidos de 4px en endpoints. Referencia: STYLE_GUIDE.md > Componentes Base > Charts.

**Tablas:**
- Mobile: Convertir a card list (cada fila se vuelve una card vertical). Cards sin bordes, fondo `--color-surface-elevated`. Referencia: STYLE_GUIDE.md > Componentes Base > Cards.
- Desktop: Tabla horizontal estandar. Headers en nivel Label (12px, uppercase, letter-spacing +2px, `--color-text-secondary`). Referencia: STYLE_GUIDE.md > Componentes Base > Tablas.

**Formularios (modales):**
- Mobile: bottom sheet (85vh) con drag handle, desliza desde abajo. Referencia: STYLE_GUIDE.md > Componentes Base > Modales > Mobile.
- Desktop: modal centrado, max-width 480px, fondo `--color-surface-elevated`, border-radius `--radius-xl` (24px). Referencia: STYLE_GUIDE.md > Componentes Base > Modales > Desktop.
- Todos los inputs: underline-only con floating labels. Referencia: STYLE_GUIDE.md > Componentes Base > Inputs.

**Sidebar:**
- Mobile: Oculta, se muestra como overlay desde la izquierda
- Desktop: Fija, siempre visible

### 6.3 Touch Targets

En movil, todo elemento interactivo tiene un area de tap minima de 44x44px (guideline de Apple). Esto incluye iconos de accion en tablas, botones de navegacion y chips de filtro. Botones pill usan min-height 48px (tamano lg) en mobile para mejor area de tap. Referencia: STYLE_GUIDE.md > Componentes Base > Buttons > Tamanos.

---

## 7. Formularios

### 7.1 Estructura

Todos los inputs usan el patron underline-only con floating labels. Referencia: STYLE_GUIDE.md > Componentes Base > Inputs.

- **Floating label:** La label comienza como texto placeholder sobre la linea en `--color-text-tertiary`. En focus o cuando tiene contenido: la label flota hacia arriba y transiciona a nivel Label (12px, uppercase, letter-spacing +2px, `--color-text-secondary`). Referencia: STYLE_GUIDE.md > Componentes Base > Inputs > Floating labels.
- Gap entre campos: 14px
- Campos opcionales: marcados con "(opcional)" en el label, no con asterisco en los obligatorios
- Agrupacion: separadores de 1px `--color-border-divider` entre grupos de campos relacionados

### 7.2 Validacion

- Validar en blur (cuando el usuario sale del campo) y en change despues del primer error
- No validar en cada keystroke — es molesto
- Mostrar error inmediatamente debajo del campo problematico
- No deshabilitar el boton de submit por errores de validacion — permitir el intento y mostrar todos los errores
- Para montos: aceptar input con o sin comas, normalizar al parsear
- **Estado error:** la linea inferior del input cambia a `--color-negative`. Mensaje de error debajo en nivel Meta (11px, `--color-negative`). Referencia: STYLE_GUIDE.md > Componentes Base > Inputs > Estado error.

### 7.3 Inputs de Monto

- `inputMode="decimal"` para teclado numerico en movil
- Prefijo "$" visual en `--color-text-tertiary` a tamano menor, posicionado al inicio de la linea underline. Estatico, no flota
- Digitos en IBM Plex Mono (`--font-mono`), alineados a la derecha
- Formatear con comas al salir del campo (blur)
- No permitir caracteres no numericos (excepto punto decimal)
- Maximo 2 decimales
- Referencia: STYLE_GUIDE.md > Componentes Base > Inputs > Inputs de montos

### 7.4 Selects y Categorias

- **Listas cortas (< 6 opciones):** radio group visual con botones pill (referencia: STYLE_GUIDE.md > Componentes Base > Buttons > Toggle pills) o grid de botones, no dropdown
- **Categorias de gasto:** grid circular de iconos (4 columnas). Cada icono en contenedor circular de 40px con fondo de color de categoria al 12%. Seleccion: ring de 2px `--color-accent` alrededor del circulo. Label debajo en nivel Meta (11px, `--color-text-secondary`). Referencia: STYLE_GUIDE.md > Iconografia > Contenedores de Icono
- **Listas largas:** dropdown con busqueda integrada

---

## 8. Feedback y Notificaciones

### 8.1 Toasts

- Posición: top-right en desktop, top-center en móvil
- Duración: 3 segundos (éxito), 5 segundos (error)
- Máximo 3 toasts visibles simultáneamente
- Incluyen botón de cerrar (X) manual
- Animación: slide in desde arriba + fade, slide out hacia arriba

### 8.2 Confirmaciones Destructivas

Nunca usar `window.confirm()`. Usar inline confirmation o modal sutil:

**Inline confirmation (preferido para eliminar items en listas):**
```
Estado normal:   [...texto del item...]  [Editar] [Eliminar]
Después de tap:  [...texto del item...]  [¿Eliminar? Sí / No]
```

**Modal confirmation (para acciones con consecuencias mayores como cerrar periodo):**
- Título: pregunta directa ("¿Cerrar el periodo de Abril 2026?")
- Descripción: consecuencia clara ("Las transacciones de este mes quedarán bloqueadas")
- Botones: "Cancelar" (secondary) + "Cerrar Periodo" (danger)

### 8.3 Transiciones y Animaciones

- **Principio:** Las animaciones comunican cambio de estado, no decoran
- Duracion base: 200ms para micro-interacciones, 300ms para cambios de layout, 500ms para progress bars
- Easing: `ease-out` para entradas, `ease-in` para salidas
- Los montos que cambian (KPIs) no animan el numero — el cambio debe ser instantaneo para transmitir precision
- Las barras de progreso (battery-bar) si animan su llenado de segmentos (500ms ease) al cargar datos
- **Modales desktop:** fade in overlay (200ms) + scale container desde 0.95 (200ms ease-out)
- **Modales mobile:** slide-up desde abajo (300ms ease-out). Referencia: STYLE_GUIDE.md > Componentes Base > Modales > Mobile.
- Las cards en listas: no necesitan animacion de entrada en carga normal; al agregar un nuevo item, usar efecto pixel-dissolve (revelacion por scanlines). Referencia: STYLE_GUIDE.md > Identidad Visual > Micro-Animacion Pixel-Dissolve.

---

## 9. Accesibilidad (a11y)

### 9.1 Requisitos Minimos

- Contraste WCAG AA: los colores de texto sobre fondos oscuros ya cumplen (verificar con herramienta). Referencia: STYLE_GUIDE.md > Paleta de Color > Ratios de contraste verificados.
- Focus visible: todo elemento interactivo tiene un focus ring visible — outline de 2px `--color-accent` con outline-offset de 2px. Sin sombra glow, sin resplandor. Referencia: STYLE_GUIDE.md > Elevacion > Focus Rings.
- Focus order: logico, de arriba-abajo y izquierda-derecha
- Tab navigation: todos los controles son alcanzables por teclado
- Escape cierra modales y dropdowns
- Enter o Space activan botones

### 9.2 Semantica HTML

- Usar `<nav>` para la sidebar y bottom bar
- Usar `<main>` para el contenido principal
- Usar `<section>` con `aria-labelledby` para agrupar secciones del dashboard
- Las tablas usan `<table>`, `<thead>`, `<tbody>`, `<th scope="col">` correctamente
- Los formularios usan `<label>` asociados a inputs con `htmlFor`
- Los iconos decorativos llevan `aria-hidden="true"`
- Los iconos funcionales llevan `aria-label` descriptivo

### 9.3 Screen Readers

- Los montos incluyen `aria-label` con el formato parseable: "$1,500.75" es suficiente
- Las barras de progreso (battery-bar) tienen `role="progressbar"` con `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Los toasts usan `role="status"` y `aria-live="polite"`

---

## 10. Patrones Especificos de Finanzas

### 10.1 Codigo de Color en Montos

Regla universal e inviolable. Todos los montos financieros usan IBM Plex Mono (`--font-mono`) con `font-variant-numeric: tabular-nums`. El signo de peso "$" se renderiza a tamano menor en `--color-text-tertiary` (silenciado). Referencia cruzada: STYLE_GUIDE.md > Tipografia > Numeros Financieros para la especificacion completa del display financiero monoespaciado.

- Monto en `--color-positive` (verde) → dinero que entra o crece (ingresos, ahorro positivo, diferencia favorable)
- Monto en `--color-negative` (rojo) → dinero que sale o se debe (gastos, deuda, diferencia desfavorable)
- Monto en `--color-text-primary` (off-white #E8E8E8) → neutral, sin juicio (saldos informativos, configuracion)
- Monto en `--color-accent` (chartreuse) → proyeccion o estimacion, no es real todavia

### 10.2 Signos en Transacciones

En la lista de movimientos, todos los montos en IBM Plex Mono (`--font-mono`):
- Ingresos: prefijo "+" en `--color-positive`, digitos en `--color-positive`
- Gastos: prefijo "-" en `--color-negative`, digitos en `--color-negative`

En el dashboard y resumenes, no usar signos — el color y la etiqueta comunican la direccion.

### 10.3 Presupuesto: Sistema de Semaforo

Las barras de progreso segmentadas tipo battery-bar cambian de color segun el avance. Referencia cruzada: STYLE_GUIDE.md > Componentes Base > Progress Bars (Battery-Bar) para la especificacion completa de los 10 segmentos rectangulares con gaps de 2px.

```
0% - 79%:   --color-accent (chartreuse)   → "Vas bien"
80% - 99%:  --color-warning (naranja)      → "Cuidado, te acercas"
100%+:      --color-negative (rojo)        → "Te pasaste"
```

El texto del porcentaje adopta el mismo color que los segmentos de la barra. En overflow (100%+), se muestra "+N%" en `--color-negative` a nivel Meta (11px) junto a la battery-bar.

### 10.4 Deudas: Indicadores de Salud

**Utilizacion de tarjeta de credito (display con battery-bar):**
```
0% - 30%:   --color-positive (verde)    → Saludable
31% - 70%:  --color-warning (naranja)   → Precaucion
71%+:       --color-negative (rojo)     → Riesgoso
```

**Ratio deuda/ingreso (display con battery-bar):**
```
0% - 35%:   --color-positive (verde)    → Manejable
36% - 50%:  --color-warning (naranja)   → Elevado
51%+:       --color-negative (rojo)     → Critico
```

Referencia cruzada: STYLE_GUIDE.md > Componentes Base > Progress Bars (Battery-Bar) para la estructura visual de segmentos y colores semaforo.

### 10.5 Periodo Cerrado: Modo Solo Lectura

Cuando el usuario navega a un periodo cerrado:
- Banner informativo arriba del contenido: fondo `--color-info-subtle`, texto `--color-info`, icono de candado, texto "Este periodo esta cerrado. Los datos son de solo lectura."
- Todos los botones de accion (Registrar, Editar, Eliminar) se deshabilitan visualmente (opacity 50%, cursor not-allowed)
- El FAB circular chartreuse se oculta completamente
- Se muestra un boton "Reabrir periodo" discreto (ghost button) en `--color-text-secondary` si el usuario necesita hacer correcciones

---

## 11. Documentos Adicionales Recomendados

Los siguientes documentos complementarían el sistema de diseño y acelerarían el desarrollo. Se listan por orden de impacto:

### 11.1 COMPONENT_CATALOG.md (Recomendado)
Catálogo visual de cada componente con sus variantes, props API, y ejemplos de uso. Funciona como referencia rápida al construir páginas — evita reimplementar componentes y mantiene consistencia. Lo ideal es que cada componente del catálogo tenga un ejemplo en Storybook, pero para MVP un markdown con snippets de código es suficiente.

### 11.2 DATA_FLOW.md (Recomendado)
Documento que mapea cómo fluyen los datos entre las entidades: qué query alimenta cada KPI, qué mutation desencadena qué actualización, cómo se propaga un cambio de saldo al dashboard. Particularmente útil para no dejar datos stale o inconsistentes entre vistas.

### 11.3 CONTRIBUTING.md (Necesario para open source)
Guía de contribución: cómo clonar el repo, levantar el ambiente, estructura de branches, convenciones de commits, proceso de PR, checklist de calidad (lint, tests, a11y). Requerido antes de hacer el repo público.

### 11.4 SEED_DATA.md (Opcional)
Dataset de ejemplo con transacciones ficticias de 3 meses para que al hacer seed la app se vea "viva" y sea más fácil desarrollar y testear las gráficas y el historial. Incluiría categorías variadas, montos realistas para México, y al menos un cierre de periodo.

