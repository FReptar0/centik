# STYLE_GUIDE.md — Centik Design System

## Filosofia de Diseno

La identidad visual de Centik se basa en cuatro principios:

- **Claridad:** La informacion financiera debe ser inmediatamente comprensible. Cada dato tiene un proposito visual claro — color, peso o posicion que comunica si algo es positivo, negativo o neutro sin necesidad de leer etiquetas.
- **Calma:** Las finanzas generan ansiedad. La interfaz debe transmitir control y orden. Fondos oscuros, espaciado generoso, transiciones suaves. Nada parpadea, nada grita.
- **Densidad controlada:** Un dashboard financiero necesita mostrar muchos datos. La solucion no es esconder informacion sino organizarla en jerarquias claras con agrupacion visual consistente.
- **Minimalismo retro-futurista:** Estetica Nothing OS x Bloomberg Terminal x Dieter Rams — calmo, confiado, preciso, ligeramente jugueton en los detalles. OLED negro puro y acento chartreuse como identidad visual central. Sin formas redondeadas excesivas ni UI burbujeante.

---

## Paleta de Color

### Colores Base

```
--color-bg:               #000000    → Negro OLED, fondo principal de la app
--color-surface:          #0A0A0A    → Fondo secundario, sidebar, secciones principales
--color-surface-elevated: #141414    → Cards, contenedores, elementos elevados
--color-surface-hover:    #1A1A1A    → Estado hover en superficies interactivas
--color-border-divider:   #222222    → Bordes, separadores, divisores
--color-dot-matrix:       #1E1E1E    → Textura dot-matrix (usar al 40% de opacidad)
```

### Texto

```
--color-text-primary:   #E8E8E8    → Texto principal, titulos, montos
--color-text-secondary: #999999    → Labels, descripciones, texto de soporte
--color-text-tertiary:  #666666    → Placeholders, metadata, texto silenciado
--color-text-disabled:  #444444    → Estado deshabilitado
```

### Colores Semanticos

```
--color-accent:          #CCFF00                    → Accion principal, links, elementos interactivos (chartreuse)
--color-accent-hover:    #B8E600                    → Hover del acento
--color-accent-subtle:   rgba(204, 255, 0, 0.12)   → Fondos de badges/tags con acento

--color-positive:        #00E676                    → Ingresos, ahorro, tendencia positiva
--color-positive-subtle: rgba(0, 230, 118, 0.12)   → Fondo sutil para contextos positivos

--color-negative:        #FF3333                    → Gastos, deuda, tendencia negativa
--color-negative-subtle: rgba(255, 51, 51, 0.12)   → Fondo sutil para contextos negativos

--color-warning:         #FF9100                    → Alertas, presupuesto cerca del limite
--color-warning-subtle:  rgba(255, 145, 0, 0.12)   → Fondo sutil para warnings

--color-info:            #448AFF                    → Informacion neutral
--color-info-subtle:     rgba(68, 138, 255, 0.12)  → Fondo sutil para info
```

### Colores de Categoria (Desaturados)

Cada categoria tiene un color desaturado asignado que se usa consistentemente en graficas, iconos y badges. Los colores son versiones silenciadas de la paleta original para armonizar con la estetica monocromatica del sistema.

```
Comida:           #C88A5A    → Naranja silenciado (de #fb923c)
Servicios:        #7A9EC4    → Azul silenciado (de #60a5fa)
Entretenimiento:  #9B89C4    → Purpura silenciado (de #a78bfa)
Suscripciones:    #C48AA3    → Rosa silenciado (de #f472b6)
Transporte:       #C4A84E    → Amarillo silenciado (de #fbbf24)
Otros:            #8A9099    → Gris silenciado (de #94a3b8)
```

**Contenedores de icono:** El color de categoria silenciado al 12% de opacidad como fondo, color solido para el icono.

**Acento de categoria principal:** En vistas de presupuesto y dashboard, la card de la categoria con mayor gasto recibe un borde izquierdo sutil en chartreuse (`--color-accent`).

### Reglas de Uso de Color

El color nunca es decorativo. Cada uso de color comunica algo:

