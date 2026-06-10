<?php

use App\Http\Middleware\JWTMiddleware;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\RefreshMiddleware;
use App\Http\Middleware\SystemAdminMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Routing\Middleware\ValidateSignature;
use Illuminate\Routing\Middleware\ThrottleRequests;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
         $middleware->alias([
            'jwt' => JWTMiddleware::class,
            'email_verified' => EnsureEmailIsVerified::class,
            'refresh' => RefreshMiddleware::class,
            'admin' => AdminMiddleware::class,
            'system_admin' => SystemAdminMiddleware::class,
            'signed' => ValidateSignature::class,
            'throttle' => ThrottleRequests::class
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
