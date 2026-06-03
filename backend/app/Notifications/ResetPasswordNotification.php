<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;
    public $token;

    /**
     * Create a new notification instance.
     */
    public function __construct($token)
    {
        $this->token = $token;
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
    public function toMail($notifiable): MailMessage
    {
        // Формируем ссылку на страницу сброса в Next.js
        // Передаем токен и email (он нужен Laravel для валидации сброса)
        $frontendUrl = config('app.frontend_url') . '/reset-password';
        $fullUrl = $frontendUrl . '?token=' . $this->token . '&email=' . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Восстановление пароля')
            ->greeting('Здравствуйте!')
            ->line('Вы получили это письмо, потому что мы получили запрос на сброс пароля для вашей учетной записи.')
            ->action('Сбросить пароль', $fullUrl)
            ->line('Срок действия этой ссылки истекает через ' . config('auth.passwords.users.expire') . ' минут.')
            ->line('Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.');
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