- **Verde** (`--color-positive`) aparece exclusivamente donde hay dinero que entra o crece
- **Rojo** (`--color-negative`) aparece exclusivamente donde hay dinero que sale o se debe
- **Chartreuse** (`--color-accent`) es la accion: botones primarios, links, elementos clicables
- **Naranja** (`--color-warning`) es la precaucion: estas cerca de un limite
- **Los colores de categoria** solo aparecen en contextos de categorias (graficas, badges, iconos)

Nunca usar rojo para un boton de accion a menos que sea destructivo (eliminar). Nunca usar verde para decorar si no implica dinero positivo.

**Restricciones visuales:**
- Sin gradientes (excepto oscuro-a-mas-oscuro muy sutil en fondos)
- Sin formas redondeadas tipo blob ni UI burbujeante
- Ratios de contraste accesibles WCAG 2.1 AA obligatorios

**Ratios de contraste verificados:**
- `#E8E8E8` sobre `#000000` = 17.4:1 (supera AAA)
- `#CCFF00` sobre `#000000` = 14.4:1 (supera AAA)
- `#999999` sobre `#000000` = 5.8:1 (supera AA)
- `#666666` sobre `#000000` = 3.7:1 (solo para texto decorativo/terciario, no para contenido esencial)

---

## Elevacion

La jerarquia visual se comunica exclusivamente a traves de cambios de fondo (background-shift). Sin bordes decorativos visibles en cards. Sin sombras.

### Niveles de Profundidad

```
Nivel 0:  --color-bg               (#000000)  → Fondo de pagina
Nivel 1:  --color-surface           (#0A0A0A)  → Sidebar, secciones principales
Nivel 2:  --color-surface-elevated  (#141414)  → Cards, contenedores, modales
Hover:    --color-surface-hover     (#1A1A1A)  → Superficies interactivas al pasar el cursor
```

### Focus Rings

Los anillos de foco usan un outline solido con `--color-accent`. Sin sombra glow, sin resplandor.

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Tokens Eliminados

Los siguientes tokens de sombra han sido eliminados del sistema de diseno:
- ~~--shadow-sm~~ (eliminado)
- ~~--shadow-md~~ (eliminado)
- ~~--shadow-lg~~ (eliminado)
- ~~--shadow-glow~~ (eliminado)

La profundidad se comunica unicamente a traves de la diferencia de luminosidad entre niveles de fondo. Cada nivel es ligeramente mas claro que el anterior, creando una jerarquia visual sutil y elegante.

---

## Tipografia

### Familias Tipograficas

El sistema usa dos familias complementarias:

```
--font-sans: 'Satoshi', system-ui, -apple-system, sans-serif
--font-mono: 'IBM Plex Mono', 'Fira Code', monospace
```

- **Satoshi** — Sans-serif geometrica para titulos, cuerpo de texto y etiquetas. Reemplaza DM Sans. Se carga via `next/font` (local o Google Fonts).
- **IBM Plex Mono** — Monoespaciada para TODOS los numeros financieros en toda la app: tablas, listas, cards, inputs, KPIs, badges. Reemplaza JetBrains Mono. Se carga via `next/font/google` o `next/font/local`.

### Jerarquia de 5 Niveles

| Nivel   | Tamano      | Fuente          | Peso            | Uso                                              |
|---------|-------------|-----------------|-----------------|--------------------------------------------------|
| Display | 36px / 40px | Satoshi Bold    | 700             | Numeros hero en KPIs, totales del dashboard. Maximo 1-2 por pagina. |
| Heading | 20px / 28px | Satoshi Semibold| 600             | Titulos de pagina, headers de seccion, titulos de cards. |
| Body    | 14px / 20px | Satoshi Regular/Medium | 400 o 500 | Texto principal, descripciones, contenido de tablas. |
| Label   | 12px / 16px | Satoshi Medium  | 500             | Etiquetas de formulario, headers de columnas, categorias de metadata. Uppercase, letter-spacing +2px, `--color-text-secondary`. |
| Meta    | 11px / 14px | Satoshi Regular | 400             | Timestamps, IDs, informacion auxiliar. `--color-text-tertiary`. |

### Numeros Financieros

Todos los numeros financieros usan **IBM Plex Mono** con las siguientes reglas:

