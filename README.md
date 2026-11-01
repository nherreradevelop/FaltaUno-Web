# FaltaUno - Web

Cliente web de FaltaUno (React + Vite + TypeScript), la plataforma para organizar actividades deportivas al aire libre y encontrar compañeros.
Proyecto final de la carrera Analista en Tecnologías de la Información (Universidad ORT Uruguay).

| Repositorio                                                            | Contenido                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| [FaltaUno](https://github.com/nherreradevelop/FaltaUno)                | API, esquema de la base, Docker de desarrollo y flujos de n8n |
| [FaltaUno-Web](https://github.com/nherreradevelop/FaltaUno-Web) (este) | Cliente web                                                   |
| [FaltaUno-Mobile](https://github.com/nherreradevelop/FaltaUno-Mobile)  | App móvil                                                     |

## Requisitos

- [Node.js 22](https://nodejs.org) (la versión está fijada en `.nvmrc`)
- La API corriendo en local: seguir el README del repositorio [FaltaUno](https://github.com/nherreradevelop/FaltaUno) (`docker compose up -d` y levantar la API)
- VS Code con las extensiones **ESLint** y **Prettier**

## Primera vez

```bash
git clone https://github.com/nherreradevelop/FaltaUno-Web.git
cd FaltaUno-Web
npm install
cp .env.example .env      # en PowerShell: Copy-Item .env.example .env
```

## Ejecutar

Con la API corriendo en local (`http://localhost:3000`):

```bash
npm run dev       # http://localhost:5173
npm run build     # verifica los tipos y genera la versión de producción en dist/
npm run preview   # sirve lo que quedó en dist/
```

En `.env`, `VITE_GOOGLE_CLIENT_ID` es el Client ID de OAuth de tipo "Aplicación web". Si queda vacío, no se muestra el botón de Google.

## Calidad de código

- **Prettier** da el formato (`.prettierrc`) y **ESLint** revisa el código (`eslint.config.mjs`).
- **Husky** ejecuta ambos sobre los archivos de cada commit (`lint-staged`). Si ESLint encuentra un error, el commit se cancela.
- `tsconfig.json` extiende `tsconfig.base.json` (modo estricto).

```bash
npm run lint           # revisar todo el repositorio
npm run lint:fix       # corregir lo que se pueda automáticamente
npm run format         # formatear todo
npm run format:check   # verificar el formato sin modificar
```

## Integración continua

GitHub Actions (`.github/workflows/ci.yml`) se ejecuta en cada pull request y push a `develop` o `main`: lint y formato siempre; compilación y pruebas en cuanto existan los scripts `build` y `test`.

## Forma de trabajo

La misma en los tres repositorios: ramas `develop` y `main`, cada tarea en una rama `feature/...` o `fix/...` que entra a `develop` por pull request revisado por otro integrante y con el CI en verde, y cada entrega etiquetada con su versión (`v0.1.0`, ...).
