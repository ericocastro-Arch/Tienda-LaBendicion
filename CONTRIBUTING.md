# Cómo contribuir

## Antes de empezar

1. Actualiza tu copia de `develop`:
   ```bash
   git switch develop
   git pull origin develop
   ```
2. Crea una rama descriptiva:
   ```bash
   git switch -c feature/descripcion-corta
   ```
3. Configura el entorno siguiendo el [README](README.md).

## Durante el desarrollo

- Haz cambios pequeños y relacionados con una sola tarea.
- Escribe mensajes de commit claros, por ejemplo: `feat: agregar filtro de productos`.
- Ejecuta `npm run build` y `npm test` antes de abrir un Pull Request.
- Incluye o actualiza pruebas cuando modifiques lógica del servidor.
- Nunca subas `.env`, credenciales, datos reales, `node_modules`, archivos de cobertura o bases de datos locales.

## Pull Requests

1. Sube tu rama: `git push -u origin feature/descripcion-corta`.
2. Abre un Pull Request contra `develop`.
3. Explica qué cambiaste, cómo lo probaste y qué queda pendiente.
4. Solicita la revisión de al menos un compañero.
5. Integra solo cuando las comprobaciones automáticas estén correctas y no haya comentarios pendientes.

## Integración a producción

Los cambios llegan a `main` mediante un Pull Request desde `develop`. Mantén `main` protegido en GitHub para exigir Pull Request y comprobaciones aprobadas.
