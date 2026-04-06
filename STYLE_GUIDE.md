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
--radius-sm:   8px     → Badges, tags, elementos pequenos
--radius-md:   12px    → Botones, inputs
--radius-lg:   16px    → Cards
--radius-xl:   24px    → Modales
--radius-full: 9999px  → Elementos circulares, badges tipo pill
```

Todos los radios han aumentado respecto al sistema anterior. Los botones ahora son 12px (ligeramente pill), cards 16px (mas redondeadas), modales 24px (significativamente mas redondeadas). El efecto general es una interfaz moderna sin llegar a ser burbujeante.

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

| Variante | Fondo | Texto | Uso |
|----------|-------|-------|-----|
| Primary | `--color-accent` | `--color-bg` | Accion principal (Guardar, Registrar) |
| Secondary | `transparent` + border `--color-border-divider` | `--color-text-secondary` | Accion secundaria (Cancelar, Filtrar) |
| Danger | `#dc2626` | `white` | Acciones destructivas (Eliminar) |
| Ghost | `transparent` | `--color-text-secondary` | Acciones terciarias, links en tablas |

**Tamanos:**

| Tamano | Padding | Font Size | Min Height |
|--------|---------|-----------|------------|
| sm | 6px 12px | 12px | 32px |
| md | 10px 18px | 14px | 40px |
| lg | 12px 24px | 16px | 48px |

Todos los botones: border-radius `--radius-md`, font-weight 600, gap de 6px entre icono y texto, transition 200ms.

### Inputs

- Fondo: `--color-surface`
- Borde: 1px `--color-border-divider`, en focus cambia a `--color-accent` con outline solido
- Texto: `--color-text-primary`
- Placeholder: `--color-text-tertiary`
- Padding: 10px 12px
- Border-radius: `--radius-md`
- Font-size: 14px
- Los inputs de montos llevan un prefijo "$" fijo en `--color-text-tertiary`
- Los inputs de porcentaje llevan un sufijo "%" fijo

### Cards

- Fondo: `--color-surface-elevated`
- Sin borde decorativo visible (la elevacion viene del contraste de fondo)
- Border-radius: `--radius-xl`
- Padding: 20px
- Sin sombra

Las cards interactivas (clickables) agregan `cursor-pointer` y en hover cambian a `--color-surface-hover`.

### Modales

- Overlay: `rgba(0, 0, 0, 0.7)` con `backdrop-filter: blur(4px)`
- Container: `--color-surface-elevated`, sin borde decorativo, border-radius `--radius-xl`, padding 28px
- Max-width: 480px para formularios, 640px para vistas amplias
- Max-height: 85vh con overflow-y auto
- Animacion de entrada: fade in + scale desde 0.95 (200ms ease-out)
- Boton de cerrar (X) siempre en la esquina superior derecha

### Tablas

- Header: fondo `--color-bg`, texto `--color-text-secondary`, font-weight 500, font-size 12px, text-transform uppercase, letter-spacing 0.5px
- Filas: borde inferior 1px `--color-border-divider`
- Hover: `--color-surface-hover`
- Celdas de montos: alineadas a la derecha, `tabular-nums`
- Celdas de texto: alineadas a la izquierda
- Padding: 12px 16px

### Badges

- Padding: 2px 8px
- Border-radius: `--radius-sm`
- Font-size: 11px, font-weight 600
- Variantes semanticas: usan fondo sutil + texto del color semantico

### Progress Bars

- Contenedor: fondo del color semantico al 12% de opacidad, border-radius `--radius-full`, altura 6px (compacto) o 8px (detallado)
- Barra de progreso: color solido, mismo border-radius, transicion de width 500ms ease
- Colores: verde (< 80%), naranja (80-100%), rojo (> 100%)

### Charts (Recharts)

- Fondo del contenedor: `--color-surface-elevated`
- Grid lines: `--color-border-divider`, dashed (3 3)
- Axis ticks: `--color-text-tertiary`, font-size 11px
- Axis lines: ocultas
- Tooltip: fondo `--color-bg`, borde `--color-border-divider`, border-radius `--radius-md`, font-size 12px
- Gradientes en AreaChart: color solido al 30% en top, 0% en bottom
- Stroke width: 2px para lineas, no outline en barras
- Bar border-radius: 4px en esquinas superiores

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
