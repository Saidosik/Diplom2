<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;


class JWTMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Проверяем валидность и получаем пользователя
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json(['error' => 'Пользователь не найден'], 404);
            }
        } catch (TokenExpiredException $e) {
            return response()->json(['error' => 'Токен истек'], 401);
        } catch (TokenInvalidException $e) {
            return response()->json(['error' => 'Токен недействителен'], 401);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Токен отсутствует'], 401);
        }

        // Установка пользователя для текущего запроса
        auth('api')->setUser($user);
        $request->setUserResolver(fn() => $user);

        return $next($request);
    }
}
