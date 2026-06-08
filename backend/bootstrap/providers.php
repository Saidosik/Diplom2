<?php

$providers = [
    App\Providers\AppServiceProvider::class,
];

$appEnv = $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'production';

if ($appEnv !== 'production' && class_exists(Laravel\Telescope\TelescopeApplicationServiceProvider::class)) {
    $providers[] = App\Providers\TelescopeServiceProvider::class;
}

$providers[] = SocialiteProviders\Manager\ServiceProvider::class;

return $providers;
