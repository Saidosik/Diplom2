<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenBlacklistedException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;

use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Symfony\Component\HttpFoundation\Response;


class RefreshMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if(! $request->bearerToken()){
            return response()->json([
                'error' => 'Не авторизован',
            ], 401);
        }

        try{
            $user = JWTAuth::parseToken()->authenticate();
        } catch(TokenExpiredException $e){
            return $next($request);
        } catch (TokenInvalidException|TokenBlacklistedException|JWTException $e) {
            return response()->json([
                'message' => 'Токен недействителен',
            ], 401);
        }

        return $next($request);
    }
}
