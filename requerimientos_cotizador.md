# Sistema de Cotización — Reparación de Equipos Eléctricos
**Documento de Requerimientos y Casos de Uso**
Versión 1.0 — Mayo 2026

---

## 1. Descripción General

Aplicación web de página única (SPA) para generar cotizaciones de reparación de equipos eléctricos (televisores y similares). Funciona sin autenticación, sin backend, almacenando los datos del mantenedor de ítems en `localStorage` del navegador. El uso es interno por el técnico o encargado del negocio.

---

## 2. Módulos del Sistema

| # | Módulo | Descripción |
|---|--------|-------------|
| M1 | Mantenedor de Ítems | CRUD de servicios/reparaciones con nombre y precio |
| M2 | Creación de Cotización | Selección de ítems, cliente, retiro/despacho, totales |
| M3 | Exportación | Generación de PDF imprimible y envío por WhatsApp |

---

## 3. Requerimientos Funcionales

### RF-01 — Mantenedor de Ítems
- El sistema debe permitir **crear** un ítem con: nombre descriptivo y precio unitario en CLP.
- El sistema debe permitir **editar** nombre y precio de un ítem existente.
- El sistema debe permitir **eliminar** un ítem con confirmación previa.
- Los ítems deben persistir en `localStorage`.
- Debe existir un set de ítems precargados como ejemplo (pantallas, fusibles, condensadores, etc.).

### RF-02 — Creación de Cotización
- Desde la vista principal se debe poder iniciar una nueva cotización.
- La cotización debe incluir:
  - Nombre del cliente (texto libre).
  - Fecha (autocompletada con la fecha actual, editable).
  - Número de cotización (autoincremental).
  - Listado de ítems seleccionados del mantenedor con cantidad y precio unitario.
  - Posibilidad de agregar un ítem ad-hoc directamente en la cotización; dicho ítem **se guarda automáticamente en el mantenedor** para uso futuro.
  - Opción de **Retiro a domicilio** (checkbox con precio configurable, por defecto $5.000).
  - Opción de **Despacho/entrega** (checkbox con precio configurable, por defecto $5.000).
  - Subtotal, total calculado automáticamente.
  - Campo de observaciones/notas (texto libre, opcional).

### RF-03 — Exportación PDF
- El sistema debe generar un PDF con el detalle completo de la cotización.
- El PDF debe incluir: número de cotización, fecha, nombre del cliente, tabla de ítems (cantidad, descripción, precio unitario, subtotal por ítem), retiro/despacho si aplica, total, observaciones.
- El PDF debe ser descargable directamente desde el navegador sin servidor.

### RF-04 — Envío por WhatsApp
- El sistema debe generar un mensaje de texto formateado con el resumen de la cotización.
- Al hacer clic en "Enviar por WhatsApp" debe abrir `wa.me` con el mensaje prellenado.
- El usuario debe poder ingresar el número de teléfono del cliente (con prefijo +56 por defecto).

---

## 4. Requerimientos No Funcionales

| ID | Requerimiento |
|----|---------------|
| RNF-01 | HTML/CSS/JS puro, sin frameworks ni build tools |
| RNF-02 | Un único archivo `.html` autocontenido |
| RNF-03 | Compatible con Chrome y Edge modernos |
| RNF-04 | Responsivo: usable en tablet y desktop |
| RNF-05 | Datos persistidos en `localStorage` del navegador |
| RNF-06 | PDF generado client-side con librería `jsPDF` (CDN) |
| RNF-07 | Sin dependencia de internet para funcionar (salvo CDN en primera carga) |

---

## 5. Casos de Uso

---

### CU-01: Crear ítem en el mantenedor

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | El usuario está en la vista "Mantenedor de Ítems" |
| **Flujo principal** | 1. El usuario hace clic en "Nuevo Ítem". 2. Ingresa nombre y precio. 3. Hace clic en "Guardar". 4. El ítem aparece en la lista y se persiste en localStorage. |
| **Flujo alternativo** | Si nombre o precio están vacíos, se muestra mensaje de validación y no se guarda. |
| **Postcondición** | El ítem está disponible para seleccionar en futuras cotizaciones. |

---

### CU-02: Editar ítem existente

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | Existe al menos un ítem en el mantenedor |
| **Flujo principal** | 1. El usuario hace clic en el ícono de edición del ítem. 2. Los campos nombre y precio se vuelven editables. 3. El usuario modifica los datos y guarda. 4. Se actualiza en localStorage. |
| **Flujo alternativo** | El usuario puede cancelar la edición sin guardar cambios. |

---

### CU-03: Eliminar ítem

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | Existe al menos un ítem en el mantenedor |
| **Flujo principal** | 1. El usuario hace clic en el ícono de eliminar. 2. Se muestra confirmación ("¿Eliminar este ítem?"). 3. El usuario confirma. 4. El ítem se elimina de la lista y de localStorage. |
| **Flujo alternativo** | Si el usuario cancela, no se realiza ninguna acción. |

---

