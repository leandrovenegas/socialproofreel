# SocialProofREEL — Ecosistema y Motor de Renderizado

Este repositorio es el núcleo compartido del ecosistema **SocialProofREEL**, un sistema automatizado diseñado para generar videos publicitarios verticales (tipo Reels 9:16) a partir de las reseñas de Google Maps de negocios locales.

El objetivo de estos videos es servir como activos de conversión de alto impacto ("bait") para redirigir tráfico cualificado a la landing page principal: [leandrovenegas.cl](https://leandrovenegas.cl).

---

## 1. Arquitectura General del Ecosistema

El proyecto completo se divide en tres componentes independientes que se ejecutan de forma coordinada a través de una base de datos centralizada en Supabase:

```mermaid
flowchart TD
    subgraph Frontend [Nube (Vercel)]
        A[portafolio / Next.js] -->|1. Configura Plantilla WYSIWYG| B[(Supabase DB)]
        A -->|2. Agrega negocio a la cola| B
    end

    subgraph Database [BaaS (Supabase)]
        B -->|settings| C[Configuración de Estilos JSONB]
        B -->|video_queue| D[Cola de Trabajos de Render]
    end

    subgraph LocalWorker [Servidor Local (Ubuntu/Docker)]
        E[sync_agent.py Daemon] -->|3. Polling cada 10s| B
        E -->|4. Descarga datos & fotos| F[places_api.py]
        E -->|5. Procesa renderizado| G[render_remotion.py]
        G -->|6. Compila React a Video| H[remotion_engine]
        G -->|7. Muxea audio.mp3| I[FFmpeg Engine]
        G -->|8. Sube video final| J[Bunny.net CDN]
    end
```

### Flujo End-to-End
1. **Edición**: El administrador diseña la plantilla en el panel de control de Next.js (`/admin/editor`). Los estilos visuales se almacenan en Supabase (`settings`).
2. **Encolado**: Se solicita la creación de un video para un comercio enviando su nombre a la cola (`video_queue`).
3. **Orquestación**: El worker local en Ubuntu Server detecta el trabajo `pending` y realiza la extracción de reseñas y fotos usando la API de Google Places.
4. **Compilación**: El motor de Remotion compila los componentes de React a frames y genera un video MP4 sin audio.
5. **Post-procesamiento**: FFmpeg mezcla una pista de voz/música de fondo en formato `.mp3`.
6. **Almacenamiento**: El archivo final se sube a Bunny CDN y la URL pública del video se registra en la base de datos para consumo del cliente.

---

## 2. Estructura de este Repositorio (`socialproofreel`)

Este espacio de trabajo contiene las utilidades compartidas, tipos de datos y scripts de control clave para el pipeline de video:

```text
socialproofreel/
├── lib/
│   ├── supabase/
│   │   └── client.ts      # Cliente hidratado de Supabase para Node.js
│   └── types.ts           # Definiciones de TypeScript (Lead, Settings, etc.)
├── scripts/
│   └── upload_raw_leads.mjs # Script para importar leads por lotes desde JSON
├── render_remotion.py     # Script ejecutable en Python para procesar el render local
├── next.config.mjs        # Configuración del framework Next.js
├── tsconfig.json          # Configuración del compilador TypeScript
└── package.json           # Dependencias de Node.js (Next, Remotion, Supabase, Tailwind)
```

### Componentes Clave

* **[lib/types.ts](file:///y:/proyects/socialproofreel/lib/types.ts)**: Define el contrato de interfaces compartidas de TypeScript para asegurar consistencia entre el Frontend y el Backend. Contiene estructuras como `Lead`, `TemplateConfig`, `Settings` y `VideoQueue`.
* **[render_remotion.py](file:///y:/proyects/socialproofreel/render_remotion.py)**: Puente de Python que interactúa con la base de datos de Supabase y el compilador de Remotion. Se encarga de:
  - Descargar la última configuración visual activa.
  - Codificar las imágenes locales y avatars de reseñas en formato **Base64** para sortear las directivas CORS del navegador Chromium Headless de Remotion.
  - Inyectar las propiedades estructuradas en un archivo temporal `props.json`.
  - Invocar mediante subproceso a `npx remotion render` contra el directorio `remotion_engine`.
  - Ejecutar un multiplexado de audio y video súper rápido con FFmpeg para añadir la pista `audio.mp3`.
  - Versionar el archivo resultante (`video_v1.mp4`, `video_v2.mp4`) en el directorio local.
* **[scripts/upload_raw_leads.mjs](file:///y:/proyects/socialproofreel/scripts/upload_raw_leads.mjs)**: Carga masiva por lotes de 100 leads crudos desde un JSON de negocios (`global_businesses.json`) directamente a la tabla `raw_leads` de Supabase usando WebSockets de soporte.

---

## 3. Esquema de Base de Datos (Supabase)

### Tabla: `settings`
Almacena las variables de estilo visual del reproductor y el renderizador de video.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | Identificador único del perfil de configuración. |
| `primary_color` | text | Color hexadecimal principal (legacy). |
| `blur_level` | integer | Nivel de desenfoque del fondo (legacy). |
| `font_family` | text | Fuente de texto elegida (legacy). |
| `config` | jsonb | **Configuración visual unificada**. Almacena la jerarquía completa de personalización. |
| `updated_at` | timestamptz | Última vez que se guardaron cambios desde el editor WYSIWYG. |

> [!NOTE]
> El campo `config` (JSONB) es la fuente de verdad del diseño de la plantilla. Estructura ejemplo:
> ```json
> {
>   "primary_color": "#00ACC1",
>   "blur_level": 10,
>   "font_family": "'Roboto', sans-serif",
>   "layout": "Center",
>   "avatar_size": 197,
>   "review_text_size": 56,
>   "reviewer_name_size": 50,
>   "component_order": [
>     { "id": "avatar", "label": "Avatar", "visible": true },
>     { "id": "stars", "label": "Estrellas", "visible": true },
>     { "id": "review_text", "label": "Texto de Reseña", "visible": true },
>     { "id": "reviewer_name", "label": "Nombre del Autor", "visible": true }
>   ],
>   "business_name": { "visible": true, "show_rating": true, "text_size": 52 },
>   "effects": {
>     "fade_in_duration": 20,
>     "card_slide_distance": 60,
>     "card_damping": 14,
>     "stars_initial_scale": 0.3,
>     "stars_damping": 10,
>     "stagger_delay": 5
>   }
> }
> ```

### Tabla: `video_queue`
Cola de trabajos para el renderizador en el worker.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | uuid | Identificador del trabajo de render. |
| `business_name` | text | Nombre del negocio sobre el cual realizar scraping. |
| `maps_url` | text | URL de Google Maps para forzar lookup exacto (opcional). |
| `status` | text | Estado del ciclo de vida: `pending` ➔ `fetching_data` ➔ `rendering` ➔ `completed` / `failed`. |
| `local_video_path` | text | Ubicación del archivo en el disco local del servidor. |
| `execution_time_seconds` | float | Segundos tomados por el compilador para renderizar el MP4. |
| `error_message` | text | Logs de error en caso de que falle. |

---

## 4. Configuración e Instalación

### Requisitos Previos
* **Node.js** v20 o superior.
* **pnpm** o **npm** para gestión de dependencias de Javascript.
* **Python** 3.10+ instalado en el entorno de ejecución.
* **FFmpeg** instalado y disponible globalmente en la variable `%PATH%` de tu sistema operativo.

### Instalación de dependencias
1. **Javascript**:
   ```bash
   pnpm install
   ```
2. **Python** (dependencias del script de renderizado):
   ```bash
   pip install python-dotenv supabase
   ```

### Variables de Entorno (`.env`)
Debes crear un archivo `.env` en la raíz de este directorio para conectarte con Supabase:
```env
# Supabase Backend credentials
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-service-role-key-o-anon-key

# Supabase Frontend client credentials (utilizadas por scripts de Node)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

## 5. Instrucciones de Uso

### Ejecutar Renderizado Manual Local
Si deseas compilar el video de un negocio específico que ya cuenta con los archivos de metadatos descargados en la carpeta local:
```bash
python render_remotion.py y:/proyects/SocialProofREEL-Worker/videos_locales/{business_id}
```
*Este comando leerá la configuración de Supabase, generará los props con assets codificados en base64, correrá Remotion en Chromium y unirá la música de fondo.*

### Importar Leads Masivos
Para rellenar la base de datos de leads procesables en base a tu listado JSON global (`global_businesses.json`):
```bash
node --env-file=.env scripts/upload_raw_leads.mjs
```

---

## 6. Resolución de Problemas Comunes (Troubleshooting)

### 1. Error de carga de recursos locales (CORS / Sandboxing de Chromium)
* **Síntoma**: Chromium headless devuelve errores `404 Not Found` o rechaza peticiones con protocolo `file:///` para cargar fotos y avatares de las reseñas.
* **Solución**: El script `render_remotion.py` convierte automáticamente todas las imágenes locales a **Data URLs en Base64** (`data:image/jpeg;base64,...`) antes de alimentar a Remotion. Asegúrate de que los campos del JSON inyectados en la plantilla usen `background_base64` y `avatar_base64` en lugar de las rutas directas a ficheros de disco.

### 2. Error 401: Unauthorized en la subida a Bunny.net (Regiones Físicas)
* **Síntoma**: El worker devuelve error de autorización `401 Unauthorized` al intentar subir videos a Bunny Storage a pesar de que el token es correcto.
* **Causa**: Las zonas de almacenamiento de Bunny en regiones no europeas (ej. Brasil) requieren que las peticiones apunten al endpoint regional exacto (ej. `br.storage.bunnycdn.com`) y fallan en el host genérico.
* **Solución**: Configura la variable `BUNNY_HOSTNAME=br.storage.bunnycdn.com` en tu `.env` del worker para que el script `upload_to_bunny.py` resuelva la subida contra el servidor geográfico correcto.

### 3. Permisos de Archivos Samba
* **Síntoma**: Errores al abrir o escribir archivos temporales desde contenedores de Docker montados en volúmenes compartidos.
* **Solución**: Verifica que el propietario de los directorios en Ubuntu sea el usuario correcto corriendo la terminal:
  ```bash
  sudo chown -R $USER:$USER ~/proyects/
  ```
