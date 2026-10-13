# 📱 Pendientes Camilo Guerra & Manager (PWA)

Aplicación Web Progresiva (**PWA**) instalable en celular y computadora, diseñada para la gestión ágil de tareas entre **Camilo Guerra** y su **Manager**. Se sincroniza en tiempo real con una base de datos gratuita en **Google Sheets** usando Google Apps Script.

---

## 🚀 Características Principales

1. **Categorías Especializadas**:
   - 🚨 **Pendientes Urgentes**: Fechas límites, entregas críticas y prioridades altas.
   - 🎥 **Solicitudes de Videos y Media**: Peticiones de contenido a Camilo (Reels, TikToks, menciones, links de referencia).
   - 💡 **Ideas Vagas**: Espacio de brainstorming y conceptos creativos sin presión.
   - 📋 **Tareas de Gestión**: Tareas asignadas directamente al Manager por Camilo (logística, grabaciones, contratos).

2. **Selector de Identidad Rápido (Manager 👔 / Camilo 🎬)**:
   - Cambia con un toque entre la vista del Manager y la de Camilo.
   - Filtro directo **"🎯 Para Mí"** para ver únicamente lo que tienes pendiente tú.
   - Asignación cruzada automática (si eres Manager, por defecto le asignas a Camilo y viceversa).

3. **100% Instalable (PWA)**:
   - Funciona sin conexión a internet (**Offline** con Service Worker).
   - Puedes instalarla como aplicación nativa en tu pantalla de inicio en Android, iPhone, Mac o Windows.

4. **Base de Datos en Google Sheets**:
   - Todo se almacena en una hoja de cálculo visible para ambos.
   - Sin servidores de pago ni suscripciones.

---

## 🛠️ Paso 1: Configurar la Base de Datos en Google Sheets

1. Abre [Google Sheets](https://sheets.new) y crea una hoja nueva (ej: `Pendientes Camilo & Manager`).
2. En el menú superior, ve a **Extensiones > Apps Script**.
3. Borra cualquier código que aparezca y copia y pega el contenido completo del archivo [`google-apps-script.js`](./google-apps-script.js).
4. Guarda el proyecto (icono de disquete o `Ctrl + S`).
5. Haz clic en el botón azul superior **Implementar (Deploy)** > **Nueva implementación (New deployment)**.
6. Haz clic en el engranaje de configuración y selecciona **Aplicación web (Web app)**:
   - **Descripción**: `API Pendientes v1`
   - **Ejecutar como**: `Yo` (tu correo)
   - **Quién tiene acceso**: `Cualquiera` (*Anyone* - importante para permitir la lectura y guardado desde la PWA).
7. Haz clic en **Implementar**, acepta los permisos de Google.
8. Copia la **URL de la aplicación web** (la que termina en `/exec`).

---

## 🌐 Paso 2: Activar GitHub Pages

1. Sube este repositorio a tu cuenta de GitHub.
2. En el repositorio de GitHub, entra en **Settings** > **Pages** (en el menú lateral izquierdo).
3. En la sección **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (o `master`) y carpeta `/(root)`.
4. Haz clic en **Save**.
5. En un par de minutos, GitHub te dará el enlace público: `https://tu-usuario.github.io/pendientes-camilo/`.

---

## ⚙️ Paso 3: Conectar la PWA con Google Sheets

1. Abre el enlace de la PWA en tu navegador o celular.
2. Toca el icono de engranaje **⚙️ (Ajustes)** en la esquina superior derecha.
3. Pega la URL de tu Google Apps Script (la que termina en `/exec`).
4. Haz clic en **"🔗 Probar Conexión"** y luego en **"💾 Guardar Configuración"**.
5. ¡Listo! Ya sincronizarán en tiempo real.

---

## 📲 ¿Cómo Instalar en el Celular?

### En Android (Chrome):
- Abre la página y toca el aviso inferior **"Agregar a la pantalla principal"** o toca los 3 puntos superiores y selecciona **"Instalar aplicación"**.

### En iPhone / iOS (Safari):
- Abre la página en Safari.
- Toca el botón de **Compartir** (icono de cuadro con flecha hacia arriba).
- Desplázate hacia abajo y selecciona **"Agregar al inicio" (Add to Home Screen)**.
- Tendrás el icono en tu pantalla como cualquier app de la App Store.