### CU-04: Crear cotización nueva

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | Existen ítems en el mantenedor (o se crearán ad-hoc) |
| **Flujo principal** | 1. El usuario hace clic en "Nueva Cotización". 2. Ingresa nombre del cliente. 3. Verifica/edita la fecha. 4. Agrega ítems desde el selector (dropdown del mantenedor + cantidad). 5. Activa/desactiva retiro y/o despacho. 6. Agrega observaciones si corresponde. 7. El sistema calcula el total en tiempo real. |
| **Flujo alternativo** | El usuario puede agregar un ítem que no existe en el mantenedor escribiendo descripción y precio manualmente. |
| **Postcondición** | La cotización está lista para exportar. |

---

### CU-05: Agregar ítem ad-hoc a cotización

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | Se está editando una cotización |
| **Flujo principal** | 1. El usuario hace clic en "Agregar ítem personalizado". 2. Ingresa descripción y precio. 3. El ítem se añade a la cotización con cantidad 1 (editable). 4. El ítem se **guarda automáticamente en el mantenedor** (localStorage) y queda disponible para futuras cotizaciones. 5. El total se recalcula automáticamente. |
| **Flujo alternativo** | Si ya existe un ítem con el mismo nombre en el mantenedor, el sistema alerta al usuario y le pregunta si desea reemplazarlo o agregar uno duplicado. |
| **Postcondición** | El ítem ad-hoc queda persistido en el mantenedor y es seleccionable en cualquier cotización futura. |

---

### CU-06: Incluir retiro y/o despacho

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | Se está editando una cotización |
| **Flujo principal** | 1. El usuario activa el checkbox "Retiro a domicilio" y/o "Despacho/entrega". 2. El sistema agrega la línea correspondiente con el precio configurado. 3. El total se recalcula. |
| **Flujo alternativo** | El usuario puede modificar el precio de retiro/despacho directamente en la cotización. |

---

### CU-07: Exportar cotización como PDF

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | La cotización tiene al menos un ítem y nombre de cliente |
| **Flujo principal** | 1. El usuario hace clic en "Descargar PDF". 2. El sistema genera el documento con jsPDF. 3. El navegador descarga el archivo `cotizacion-NNN.pdf`. |
| **Flujo alternativo** | Si falta el nombre del cliente, se muestra validación. |

---

### CU-08: Enviar cotización por WhatsApp

| Campo | Detalle |
|-------|---------|
| **Actor** | Técnico / Encargado |
| **Precondición** | La cotización tiene al menos un ítem |
| **Flujo principal** | 1. El usuario ingresa el número de teléfono del cliente (formato +569XXXXXXXX). 2. Hace clic en "Enviar por WhatsApp". 3. El sistema abre `https://wa.me/56XXXXXXXXX?text=...` con el resumen prellenado. 4. WhatsApp Web o la app se abre con el mensaje listo para enviar. |
| **Flujo alternativo** | Si el número está vacío, el link abre WhatsApp sin destinatario (el usuario elige el contacto manualmente). |

---

## 6. Modelo de Datos (localStorage)

```json
// Clave: "cotizador_items"
[
  { "id": "uuid", "nombre": "Cambio de pantalla hasta 36\"", "precio": 30000 },
  { "id": "uuid", "nombre": "Cambio de pantalla hasta 50\"", "precio": 42000 }
]

// Clave: "cotizador_config"
{
  "precio_retiro": 5000,
  "precio_despacho": 5000,
  "ultimo_numero_cotizacion": 12
}
```

---

## 7. Ítems Precargados (Seed)

| Descripción | Precio CLP |
|-------------|-----------|
| Cambio de pantalla hasta 32" | $28.000 |
| Cambio de pantalla hasta 40" | $35.000 |
| Cambio de pantalla hasta 50" | $42.000 |
| Cambio de pantalla hasta 65" | $58.000 |
| Cambio de tarjeta principal | $25.000 |
| Cambio de fuente de poder | $18.000 |
| Cambio de condensadores | $8.000 |
| Cambio de parlantes | $12.000 |
| Revisión diagnóstico | $5.000 |
| Mano de obra general | $15.000 |

---

## 8. Estructura de Vistas

```
┌─────────────────────────────────┐
│  HEADER: Cotizador Técnico      │
│  [Nueva Cotización] [Mantenedor]│
└─────────────────────────────────┘
         │                │
         ▼                ▼
  ┌─────────────┐  ┌──────────────────┐
  │  VISTA:     │  │  VISTA:          │
  │  Nueva      │  │  Mantenedor      │
  │  Cotización │  │  de Ítems        │
  │             │  │                  │
  │ - Cliente   │  │ - Lista ítems    │
  │ - Fecha     │  │ - Crear/Editar   │
  │ - Ítems     │  │ - Eliminar       │
  │ - Retiro    │  └──────────────────┘
  │ - Despacho  │
  │ - Total     │
  │ [PDF][WA]   │
  └─────────────┘
```

---

*Documento generado para implementación en HTML/CSS/JS puro con jsPDF (CDN). Sin backend, sin autenticación.*
