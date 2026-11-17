# Regresión de detalle y cierre de sesión

## Cambios

- CU09: el adaptador valida la respuesta real antes de mostrar el detalle. Un HTTP 200 con datos incompletos muestra un error recuperable y Reintentar. Un límite de errores contiene fallos de render inesperados.
- CU37: se registra una marca vinculada a la huella SHA256 del token antes del cierre remoto. La restauración consulta las marcas antes de habilitar rutas privadas. Se intentan localStorage, sessionStorage y una cookie del mismo sitio; las marcas no contienen el token.
- Las respuestas tardías y los reintentos de una sesión anterior no cierran ni sobrescriben una autenticación nueva. El reintento del login vuelve a intentar la revocación y la limpieza.
- Las fechas de actividades, detalle e historial usan America/Montevideo.

## Validación

Ejecución local de referencia del 14/11/2026: 72 pruebas web aprobadas, sin omisiones; TypeScript, ESLint, formato y compilación de producción aprobados. La API de CU37 aprobó 203 pruebas con PostgreSQL y Redis locales.

Se repitieron en Chrome la respuesta 200 con {}, el fallo de render y la doble falla de desconexión y borrado local. La recarga permaneció en login y el reintento recuperó el cierre al restablecer el servicio. La instrumentación se retiró del código final.

Ejecutar npm test, npm run lint, npm run format:check y npm run build. La integración requiere POST /api/auth/cerrar-sesion de la API CU37.

## Límite conocido

Si todos los medios de persistencia y el servidor fallan, no se garantiza un bloqueo después de recargar. Si solo funciona sessionStorage, la marca protege esa pestaña. Si el token local se borró y se perdió su copia en memoria, la huella no permite reconstruirlo para reintentar una revocación remota. No se presenta un cierre remoto desconocido como confirmado.
