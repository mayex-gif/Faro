
# Flujo de trabajo (Metodología Git Flow)

Para coordinar el código de los 7 desarrolladores sin generar conflictos, debes implementar el flujo de trabajo basado en *Git Flow*.

  

Asegúrate de tener la **rama main intacta** y crea una rama llamada ***develop***, la cual servirá para que el equipo integre sus avances diarios de forma segura.

  

Instruye al equipo para que ***nunca*** trabajen directamente sobre develop, sino que **creen ramas derivativas** por cada tarea (por ejemplo, feature/login o feature/mapa).

  

### Ramas de apoyo o temporales

*Feature*: Sirve para crear una nueva funcionalidad. Nace de develop y vuelve a unirse a develop.

*Release*: Permite preparar una nueva versión para producción. Nace de develop y se fusiona tanto en main como en develop.

*Hotfix*: Corrige un error urgente detectado en producción. Nace de main y se fusiona en main y en develop.

  
  

#### 1. El inicio del día (Sincronizar tu equipo)

Antes de escribir código, te aseguras de tener lo último que tus compañeros han subido a la rama de desarrollo (develop).

  

```

git checkout develop

git pull origin develop

```

  
  

#### 2. Creas la rama para tu tarea (Feature)

En lugar de crear una rama común, usas el comando de Git Flow para indicar que vas a programar una nueva funcionalidad. Esto crea automáticamente una rama llamada feature/boton-paypal basada en develop.

  
```
git flow feature start boton-paypal
```
  

#### 3. Trabajas en tu código (Tu rutina normal)

Aquí programas el botón, haces tus pruebas locales y guardas tus cambios como siempre.

  

```

git add .

git commit -m "Formulario y diseño del botón de PayPal"

```

  

#### 4. Subes tu trabajo para revisión

Cuando terminas, "publicas" tu rama en GitHub para que tus compañeros revisen tu código a través de un Pull Request (PR) hacia la rama develop (no a main).
En GitHub: Vas a la web, abres el PR hacia la rama develop (no a main). Recordá que **el sistema exige al menos 1 aprobación** de un compañero para poder fusionarlo, garantizando así la calidad del código mediante la revisión de pares.

  
```
git flow feature publish boton-paypal
```
  

En GitHub: Vas a la web, abres el PR, tu equipo lo aprueba y se fusiona (merge) en develop.

  

#### 5. Finalizas la tarea

Una vez aprobado y fusionado en la nube, limpias tu computadora local para cerrar el ciclo de esa función.

  
```
git flow feature finish boton-paypal
```
  
  

(Este comando borra la rama local feature/boton-paypal y te regresa automáticamente a develop).