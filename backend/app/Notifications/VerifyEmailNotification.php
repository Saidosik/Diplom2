<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;
use Carbon\Carbon;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */


    public function toMail($notifiable)
    {
        // 1. Генерируем временную ссылку, указывающую на ваш ЛАРАВЕЛЬ-эндпоинт (бэкенд)
        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(60),
            ['id' => $notifiable->getKey()]
        );

        // 2. Превращаем её в ссылку на Next.js
        // Берем query параметры (expires и signature) из сгенерированного URL
        $parsedUrl = parse_url($verifyUrl);
        $frontendUrl = env('FRONTEND_URL') . '/verify-email?id=' . $notifiable->getKey() . '&' . $parsedUrl['query'];

        return (new MailMessage)
            ->subject('Подтвердите ваш email')
            ->action('Подтвердить почту', $frontendUrl)
            ->line('Ссылка действительна 60 минут.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