- **Peso:** 600 (Semibold) o 700 (Bold) segun contexto
- **Alineacion:** Siempre `font-variant-numeric: tabular-nums` para alineacion en columnas
- **Signo de peso:** El "$" se muestra a un tamano menor y en `--color-text-tertiary` (silenciado). En un monto Display de 36px, el "$" se renderiza a ~24px y silenciado
- **Colores segun contexto:**
  - Montos positivos: `--color-positive`
  - Montos negativos: `--color-negative`
  - Montos neutros: `--color-text-primary` (#E8E8E8)

### Estilo de Metadata y Etiquetas

Las etiquetas, headers de columna y subtitulos de seccion siguen un estilo consistente:

```
text-transform: uppercase
letter-spacing: +2px (equivalente a tracking-widest)
Nivel: Label (12px) o Meta (11px)
Color: --color-text-secondary o --color-text-tertiary
```

Se usa para: etiquetas de formulario, headers de columna en tablas, subtitulos de seccion, texto de badges.

### Reglas Tipograficas

- Las etiquetas y descripciones siempre tienen **menos peso visual** que el valor que describen
- **No usar ALL CAPS** en texto de cuerpo — solo para el nivel Label/metadata (maximo 3 palabras)
- **Line-height minimo** de 1.4 para bloques de texto legible
- Nunca mezclar Satoshi y IBM Plex Mono en la misma linea de texto (excepto cuando un monto aparece inline en una oracion)

---

## Espaciado y Radios

### Escala de Espaciado

Base de 4px con ajustes para la estetica Glyph Finance:

| Token | Valor | Uso |
|-------|-------|-----|
| 1     | 4px   | Espaciado inline minimo |
| 2     | 8px   | Gap icono-a-texto, padding interno de badges |
| 3     | 12px  | Gap entre elementos en listas compactas, gap de grid entre cards |
| 4     | 16px  | Margenes de pagina (mobile), gap titulo de seccion a contenido |
| 5     | 20px  | Padding interno de cards (estandar) |
| 6     | 24px  | Padding interno de cards (generoso, para KPI cards), separacion de secciones dentro de cards |
| 8     | 32px  | Separacion entre cards o secciones de pagina |

### Reglas de Espaciado

| Contexto                  | Valor       |
|---------------------------|-------------|
| Cards: padding interno    | 20px (estandar), 24px (KPI cards generosas) |
| Grid de cards: gap        | 12px        |
| Margenes de pagina        | 16px (mobile), 24px (desktop) |
| Celdas de tabla           | 12px vertical, 16px horizontal |
| Gap vertical en formularios | 14px      |
| Padding de modales        | 24px        |

### Escala de Radios

```
--radius-sm:   8px     → Tags, elementos pequenos, contenedores de icono
--radius-md:   12px    → Inputs, tooltips, contenedores medios
--radius-lg:   16px    → Cards
--radius-xl:   24px    → Modales
--radius-full: 9999px  → Elementos circulares, badges tipo pill
```

Todos los radios han aumentado respecto al sistema anterior. Los botones usan `--radius-full` (9999px, capsulas completas), badges usan `--radius-full` (pill), inputs 12px, cards 16px (mas redondeadas), modales 24px (significativamente mas redondeadas). El efecto general es una interfaz moderna sin llegar a ser burbujeante.

---

## Iconografia

### Libreria

Lucide React exclusivamente. No emojis, no SVGs custom, no icon fonts.

### Tamanos

```
14px  → Dentro de badges, acciones secundarias en tablas, chevrons
16px  → Botones, inputs con icono, items de lista
18px  → Navegacion sidebar, headers de card
20px  → Headers de seccion
24px  → KPI cards, estados vacios
32px  → Estados vacios grandes (empty states)
```

### Renderizado Dinamico de Iconos de Categoria

Las categorias almacenan el nombre del icono como string en la BD. Crear un componente `DynamicIcon` que resuelva el icono de Lucide por nombre:

```tsx
// Mapeo estatico para tree-shaking
import { Utensils, Zap, Clapperboard, Smartphone, Car, Package, Briefcase, Laptop } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  zap: Zap,
  clapperboard: Clapperboard,
  smartphone: Smartphone,
  car: Car,
  package: Package,
  briefcase: Briefcase,
  laptop: Laptop,
}
```

No usar import dinamico de toda la libreria — impacta el bundle size.

### Contenedores de Icono

Los iconos de categoria se muestran dentro de un contenedor con border-radius que usa el color de la categoria al 12% de opacidad como fondo y el color solido para el icono:

```
Fondo:  {categoryColor} al 12% opacidad
Icono:  {categoryColor} (color solido)
Tamano contenedor: 36px x 36px (listas), 40px x 40px (cards)
Border-radius: 12px
```

---

## Componentes Base

### Buttons

**Variantes:**

| Variante | Fondo | Texto | Borde | Uso |
|----------|-------|-------|-------|-----|
| Primary | `--color-accent` (#CCFF00) | `#000000` (negro puro) | none | Accion principal (Guardar, Registrar) |
| Secondary | `transparent` | `--color-text-secondary` | 1px `--color-border-divider` | Accion secundaria (Cancelar, Filtrar) |
| Danger | `--color-negative` (#FF3333) | `#FFFFFF` (blanco) | none | Acciones destructivas (Eliminar) |
| Ghost | `transparent` | `--color-text-secondary` | none | Acciones terciarias, links en tablas |
| Toggle (active) | `--color-accent` (#CCFF00) | `#000000` (negro puro) | none | Expense/Income toggle, periodo activo |
| Toggle (inactive) | `transparent` | `--color-text-secondary` | none | Toggle no seleccionado |

**Tamanos:**

| Tamano | Padding | Font Size | Min Height |
|--------|---------|-----------|------------|
| sm | 6px 12px | 12px | 32px |
| md | 10px 18px | 14px | 40px |
| lg | 12px 24px | 16px | 48px |

**Forma:** Todos los botones usan `border-radius: --radius-full` (9999px) — forma capsule/pill verdadera, no rectangulo redondeado.

**Interaccion:** `transition: all 200ms`, font-weight 600, gap 6px icono-a-texto. Estado de presion: `transform: scale(0.98)` para sensacion de switch tactil. Focus: 2px `--color-accent` outline segun spec de focus ring.

**Toggle pills:** Variante nueva para selectores binarios o multi-opcion (Expense/Income, Week/Month/Year). Estado activo: fondo chartreuse con texto negro. Estado inactivo: ghost/transparente con texto secundario. Agrupar toggles en fila con gap de 4px.

### Inputs

**Estilo:** Underline-only para TODOS los inputs en todos los formularios. Solo borde inferior, sin caja/rectangulo completo.

**Estructura:**

- Fondo: transparente. Sin fill de `--color-surface`. La linea se asienta directamente sobre la superficie donde esta el formulario.
- Borde inferior: 1px `--color-border-divider` (#222222) en estado default.
- Texto: `--color-text-primary` (#E8E8E8). Font-size 14px nivel Body.
- Padding: 10px 0 (padding vertical, sin padding horizontal ya que no hay caja).

**Floating labels:**

- La label comienza como texto placeholder sobre la linea en `--color-text-tertiary`.
- En focus o cuando tiene contenido: la label flota hacia arriba sobre el input, transiciona a estilo Label (12px, uppercase, letter-spacing +2px, `--color-text-secondary`).
- Transicion: 200ms ease para la animacion de flotacion.

**Estado focus:**

- La linea inferior transiciona de `--color-border-divider` a `--color-accent` (#CCFF00, chartreuse).
- Transicion: 200ms ease.
- Focus ring: outline estandar de 2px `--color-accent` segun spec global de focus ring.

**Estado error:**

- Color de linea inferior: `--color-negative` (#FF3333).
- Mensaje de error debajo del input en nivel Meta (11px, `--color-negative`).

**Inputs de montos:**

- Prefijo "$" mostrado en `--color-text-tertiary` a un tamano ligeramente menor, posicionado al inicio de la linea. El prefijo es estatico (no flota). Digitos del monto en IBM Plex Mono.

**Inputs de porcentaje:**

- Sufijo "%" mostrado en `--color-text-tertiary`, posicionado al final de la linea. Sufijo estatico.

**Inputs de select/dropdown:**

- Mismo estilo de underline. Icono chevron (16px, `--color-text-tertiary`) al extremo derecho de la linea.

### Cards

**Superficie:** `--color-surface-elevated` (#141414) sobre `--color-bg` (#000000). Sin bordes visibles, sin sombra. La elevacion se comunica unicamente por el contraste de fondo.

**Border-radius:** `--radius-lg` (16px).

**Padding:** 20px estandar, 24px para KPI/hero cards.

**Cards interactivas:** `cursor-pointer`, hover a `--color-surface-hover`.

**Cards apiladas (stacked):** Separador de 1px `--color-border-divider` (#222222) entre cards adyacentes para legibilidad de listas. Esta es una concesion pragmatica — la regla de "sin lineas" es aspiracional pero la legibilidad de listas requiere separadores sutiles.

**Cards de scroll horizontal:** Cards oscuras pequenas en fila para categorias — icono + nombre uppercase + monto monoespaciado. Fondo `--color-surface-elevated`, sin borde.

**Hero/balance cards:** Pueden incluir patron de textura dot-matrix como acento visual (detallado en Phase 14).

### Modales

**Desktop:**

- Overlay: `rgba(0, 0, 0, 0.7)` con `backdrop-filter: blur(4px)`
- Container: `--color-surface-elevated`, sin borde decorativo, border-radius `--radius-xl`, padding 28px
- Max-width: 480px para formularios, 640px para vistas amplias
- Max-height: 85vh con overflow-y auto
- Animacion de entrada: fade in + scale desde 0.95 (200ms ease-out)
- Boton de cerrar (X) siempre en la esquina superior derecha

**Mobile (bottom sheet):**

- Se desliza hacia arriba desde la parte inferior de la pantalla.
- Altura: 85% de la altura de pantalla (`85vh`).
- Overlay: `rgba(0, 0, 0, 0.7)` con `backdrop-filter: blur(4px)`.
- Container: `--color-surface-elevated`, sin borde, border-radius `--radius-xl` (24px) solo en esquinas superiores (esquinas inferiores cuadradas, al ras del borde de pantalla).
- Padding: 24px.
- Handle indicator: 4px de alto, 40px de ancho, `--color-border-divider` centrado en la parte superior con 12px de margen superior.

### Tablas

**Header row:**

- Fondo: `--color-bg` (#000000).
- Estilo de texto: nivel Label (12px, uppercase, letter-spacing +2px, font-weight 500).
- Color de texto: `--color-text-secondary`.

**Body rows:**

- Sin fondos alternados entre filas. Todas las filas en la misma superficie.
- Borde inferior: 1px `--color-border-divider` (#222222) como separador en cada fila.
- Estado hover: fondo `--color-surface-hover` (#1A1A1A).

**Formato de celdas:**

- Montos: alineados a la derecha, `font-variant-numeric: tabular-nums`, IBM Plex Mono.
- Texto: alineado a la izquierda, Satoshi.
- Padding: 12px vertical, 16px horizontal.

**Variante compacta** (para mobile o datos densos):

- Padding: 8px vertical, 12px horizontal.
- Font-size: 12px para celdas del body.

### Badges

**Forma:** Pill-shaped, `border-radius: --radius-full` (9999px). Consistente con la forma pill de los botones.

**Tamano:**

- Padding: 2px 8px.
- Font-size: 11px, font-weight 600, uppercase.

**Variantes semanticas** (fondo sutil + texto solido):

| Variante | Fondo | Texto | Uso |
|----------|-------|-------|-----|
| Accent | `--color-accent-subtle` | `--color-accent` | Links "VER TODO", elementos destacados |
| Positive | `--color-positive-subtle` | `--color-positive` | Tags de ingreso, tendencia positiva |
| Negative | `--color-negative-subtle` | `--color-negative` | Tags de gasto, tendencia negativa |
| Warning | `--color-warning-subtle` | `--color-warning` | Alertas, presupuesto cerca del limite |
| Info | `--color-info-subtle` | `--color-info` | Informacion neutral, periodos |
| Neutral | `rgba(232, 232, 232, 0.08)` | `--color-text-secondary` | Categorias, etiquetas genericas |

**Patron "VER TODO":** Usar variante Accent con flecha derecha. Texto en chartreuse, uppercase, nivel Meta. Ejemplo: `VER TODO ->` como badge pill que actua como link.

### Progress Bars (Battery-Bar)

Reemplaza TODAS las barras de progreso continuas/suaves en la app. Cada indicador de porcentaje (progreso de presupuesto, utilizacion de credito, avance de deuda) usa este estilo segmentado tipo battery-bar.

**Estructura:**

- **Contenedor:** Fondo a color semantico al 12% de opacidad. Altura: 6px (variante compacta) o 8px (variante detallada). Ancho completo del padre.
- **Segmentos:** Siempre exactamente 10 segmentos rectangulares. Cada segmento = 10% del total. 2px gaps entre segmentos. Los segmentos son rectangulos planos (sin border-radius).
- **Direccion de llenado:** Izquierda a derecha.

**Sistema de colores semaforo (traffic-light):**

Aplicado por segmento segun la posicion en el rango de llenado:

- `--color-accent` (#CCFF00, chartreuse) para segmentos que representan < 80% de llenado
- `--color-warning` (#FF9100, naranja) para segmentos que representan 80-99% de llenado
- `--color-negative` (#FF3333, rojo) para segmentos que representan 100%+ de llenado

**Comportamiento de overflow (100%+):** Los 10 segmentos se llenan con `--color-negative` (rojo). Se muestra el exceso como texto a la derecha de la barra: "+15%" en `--color-negative` a nivel Meta (11px). Esto hace inmediatamente claro que el presupuesto/limite ha sido excedido sin necesidad de un indicador separado.

**Ejemplos:**

- 45% presupuesto gastado: 4 segmentos chartreuse llenos, 1 medio lleno chartreuse, 5 vacios
- 85% presupuesto gastado: 8 segmentos chartreuse, luego el 9no segmento en naranja (cruzando umbral del 80%), 1 vacio
- 110% sobre presupuesto: 10 segmentos en rojo + texto "+10%"

**Nota:** Los segmentos parcialmente llenos muestran ancho parcial dentro del espacio del segmento. El gap entre segmentos siempre se mantiene.

**CSS conceptual del contenedor:**

```css
display: flex;
gap: 2px;
align-items: center;
background: {color-semantico al 12% opacidad};
padding: 2px;
```

**CSS conceptual de segmento individual:**

```css
flex: 1;
height: 100%;
background: {color basado en posicion en sistema semaforo};
border-radius: 0; /* rectangulos planos */
transition: background-color 300ms ease;
```

### Charts

**Contenedor:** Fondo `--color-surface-elevated`. Padding 20px. Border-radius `--radius-lg`.

**Line/Area charts:**

- Stroke width: 1.5px (reducido de 2px para sensacion minimal).
- Dot endpoints: puntos solidos de 4px en cada data point. Mismo color que el stroke de la linea.
- Area fill: gradiente desde color de stroke al 10-15% de opacidad en la parte superior a 0% en la inferior. Sutil, no dominante.
- No grid lines. Eliminar todas las referencias a CartesianGrid.
- Axis labels: minimos. X-axis muestra solo etiquetas de fecha de inicio y fin para series temporales. Sin etiquetas en Y-axis. Valores visibles solo en hover/tooltip.
- Axis ticks: `--color-text-tertiary`, 11px, nivel Meta.
- Axis lines: ocultas.

**Bar charts:**

- Barras rectangulares, sin border-radius (tops planos). Relleno geometrico limpio.
- Ancho de barra: mas delgado que default — aproximadamente 60% del espacio disponible para mostrar gaps entre barras.
- Sin outlines ni strokes en barras.

**Donut charts:**

- Anillo mas delgado (innerRadius ~70% de outerRadius) para sensacion minimal.
- Sin labels dentro del donut. Texto central para total/resumen si es necesario.

**Estrategia de color:**

- Graficas de serie unica: `--color-accent` (#CCFF00, chartreuse).
- Graficas multi-serie: usar colores de categoria de la paleta desaturada.
- Ingreso vs gasto: `--color-positive` para ingreso, `--color-negative` para gasto.

**Tooltips:**

- Tooltip flotante estilo card. Fondo: `--color-surface-elevated`. Sin borde (elevacion via background-shift). Border-radius: `--radius-md`. Font-size: 12px nivel Body.
- Montos en tooltip usan IBM Plex Mono (display financiero monoespaciado).

---

## Formato de Montos

### Display General

```
$1,234.56      → Monto estandar
-$1,234.56     → Monto negativo (prefijo -, en rojo)
+$1,234.56     → Monto positivo explicito (prefijo +, en verde, solo en transacciones)
$0.00          → Zero, mostrar como "—" en tablas, "$0.00" en inputs
```

### Montos Grandes (KPIs)

En KPI cards donde el espacio es limitado y el monto supera 6 digitos, abreviar:

```
$1,234,567.89  → $1.23M
$123,456.78    → $123.4K (solo si el espacio lo requiere)
```

Siempre mostrar el monto completo en tooltip al hacer hover.

### Porcentajes

```
20.5%   → Formato estandar
0.0%    → Zero
-5.2%   → Negativo (en rojo)
```

### Fechas

```
1 abr          → En listas de transacciones (dia + mes abreviado)
1 abr 2026     → En listas cuando hay transacciones de multiples anos
Abril 2026     → Titulos de periodo
01/04/2026     → Inputs de fecha
```

---

## Configuracion Tailwind

Tailwind v4 usa configuracion CSS-first via bloques `@theme`. Este bloque contiene **todos** los tokens del sistema de diseno Glyph Finance, listo para copiar en `src/app/globals.css`.

### Bloque @theme Principal

```css
@theme {
  /* Fondos */
  --color-bg: #000000;
  --color-surface: #0A0A0A;
  --color-surface-elevated: #141414;
  --color-surface-hover: #1A1A1A;

  /* Bordes */
  --color-border-divider: #222222;

  /* Textura */
  --color-dot-matrix: #1E1E1E;

  /* Texto */
  --color-text-primary: #E8E8E8;
  --color-text-secondary: #999999;
  --color-text-tertiary: #666666;
  --color-text-disabled: #444444;

  /* Acento */
  --color-accent: #CCFF00;
  --color-accent-hover: #B8E600;
  --color-accent-subtle: rgba(204, 255, 0, 0.12);

  /* Semanticos */
  --color-positive: #00E676;
  --color-positive-subtle: rgba(0, 230, 118, 0.12);
  --color-negative: #FF3333;
  --color-negative-subtle: rgba(255, 51, 51, 0.12);
  --color-warning: #FF9100;
  --color-warning-subtle: rgba(255, 145, 0, 0.12);
  --color-info: #448AFF;
  --color-info-subtle: rgba(68, 138, 255, 0.12);

  /* Categorias (desaturadas) */
  --color-cat-food: #C88A5A;
  --color-cat-services: #7A9EC4;
  --color-cat-entertainment: #9B89C4;
  --color-cat-subscriptions: #C48AA3;
  --color-cat-transport: #C4A84E;
  --color-cat-other: #8A9099;

  /* Tipografia */
  --font-mono: 'IBM Plex Mono', 'Fira Code', monospace;

  /* Radios */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

### Bloque @theme inline (next/font)

```css
@theme inline {
  --font-sans: var(--font-satoshi);
}
```

El bloque `@theme inline` es necesario para inyectar la variable CSS generada por `next/font`. Satoshi se carga via `next/font/google` o `next/font/local` en el layout raiz, lo que genera una variable CSS `--font-satoshi`. El `@theme inline` conecta esa variable con el token `--font-sans` de Tailwind.

### Estilos Globales

Los siguientes estilos se aplican en `globals.css` fuera de los bloques `@theme`:

```css
:focus-visible {
  outline: 2px solid var(--color-accent, #CCFF00);
  outline-offset: 2px;
  border-radius: inherit;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
}
```

### Notas de Implementacion

- **CSS-first:** Este enfoque reemplaza el antiguo `tailwind.config.ts` con JavaScript. En Tailwind v4, toda la configuracion vive en CSS.
- **Sin sombras en @theme:** No existen tokens de sombra. La elevacion es puramente cambio de fondo (background-shift).
- **Colores de categoria:** Los valores hex son las versiones desaturadas. Para fondos de contenedores de icono, usar el color de categoria al 15% de opacidad en codigo de componente (e.g., `rgba(200, 138, 90, 0.15)` para Comida).
- **Fuente sans:** Se define en `@theme inline` (no en el bloque principal) porque depende de la variable CSS inyectada por `next/font` en runtime.
