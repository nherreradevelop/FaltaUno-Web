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

## Crear el proyecto de Vite (una sola vez)

El proyecto va en la raíz del repositorio. Como la raíz ya tiene la configuración, la plantilla se crea en una carpeta aparte y se trae:

1. Fuera del repositorio: `npm create vite@latest faltauno-web-tmp -- --template react-ts`
2. Copiar a la raíz del repositorio: `index.html`, `public/`, `src/` y `vite.config.ts`.
3. En el `package.json` del repositorio, agregar los scripts `dev`, `build` y `preview` de la plantilla, y sus `dependencies`. De sus `devDependencies`, agregar solo las de Vite, React y tipos (`vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`), sin las de ESLint.
4. Conservar `tsconfig.json`, `eslint.config.mjs`, `.gitignore` y `README.md` del repositorio. No copiar `tsconfig.app.json` ni `tsconfig.node.json` de la plantilla.
5. `npm install`, `npm run dev` y borrar la carpeta temporal.

Recomendado: el script `build` como `"tsc --noEmit && vite build"`, para que el CI también verifique los tipos.

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
