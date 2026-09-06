# La Bendición POS

Sistema interno de inventario, ventas y administración para la tienda La Bendición. Es un monorepo con un cliente React/Vite y una API Node.js/Express con PostgreSQL y Prisma.

## Requisitos

- Node.js 22 (usa `nvm use` si tienes nvm instalado).
- npm 10 o superior.
- Docker y Docker Compose para la base de datos local.

## Inicio rápido

```bash
git clone git@github.com:ericocastro-Arch/Tienda-LaBendicion.git
cd Tienda-LaBendicion
nvm use
npm ci
cp .env.example .env
docker compose up -d
npm run prisma:generate
npm run db:deploy
npm run dev
```

El cliente queda disponible en `http://localhost:5173` y la API en `http://localhost:4000`.

La configuración canónica es el archivo `.env` de la raíz. No crees archivos `.env` dentro de `client` o `server`.

## Comandos útiles

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia API y cliente en desarrollo. |
| `npm run build` | Genera la compilación de producción del cliente. |
| `npm test` | Ejecuta las pruebas del servidor y la cobertura. |
| `npm run prisma:generate` | Genera el cliente de Prisma. |
| `npm run db:migrate` | Crea una migración durante desarrollo. |
| `npm run db:deploy` | Aplica migraciones existentes. |
| `docker compose up -d` | Inicia PostgreSQL local. |
| `docker compose down` | Detiene PostgreSQL sin borrar los datos. |

## Base de datos local

`compose.yaml` expone PostgreSQL en `localhost:5433` y crea la base `labendicion_db`. Las credenciales de desarrollo están en `.env.example`; son exclusivamente locales y no deben usarse en producción.

Para reiniciar completamente los datos locales:

```bash
docker compose down -v
docker compose up -d
npm run db:deploy
```

Esto borra únicamente el volumen local de Docker.

## Flujo de trabajo

- `main` contiene versiones estables.
- `develop` integra el trabajo que está en desarrollo.
- Cada tarea se desarrolla en una rama `feature/nombre-corto`, creada desde `develop`.
- Abre un Pull Request hacia `develop`, espera revisión y la validación automática antes de integrar.
- No hagas `push` directo a `main` ni subas archivos `.env`, claves, bases de datos o `node_modules`.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para el proceso completo.

## Seguridad

No publiques secretos ni datos reales de la tienda. Si encuentras una vulnerabilidad, no abras un issue público con los detalles: comunícala de forma privada al responsable del repositorio.
