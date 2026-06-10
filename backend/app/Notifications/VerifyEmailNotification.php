<?php

namespace App\Notifications;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification
{
    use Queueable;

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
    public function toMail(object $notifiable): MailMessage
    {
        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes((int) config('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        return (new MailMessage)
            ->subject('Подтвердите ваш email')
            ->greeting('Здравствуйте!')
            ->line('Мы отправили это письмо после регистрации на платформе IT-сообщества.')
            ->line('Нажмите кнопку ниже, чтобы подтвердить email и получить доступ к публикациям, профилю, рекомендациям, AI-ассистенту и другим разделам.')
            ->action('Подтвердить email', $verifyUrl)
            ->line('Если кнопка не работает, скопируйте и откройте эту ссылку в браузере:')
            ->line($verifyUrl)
            ->line('Ссылка действительна 60 минут.')
            ->line('Если вы не регистрировались, просто проигнорируйте это письмо.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [];
    }
}
