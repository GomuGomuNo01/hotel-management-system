# Routes supplémentaires à ajouter dans routes/api.php

Dans le groupe `admin` (middleware auth:admin), ajouter :

```php
// Gestion des images de chambre
Route::delete('/rooms/{room}/images/{image}', [RoomController::class, 'deleteImage']);
Route::put('/rooms/{room}/images/{image}/primary', [RoomController::class, 'setPrimaryImage']);
```

La route `store` et `update` de RoomController gèrent déjà l'upload via `multipart/form-data`.
Penser à lancer : `php artisan storage:link` pour exposer le disque `public`.
