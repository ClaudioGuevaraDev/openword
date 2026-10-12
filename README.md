<div align="center">

<img src="build/icon.png" alt="Logo de OpenWord" width="120">

# OpenWord

**Procesador de textos de escritorio compatible con Microsoft Word, para Windows, macOS y Linux.**

[![Versión](https://img.shields.io/badge/versión-0.2.25-blue)](package.json)
[![CI](https://github.com/ClaudioGuevaraDev/openword/actions/workflows/ci.yml/badge.svg)](https://github.com/ClaudioGuevaraDev/openword/actions/workflows/ci.yml)
[![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-estricto-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Plataformas](https://img.shields.io/badge/plataformas-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](docs/DISTRIBUCION.md)
[![Motor](https://img.shields.io/badge/motor-docx--editor%202.27-orange)](https://github.com/eigenpal/docx-editor)

[Funciones](#funciones) • [Primeros pasos](#primeros-pasos) • [Compatibilidad con Word](#compatibilidad-con-word) • [Atajos](#atajos-de-teclado) • [Desarrollo](#desarrollo) • [Seguridad](#seguridad)

</div>

OpenWord abre, edita y guarda documentos `.docx` directamente sobre OOXML, el formato nativo de Word. No convierte a un modelo propio: lo que no sabe editar lo conserva intacto al guardar. Funciona sin conexión, nunca ejecuta macros y usa el mismo Chromium en los tres sistemas operativos, así que la medición del texto y la paginación son idénticas en todos.

## Funciones

- **Documentos de Word de verdad:** `.docx`, `.docm`, `.dotx` y `.dotm`, con guardado atómico y detección del formato por contenido. `.doc`, `.rtf` y `.odt` se convierten con LibreOffice.
- **Cinta de opciones al estilo de Word:** Archivo, Inicio, Insertar, Disposición, Referencias y Vista, más las pestañas contextuales Tabla, Formato de imagen y Encabezado y pie de página.
- **Formato completo de texto y párrafo:** fuentes reales del sistema, estilos, listas, sangrías, interlineado, tablas, imágenes, cuadros de texto, encabezados, pies, notas al pie y tabla de contenido.
- **Imprimir y exportar a PDF:** vista previa fiel, tamaño y orientación por sección, y PDF etiquetado con marcadores.
- **Corrector ortográfico propio:** diccionarios en español e inglés, sugerencias y diccionario personal.
- **Recuperación automática:** copias periódicas que se reabren tras un cierre inesperado.
- **Interfaz en español e inglés:** tema claro, oscuro o del sistema; unidades en cm o pulgadas y papel Carta o A4 según la región.
- **Fidelidad medida:** un corpus de 39 documentos reales se abre y se guarda sin pérdidas, y el resultado se valida con el Open XML SDK.

**Stack:** Electron 44 · React 19 + TypeScript estricto · [docx-editor](https://github.com/eigenpal/docx-editor) 2.27 (Apache-2.0), sin los paquetes Pro (`pro`, `editor-api`, `docx-to-pdf`, que ESLint y `pnpm run check:deps` prohíben).

## Primeros pasos

1. Descarga el instalador de tu sistema desde los artefactos del workflow [Release](https://github.com/ClaudioGuevaraDev/openword/actions/workflows/release.yml), que se genera al publicar un tag `v*`: `.exe` para Windows, `.dmg` o `.zip` para macOS, `.deb` o `.AppImage` para Linux. También puedes generarlo tú con `pnpm run package` (ver [Desarrollo](#desarrollo)).
2. Abre un documento con doble clic, arrastrándolo a la ventana o desde **Archivo › Abrir**.

> [!NOTE]
> LibreOffice es opcional. Solo se usa para abrir `.doc`, `.rtf`, `.odt`, Word XML y HTML guardado como `.doc`: OpenWord los convierte a `.docx` sin tocar el original. Si no está instalado, la app ofrece descargarlo.

## Compatibilidad con Word

Esta sección compara OpenWord con **todas** las funciones de Microsoft Word (Microsoft 365), pestaña por pestaña. Cada fila indica si la función se puede usar desde la interfaz, si solo se ve al abrir un documento de Word, o si no existe.

> [!IMPORTANT]
> Los **comentarios** y el **control de cambios** se muestran (en su estado final) y se conservan al guardar, pero no se pueden crear, aceptar ni rechazar: en el motor docx-editor esas funciones requieren la licencia Pro.

### Leyenda

| Estado | Significado                                                                                  |
| :----: | -------------------------------------------------------------------------------------------- |
|   ✅   | **Soportado:** se usa desde la interfaz como en Word.                                        |
|   🟡   | **Parcial:** existe, pero con limitaciones (ver la nota).                                    |
|   👁️   | **Solo visualización:** se muestra fiel y se conserva al guardar, pero no se crea ni edita.  |
|   💾   | **Solo se conserva:** no se muestra (o aparece como marcador), pero no se pierde al guardar. |
|   ⚙️   | **Motor sí, interfaz no:** el motor lo permite, pero todavía no hay botón en la cinta.       |
|   ❌   | **No soportado.**                                                                            |
|   🚫   | **Fuera de alcance:** decisión de diseño (ejecutar macros, nube, IA…).                       |

### Resumen

357 funciones evaluadas (sin contar la tabla de formatos de archivo):

| Área                    |     ✅ |     🟡 |     👁️ |     💾 |    ⚙️ |      ❌ |     🚫 |   Total |
| ----------------------- | -----: | -----: | -----: | -----: | ----: | ------: | -----: | ------: |
| Archivo                 |      9 |      7 |      0 |      2 |     0 |      13 |      5 |      36 |
| Inicio                  |     20 |      9 |      7 |      0 |     0 |      12 |      2 |      50 |
| Insertar                |      6 |      2 |      0 |      0 |     3 |      25 |      2 |      38 |
| Dibujar                 |      0 |      0 |      0 |      1 |     0 |       5 |      0 |       6 |
| Diseño                  |      0 |      0 |      5 |      2 |     0 |       3 |      0 |      10 |
| Disposición             |      9 |      4 |      2 |      1 |     0 |       7 |      0 |      23 |
| Referencias             |      3 |      2 |      4 |      0 |     1 |       9 |      1 |      20 |
| Correspondencia         |      0 |      0 |      1 |      1 |     0 |       7 |      0 |       9 |
| Revisar                 |      0 |      3 |      1 |      1 |     0 |      12 |      1 |      18 |
| Vista                   |      8 |      1 |      0 |      0 |     0 |      13 |      1 |      23 |
| Pestañas contextuales   |     11 |      7 |     11 |      0 |     3 |      23 |      0 |      55 |
| Fidelidad al abrir      |     15 |      6 |     17 |     11 |     0 |       1 |      0 |      50 |
| Plataforma y aplicación |     11 |      3 |      0 |      0 |     0 |       2 |      3 |      19 |
| **Total**               | **92** | **44** | **48** | **19** | **7** | **132** | **15** | **357** |

**Puntos fuertes:** formato de texto y párrafo, tablas básicas, imágenes, encabezados y pies, notas al pie, tabla de contenido, impresión y PDF, y una fidelidad alta al abrir documentos complejos (columnas, celdas combinadas, marcas de agua, ecuaciones, campos y controles de contenido se ven tal como en Word).

**Faltantes principales:** crear comentarios y control de cambios, columnas, combinar celdas, editar estilos, listas multinivel, formas, SmartArt y gráficos, y las pestañas Diseño, Correspondencia y Revisar.

### Matriz de funciones

Haz clic en cada sección para desplegarla.

<details>
<summary><strong>Archivo (Backstage)</strong></summary>

| Función                                        | Estado | Notas                                                                                    |
| ---------------------------------------------- | :----: | ---------------------------------------------------------------------------------------- |
| Nuevo documento en blanco                      |   ✅   | Papel Carta o A4 según la región. Un «Documento1» sin cambios se reutiliza al abrir.     |
| Galería de plantillas                          |   ❌   | Sí se pueden abrir plantillas `.dotx`/`.dotm` como documento nuevo.                      |
| Abrir                                          |   ✅   | Selección múltiple. Formato detectado por contenido, no por extensión.                   |
| Documentos recientes                           |   ✅   | Hasta 20, también en la lista de recientes del sistema operativo.                        |
| Anclar documentos y carpetas                   |   ❌   |                                                                                          |
| Guardar                                        |   ✅   | Guardado atómico (archivo temporal, fsync y renombrado).                                 |
| Guardar como                                   |   🟡   | Solo `.docx`, o `.docm` si el documento tiene macros.                                    |
| Guardar una copia                              |   ❌   |                                                                                          |
| Autoguardado en la nube                        |   🚫   | Sin red. La recuperación automática local sí existe.                                     |
| Info › Propiedades del documento               |   💾   | Título, autor, etc. se conservan, pero no se ven ni se editan.                           |
| Proteger documento › Cifrar con contraseña     |   ❌   | Los documentos cifrados no se pueden abrir.                                              |
| Proteger documento › Restringir edición        |   🟡   | Una protección existente se respeta. No se puede activar desde la interfaz.              |
| Proteger documento › Marcar como final         |   💾   |                                                                                          |
| Inspeccionar documento                         |   ❌   |                                                                                          |
| Comprobar accesibilidad                        |   ❌   |                                                                                          |
| Comprobar compatibilidad                       |   ❌   | El modo de compatibilidad del archivo se respeta al paginar.                             |
| Historial de versiones                         |   ❌   |                                                                                          |
| Administrar documento (recuperar no guardados) |   🟡   | La recuperación automática reabre las copias tras un cierre inesperado.                  |
| Imprimir › Vista previa                        |   ✅   | El mismo PDF que se imprime, dibujado con pdf.js.                                        |
| Imprimir › Impresora, copias, intervalo        |   🟡   | Se eligen en el diálogo de impresión del sistema, no dentro de la app.                   |
| Imprimir › Configuración de página             |   🟡   | Se usa la de cada sección del documento.                                                 |
| Exportar › Crear PDF                           |   ✅   | PDF etiquetado con marcadores. No usa el conversor Pro del motor.                        |
| Exportar › XPS                                 |   ❌   |                                                                                          |
| Exportar › Cambiar tipo de archivo             |   ❌   |                                                                                          |
| Compartir / Enviar por correo                  |   🚫   |                                                                                          |
| Cerrar                                         |   ✅   | Avisa Guardar / No guardar / Cancelar.                                                   |
| Cuenta                                         |   🚫   |                                                                                          |
| Opciones › Idioma de la interfaz               |   ✅   | Automático, español o inglés.                                                            |
| Opciones › Revisión (corrector)                |   🟡   | Activar, omitir MAYÚSCULAS y palabras con números, y elegir diccionarios. Sin gramática. |
| Opciones › Autocorrección                      |   ❌   |                                                                                          |
| Opciones › Guardar (autorrecuperación)         |   ✅   | Cada N minutos (0–120, por defecto 2).                                                   |
| Opciones › Avanzadas                           |   ❌   |                                                                                          |
| Opciones › Personalizar cinta                  |   ❌   |                                                                                          |
| Opciones › Barra de acceso rápido              |   🟡   | Fija: Guardar, Deshacer y Rehacer.                                                       |
| Opciones › Complementos                        |   🚫   |                                                                                          |
| Opciones › Centro de confianza                 |   🚫   | Las macros nunca se ejecutan.                                                            |

</details>

<details>
<summary><strong>Inicio</strong></summary>

| Función                                                 | Estado | Notas                                                                                      |
| ------------------------------------------------------- | :----: | ------------------------------------------------------------------------------------------ |
| Pegar                                                   |   ✅   |                                                                                            |
| Opciones de pegado                                      |   🟡   | Mantener formato y Solo texto. Sin «Combinar formato» ni «Imagen».                         |
| Pegado especial                                         |   ❌   |                                                                                            |
| Cortar / Copiar                                         |   ✅   |                                                                                            |
| Copiar formato                                          |   ✅   |                                                                                            |
| Panel Portapapeles de Office                            |   ❌   |                                                                                            |
| Fuente (familia)                                        |   ✅   | Fuentes del documento y todas las del sistema, con sustitutos métricos libres.             |
| Tamaño de fuente                                        |   ✅   | De 1 a 1638 pt en pasos de ½ pt.                                                           |
| Agrandar / Reducir fuente                               |   ✅   | Con los mismos saltos que Word.                                                            |
| Cambiar mayúsculas y minúsculas                         |   ❌   |                                                                                            |
| Borrar todo el formato                                  |   ✅   |                                                                                            |
| Negrita / Cursiva                                       |   ✅   |                                                                                            |
| Subrayado                                               |   🟡   | Solo subrayado simple. Los demás estilos y colores de subrayado se muestran.               |
| Tachado                                                 |   ✅   |                                                                                            |
| Doble tachado                                           |   👁️   |                                                                                            |
| Subíndice / Superíndice                                 |   ✅   |                                                                                            |
| Efectos de texto (contorno, sombra, reflejo, iluminado) |   🟡   | Solo el contorno sólido se muestra. El resto se conserva sin dibujarse.                    |
| Color de resaltado                                      |   ✅   | Los 15 colores de Word.                                                                    |
| Color de fuente                                         |   🟡   | Automático, colores del tema y estándar. Sin «Más colores».                                |
| Diálogo Fuente › Versalitas / Mayúsculas                |   👁️   |                                                                                            |
| Diálogo Fuente › Oculto                                 |   👁️   | El texto oculto se respeta (no se dibuja).                                                 |
| Diálogo Fuente › Espaciado, escala, posición            |   👁️   |                                                                                            |
| Diálogo Fuente › Kerning y ligaduras                    |   👁️   |                                                                                            |
| Diálogo Fuente › Fuente predeterminada                  |   ❌   |                                                                                            |
| Viñetas                                                 |   🟡   | Activar/desactivar. Sin biblioteca de viñetas ni viñetas de imagen nuevas.                 |
| Numeración                                              |   🟡   | Activar/desactivar. Sin biblioteca de formatos ni «Establecer valor de numeración».        |
| Lista multinivel                                        |   🟡   | Las existentes se muestran fieles y se cambia de nivel con la sangría. No se crean nuevas. |
| Aumentar / Disminuir sangría                            |   ✅   |                                                                                            |
| Ordenar                                                 |   ❌   |                                                                                            |
| Mostrar todo (¶)                                        |   ✅   |                                                                                            |
| Alinear izquierda, centro, derecha, justificar          |   ✅   |                                                                                            |
| Interlineado                                            |   ✅   | 1, 1.15, 1.5, 2, 2.5, 3 y opciones.                                                        |
| Sombreado de párrafo                                    |   👁️   |                                                                                            |
| Bordes de párrafo                                       |   👁️   |                                                                                            |
| Diálogo Párrafo (sangrías y espaciado)                  |   ✅   |                                                                                            |
| Líneas viudas, conservar con el siguiente, salto antes  |   ✅   | En el diálogo Párrafo.                                                                     |
| Tabulaciones y rellenos                                 |   🟡   | Se muestran todas. Se crean y quitan desde la regla, sin tabulación de barra.              |
| Galería de estilos                                      |   ✅   | Con nombres localizados.                                                                   |
| Panel Estilos                                           |   ❌   |                                                                                            |
| Crear / Modificar estilo                                |   ❌   | Los estilos del documento se respetan completos (herencia, tema, valores por defecto).     |
| Inspector de estilos / Mostrar formato                  |   ❌   |                                                                                            |
| Buscar                                                  |   ✅   | En el panel de navegación, con mayúsculas y palabras completas.                            |
| Búsqueda avanzada (comodines, formato)                  |   ❌   |                                                                                            |
| Reemplazar / Reemplazar todo                            |   🟡   | Cada reemplazo es un paso de Deshacer (el motor no implementa el reemplazo nativo).        |
| Ir a                                                    |   ❌   |                                                                                            |
| Seleccionar todo                                        |   ✅   |                                                                                            |
| Seleccionar texto con formato similar                   |   ❌   |                                                                                            |
| Dictar                                                  |   🚫   |                                                                                            |
| Editor (gramática y estilo)                             |   ❌   |                                                                                            |
| Copilot                                                 |   🚫   |                                                                                            |

</details>

<details>
<summary><strong>Insertar</strong></summary>

| Función                                 | Estado | Notas                                                                                              |
| --------------------------------------- | :----: | -------------------------------------------------------------------------------------------------- |
| Portada                                 |   ❌   |                                                                                                    |
| Página en blanco                        |   ❌   | Se puede lograr con dos saltos de página.                                                          |
| Salto de página                         |   ✅   |                                                                                                    |
| Tabla › Cuadrícula                      |   ✅   | Hasta 10 × 8, accesible con el teclado.                                                            |
| Tabla › Insertar tabla (diálogo)        |   ❌   |                                                                                                    |
| Tabla › Dibujar tabla                   |   ❌   |                                                                                                    |
| Tabla › Convertir texto en tabla        |   ❌   |                                                                                                    |
| Tabla › Hoja de Excel                   |   ❌   |                                                                                                    |
| Tabla › Tablas rápidas                  |   ❌   |                                                                                                    |
| Imágenes › Desde archivo                |   ✅   | PNG, JPEG y GIF. BMP, WebP y SVG se convierten a PNG. Se ajustan al ancho del texto.               |
| Imágenes › En línea / de stock          |   🚫   | Sin red.                                                                                           |
| Formas                                  |   ❌   | Las existentes se muestran con relleno y trazo sólidos.                                            |
| Iconos                                  |   ❌   |                                                                                                    |
| Modelos 3D                              |   ❌   |                                                                                                    |
| SmartArt                                |   ❌   | Los existentes se conservan (se ve un marcador).                                                   |
| Gráfico                                 |   ❌   | Los existentes se conservan (se ve un marcador).                                                   |
| Captura de pantalla                     |   ❌   |                                                                                                    |
| Vínculo                                 |   ✅   | También a marcadores. Se abren en el navegador del sistema.                                        |
| Marcador                                |   ❌   | Los existentes funcionan como destino de vínculos y referencias.                                   |
| Referencia cruzada                      |   ❌   | Las existentes (REF, PAGEREF) se evalúan.                                                          |
| Comentario                              |   ❌   | Requiere la licencia Pro del motor.                                                                |
| Encabezado                              |   ✅   | Entra en el modo de edición. Sin galería de diseños.                                               |
| Pie de página                           |   ✅   | Entra en el modo de edición. Sin galería de diseños.                                               |
| Número de página                        |   🟡   | Principio, final y «Página X de Y». Sin formatos (romanos, letras) ni posición lateral.            |
| Cuadro de texto                         |   🟡   | Inserta un cuadro simple. Sin galería de diseños.                                                  |
| Elementos rápidos › Campo               |   ❌   | Muchos campos existentes se evalúan (ver Fidelidad).                                               |
| Elementos rápidos › Autotexto / Bloques |   ❌   |                                                                                                    |
| WordArt                                 |   ❌   |                                                                                                    |
| Letra capital                           |   ❌   | Las existentes se muestran.                                                                        |
| Línea de firma                          |   ❌   |                                                                                                    |
| Fecha y hora                            |   ❌   | Los campos DATE/TIME existentes se evalúan.                                                        |
| Objeto (OLE)                            |   ❌   | Los existentes se conservan y nunca se ejecutan.                                                   |
| Texto de archivo                        |   ❌   |                                                                                                    |
| Ecuación                                |   ⚙️   | Las existentes se editan con un clic en sintaxis lineal. No hay botón para insertar.               |
| Símbolo                                 |   ❌   |                                                                                                    |
| Vídeo en línea                          |   🚫   |                                                                                                    |
| Controles de contenido                  |   ⚙️   | Texto, casilla, lista, fecha, imagen y secciones repetibles: el motor los inserta, falta el botón. |
| Campos de formulario heredados          |   ⚙️   | Texto, casilla y lista desplegable.                                                                |

</details>

<details>
<summary><strong>Dibujar</strong></summary>

| Función                        | Estado | Notas                                      |
| ------------------------------ | :----: | ------------------------------------------ |
| Lápices, marcadores y borrador |   ❌   | La tinta existente se conserva al guardar. |
| Lazo y selección de tinta      |   ❌   |                                            |
| Convertir tinta en forma       |   ❌   |                                            |
| Tinta a matemáticas            |   ❌   |                                            |
| Lienzo de dibujo               |   💾   | Se ve un marcador.                         |
| Reproducir entintado           |   ❌   |                                            |

</details>

<details>
<summary><strong>Diseño</strong></summary>

La pestaña Diseño no existe todavía. El motor sí respeta al abrir lo que estas opciones generan.

| Función                        | Estado | Notas                                                           |
| ------------------------------ | :----: | --------------------------------------------------------------- |
| Temas                          |   👁️   | Los colores y fuentes del tema se resuelven al mostrar.         |
| Conjuntos de estilos           |   ❌   |                                                                 |
| Colores del tema               |   👁️   |                                                                 |
| Fuentes del tema               |   👁️   |                                                                 |
| Espaciado entre párrafos       |   ❌   | Se puede cambiar párrafo a párrafo en Disposición.              |
| Efectos del tema               |   💾   |                                                                 |
| Establecer como predeterminado |   ❌   |                                                                 |
| Marca de agua                  |   👁️   | Las de texto e imagen (VML) se muestran. No se crean ni editan. |
| Color de página                |   💾   | Se conserva, pero el fondo no se pinta.                         |
| Bordes de página               |   👁️   | Los bordes de línea se muestran; los artísticos no.             |

</details>

<details>
<summary><strong>Disposición</strong></summary>

| Función                               | Estado | Notas                                                                      |
| ------------------------------------- | :----: | -------------------------------------------------------------------------- |
| Márgenes                              |   ✅   | Normal, Estrecho, Moderado, Ancho y personalizados.                        |
| Márgenes simétricos y encuadernación  |   🟡   | El margen de encuadernación se respeta; no se configura desde la interfaz. |
| Orientación                           |   ✅   | Por sección.                                                               |
| Tamaño                                |   ✅   | Carta, Oficio, A4, A5, Ejecutivo, B5 (JIS) y personalizados.               |
| Columnas                              |   👁️   | Se muestran (incluso desiguales y con línea separadora). No se crean.      |
| Salto › Página                        |   ✅   |                                                                            |
| Salto › Columna                       |   ❌   | El motor lo rechaza.                                                       |
| Salto › Ajuste de texto               |   ❌   |                                                                            |
| Salto de sección › Página siguiente   |   ✅   |                                                                            |
| Salto de sección › Continua           |   ✅   |                                                                            |
| Salto de sección › Página par / impar |   👁️   |                                                                            |
| Números de línea                      |   💾   |                                                                            |
| Guiones automáticos                   |   ❌   | Los guiones opcionales del documento se respetan.                          |
| Sangría izquierda / derecha           |   ✅   | En cm o pulgadas según la región.                                          |
| Espaciado anterior / posterior        |   ✅   | En pt, con pasos de 6 pt.                                                  |
| Diálogo Configurar página             |   ✅   |                                                                            |
| Posición (objeto)                     |   🟡   | En el diálogo Tamaño y posición de la imagen.                              |
| Ajustar texto                         |   🟡   | Solo en imágenes flotantes, desde Formato de imagen.                       |
| Traer adelante / Enviar atrás         |   ❌   |                                                                            |
| Panel de selección                    |   ❌   |                                                                            |
| Alinear objetos                       |   ❌   |                                                                            |
| Agrupar / Desagrupar                  |   ❌   | Los grupos existentes se muestran.                                         |
| Girar                                 |   🟡   | 90° y voltear, solo en imágenes.                                           |

</details>

<details>
<summary><strong>Referencias</strong></summary>

| Función                                   | Estado | Notas                                                                |
| ----------------------------------------- | :----: | -------------------------------------------------------------------- |
| Tabla de contenido › Insertar             |   🟡   | Títulos de nivel 1 a 3. Sin galería de estilos ni TDC personalizada. |
| Tabla de contenido › Actualizar           |   ✅   | Toda la tabla o solo los números de página.                          |
| Tabla de contenido › Agregar texto        |   ❌   | Se puede aplicar un estilo de título desde la galería de estilos.    |
| Tabla de contenido › Quitar               |   🟡   | Se borra como cualquier contenido.                                   |
| Insertar nota al pie                      |   ✅   |                                                                      |
| Insertar nota al final                    |   ✅   |                                                                      |
| Siguiente nota al pie                     |   ❌   |                                                                      |
| Mostrar notas                             |   ❌   |                                                                      |
| Diálogo Notas al pie (formato, convertir) |   ⚙️   | El motor puede convertir notas y cambiar sus propiedades.            |
| Buscar / Investigador                     |   🚫   |                                                                      |
| Insertar cita                             |   ❌   | Las existentes muestran su resultado guardado.                       |
| Administrar fuentes / Estilo              |   ❌   |                                                                      |
| Bibliografía                              |   👁️   | Muestra el resultado guardado.                                       |
| Insertar título (rótulo)                  |   ❌   | Los campos SEQ existentes se evalúan.                                |
| Tabla de ilustraciones                    |   👁️   | Muestra el resultado guardado.                                       |
| Referencia cruzada                        |   ❌   | Las existentes se evalúan.                                           |
| Marcar entrada de índice                  |   ❌   |                                                                      |
| Insertar índice                           |   👁️   | Muestra el resultado guardado.                                       |
| Marcar cita (autoridades)                 |   ❌   |                                                                      |
| Tabla de autoridades                      |   👁️   | Muestra el resultado guardado.                                       |

</details>

<details>
<summary><strong>Correspondencia</strong></summary>

La pestaña Correspondencia no existe.

| Función                                 | Estado | Notas                                             |
| --------------------------------------- | :----: | ------------------------------------------------- |
| Sobres                                  |   ❌   |                                                   |
| Etiquetas                               |   ❌   |                                                   |
| Iniciar combinación de correspondencia  |   ❌   |                                                   |
| Seleccionar / editar destinatarios      |   ❌   |                                                   |
| Campos de combinación (MERGEFIELD)      |   👁️   | Se muestra el resultado guardado en el documento. |
| Bloque de direcciones / Línea de saludo |   ❌   |                                                   |
| Reglas (IF, ASK, FILL-IN…)              |   💾   |                                                   |
| Vista previa de resultados              |   ❌   |                                                   |
| Finalizar y combinar                    |   ❌   |                                                   |

</details>

<details>
<summary><strong>Revisar</strong></summary>

La pestaña Revisar no existe. El corrector ortográfico funciona desde el menú contextual.

| Función                                    | Estado | Notas                                                                                                      |
| ------------------------------------------ | :----: | ---------------------------------------------------------------------------------------------------------- |
| Ortografía (subrayado y sugerencias)       |   🟡   | Corrector propio: sugerencias, Omitir todo (en la sesión) y Agregar al diccionario. Sin panel de revisión. |
| Gramática                                  |   ❌   |                                                                                                            |
| Sinónimos                                  |   ❌   |                                                                                                            |
| Contar palabras                            |   🟡   | Contador en vivo en la barra de estado. Sin diálogo de estadísticas.                                       |
| Leer en voz alta                           |   ❌   |                                                                                                            |
| Comprobar accesibilidad                    |   ❌   |                                                                                                            |
| Traducir                                   |   🚫   |                                                                                                            |
| Idioma de revisión                         |   ❌   | La barra de estado muestra el idioma de la interfaz, no el del documento.                                  |
| Comentarios › Nuevo / Responder / Eliminar |   ❌   | Requiere la licencia Pro del motor.                                                                        |
| Comentarios existentes                     |   💾   | Se conservan al guardar, pero no se muestran.                                                              |
| Control de cambios › Activar               |   ❌   | Requiere la licencia Pro del motor.                                                                        |
| Cambios existentes                         |   👁️   | Se muestra el estado final y se conservan las marcas al guardar.                                           |
| Aceptar / Rechazar cambios                 |   ❌   | Requiere la licencia Pro del motor.                                                                        |
| Panel de revisiones                        |   ❌   |                                                                                                            |
| Comparar documentos                        |   ❌   |                                                                                                            |
| Combinar revisiones                        |   ❌   |                                                                                                            |
| Bloquear autores / Restringir edición      |   🟡   | La protección «solo rellenar formularios» existente se respeta.                                            |
| Ocultar entintado                          |   ❌   |                                                                                                            |

</details>

<details>
<summary><strong>Vista</strong></summary>

| Función                            | Estado | Notas                                                                 |
| ---------------------------------- | :----: | --------------------------------------------------------------------- |
| Modo de lectura                    |   ❌   |                                                                       |
| Diseño de impresión                |   ✅   | Es la única vista.                                                    |
| Diseño web                         |   ❌   |                                                                       |
| Esquema                            |   ❌   |                                                                       |
| Borrador                           |   ❌   |                                                                       |
| Modo Foco                          |   ❌   |                                                                       |
| Lector inmersivo                   |   ❌   |                                                                       |
| Movimiento de página (en paralelo) |   ❌   |                                                                       |
| Regla                              |   ✅   | Horizontal y vertical, en cm o pulgadas.                              |
| Líneas de cuadrícula               |   ❌   |                                                                       |
| Panel de navegación                |   ✅   | Títulos y búsqueda. Sin vista de miniaturas de páginas.               |
| Zoom                               |   ✅   | 10–500 %, menú de niveles y control deslizante en la barra de estado. |
| 100 %                              |   ✅   |                                                                       |
| Una página                         |   ✅   |                                                                       |
| Varias páginas                     |   ❌   |                                                                       |
| Ancho de página                    |   ✅   |                                                                       |
| Nueva ventana                      |   ❌   | Sí se abre una ventana por documento.                                 |
| Organizar todo                     |   ❌   |                                                                       |
| Dividir                            |   ❌   |                                                                       |
| Ver en paralelo                    |   ❌   |                                                                       |
| Cambiar ventanas                   |   🟡   | Con el gestor de ventanas del sistema (en macOS, menú Ventana).       |
| Macros                             |   🚫   | Se conservan en `.docm`/`.dotm` y nunca se ejecutan.                  |
| Tema claro / oscuro                |   ✅   | Claro, oscuro o del sistema; se recuerda entre sesiones.              |

</details>

<details>
<summary><strong>Pestañas contextuales</strong></summary>

**Diseño de tabla y Disposición de tabla**

| Función                                       | Estado | Notas                                                                            |
| --------------------------------------------- | :----: | -------------------------------------------------------------------------------- |
| Estilos de tabla (galería)                    |   ❌   | Los estilos existentes se muestran.                                              |
| Opciones: fila de encabezado, totales, bandas |   ❌   |                                                                                  |
| Bordes                                        |   🟡   | Todos, exteriores, interiores y ninguno (negro de ½ pt). Sin estilos ni colores. |
| Sombreado de celda                            |   🟡   | 6 colores predefinidos. Sin color personalizado.                                 |
| Seleccionar celda, fila, columna, tabla       |   ❌   |                                                                                  |
| Insertar filas arriba / abajo                 |   ✅   | También en el menú contextual.                                                   |
| Insertar columnas a la izquierda / derecha    |   ✅   |                                                                                  |
| Eliminar fila, columna o tabla                |   ✅   |                                                                                  |
| Combinar celdas                               |   👁️   | Las combinadas se muestran. El motor todavía no permite combinar.                |
| Dividir celdas / Dividir tabla                |   ❌   |                                                                                  |
| Autoajustar                                   |   👁️   | Diseño automático o fijo según el documento.                                     |
| Alto de fila y ancho de columna               |   🟡   | Arrastrando los bordes. Sin campos numéricos.                                    |
| Distribuir filas / columnas                   |   ❌   |                                                                                  |
| Alineación vertical de celda                  |   ✅   | Desde el menú contextual.                                                        |
| Alineación horizontal de tabla                |   ❌   |                                                                                  |
| Dirección del texto                           |   👁️   | Solo de abajo hacia arriba se muestra girado.                                    |
| Márgenes de celda                             |   👁️   |                                                                                  |
| Repetir filas de título                       |   👁️   | Se repiten en cada página. No se pueden marcar.                                  |
| No dividir fila entre páginas                 |   👁️   |                                                                                  |
| Tablas anidadas                               |   👁️   |                                                                                  |
| Tablas flotantes                              |   👁️   |                                                                                  |
| Ordenar                                       |   ❌   |                                                                                  |
| Fórmula                                       |   ❌   |                                                                                  |
| Convertir tabla en texto                      |   ❌   |                                                                                  |
| Propiedades de tabla (diálogo)                |   ❌   |                                                                                  |

**Formato de imagen**

| Función                                  | Estado | Notas                                                                           |
| ---------------------------------------- | :----: | ------------------------------------------------------------------------------- |
| Quitar fondo                             |   ❌   |                                                                                 |
| Correcciones (brillo, contraste)         |   👁️   |                                                                                 |
| Color (escala de grises, transparencia)  |   👁️   |                                                                                 |
| Efectos artísticos                       |   ❌   |                                                                                 |
| Comprimir / Cambiar / Restablecer imagen |   ❌   |                                                                                 |
| Estilos de imagen                        |   ❌   |                                                                                 |
| Borde de imagen                          |   ❌   |                                                                                 |
| Efectos de imagen (sombra, reflejo…)     |   ❌   |                                                                                 |
| Texto alternativo                        |   ✅   |                                                                                 |
| Posición                                 |   🟡   | En el diálogo Tamaño y posición.                                                |
| Ajustar texto                            |   🟡   | 7 modos, solo en imágenes flotantes.                                            |
| Girar 90° y voltear                      |   ✅   |                                                                                 |
| Giro libre                               |   ❌   |                                                                                 |
| Recortar                                 |   ⚙️   | Los recortes existentes se muestran; el motor permite recortar, falta el botón. |
| Tamaño                                   |   ✅   | Diálogo Tamaño y posición, o arrastrando las esquinas.                          |

**Encabezado y pie de página**

| Función                                     | Estado | Notas                                                          |
| ------------------------------------------- | :----: | -------------------------------------------------------------- |
| Número de página                            |   ✅   | Página actual, total y «Página X de Y».                        |
| Formato del número de página                |   👁️   | Los formatos existentes (romanos, letras, inicio) se respetan. |
| Fecha y hora                                |   ❌   |                                                                |
| Imágenes                                    |   🟡   | Se insertan desde Insertar › Imágenes.                         |
| Ir a encabezado / pie, anterior / siguiente |   ❌   |                                                                |
| Vincular al anterior                        |   ⚙️   | El motor lo permite; falta el botón.                           |
| Primera página diferente                    |   ✅   |                                                                |
| Páginas pares e impares diferentes          |   ✅   |                                                                |
| Mostrar texto del documento                 |   ❌   |                                                                |
| Posición (distancia al borde)               |   ⚙️   | El motor lo permite; falta el control.                         |
| Cerrar encabezado y pie                     |   ✅   |                                                                |

**Formato de forma, SmartArt, Gráfico y Ecuación**

| Función                                       | Estado | Notas                                                                                                           |
| --------------------------------------------- | :----: | --------------------------------------------------------------------------------------------------------------- |
| Formato de forma (relleno, contorno, efectos) |   ❌   | Las formas se muestran con relleno y trazo sólidos; degradados y texto dentro de formas aparecen como marcador. |
| Diseño / Formato de SmartArt                  |   ❌   |                                                                                                                 |
| Diseño / Formato de gráfico                   |   ❌   |                                                                                                                 |
| Herramientas de ecuación                      |   🟡   | Edición en sintaxis lineal: fracciones, raíces, índices y operadores n-arios. Sin galería de estructuras.       |

</details>

<details>
<summary><strong>Fidelidad al abrir documentos de Word</strong></summary>

Qué se ve al abrir un `.docx` creado en Word, aunque no haya un botón para crearlo. Todo lo que el motor no entiende se conserva al guardar.

| Elemento                                      | Estado | Notas                                                                                                          |
| --------------------------------------------- | :----: | -------------------------------------------------------------------------------------------------------------- |
| Estilos (herencia, valores por defecto, tema) |   ✅   | Cascada completa.                                                                                              |
| Todos los estilos y colores de subrayado      |   👁️   |                                                                                                                |
| Doble tachado, versalitas, mayúsculas, oculto |   👁️   |                                                                                                                |
| Espaciado, escala, posición y kerning         |   👁️   |                                                                                                                |
| Sombreado y borde de carácter                 |   👁️   |                                                                                                                |
| Efectos de texto de Word 2010+                |   🟡   | Solo el contorno sólido. Sombra, iluminado, reflejo y relleno degradado se conservan sin dibujarse.            |
| Bordes y sombreado de párrafo                 |   👁️   | La sombra del borde no se dibuja.                                                                              |
| Letra capital y marcos de texto               |   👁️   |                                                                                                                |
| Listas multinivel e imágenes de viñeta        |   👁️   |                                                                                                                |
| Tabulaciones con relleno                      |   ✅   |                                                                                                                |
| Columnas                                      |   👁️   | Equilibradas, desiguales y con separador.                                                                      |
| Secciones con distinto tamaño y orientación   |   ✅   |                                                                                                                |
| Encabezados y pies (primera página, pares)    |   ✅   |                                                                                                                |
| Bordes de página                              |   🟡   | Los de línea se muestran; los artísticos no.                                                                   |
| Marcas de agua                                |   👁️   |                                                                                                                |
| Color de página                               |   💾   |                                                                                                                |
| Números de línea                              |   💾   |                                                                                                                |
| Celdas combinadas                             |   👁️   |                                                                                                                |
| Tablas anidadas y flotantes                   |   👁️   |                                                                                                                |
| Imágenes en línea y flotantes con ajuste      |   ✅   | Incluido el ajuste a un polígono.                                                                              |
| Recorte y efectos de color de imagen          |   👁️   |                                                                                                                |
| Imágenes SVG, BMP y WebP                      |   ✅   |                                                                                                                |
| Imágenes EMF, WMF y TIFF                      |   💾   | Se ve un marcador con su nombre.                                                                               |
| Formas DrawingML                              |   🟡   | Relleno y trazo sólidos. Degradados, rellenos de imagen, texto dentro y giro aparecen como marcador.           |
| Formas VML (documentos antiguos)              |   🟡   | Un subconjunto de solo lectura.                                                                                |
| Cuadros de texto                              |   ✅   | Editables.                                                                                                     |
| SmartArt                                      |   💾   | Se ve un marcador.                                                                                             |
| Gráficos                                      |   💾   | Se ve un marcador.                                                                                             |
| Ecuaciones (OMML)                             |   🟡   | Fracciones, raíces, índices y n-arios. Lo demás se muestra como texto.                                         |
| Campos PAGE, NUMPAGES, SECTIONPAGES           |   ✅   |                                                                                                                |
| Campos REF, PAGEREF, NOTEREF, SEQ, STYLEREF   |   👁️   | Se evalúan.                                                                                                    |
| Campos DATE, TIME, DOCPROPERTY, SYMBOL        |   👁️   | Se evalúan.                                                                                                    |
| Campos MERGEFIELD, IF, INDEX, CITATION        |   👁️   | Se muestra el resultado guardado.                                                                              |
| Campos DDE, INCLUDE, LINK, MACROBUTTON        |   💾   | Nunca se ejecutan.                                                                                             |
| Vínculos y marcadores                         |   ✅   |                                                                                                                |
| Notas al pie y al final                       |   ✅   |                                                                                                                |
| Controles de contenido                        |   ✅   | Texto, casilla, lista, cuadro combinado, fecha, imagen y secciones repetibles: se rellenan desde el documento. |
| Campos de formulario heredados                |   ✅   | Texto, casilla y lista desplegable.                                                                            |
| Protección del documento                      |   🟡   | Se respeta; solo «rellenar formularios» se puede alternar.                                                     |
| Comentarios                                   |   💾   |                                                                                                                |
| Control de cambios                            |   👁️   | Estado final.                                                                                                  |
| Texto de derecha a izquierda (RTL / bidi)     |   ✅   | Algoritmo bidi de Unicode y modelado con HarfBuzz.                                                             |
| Texto asiático (fuentes, cuadrícula, kinsoku) |   👁️   | Sin texto vertical, ruby ni diseño asiático especial.                                                          |
| Guiones automáticos                           |   ❌   |                                                                                                                |
| Fuentes incrustadas                           |   ✅   | Se usan al dibujar, incluidas las ofuscadas.                                                                   |
| Modo de compatibilidad                        |   ✅   | Afecta a la paginación igual que en Word.                                                                      |
| Objetos OLE y ActiveX                         |   💾   | Nunca se ejecutan.                                                                                             |
| Macros VBA                                    |   💾   | Nunca se ejecutan.                                                                                             |
| Glosario, altChunk, subdocumentos, customXml  |   💾   |                                                                                                                |
| Variables de documento                        |   💾   |                                                                                                                |

</details>

<details>
<summary><strong>Formatos de archivo</strong></summary>

| Formato                            | Abrir | Guardar | Notas                                                  |
| ---------------------------------- | :---: | :-----: | ------------------------------------------------------ |
| Documento de Word (`.docx`)        |  ✅   |   ✅    |                                                        |
| Con macros (`.docm`)               |  ✅   |   ✅    | Las macros se conservan y nunca se ejecutan.           |
| Plantilla (`.dotx`, `.dotm`)       |  ✅   |   ❌    | Se abre como documento nuevo.                          |
| Word 97-2003 (`.doc`)              |  🟡   |   ❌    | Se convierte con LibreOffice, si está instalado.       |
| Texto enriquecido (`.rtf`)         |  🟡   |   ❌    | Con LibreOffice.                                       |
| OpenDocument (`.odt`)              |  🟡   |   ❌    | Con LibreOffice.                                       |
| Word XML 2003 / Flat OPC (`.xml`)  |  🟡   |   ❌    | Con LibreOffice.                                       |
| HTML / MHT guardado como `.doc`    |  🟡   |   ❌    | Con LibreOffice.                                       |
| Página web (`.htm`, `.html`)       |  ❌   |   ❌    |                                                        |
| Texto sin formato (`.txt`)         |  ❌   |   ❌    |                                                        |
| PDF                                |  ❌   |   ✅    | Exportar e imprimir. No se pueden abrir ni editar PDF. |
| XPS                                |  ❌   |   ❌    |                                                        |
| Documentos cifrados con contraseña |  ❌   |   ❌    |                                                        |
| Archivos de más de 512 MB          |  ❌   |    —    |                                                        |

</details>

<details>
<summary><strong>Plataforma y aplicación</strong></summary>

| Función                               | Estado | Notas                                                                              |
| ------------------------------------- | :----: | ---------------------------------------------------------------------------------- |
| Windows, macOS y Linux                |   ✅   | Mismo Chromium en los tres: paginación idéntica.                                   |
| Una ventana por documento             |   ✅   | Instancia única: los archivos de un segundo arranque van a la app abierta.         |
| Abrir desde la línea de comandos      |   ✅   |                                                                                    |
| Arrastrar y soltar archivos           |   ✅   |                                                                                    |
| Abrir con doble clic (asociación)     |   ✅   | Incluido `open-file` en macOS.                                                     |
| Deshacer / Rehacer                    |   ✅   | También desde el menú Edición de macOS.                                            |
| Recuperación automática               |   ✅   |                                                                                    |
| Aviso de cambios sin guardar          |   ✅   | Al cerrar y al salir; marca en el título de la ventana.                            |
| Barra de estado                       |   🟡   | Página X de Y, palabras y zoom. Sin selector de vistas ni indicadores de revisión. |
| Menú contextual                       |   ✅   | Portapapeles, ortografía, vínculo, tablas y tabla de contenido.                    |
| Navegación de la cinta con el teclado |   🟡   | Flechas entre pestañas. Sin KeyTips (Alt + letra).                                 |
| Tema oscuro                           |   ✅   |                                                                                    |
| Interfaz en varios idiomas            |   🟡   | Español e inglés.                                                                  |
| Funciona sin conexión                 |   ✅   | En producción no accede a la red.                                                  |
| Actualizaciones automáticas           |   ❌   |                                                                                    |
| Instaladores firmados                 |   ❌   | Ver [Distribución](#distribución).                                                 |
| Coautoría y almacenamiento en la nube |   🚫   |                                                                                    |
| Copilot / IA                          |   🚫   |                                                                                    |
| Complementos de Office                |   🚫   |                                                                                    |

</details>

## Atajos de teclado

En macOS, <kbd>Ctrl</kbd> equivale a <kbd>⌘</kbd>, salvo donde se indica.

| Atajo                                                                        | Acción                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| <kbd>Ctrl</kbd>+<kbd>N</kbd> / <kbd>O</kbd> / <kbd>S</kbd>                   | Nuevo / Abrir / Guardar                                                         |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> o <kbd>F12</kbd>               | Guardar como                                                                    |
| <kbd>Ctrl</kbd>+<kbd>W</kbd>                                                 | Cerrar (Windows y Linux)                                                        |
| <kbd>Ctrl</kbd>+<kbd>P</kbd>                                                 | Imprimir                                                                        |
| <kbd>Ctrl</kbd>+<kbd>F</kbd>                                                 | Buscar                                                                          |
| <kbd>Ctrl</kbd>+<kbd>H</kbd>                                                 | Reemplazar (también <kbd>Ctrl</kbd> en macOS)                                   |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd>                                  | Deshacer / Rehacer (⌘+Shift+Z en macOS)                                         |
| <kbd>Ctrl</kbd>+<kbd>X</kbd> / <kbd>C</kbd> / <kbd>V</kbd>                   | Cortar / Copiar / Pegar                                                         |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>                                | Pegar solo texto                                                                |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd>                                  | Copiar formato                                                                  |
| <kbd>Ctrl</kbd>+<kbd>A</kbd>                                                 | Seleccionar todo                                                                |
| <kbd>Ctrl</kbd>+<kbd>B</kbd> / <kbd>I</kbd> / <kbd>U</kbd>                   | Negrita / Cursiva / Subrayado                                                   |
| <kbd>Ctrl</kbd>+<kbd>=</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>=</kbd> | Subíndice / Superíndice                                                         |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>&gt;</kbd> / <kbd>&lt;</kbd>           | Agrandar / Reducir fuente (también <kbd>Ctrl</kbd>+<kbd>]</kbd> / <kbd>[</kbd>) |
| <kbd>Ctrl</kbd>+<kbd>L</kbd> / <kbd>E</kbd> / <kbd>R</kbd> / <kbd>J</kbd>    | Alinear izquierda / centro / derecha / justificar                               |
| <kbd>Ctrl</kbd>+<kbd>M</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> | Aumentar / Disminuir sangría                                                    |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>8</kbd>                                | Mostrar todo (¶)                                                                |
| <kbd>Ctrl</kbd>+<kbd>Enter</kbd>                                             | Salto de página                                                                 |
| <kbd>Ctrl</kbd>+<kbd>K</kbd>                                                 | Vínculo                                                                         |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd> / <kbd>D</kbd>                   | Nota al pie / Nota al final                                                     |
| <kbd>Esc</kbd>                                                               | Salir de Archivo o cerrar Buscar y reemplazar                                   |

## Desarrollo

Requisitos: Node 22.12 o superior (se recomienda Node 24) y pnpm.

> [!TIP]
> La versión de pnpm está fijada en `packageManager`. Ejecuta `corepack enable` una vez y se usará la correcta automáticamente.

```bash
pnpm install
pnpm dev       # app con recarga en caliente (descarga el binario de Electron la primera vez)
```

En Linux, `pnpm dev` agrega `--noSandbox` automáticamente: Ubuntu 24.04 o superior no permite el sandbox SUID de Chromium fuera de un paquete instalado. Los paquetes `.deb` lo resuelven al instalar.

Las dependencias se fijan a versión exacta (`saveExact: true` en `pnpm-workspace.yaml`): `pnpm add -D -E paquete@1.2.3` guarda `"1.2.3"`, nunca `"^1.2.3"`.

| Comando                             | Qué hace                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm run build`                    | Compila main, preload y renderer en `out/`                                                |
| `pnpm run typecheck`                | TypeScript (main/preload, renderer y E2E)                                                 |
| `pnpm run lint` / `pnpm run format` | ESLint / Prettier                                                                         |
| `pnpm test`                         | Pruebas unitarias (Vitest)                                                                |
| `pnpm run test:e2e`                 | Compila y ejecuta las E2E (Playwright sobre Electron)                                     |
| `pnpm run check:deps`               | Falla si aparece algún paquete Pro de docx-editor o alguna dependencia sin versión exacta |
| `pnpm run fidelity`                 | Corpus de fidelidad: lectura y escritura sin pérdidas                                     |
| `pnpm run fidelity:report`          | Informe de paginación frente a PDF de Word                                                |
| `pnpm run package:dir`              | Empaqueta sin instalador (`dist/<so>-unpacked`)                                           |
| `pnpm run package`                  | Instaladores para el SO actual (`dist/`)                                                  |

### Estructura

```
src/
  shared/    contrato IPC (ipc-contract.ts) y utilidades sin dependencias de Electron
  main/      proceso principal: protocolo app://, seguridad, ventanas, IPC, menú
  preload/   puente mínimo window.openword (contextBridge)
  renderer/  React: EditorHost (motor), cinta, barra de estado, i18n
tests/
  unit/             Vitest
  e2e/              Playwright (_electron)
  corpus/           documentos .docx reales para las pruebas de fidelidad (con su licencia)
  fixtures/         documentos de prueba de las E2E
  fidelity/         corpus sin DOM: lectura y escritura sin pérdidas (pnpm run fidelity)
  fidelity-report/  informe de paginación frente a PDF de Word
tools/
  ooxml-validator/  validador con el Open XML SDK (.NET), usado por el CI
scripts/            dev, comprobación de dependencias y validación OOXML
docs/               fidelidad, QA manual y distribución
```

## Seguridad

Los documentos se tratan como entrada no confiable:

- El renderer corre con `sandbox`, `contextIsolation` y sin Node.
- Se sirve por `app://openword` con una CSP estricta (solo `wasm-unsafe-eval` para HarfBuzz).
- No se permite navegar ni abrir ventanas nuevas. Los vínculos `http`, `https` y `mailto` se abren en el navegador del sistema.
- En producción no hay acceso a la red.
- El IPC solo atiende mensajes de nuestro origen.
- Las macros, los objetos OLE y los campos que ejecutan código se conservan, pero nunca se ejecutan.
- El binario empaquetado lleva Electron Fuses: sin `RunAsNode`, sin `NODE_OPTIONS`, sin `--inspect`, con integridad ASAR y cargando solo desde el ASAR.

## Distribución

El CI genera instaladores para los tres sistemas operativos.

> [!WARNING]
> Los builds del CI salen **sin firmar**. Antes de entregar la app a usuarios finales hace falta:
>
> - **macOS:** Apple Developer ID y notarización (variables `CSC_LINK`, `APPLE_API_KEY`…).
> - **Windows:** certificado Authenticode o Azure Trusted Signing.

Más documentación:

- [`docs/FIDELIDAD.md`](docs/FIDELIDAD.md): corpus de fidelidad, validación OOXML y diferencias conocidas.
- [`docs/QA-MANUAL.md`](docs/QA-MANUAL.md): checklist de pruebas manuales.
- [`docs/DISTRIBUCION.md`](docs/DISTRIBUCION.md): empaquetado, instaladores y firma.
