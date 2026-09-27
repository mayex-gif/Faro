Probar ABMC siguiendo estos pasos para verificar funcionamiento

Levantar el Backend: Ejecuten la aplicación Spring Boot desde IntelliJ IDEA. Asegúrense de que el contenedor de Docker con PostgreSQL (PostGIS) esté corriendo.

Validar Swagger: Ingresen desde el navegador a http://localhost:8080/swagger-ui.html. Deberían ver la interfaz gráfica con el endpoint /api/infraestructura documentado y listo para ejecutar pruebas en vivo.

Probar en Postman: Hagan una petición GET a http://localhost:8080/api/infraestructura. Aunque devuelva una lista vacía [], esto confirmará que la conexión base de datos -> repositorio -> servicio -> controlador -> JSON está funcionando perfectamente